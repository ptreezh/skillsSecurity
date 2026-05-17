---
phase: 16
slug: polygon-amoy-deploy
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-17
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Hardhat + Mocha |
| **Config file** | hardhat.config.js |
| **Quick run command** | `npx hardhat test --no-compile` |
| **Full suite command** | `npx hardhat test` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx hardhat test --no-compile`
- **After every plan wave:** Run `npx hardhat test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 16-01-01 | 01 | 1 | DEPL-01 | T-16-01 | N/A - config review | manual | Inspect hardhat.config.js | ✅ | ⬜ pending |
| 16-01-02 | 01 | 1 | DEPL-01 | T-16-01 | N/A - config review | manual | Inspect .env.example | ❌ W0 | ⬜ pending |
| 16-02-01 | 02 | 1 | DEPL-02 | — | N/A - script creation | manual | `npx hardhat run scripts/deploy-all.cjs --network polygonAmoy` | ❌ W0 | ⬜ pending |
| 16-02-02 | 02 | 1 | DEPL-03 | — | N/A - deployment | manual | Script execution + block explorer | ❌ W0 | ⬜ pending |
| 16-02-03 | 02 | 1 | DEPL-04 | T-16-02 | N/A - verification | manual | Check Polygonscan, run verify task | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/deploy-all.cjs` — main deployment script
- [ ] `contracts/.env.example` — update for Amoy, add POLYGONSCAN_API_KEY
- [ ] Update `contracts/.env` — change POLYGON_MUMBAI_RPC to POLYGON_AMOY_RPC
- [ ] Framework install: N/A — already installed

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Contracts deploy to Amoy and return addresses | DEPL-03 | One-time deployment, requires real RPC | Run `npx hardhat run scripts/deploy-all.cjs --network polygonAmoy`, verify addresses in output |
| Contracts verified on Polygonscan | DEPL-04 | Requires external block explorer | Check https://polygonscan.com with deployed addresses |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending