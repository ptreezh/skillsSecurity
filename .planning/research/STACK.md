# Technology Stack: Hardhat Testing & Polygon Amoy Deployment

**Project:** AgentSkills Smart Contracts
**Researched:** 2026-05-16
**Confidence:** HIGH (verified from existing config and node_modules)

---

## Executive Summary

The project has Hardhat 2.19.4 installed (which includes ethers.js v6 as a bundled dependency). No test framework is configured yet, and the existing `hardhat.config.cjs` uses the deprecated Mumbai testnet. This document specifies the additions needed for comprehensive smart contract testing and Polygon Amoy deployment.

---

## Current State

| Component | Version | Status |
|-----------|---------|--------|
| hardhat | 2.19.4 | Installed, no config file |
| ethers | 5.8.0 | Installed (legacy v5, separate from Hardhat bundle) |
| hardhat.config.cjs | - | Exists but outdated |
| Test directory | - | `tests/` exists but contains Node.js tests, not Solidity tests |
| Test framework | - | None configured |

---

## Required Additions

### 1. Test Framework (Hardhat Test Environment)

**Status:** No test framework configured.

Hardhat 2.x includes the Hardhat Network (local blockchain) and supports Mocha test runner by default. The missing pieces are:

| Package | Purpose | Version |
|---------|---------|---------|
| `chai` | Assertion library | 4.2.x (bundled with Hardhat) |
| `@nomicfoundation/hardhat-chai-matchers` | Smart contract specific matchers | ^2.0.0 |
| `@nomicfoundation/hardhat-network-helpers` | Time manipulation, snapshotting | ^2.0.0 |

**Why Hardhat Chai Matchers:**
- Provides `emit()`, `revertedWith()`, `revertedWithCustomError()`, `withArgs()` for Solidity events and errors
- Integrates with Hardhat's contract abstraction
- Maintained by Hardhat team, compatible with Hardhat 2.x

**Installation:**
```bash
npm install -D @nomicfoundation/hardhat-chai-matchers @nomicfoundation/hardhat-network-helpers
```

---

### 2. Test Structure

**Current:** `tests/audit-independence.test.js` - Node.js unit tests (not Solidity tests)

**Required:** Create `test/contracts/` directory for Solidity contract tests.

```
test/
├── contracts/           # Solidity contract tests
│   ├── ASKToken.test.js
│   ├── SkillRegistry.test.js
│   ├── StakingManager.test.js
│   └── Attribution.test.js
└── unit/               # Keep existing Node.js tests
    └── audit-independence.test.js
```

**Hardhat test file pattern:** `test/**/*.js` or `test/**/*.ts`

**Important:** Hardhat automatically loads the `chai` export from `@nomicfoundation/hardhat-chai-matchers`. No manual setup required in test files.

---

### 3. Polygon Amoy Testnet Configuration

**Status:** Existing config has deprecated Mumbai network (chainId 80001).

**Mumbai Deprecation:** Polygon Mumbai testnet was deprecated in favor of **Polygon Amoy** (chainId 80002).

**Required Changes to `hardhat.config.cjs`:**

```javascript
require("@nomicfoundation/hardhat-chai-matchers");
require("@nomicfoundation/hardhat-network-helpers");

module.exports = {
  solidity: {
    compilers: [
      { version: "0.8.20", settings: { optimizer: { enabled: true, runs: 200 } } }
    ]
  },
  paths: {
    sources: "./contracts",
    cache: "./contracts/cache",
    artifacts: "./contracts/artifacts",
    tests: "./test/contracts"  // Explicit test path (optional)
  },
  networks: {
    hardhat: {
      chainId: 31337
    },
    polygonAmoy: {                    // NEW: Polygon Amoy
      url: process.env.POLYGON_AMOY_RPC || "https://rpc-amoy.polygon.technology",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 80002
    },
    // Keep deprecated Mumbai for reference (remove in production)
    polygonMumbai: {
      url: process.env.POLYGON_MUMBAI_RPC || "https://rpc-mumbai.maticvigil.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 80001
    },
    polygon: {
      url: process.env.POLYGON_RPC || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 137
    }
  }
};
```

**Amoy RPC Endpoints:**
| Provider | URL | Notes |
|----------|-----|-------|
| Polygon (official) | `https://rpc-amoy.polygon.technology` | Recommended, rate limited |
| QuickNode | `https://few-quaint-rain.matic.discover.quiknode.pro/` | Requires API key |
| Alchemy | `https://polygon-amoy.g.alchemy.com/v2/{API_KEY}` | Requires API key |

---

### 4. Deployment Tools

**Recommended additions:**

| Package | Purpose | When to Use |
|---------|---------|-------------|
| `@nomicfoundation/hardhat-verify` | Contract verification on PolygonScan | After deployment |
| `dotenv` | Environment variable management | Already installed |

**Installation:**
```bash
npm install -D @nomicfoundation/hardhat-verify
```

**Verify plugin in config:**
```javascript
require("@nomicfoundation/hardhat-verify");
```

---

## Package.json Additions

**Required devDependencies:**

```json
{
  "devDependencies": {
    "@nomicfoundation/hardhat-chai-matchers": "^2.0.0",
    "@nomicfoundation/hardhat-network-helpers": "^2.0.0",
    "@nomicfoundation/hardhat-verify": "^2.0.0"
  }
}
```

**Scripts to add:**

```json
{
  "scripts": {
    "test": "hardhat test",
    "test:coverage": "hardhat coverage",
    "deploy:amoy": "hardhat run scripts/deploy.js --network polygonAmoy",
    "verify": "hardhat verify --network polygonAmoy"
  }
}
```

---

## Recommended Testing Patterns

### 1. Basic Test Structure

```javascript
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("ASKToken", function () {
  async function deployFixture() {
    const [owner, user1, user2] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("ASKToken");
    const token = await Token.deploy();
    await token.waitForDeployment();
    return { token, owner, user1, user2 };
  }

  it("should mint tokens", async function () {
    const { token, owner } = await loadFixture(deployFixture);
    const initialBalance = await token.balanceOf(owner.address);
    await token.mint(owner.address, 1000);
    expect(await token.balanceOf(owner.address)).to.equal(initialBalance + 1000n);
  });
});
```

### 2. Time-sensitive Tests (StakingManager unlock)

```javascript
const { time } = require("@nomicfoundation/hardhat-network-helpers");

it("should unlock after 90 days", async function () {
  const { staking } = await loadFixture(deployFixture);
  await staking.stake(skillId, amount);
  
  // Fast forward 90 days
  await time.increase(90 * 24 * 60 * 60);
  
  await staking.unstake(skillId);
  expect(await token.balanceOf(owner.address)).to.equal(initialBalance + amount);
});
```

### 3. Event Testing

```javascript
it("should emit SkillRegistered event", async function () {
  const { registry } = await loadFixture(deployFixture);
  await expect(registry.registerSkill(...args))
    .to.emit(registry, "SkillRegistered")
    .withArgs(owner.address, 0, "SkillName");
});
```

### 4. Error Revert Testing

```javascript
it("should revert on insufficient stake", async function () {
  const { registry } = await loadFixture(deployFixture);
  await expect(registry.registerSkill(...)).to.be.revertedWith("Stake failed");
});
```

---

## Ethers Version Note

**Conflict Warning:** The project has `ethers` v5.8.0 installed separately (not through Hardhat). Hardhat 2.19.4 bundles ethers v6 internally.

| Version | Used By | Status |
|---------|---------|--------|
| ethers v6 | Hardhat tasks, tests | Recommended for new code |
| ethers v5 | Legacy scripts | Already installed |

**Recommendation:** Use Hardhat's built-in `ethers` (v6) in tests and new deployment scripts. The existing `scripts/` directory using v5 can remain as-is.

Access ethers in Hardhat:
```javascript
const { ethers } = require("hardhat");  // v6 from Hardhat
const { ethers: ethersV5 } = require("ethers");  // v5 for legacy scripts
```

---

## Summary: What to Install

```bash
npm install -D \
  @nomicfoundation/hardhat-chai-matchers \
  @nomicfoundation/hardhat-network-helpers \
  @nomicfoundation/hardhat-verify
```

**Files to update:**
1. `package.json` - Add devDependencies and scripts
2. `hardhat.config.cjs` - Add plugins and polygonAmoy network

---

## Sources

- [Hardhat Testing Documentation](https://hardhat.org/hardhat-runner/docs/guides/test-contracts) - HIGH confidence
- [Hardhat Chai Matchers](https://hardhat.org/hardhat-chai-matchers/docs/overview) - HIGH confidence
- [Hardhat Network Helpers](https://hardhat.org/hardhat-network-helpers/docs/overview) - HIGH confidence
- [Polygon Amoy Migration Guide](https://polygon.technology/blog/introducing-polygon-amoy) - HIGH confidence
- [Polygon Amoy RPC Documentation](https://wiki.polygon.technology/docs/tools/development/network-details) - HIGH confidence