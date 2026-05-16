# Domain Pitfalls: Hardhat Testing & Polygon Testnet Deployment

**Domain:** Smart Contract Testing & Deployment
**Project:** AgentSkills (Solidity + Hardhat + Polygon)
**Researched:** 2026-05-16
**Confidence:** HIGH (established patterns with known failure modes)

---

## Critical Pitfalls

Mistakes that cause rewrites, test failures, or deployment failures.

### Pitfall 1: Cross-Contract Dependency Initialization Order

**What goes wrong:** Tests fail with "cannot estimate gas" or "transaction reverted" because contract dependencies are deployed in wrong order.

**Why it happens:** Your contracts have circular-ish dependencies:
```
ASKToken → StakingManager → (needs token)
ASKToken → SkillRegistry → (needs token + stakingManager)
Attribution → StakingManager → (needs to be set separately)
```

SkillRegistry constructor takes `(token, stakingManager)` but StakingManager doesn't know SkillRegistry yet. Attribution needs `setStakingManager()` called after deployment.

**Consequences:**
- Contract interactions fail silently
- `stakingManager.getUserReputation()` returns incorrect values
- Reputation lock mechanism breaks

**Prevention:**
```javascript
// WRONG order for tests
const token = await deploy("ASKToken");
const staking = await deploy("StakingManager", [token.address]);
const registry = await deploy("SkillRegistry", [token.address, staking.address]);
// Attribution has no stakingManager!

// CORRECT order for tests
const token = await deploy("ASKToken");
const staking = await deploy("StakingManager", [token.address]);
const registry = await deploy("SkillRegistry", [token.address, staking.address]);
const attribution = await deploy("Attribution");
await attribution.setStakingManager(staking.address);  // Must be called!
```

**Detection:** Add integration test that calls `getUserReputation()` immediately after setup.

---

### Pitfall 2: Time Manipulation Not Affecting Mined Blocks

**What goes wrong:** Tests for `lockedUntil`, `claimRecoverableReputation`, monthly recovery fail because `evm_increaseTime` doesn't work as expected.

**Why it happens:** Hardhat's `evm_increaseTime` only affects subsequent transactions if they are mined in NEW blocks. All transactions in a single test might be in the same block.

**Consequences:**
- `unstake()` always says "Still locked" despite time advancement
- Recovery calculations fail (30 days haven't elapsed)
- Time-based logic appears broken

**Prevention:**
```javascript
// WRONG: Time advancement doesn't affect this tx
await staking.stake(skillId, amount);
await evm_increaseTime(90 days);
await staking.unstake(skillId);  // Still "Still locked"!

// CORRECT: Mine a new block after time advancement
await staking.stake(skillId, amount);
await evm_increaseTime(90 days);
await evm_mine();  // Force new block
await staking.unstake(skillId);  // Works!

// CORRECT for recovery (needs 30+ days)
await evm_increaseTime(31 * 24 * 60 * 60);
await evm_mine();  // Often missed - CRITICAL!
await staking.claimRecoverableReputation();
```

**Detection:** Write specific test for time-based unlock that asserts after each step.

---

### Pitfall 3: Mock Contract Stubs Don't Match Real ABI

**What goes wrong:** Tests pass locally but fail on testnet with "invalid selector" or "function not found" errors.

**Why it happens:** Mock contracts return wrong-sized responses or wrong encoding. Your contracts use:

```solidity
// SkillRegistry.sol expects this from StakingManager
function getUserReputation(address _user) external view returns (int256)

// But mock might return:
// - uint256 instead of int256
// - wrong bytes32 encoding
// - nothing (missing function)
```

**Consequences:**
- Integration tests pass (Hardhat network)
- Testnet deployment fails
- Real user transactions revert

**Prevention:**
```javascript
// BAD MOCK: Returns uint256 instead of int256
const badMock = {
  getUserReputation: async (addr) => 1000  // Wrong type!
};

// GOOD MOCK: Exact ABI match
const goodMock = {
  getUserReputation: async (addr) => {
    // Returns correctly encoded int256 (can be negative)
    return ethers.utils.defaultAbiCoder.encode(
      ['int256'],
      [1000]  // or [-500] for negative
    );
  }
};

// BETTER: Use deployed mock contract, not JS object
const MockStakingManager = await ethers.getContractFactory("MockStakingManager");
const mockStaking = await MockStakingManager.deploy();
await registry.setStakingManager(mockStaking.address);
```

**Detection:** Create mock contracts that exactly mirror real contract ABIs.

---

### Pitfall 4: Polygon Amoy RPC Rate Limits

**What goes wrong:** Deployment succeeds for first contract, then fails for subsequent ones with "429 Too Many Requests" or timeout errors.

**Why it happens:** Public RPC endpoints (maticvigil, polygon-rpc) have strict rate limits. Mumbai RPC is deprecated (use Amoy instead). Amoy has different endpoints.

**Consequences:**
- Incomplete deployment (some contracts missing)
- `deployments.json` has partial data
- Redeployment required with different addresses

**Prevention:**
```javascript
// hardhat.config.cjs - CORRECT for Amoy (replacing Mumbai)
networks: {
  polygonAmoy: {
    url: process.env.POLYGON_AMOY_RPC || "https://rpc-amoy.polygon.technology",
    accounts: [process.env.PRIVATE_KEY],
    chainId: 80002  // Amoy chainId
  }
}

// Environment variables needed:
POLYGON_AMOY_RPC=https://rpc-amoy.polygon.technology
PRIVATE_KEY=your_private_key  // Never commit!

// Alternative RPCs (rotate if rate limited):
// https://rpc.ankr.com/polygon_amoy
// https://polygon-amoy.blockpi.network/v1/rpc/xxx
```

**Detection:** Implement retry with exponential backoff in deployment script:

```javascript
async function deployWithRetry(artifact, args, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await deploy(artifact, args);
    } catch (e) {
      if (e.message.includes("429") && i < retries - 1) {
        await sleep(1000 * Math.pow(2, i));  // Backoff
        continue;
      }
      throw e;
    }
  }
}
```

---

### Pitfall 5: Snapshot Isolation Breaking State Between Tests

**What goes wrong:** Test 2 fails because Test 1 modified global state that persists.

**Why it happens:** Hardhat tests share state unless explicitly isolated. Your `hasLiked` mapping is global:

```solidity
// Attribution.sol - global state!
mapping(address => bool) public hasLiked;

// Test 1 sets user as having liked
await attribution.likeSkill(skillId, { from: user });

// Test 2 expects user can like again (but they can't!)
await attribution.likeSkill(skillId, { from: user });  // REVERTS!
```

**Consequences:**
- Tests pass individually, fail in sequence
- Flaky test suite
- Hard to reproduce failures

**Prevention:**
```javascript
// Use beforeEach/afterEach snapshots
const { expect } = require("chai");

describe("Attribution", function() {
  let attribution, staking, token, owner, user;

  beforeEach(async function() {
    // Deploy fresh contracts for each test
    token = await ethers.getContractFactory("ASKToken").deploy();
    staking = await ethers.getContractFactory("StakingManager").deploy(token.address);
    attribution = await ethers.getContractFactory("Attribution").deploy();
    await attribution.setStakingManager(staking.address);

    [owner, user] = await ethers.getSigners();
  });

  it("should allow user to like", async function() {
    // Clean state - user hasn't liked yet
    await attribution.likeSkill(1);
    expect(await attribution.hasLiked(user.address)).to.be.true;
  });

  it("should reject duplicate like", async function() {
    // Clean state for this test
    await attribution.likeSkill(1);
    await expect(attribution.likeSkill(1)).to.be.revertedWith("Already liked");
  });
});
```

**Detection:** Run tests in random order: `npm test -- --random`.

---

## Moderate Pitfalls

### Pitfall 6: Gas Estimation Fails on Complex Transactions

**What goes wrong:** `estimateGas()` throws but transaction would succeed. Particularly affects `claimRecoverableReputation()` with multiple state updates.

**Why it happens:** Gas estimation fails for transactions that will revert due to runtime conditions (not bytecode). Your recovery function has multiple require checks that pass in normal flow but estimation might fail with "execution reverted".

**Prevention:**
```javascript
// deployment script - handle estimation failure
async function deploy(artifact, args) {
  try {
    const factory = await ethers.getContractFactory(artifact);
    const contract = await factory.deploy(...args);
    return contract;
  } catch (e) {
    // Fallback to manual RPC deployment
    return await manualDeploy(artifact, args);
  }
}

// Test - explicitly set gas for complex functions
it("should claim recovery", async function() {
  const tx = await staking.claimRecoverableReputation({ gasLimit: 500000 });
  await tx.wait();
});
```

---

### Pitfall 7: Testnet Verification Mismatch

**What goes wrong:** Contract works in tests, verified on testnet shows different behavior than local.

**Why it happens:** Compiler optimization, different Solidity version, or missing constructor arguments.

**Prevention:**
```javascript
// hardhat.config.cjs - Match exact settings
solidity: {
  compilers: [{
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 }
    }
  }]
}

// Always verify after deployment
// npx hardhat verify --network polygonAmoy <address> <constructor args>
```

---

### Pitfall 8: Int vs Uint Encoding in Mock Responses

**What goes wrong:** `userReputation` in StakingManager is `int256`, but mock returns `uint256`. Negative values silently fail.

**Why it happens:** JavaScript doesn't have native int256. When mock returns positive number for a field that should be negative, subsequent checks fail silently.

**Prevention:**
```javascript
// Mock must return proper int256 encoding
// int256(-500) encoded: 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0c

// Test with negative case:
it("should handle negative reputation", async function() {
  // Manually set negative reputation via internal function
  await staking.setNegativeReputation(user.address, -500);
  const rep = await staking.getUserReputation(user.address);
  // Should return 0 (effective = -500 - locked(0) = -500, clamped to 0)
  expect(rep).to.equal(0);
});
```

---

## Minor Pitfalls

### Pitfall 9: Missing `onlyOwner` Test Coverage

**What goes wrong:** Admin functions work in tests but fail on testnet because test contract owner differs from expected.

**Why it happens:** Tests use first Hardhat account as owner via `Ownable`. Testnet deployment uses deployer's address, but might transfer ownership or call from wrong account.

**Prevention:**
```javascript
it("should only allow owner to slash", async function() {
  const [owner, attacker] = await ethers.getSigners();

  // Attacker tries to slash - should revert
  await expect(
    staking.connect(attacker).slash(user.address, skillId, amount)
  ).to.be.revertedWith("Ownable: caller is not the owner");
});
```

---

### Pitfall 10: Event Emission Not Tested

**What goes wrong:** Function executes but events not emitted. Downstream systems (indexers, frontends) break.

**Why it happens:** Easy to forget testing events, especially for edge cases.

**Prevention:**
```javascript
it("should emit RecoveryClaimed event", async function() {
  await staking.claimRecoverableReputation();

  await expect(tx)
    .to.emit(staking, "RecoveryClaimed")
    .withArgs(user.address, expectedAmount, remainingLocked);
});
```

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Unit tests | Mock ABI mismatch | Use deployed mock contracts, not JS stubs |
| Integration tests | Deployment order | Create `deployContracts()` fixture |
| Time-based tests | No new block mined | Always `evm_mine()` after `evm_increaseTime()` |
| Testnet deployment | RPC rate limits | Retry with backoff, use multiple RPCs |
| Cross-contract | State persistence | Use `beforeEach` snapshots |
| Reputation system | Negative values | Test int256 encoding, clamping to 0 |

---

## Research Sources

| Source | Confidence | Notes |
|--------|------------|-------|
| Hardhat Documentation | HIGH | Official behavior, verified |
| OpenZeppelin Test Helpers | MEDIUM | Common patterns, may be outdated |
| Stack Overflow / Ethereum Dev | MEDIUM | Community experience, verify |
| AgentSkills codebase | HIGH | Project-specific constraints |

**Key files referenced:**
- `contracts/StakingManager.sol` - lock/recovery logic
- `contracts/SkillRegistry.sol` - cross-contract dependencies
- `contracts/Attribution.sol` - stateful mappings
- `contracts/scripts/test.js` - manual testing approach
- `hardhat.config.cjs` - network configuration

---

## Recommendations

1. **Install test framework immediately:**
   ```bash
   npm install --save-dev chai @nomiclabs/hardhat-waffle
   ```

2. **Create `test/contracts/` directory with fixture helper:**
   ```javascript
   // test/fixtures.js - deployment fixture
   async function deployFullStack() {
     const Token = await ethers.getContractFactory("ASKToken");
     const token = await Token.deploy();

     const Staking = await ethers.getContractFactory("StakingManager");
     const staking = await Staking.deploy(token.address);

     const Registry = await ethers.getContractFactory("SkillRegistry");
     const registry = await Registry.deploy(token.address, staking.address);

     const Attribution = await ethers.getContractFactory("Attribution");
     const attribution = await Attribution.deploy();
     await attribution.setStakingManager(staking.address);

     return { token, staking, registry, attribution };
   }
   ```

3. **Update `hardhat.config.cjs` for Amoy:**
   ```javascript
   polygonAmoy: {
     url: process.env.POLYGON_AMOY_RPC || "https://rpc-amoy.polygon.technology",
     chainId: 80002
   }
   ```

4. **Test time-sensitive functions with explicit block mining:**
   ```javascript
   await evm_increaseTime(31 * 24 * 60 * 60);
   await evm_mine();  // CRITICAL - not just increaseTime
   ```

---

*Research complete: 2026-05-16*