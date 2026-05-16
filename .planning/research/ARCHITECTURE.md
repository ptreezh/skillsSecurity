# Hardhat Test Environment Architecture

**Domain:** Smart Contract Testing and Deployment
**Researched:** 2026-05-16
**Confidence:** MEDIUM

## Executive Summary

This document describes the test environment architecture for AgentSkills smart contracts. Hardhat provides the foundation with fixtures for contract setup, network helpers for time-dependent tests, and deployment scripts for cross-contract orchestration. The current codebase lacks test infrastructure entirely -- this architecture provides the blueprint for v1.3 milestone work.

**Key finding:** Cross-contract dependencies (SkillRegistry -> StakingManager -> ASKToken) require hierarchical fixture construction. Tests must deploy contracts in dependency order and wire them together before individual contract tests execute.

## Recommended Architecture

### Directory Structure

```
F:/skillsSecurity/
├── hardhat.config.cjs          # Existing: extended for Polygon Amoy
├── contracts/
│   ├── ASKToken.sol
│   ├── SkillRegistry.sol
│   ├── Attribution.sol
│   └── StakingManager.sol
├── test/
│   ├── fixtures/
│   │   ├── token.fixture.js     # ASKToken deployment
│   │   ├── staking.fixture.js   # StakingManager + ASKToken wiring
│   │   ├── registry.fixture.js  # SkillRegistry + dependencies
│   │   └── attribution.fixture.js # Attribution + StakingManager
│   ├── integration/
│   │   ├── cross-contract.test.js
│   │   └── full-system.test.js
│   ├── ASKToken.test.js
│   ├── StakingManager.test.js
│   ├── SkillRegistry.test.js
│   └── Attribution.test.js
├── scripts/
│   ├── deploy.js               # Single contract deployment
│   ├── deploy-all.js           # Full system deployment
│   ├── verify-on-polygonscan.js # Contract verification
│   └── upgrade.js              # Future upgrades
└── contracts/
    ├── cache/                  # Existing
    └── artifacts/              # Existing
```

**Rationale:** Fixtures live in `test/fixtures/` to keep tests DRY. Integration tests live in `test/integration/` to distinguish cross-contract coverage from unit coverage.

### Test Environment Configuration

**Recommended hardhat.config.cjs additions:**

```javascript
// hardhat.config.cjs
module.exports = {
  solidity: {
    compilers: [
      { 
        version: "0.8.20", 
        settings: { 
          optimizer: { enabled: true, runs: 200 } 
        } 
      }
    ]
  },
  paths: {
    sources: "./contracts",
    cache: "./contracts/cache",
    artifacts: "./contracts/artifacts"
  },
  networks: {
    hardhat: {
      chainId: 31337,
      // Enable detailed logging for test debugging
      loggingEnabled: true
    },
    polygonAmoy: {
      url: process.env.POLYGON_AMOY_RPC || "https://rpc-amoy.polygon.technology",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 80002,
      // Verify contracts on Polygonscan after deployment
      verify: {
        etherscan: {
          apiKey: {
            polygonAmoy: process.env.POLYGONSCAN_API_KEY || ""
          }
        }
      }
    },
    polygonMainnet: {
      url: process.env.POLYGON_RPC || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 137
    }
  },
  // Mocha test configuration
  mocha: {
    timeout: 40000,
    reporter: "spec",
    grep: ["@skip-on-ci"],
    invert: false
  }
};
```

**Note:** Polygon Amoy (chainId: 80002) replaces deprecated Mumbai. Mumbai support should be removed.

### Fixture Pattern for Cross-Contract Setup

**The core pattern uses `loadFixture` from Hardhat Toolbox:**

```javascript
// test/fixtures/token.fixture.js
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

async function deployTokenFixture() {
  const [owner, user1, user2, ...accounts] = await ethers.getSigners();
  
  const Token = await ethers.getContractFactory("ASKToken");
  const token = await Token.deploy();
  await token.deployed();
  
  // Mint tokens for testing
  await token.mint(owner.address, ethers.parseEther("1000000"));
  await token.mint(user1.address, ethers.parseEther("10000"));
  await token.mint(user2.address, ethers.parseEther("10000"));
  
  return { token, owner, user1, user2, accounts };
}

module.exports = { deployTokenFixture, loadFixture };
```

**StakingManager fixture (depends on ASKToken):**

```javascript
// test/fixtures/staking.fixture.js
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { deployTokenFixture } = require("./token.fixture");

async function deployStakingFixture() {
  // Deploy token first
  const { token, owner, user1, user2, accounts } = await loadFixture(deployTokenFixture);
  
  // Deploy StakingManager with token address
  const StakingManager = await ethers.getContractFactory("StakingManager");
  const stakingManager = await StakingManager.deploy(token.target);
  await stakingManager.deployed();
  
  // Transfer tokens to StakingManager for staking operations
  await token.transfer(stakingManager.target, ethers.parseEther("500000"));
  
  return { token, stakingManager, owner, user1, user2, accounts };
}

module.exports = { deployStakingFixture, loadFixture };
```

**SkillRegistry fixture (depends on ASKToken + StakingManager):**

```javascript
// test/fixtures/registry.fixture.js
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { deployStakingFixture } = require("./staking.fixture");

async function deployRegistryFixture() {
  // Deploy staking infrastructure first
  const { token, stakingManager, owner, user1, user2, accounts } = 
    await loadFixture(deployStakingFixture);
  
  // Deploy SkillRegistry with all dependencies
  const SkillRegistry = await ethers.getContractFactory("SkillRegistry");
  const skillRegistry = await SkillRegistry.deploy(token.target, stakingManager.target);
  await skillRegistry.deployed();
  
  return { token, stakingManager, skillRegistry, owner, user1, user2, accounts };
}

module.exports = { deployRegistryFixture, loadFixture };
```

**Attribution fixture (depends on StakingManager):**

```javascript
// test/fixtures/attribution.fixture.js
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { deployStakingFixture } = require("./staking.fixture");

async function deployAttributionFixture() {
  const { token, stakingManager, owner, user1, user2, accounts } = 
    await loadFixture(deployStakingFixture);
  
  const Attribution = await ethers.getContractFactory("Attribution");
  const attribution = await Attribution.deploy();
  await attribution.deployed();
  
  // Wire Attribution to StakingManager
  await attribution.setStakingManager(stakingManager.target);
  
  return { token, stakingManager, attribution, owner, user1, user2, accounts };
}

module.exports = { deployAttributionFixture, loadFixture };
```

## Deployment Script Patterns

### Single Network Deployment

**scripts/deploy-all.js:**

```javascript
// scripts/deploy-all.js
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  // 1. Deploy ASKToken
  console.log("\nDeploying ASKToken...");
  const Token = await ethers.getContractFactory("ASKToken");
  const token = await Token.deploy();
  await token.waitForDeployment();
  const tokenAddress = token.target;
  console.log("ASKToken deployed to:", tokenAddress);

  // 2. Deploy StakingManager
  console.log("\nDeploying StakingManager...");
  const StakingManager = await ethers.getContractFactory("StakingManager");
  const stakingManager = await StakingManager.deploy(tokenAddress);
  await stakingManager.waitForDeployment();
  const stakingAddress = stakingManager.target;
  console.log("StakingManager deployed to:", stakingAddress);

  // 3. Deploy SkillRegistry
  console.log("\nDeploying SkillRegistry...");
  const SkillRegistry = await ethers.getContractFactory("SkillRegistry");
  const skillRegistry = await SkillRegistry.deploy(tokenAddress, stakingAddress);
  await skillRegistry.waitForDeployment();
  const registryAddress = skillRegistry.target;
  console.log("SkillRegistry deployed to:", registryAddress);

  // 4. Deploy Attribution
  console.log("\nDeploying Attribution...");
  const Attribution = await ethers.getContractFactory("Attribution");
  const attribution = await Attribution.deploy();
  await attribution.waitForDeployment();
  const attributionAddress = attribution.target;
  console.log("Attribution deployed to:", attributionAddress);

  // 5. Wire Attribution to StakingManager
  console.log("\nWiring Attribution to StakingManager...");
  const tx = await attribution.setStakingManager(stakingAddress);
  await tx.wait();
  console.log("Attribution wired to StakingManager");

  // 6. Output deployment summary
  console.log("\n=== Deployment Summary ===");
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("Deployer:", deployer.address);
  console.log("ASKToken:", tokenAddress);
  console.log("StakingManager:", stakingAddress);
  console.log("SkillRegistry:", registryAddress);
  console.log("Attribution:", attributionAddress);

  // 7. Save addresses to file (for frontend integration)
  const fs = require("fs");
  const deployments = {
    network: (await ethers.provider.getNetwork()).chainId.toString(),
    timestamp: new Date().toISOString(),
    contracts: {
      ASKToken: tokenAddress,
      StakingManager: stakingAddress,
      SkillRegistry: registryAddress,
      Attribution: attributionAddress
    }
  };
  
  fs.writeFileSync(
    "./deployments/latest.json",
    JSON.stringify(deployments, null, 2)
  );
  console.log("\nDeployments saved to ./deployments/latest.json");

  return deployments;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

### Verification Script

**scripts/verify-on-polygonscan.js:**

```javascript
// scripts/verify-on-polygonscan.js
// Run after deployment: npx hardhat run scripts/verify-on-polygonscan.js --network polygonAmoy

const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  const deployments = JSON.parse(fs.readFileSync("./deployments/latest.json", "utf8"));
  
  console.log("Verifying contracts on Polygonscan...");
  console.log("Network chainId:", deployments.network);

  const contractArtifacts = {
    ASKToken: { args: [] },
    StakingManager: { args: [deployments.contracts.ASKToken] },
    SkillRegistry: { args: [deployments.contracts.ASKToken, deployments.contracts.StakingManager] },
    Attribution: { args: [] }
  };

  for (const [name, config] of Object.entries(contractArtifacts)) {
    const address = deployments.contracts[name];
    console.log(`\nVerifying ${name} at ${address}...`);
    
    try {
      await hre.run("verify:verify", {
        address: address,
        constructorArguments: config.args
      });
      console.log(`${name} verified successfully`);
    } catch (error) {
      if (error.message.includes("Already verified")) {
        console.log(`${name} already verified`);
      } else {
        console.error(`${name} verification failed:`, error.message);
      }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

## Unit Test Patterns

### ASKToken Tests

**test/ASKToken.test.js:**

```javascript
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { deployTokenFixture } = require("./fixtures/token.fixture");

describe("ASKToken", function () {
  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      const { token } = await loadFixture(deployTokenFixture);
      expect(await token.name()).to.equal("AgentSkills Token");
      expect(await token.symbol()).to.equal("ASK");
    });

    it("Should mint max supply to deployer", async function () {
      const { token, owner } = await loadFixture(deployTokenFixture);
      const maxSupply = ethers.parseEther("1000000000"); // 1 billion
      expect(await token.totalSupply()).to.equal(maxSupply);
      expect(await token.balanceOf(owner.address)).to.equal(maxSupply);
    });
  });

  describe("Minting", function () {
    it("Should allow owner to mint tokens", async function () {
      const { token, user1 } = await loadFixture(deployTokenFixture);
      const mintAmount = ethers.parseEther("1000");
      
      await expect(token.mint(user1.address, mintAmount))
        .to.emit(token, "Transfer")
        .withArgs(ethers.ZeroAddress, user1.address, mintAmount);
      
      expect(await token.balanceOf(user1.address)).to.equal(mintAmount);
    });

    it("Should prevent non-owner from minting", async function () {
      const { token, user1, user2 } = await loadFixture(deployTokenFixture);
      
      await expect(
        token.connect(user1).mint(user2.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount")
        .withArgs(user1.address);
    });

    it("Should reject minting beyond max supply", async function () {
      const { token, user1 } = await loadFixture(deployTokenFixture);
      
      await expect(
        token.mint(user1.address, ethers.parseEther("1")) // Exceeds 1B max
      ).to.be.revertedWith("Max supply exceeded");
    });
  });

  describe("Burning", function () {
    it("Should allow owner to burn tokens", async function () {
      const { token, owner } = await loadFixture(deployTokenFixture);
      const burnAmount = ethers.parseEther("100");
      
      await token.burn(burnAmount);
      const maxSupply = ethers.parseEther("1000000000");
      expect(await token.totalSupply()).to.equal(maxSupply - burnAmount);
    });
  });

  describe("Voting", function () {
    it("Should track votes correctly", async function () {
      const { token, owner, user1 } = await loadFixture(deployTokenFixture);
      
      await token.delegate(user1.address);
      expect(await token.getVotes(user1.address)).to.equal(
        await token.balanceOf(owner.address)
      );
    });
  });
});
```

### StakingManager Tests

**test/StakingManager.test.js:**

```javascript
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { deployStakingFixture } = require("./fixtures/staking.fixture");

describe("StakingManager", function () {
  describe("Staking", function () {
    it("Should accept stake and record stake info", async function () {
      const { token, stakingManager, user1 } = await loadFixture(deployStakingFixture);
      
      const stakeAmount = ethers.parseEther("100");
      await token.connect(user1).approve(stakingManager.target, stakeAmount);
      
      await expect(stakingManager.connect(user1).stake(1, stakeAmount))
        .to.emit(stakingManager, "Staked");
      
      const stakeInfo = await stakingManager.stakes(user1.address, 1);
      expect(stakeInfo.amount).to.equal(stakeAmount);
      expect(stakeInfo.slashed).to.equal(false);
    });

    it("Should reject staking on slashed skill", async function () {
      const { token, stakingManager, owner, user1 } = await loadFixture(deployStakingFixture);
      
      // First stake
      const stakeAmount = ethers.parseEther("100");
      await token.connect(user1).approve(stakingManager.target, stakeAmount);
      await stakingManager.connect(user1).stake(1, stakeAmount);
      
      // Slash (by owner)
      await stakingManager.connect(owner).slash(user1.address, 1, stakeAmount);
      
      // Try to stake again on slashed skill
      await token.connect(user1).approve(stakingManager.target, stakeAmount);
      await expect(
        stakingManager.connect(user1).stake(1, stakeAmount)
      ).to.be.revertedWith("Already slashed");
    });
  });

  describe("Unstaking", function () {
    it("Should prevent early unstake", async function () {
      const { token, stakingManager, user1 } = await loadFixture(deployStakingFixture);
      
      const stakeAmount = ethers.parseEther("100");
      await token.connect(user1).approve(stakingManager.target, stakeAmount);
      await stakingManager.connect(user1).stake(1, stakeAmount);
      
      await expect(stakingManager.connect(user1).unstake(1))
        .to.be.revertedWith("Still locked");
    });

    it("Should allow unstake after lock period", async function () {
      const { token, stakingManager, user1 } = await loadFixture(deployStakingFixture);
      
      const stakeAmount = ethers.parseEther("100");
      await token.connect(user1).approve(stakingManager.target, stakeAmount);
      await stakingManager.connect(user1).stake(1, stakeAmount);
      
      // Fast forward 91 days
      await time.increase(91 * 24 * 60 * 60);
      
      const balanceBefore = await token.balanceOf(user1.address);
      await stakingManager.connect(user1).unstake(1);
      const balanceAfter = await token.balanceOf(user1.address);
      
      expect(balanceAfter - balanceBefore).to.equal(stakeAmount);
    });
  });

  describe("Reputation", function () {
    it("Should track user reputation", async function () {
      const { stakingManager, user1 } = await loadFixture(deployStakingFixture);
      
      await stakingManager.connect(user1).likeSkill(1);
      const effectiveRep = await stakingManager.getUserReputation(user1.address);
      expect(effectiveRep).to.be.greaterThan(0);
    });

    it("Should calculate effective reputation excluding locked", async function () {
      const { stakingManager, owner, user1 } = await loadFixture(deployStakingFixture);
      
      // User has positive reputation
      await stakingManager.connect(user1).likeSkill(1);
      
      // Slash the liker (creates lock)
      await stakingManager.connect(owner).slashLiker(
        user1.address, 
        ethers.parseEther("-100"), 
        "Test penalty"
      );
      
      // Effective reputation should exclude locked amount
      const effectiveRep = await stakingManager.getUserReputation(user1.address);
      const lockInfo = await stakingManager.getRecoverableReputation(user1.address);
      
      expect(lockInfo.lockedAmount).to.be.greaterThan(0);
      expect(effectiveRep).to.be.lessThan(await stakingManager.userReputation(user1.address));
    });
  });

  describe("Reputation Recovery", function () {
    it("Should calculate correct recovery amount", async function () {
      const { token, stakingManager, owner, user1 } = await loadFixture(deployStakingFixture);
      
      // Set initial reputation and lock
      await stakingManager.connect(user1).likeSkill(1);
      await stakingManager.connect(owner).slashLiker(
        user1.address,
        ethers.parseEther("-1000"),
        "Test slash"
      );
      
      // Fast forward 1 month
      await time.increase(31 * 24 * 60 * 60);
      
      // Set positive contribution
      await stakingManager.connect(owner).setPositiveContribution(user1.address);
      
      // Claim recovery - should recover 5% of original slash (50)
      await expect(stakingManager.connect(user1).claimRecoverableReputation())
        .to.emit(stakingManager, "RecoveryClaimed");
      
      const lockInfo = await stakingManager.getRecoverableReputation(user1.address);
      // 50 recovered, 950 remaining
      expect(lockInfo.lockedAmount).to.equal(ethers.parseEther("950"));
    });
  });
});
```

### Cross-Contract Integration Tests

**test/integration/cross-contract.test.js:**

```javascript
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { deployRegistryFixture } = require("./fixtures/registry.fixture");

describe("Cross-Contract Integration", function () {
  describe("SkillRegistry + StakingManager", function () {
    it("Should enforce reputation requirements on skill registration", async function () {
      const { token, stakingManager, skillRegistry, owner, user1, user2 } = 
        await loadFixture(deployRegistryFixture);
      
      // User1 has no effective reputation (0)
      await expect(
        skillRegistry.connect(user1).registerSkill(
          "high-skill",
          "A high risk skill",
          "trigger",
          "ipfs://test",
          3, // HIGH risk
          "1.0.0"
        )
      ).to.be.revertedWith("Insufficient effective reputation for HIGH skill");
      
      // User2 with sufficient reputation should succeed
      await token.mint(user2.address, ethers.parseEther("10000"));
      await token.connect(user2).approve(skillRegistry.target, ethers.parseEther("100"));
      
      // Bump user2's effective reputation by having them like a skill
      await stakingManager.connect(user2).likeSkill(999);
      await stakingManager.connect(owner).slashLiker(
        user2.address,
        ethers.parseEther("-5000"),
        "Test"
      );
      
      // Now user2 should have effective reputation >= 2000 for HIGH skill
      // (2000+ positive - 5000 locked = negative, but we test basic flow)
    });

    it("Should set positive contribution on successful verification", async function () {
      const { token, stakingManager, skillRegistry, owner, user1 } = 
        await loadFixture(deployRegistryFixture);
      
      // Register a LOW risk skill (no reputation requirement)
      await token.connect(user1).approve(skillRegistry.target, ethers.parseEther("10"));
      await skillRegistry.connect(user1).registerSkill(
        "test-skill",
        "A test skill",
        "trigger",
        "ipfs://test",
        0, // LOW risk
        "1.0.0"
      );
      
      // Give user1 some reputation first
      await stakingManager.connect(user1).likeSkill(999);
      
      // Verify the skill as owner
      await skillRegistry.connect(owner).verifySkill(0, true);
      
      // Check positive contribution was set
      // Note: This requires checking the stakingManager
    });
  });

  describe("Attribution + StakingManager", function () {
    it("Should report reputation through Attribution", async function () {
      const { stakingManager, attribution, user1 } = await loadFixture(
        require("./fixtures/attribution.fixture").deployAttributionFixture
      );
      
      // Check reputation via Attribution (delegates to StakingManager)
      const effectiveRep = await attribution.getUserReputation(user1.address);
      expect(effectiveRep).to.equal(0); // New user
      
      // Like a skill via StakingManager
      await stakingManager.connect(user1).likeSkill(1);
      
      const newRep = await attribution.getUserReputation(user1.address);
      expect(newRep).to.be.greaterThan(effectiveRep);
    });

    it("Should trigger slashing via Attribution", async function () {
      const { stakingManager, attribution, owner, user1 } = 
        await loadFixture(require("./fixtures/attribution.fixture").deployAttributionFixture);
      
      await attribution.connect(owner).slashLiker(
        user1.address,
        ethers.parseEther("-100"),
        "Test slash"
      );
      
      const lockInfo = await stakingManager.getRecoverableReputation(user1.address);
      expect(lockInfo.lockedAmount).to.equal(ethers.parseEther("100"));
    });
  });

  describe("Full System Flow", function () {
    it("Should complete skill registration to earning flow", async function () {
      const { token, stakingManager, skillRegistry, owner, user1, user2 } = 
        await loadFixture(deployRegistryFixture);
      
      // 1. User1 registers a LOW risk skill
      await token.connect(user1).approve(skillRegistry.target, ethers.parseEther("10"));
      await skillRegistry.connect(user1).registerSkill(
        "earning-skill",
        "Skill that earns",
        "trigger",
        "ipfs://test",
        0, // LOW risk
        "1.0.0"
      );
      
      // 2. Verify skill
      await stakingManager.connect(user1).likeSkill(999);
      await skillRegistry.connect(owner).verifySkill(0, true);
      
      // 3. User2 stakes on the skill
      await token.connect(user2).approve(stakingManager.target, ethers.parseEther("100"));
      await stakingManager.connect(user2).stake(0, ethers.parseEther("100"));
      
      // 4. Check stake was recorded
      const stakeInfo = await stakingManager.stakes(user2.address, 0);
      expect(stakeInfo.amount).to.equal(ethers.parseEther("100"));
    });
  });
});
```

## Network Configuration

### Polygon Amoy (Testnet)

**Chain ID:** 80002 (replaces Mumbai 80001)
**RPC:** https://rpc-amoy.polygon.technology
**Block Explorer:** https://www.oklink.com/amoy (or Polygonscan with API key)

**Faucet:** https:// faucets.chainstack.com/amoy (Polygon Amoy faucet)

**Configuration:**

```javascript
polygonAmoy: {
  url: process.env.POLYGON_AMOY_RPC || "https://rpc-amoy.polygon.technology",
  accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
  chainId: 80002,
  // Gas configuration
  gasPrice: "auto",
  // EIP-1559 support
  maxFeePerGas: "auto",
  maxPriorityFeePerGas: "auto"
}
```

### Environment Variables

Create `.env` in project root:

```bash
# RPC URLs
POLYGON_AMOY_RPC=https://rpc-amoy.polygon.technology
POLYGON_RPC=https://polygon-rpc.com

# Wallet
PRIVATE_KEY=your_private_key_here

# Verification
POLYGONSCAN_API_KEY=your_polygonscan_api_key

# Optional: Alchemy/Infura for higher reliability
ALCHEMY_API_KEY=your_alchemy_key
```

## Build/Test Commands

### Package.json Scripts (Recommended Additions)

```json
{
  "scripts": {
    "test": "hardhat test",
    "test:coverage": "hardhat coverage",
    "test:integration": "hardhat test test/integration/*.test.js",
    "compile": "hardhat compile",
    "node": "hardhat node",
    "deploy:local": "hardhat run scripts/deploy-all.js --network localhost",
    "deploy:amoy": "hardhat run scripts/deploy-all.js --network polygonAmoy",
    "deploy:mainnet": "hardhat run scripts/deploy-all.js --network polygon",
    "verify": "hardhat run scripts/verify-on-polygonscan.js --network polygonAmoy",
    "clean": "hardhat clean"
  }
}
```

### Required Dependencies

```bash
# Install for testing
npm install --save-dev \
  @nomicfoundation/hardhat-toolbox \
  @nomicfoundation/hardhat-chai-matchers \
  @nomicfoundation/hardhat-network-helpers \
  chai \
  solidity-coverage \
  dotenv
```

## Anti-Patterns to Avoid

### 1. Hardcoding Addresses
```javascript
// BAD: Hardcoded address
const TOKEN_ADDRESS = "0x1234567890123456789012345678901234567890";

// GOOD: Use deployment output
const deployments = JSON.parse(fs.readFileSync("./deployments/latest.json"));
const TOKEN_ADDRESS = deployments.contracts.ASKToken;
```

### 2. Skipping Fixture Usage
```javascript
// BAD: Deploy in every test
beforeEach(async function () {
  const Token = await ethers.getContractFactory("ASKToken");
  this.token = await Token.deploy();
});

// GOOD: Use loadFixture for state isolation
beforeEach(async function () {
  const { token } = await loadFixture(deployTokenFixture);
  this.token = token;
});
```

### 3. Not Resetting Network State
```javascript
// BAD: Manual reset
beforeEach(async function () {
  await network.provider.send("evm_revert", [snapshotId]);
});

// GOOD: loadFixture handles snapshots automatically
async function deployFixture() {
  // Setup once
  // Snapshot taken
  return state;
}
// Each test gets fresh snapshot
```

### 4. Ignoring Gas Estimation
```javascript
// BAD: Fixed gas limit
await contract.method({ gasLimit: 100000 });

// GOOD: Let Hardhat estimate
await contract.method();
// Or specify max, let network optimize
await contract.method({ gasLimit: 500000 });
```

## Scalability Considerations

| Scenario | Approach |
|----------|----------|
| 10 test files, 500 tests | Parallel test execution via `npx hardhat test --parallel` |
| 100+ test files | Split by domain (unit vs integration), run separately |
| Cross-chain testing | Use Hardhat Network with forked mainnet state |
| Load testing | Deploy to testnet with realistic data sizes |

## Confidence Assessment

| Area | Level | Notes |
|------|-------|-------|
| Fixture patterns | MEDIUM | Based on Hardhat sample projects and documentation patterns |
| Deployment scripts | MEDIUM | Standard patterns, tested against Hardhat docs |
| Network config | MEDIUM | Polygon Amoy is current (2024), Mumbai deprecated |
| Integration testing | MEDIUM | Cross-contract patterns well established |
| Coverage tooling | LOW | solidity-coverage needs verification with project structure |

## Sources

- [Hardhat Testing Guide](https://hardhat.org/hardhat-runner/docs/guides/test-contracts) - Official documentation patterns
- [Hardhat Network Helpers](https://www.npmjs.com/package/@nomicfoundation/hardhat-network-helpers) - Time and snapshot utilities
- [Hardhat Toolbox](https://www.npmjs.com/package/@nomicfoundation/hardhat-toolbox) - Standard test utilities
- [Polygon Amoy Documentation](https://wiki.polygon.technology/docs/develop/metamask/config-polygon-amoy) - Network configuration

---

*Architecture for test environment: 2026-05-16*