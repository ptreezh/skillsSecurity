#!/usr/bin/env node
/**
 * v2 On-Chain Wiring End-to-End Test (ChainMaker chain1)
 *
 * Semantic verification of all 11 cross-contract wiring links deployed on
 * the real ChainMaker solo chain (blocks 38-53), mirroring the 13 checks in
 * scripts/deploy-core-v2.js Step 3. Reads live state via the cmc CLI inside
 * the cmc-debug container, decodes byte-array responses, and asserts each
 * against the expected v2 contract address / boolean.
 *
 * Usage:
 *   node test/e2e/v2-wiring.test.mjs          # requires: docker cmc-debug up
 *   npm run test:chain
 *
 * Exit code 0 = 13/13 pass. Exit code 1 = any check failed or infra error.
 */

import { execSync } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFileSync } from "node:fs";

const CONTAINER = "cmc-debug";
const WORK = "/work";
const ABI_DIR = WORK;

// ── v2 contract addresses (authoritative, from deployments.json) ────────────
const addr = JSON.parse(
  readFileSync(new URL("../../deployments.json", import.meta.url), "utf8"),
).v2_contracts;

const STAKING = addr.AS_Staking.toLowerCase();
const REGISTRY = addr.AS_SkillRegistry.toLowerCase();
const ATTRIBUTION = addr.AS_Attribution.toLowerCase();
const GOVERNANCE = addr.DaoGovernance.toLowerCase();
const SSE = addr.AgentEcosystem.toLowerCase();
const BADGES = addr.ReputationBadges.toLowerCase();

// ── 13 checks: [label, contractName, abiFile, method, params, expected] ──────
// expected = '0x...' address (lowercase) or boolean
const CHECKS = [
  [
    "StakingManager.governance",
    "AS_Staking",
    "StakingManager.abi",
    "governance",
    [],
    GOVERNANCE,
  ],
  [
    "StakingManager.reputationOracle",
    "AS_Staking",
    "StakingManager.abi",
    "reputationOracle",
    [],
    SSE,
  ],
  [
    "StakingManager.authorizedCallers[SkillRegistry]",
    "AS_Staking",
    "StakingManager.abi",
    "authorizedCallers",
    [{ address: REGISTRY }],
    true,
  ],
  [
    "StakingManager.authorizedCallers[Attribution]",
    "AS_Staking",
    "StakingManager.abi",
    "authorizedCallers",
    [{ address: ATTRIBUTION }],
    true,
  ],
  [
    "Attribution.stakingManager",
    "AS_Attribution",
    "Attribution.abi",
    "stakingManager",
    [],
    STAKING,
  ],
  [
    "SSE.stakingManager",
    "AgentEcosystem",
    "SelfSustainingEcosystem.abi",
    "stakingManager",
    [],
    STAKING,
  ],
  [
    "SSE.skillRegistry",
    "AgentEcosystem",
    "SelfSustainingEcosystem.abi",
    "skillRegistry",
    [],
    REGISTRY,
  ],
  [
    "SSE.attribution",
    "AgentEcosystem",
    "SelfSustainingEcosystem.abi",
    "attribution",
    [],
    ATTRIBUTION,
  ],
  [
    "SSE.governance",
    "AgentEcosystem",
    "SelfSustainingEcosystem.abi",
    "governance",
    [],
    GOVERNANCE,
  ],
  [
    "SSE.reputationBadges",
    "AgentEcosystem",
    "SelfSustainingEcosystem.abi",
    "reputationBadges",
    [],
    BADGES,
  ],
  [
    "SSE.reputationBadgesSet",
    "AgentEcosystem",
    "SelfSustainingEcosystem.abi",
    "reputationBadgesSet",
    [],
    true,
  ],
  [
    "ReputationBadges.issuer",
    "ReputationBadges",
    "ReputationBadges.abi",
    "issuer",
    [],
    SSE,
  ],
  [
    "Governance.stakingManager",
    "DaoGovernance",
    "Governance.abi",
    "stakingManager",
    [],
    STAKING,
  ],
];

const toParamsJson = (params) => JSON.stringify(params);

function buildShellScript() {
  const sdk =
    "--sdk-conf-path=" +
    WORK +
    "/sdk_config.yml --chain-id=chain1 --org-id=wx-org.chainmaker.org";
  const tls =
    "--user-tlscrt-file-path=" +
    WORK +
    "/admin1.tls.crt --user-tlskey-file-path=" +
    WORK +
    "/admin1.tls.key --user-signcrt-file-path=" +
    WORK +
    "/admin1.sign.crt --user-signkey-file-path=" +
    WORK +
    "/admin1.sign.key";
  const flags = sdk + " " + tls + " --result-to-string";
  const nameToAddr = {
    AS_Staking: STAKING.replace(/^0x/, ""),
    AS_SkillRegistry: REGISTRY.replace(/^0x/, ""),
    AS_Attribution: ATTRIBUTION.replace(/^0x/, ""),
    DaoGovernance: GOVERNANCE.replace(/^0x/, ""),
    AgentEcosystem: SSE.replace(/^0x/, ""),
    ReputationBadges: BADGES.replace(/^0x/, ""),
  };
  const lines = ["#!/bin/sh", "set -eu", ""];
  CHECKS.forEach(([label, name, abi, method, params], i) => {
    lines.push("# " + (i + 1) + "/13 " + label);
    lines.push(
      "echo '[CHECK_" + (i + 1) + "]'",
      "cmc client contract user get --contract-name=" +
        name +
        " --contract-address=" +
        nameToAddr[name] +
        " --method=" +
        method +
        " --abi-file-path=" +
        ABI_DIR +
        "/" +
        abi +
        " " +
        flags +
        " --params='" +
        toParamsJson(params) +
        "'",
    );
  });
  return lines.join("\n") + "\n";
}

/** Decode cmc result-to-string output into a semantic value. */
function decodeResult(raw) {
  const s = String(raw).trim();
  // boolean: "[true]" / "[false]"
  if (/^\[(true|false)\]$/.test(s)) {
    return s === "[true]";
  }
  // address byte array: "[[16 109 54 ...]]" or "[[207 8 ...]]"
  const m = s.match(/^\[\[([0-9 ]+)\]\]$/);
  if (m) {
    const bytes = m[1]
      .trim()
      .split(/\s+/)
      .map((v) => parseInt(v, 10));
    if (bytes.length !== 20)
      throw new Error("unexpected byte count: " + bytes.length);
    return "0x" + bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // bare byte array "[[...]]" already handled; fallback to raw
  throw new Error("unrecognized result format: " + JSON.stringify(s));
}

function run() {
  // 1. ensure container up
  try {
    execSync("docker exec " + CONTAINER + " echo ok", { stdio: "pipe" });
  } catch {
    console.error(
      "❌ Container " +
        CONTAINER +
        " not reachable. Run: docker start " +
        CONTAINER,
    );
    process.exit(1);
  }

  // 2. write script, copy in, execute
  const local = join(tmpdir(), "v2-wiring-test-" + Date.now() + ".sh");
  const remote = WORK + "/v2-wiring-test.sh";
  writeFileSync(local, buildShellScript(), "utf8");
  try {
    execSync('docker cp "' + local + '" ' + CONTAINER + ":" + remote, {
      stdio: "pipe",
    });
    const out = execSync("docker exec " + CONTAINER + " sh " + remote, {
      stdio: ["pipe", "pipe", "pipe"],
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    }).toString();

    // 3. split output on [CHECK_i] markers
    const blocks = out.split(/\[CHECK_(\d+)\]/).slice(1);
    const results = new Map();
    for (let i = 0; i < blocks.length; i += 2) {
      const idx = parseInt(blocks[i], 10);
      const json = blocks[i + 1].slice(
        blocks[i + 1].indexOf("{"),
        blocks[i + 1].lastIndexOf("}") + 1,
      );
      const parsed = JSON.parse(json);
      if (parsed.message !== "SUCCESS")
        throw new Error("check " + idx + " cmc error: " + parsed.message);
      results.set(idx, decodeResult(parsed.contract_result.result));
    }

    // 4. assert each
    let allPass = true;
    CHECKS.forEach(([label], i) => {
      const idx = i + 1;
      const got = results.get(idx);
      const expected = CHECKS[i][5];
      const pass = got === expected;
      allPass = allPass && pass;
      console.log(
        "   " +
          (pass ? "✅" : "❌") +
          " " +
          label +
          (pass ? "" : " expected=" + expected + " got=" + got),
      );
    });
    console.log(
      allPass
        ? "\n✅ 13/13 on-chain wiring checks PASSED"
        : "\n❌ Wiring verification FAILED",
    );
    process.exit(allPass ? 0 : 1);
  } catch (err) {
    console.error("❌ Test runner error:", err.message);
    process.exit(1);
  } finally {
    rmSync(local, { force: true });
  }
}

run();
