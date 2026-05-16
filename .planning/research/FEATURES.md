# Feature Landscape: Smart Contract Testing

**Domain:** Solidity smart contract testing with Hardhat
**Researched:** 2026-05-16
**Confidence:** HIGH (based on established patterns, OpenZeppelin testing guides, and Hardhat documentation)

## Executive Summary

Smart contract testing is critical for security-critical code deployed on-chain. Unlike traditional software, contracts are immutable once deployed and vulnerabilities can result in permanent fund loss. A comprehensive testing strategy combines unit tests for individual contract logic, integration tests for cross-contract interactions, and invariant tests to verify system-wide properties.

This project has 4 contracts with interconnected dependencies (ASKToken, StakingManager, SkillRegistry, Attribution) requiring both isolated unit tests and integration tests that verify cross-contract behavior, especially around the reputation system, staking mechanics, and anti-slash mechanisms.

## Table Stakes

Core test categories expected for any production Solidity project.

### Unit Tests (Per Contract)

| Test Category | Coverage Target | Why Expected |
|--------------|-----------------|--------------|
| Function revert conditions | 100% | Prevent unauthorized state changes |
| State transitions | 100% | Ensure valid lifecycle transitions |
| Event emissions | 100% | Enable off-chain monitoring |
| Access control | 100% | Ownership and role verification |
| Arithmetic overflow/underflow | 100% | Solidity 0.8+ handles this, but boundary tests still valuable |
| Parameter bounds | 100% | Edge case validation |

### Integration Tests (Cross-Contract)

| Test Category | Purpose | Complexity |
|--------------|---------|------------|
| Deployment order | Verify contracts initialize correctly with dependencies | Low |
| Cross-contract calls | Verify StakingManager <-> contracts work together | Medium |
| State synchronization | Verify reputation changes propagate correctly | Medium |
| Event correlation | Verify events fire across contract boundaries | Low |

### Test Framework Requirements

| Requirement | Standard | Notes |
|-------------|----------|-------|
| Test runner | Hardhat Test Runner | Built-in, uses Mocha |
| Assertion library | chai + hardhat-chai-matchers | Enable contract-specific assertions |
| Fixture system | Hardhat Fixtures | Shared state across tests |
| Mocking | Solidity interfaces + caller contracts | For isolated contract testing |

## Contract-Specific Test Scenarios

### ASKToken Tests

**Unit test scenarios:**
```
- Deployment: owner receives MAX_SUPPLY tokens
- Mint: owner can mint up to MAX_SUPPLY, reverts beyond
- Burn: any holder can burn their tokens
- Delegate: votes transfer correctly to delegatee
- Balance checks: getVotes returns correct value
```

**Key assertions:**
- Total supply never exceeds MAX_SUPPLY
- Token decimals handled correctly (18)
- Events: Transfer, Mint, Approval emitted correctly

### SkillRegistry Tests

**Unit test scenarios:**
```
- registerSkill: creates skill with correct stake amount per RiskLevel
- registerSkill: reverts if name taken
- registerSkill: applies correct MIN_STAKE based on RiskLevel
- verifySkill: updates verifiedSkills mapping
- verifySkill: reverts if insufficient effective reputation
- slashSkill: reduces stakeAmount, handles overflow
- computeFingerprint: deterministic fingerprint generation
- getFingerprint: returns correct fingerprint for skill
```

**RiskLevel stake requirements:**
| RiskLevel | Stake Amount |
|-----------|-------------|
| LOW | 10 ether |
| MEDIUM | 50 ether |
| HIGH | 100 ether |
| CRITICAL | 200 ether |

**Key assertions:**
- Reputation gates enforced per risk level (500/2000/5000 thresholds)
- Positive contribution set when verification passes
- Fingerprint includes IPFS hash, creator, timestamp

### StakingManager Tests

**Unit test scenarios:**
```
- stake: creates stake, locks for 90 days
- stake: reverts if already slashed
- unstake: releases tokens after lock period
- unstake: reverts if still locked or no stake
- slash: reduces stake, sends 25% to reporter
- slashLiker: creates ReputationLock, updates userReputation
- getUserReputation: returns effective (total - locked)
- getRecoverableReputation: returns lockedAmount and lastClaimTime
- claimRecoverableReputation: recovers 5% per month
- claimRecoverableReputation: reverts without positive contribution
- claimRecoverableReputation: reverts if < 1 month elapsed
- setPositiveContribution: marks user as having contributed
```

**Anti-slash (Reputation Lock) scenarios:**
```
- Initial slash: lockedAmount = penalty, lastClaimTime = now
- Subsequent slash: lockedAmount accumulates
- Claim recovery: reduces lockedAmount, updates lastClaimTime
- Recovery calculation: based on originalSlashAmount (not remaining)
- Effective reputation: excludes locked amount from voting power
```

**Key assertions:**
- 5% monthly recovery rate (500 basis points)
- Recovery based on originalSlashAmount, not remaining lockedAmount
- hasPositiveContribution resets after claim
- getUserReputation returns max(0, total - locked)

### Attribution Tests

**Unit test scenarios:**
```
- addContribution: records contribution with correct share
- validateSplit: returns true if shares sum to 10000
- addTestReport: records report, sets positive contribution if score > 0
- likeSkill: records like, prevents duplicate likes
- likeSkill: reverts if already liked
- calculateSplit: distributes amount by share percentages
- slashLiker: delegates to StakingManager
- getUserReputation: delegates to StakingManager
```

**Cross-contract scenarios:**
```
- setStakingManager: allows setting StakingManager address
- Positive contribution notification: testReport.score > 0 triggers setPositiveContribution
```

**Key assertions:**
- Test report score > 0 triggers positive contribution
- Duplicate likes prevented by hasLiked mapping
- Shares validated as basis points (10000 = 100%)

### Integration Test Scenarios

**Reputation flow:**
```
1. User registers skill -> reputation check passes
2. User receives positive contribution -> hasPositiveContribution = true
3. User's skill gets verified -> setPositiveContribution called
4. User claims recoverable reputation -> lockedAmount reduces
5. User registers higher-risk skill -> effective reputation check
```

**Anti-slash flow:**
```
1. User likes a skill
2. Skill is later slashed (proves it was harmful)
3. User's like triggers slashLiker
4. User's reputation locked, effective reputation drops
5. User cannot register high-risk skills until recovered
6. User makes positive contribution
7. User claims recovery after 1 month
8. User's effective reputation restored
```

**Staking integration:**
```
1. User stakes tokens for a skill
2. Skill is verified (positive contribution set)
3. User unstakes after 90 days
4. Or: Skill is slashed, stake reduced
```

## Mocking Patterns

### Why Mock External Contracts

Isolation is critical. When testing SkillRegistry, you should not need a real StakingManager. Mock it to:
- Control behavior deterministically
- Avoid deploying full contract stack
- Test edge cases not easily reproducible with real contracts

### Mock Pattern: StakingManager Interface

```solidity
// contracts/mocks/MockStakingManager.sol
interface IStakingManager {
    function getUserReputation(address user) external view returns (int256);
    function setPositiveContribution(address user) external;
    function slashLiker(address user, int256 penalty, string memory reason) external;
}

contract MockStakingManager {
    mapping(address => int256) public reputation;
    mapping(address => bool) public positiveContributions;

    function setUserReputation(address user, int256 rep) external {
        reputation[user] = rep;
    }

    function getUserReputation(address user) external view returns (int256) {
        return reputation[user];
    }

    function setPositiveContribution(address user) external {
        positiveContributions[user] = true;
    }
}
```

### When to Use Mocks vs Real Contracts

| Scenario | Use Mock | Use Real |
|----------|----------|----------|
| Testing SkillRegistry.registerSkill reputation checks | Yes | - |
| Testing full reputation recovery flow | - | Yes |
| Testing edge cases in arithmetic | Yes | - |
| Testing event correlation | - | Yes |
| CI/CD fast tests | Yes | - |
| Pre-deployment integration test | - | Yes |

## Fixture Patterns

### Shared Fixture Structure

```typescript
// test/fixtures.ts
import { ethers } from "hardhat";
import type { ASKToken, SkillRegistry, StakingManager, Attribution } from "../typechain-types";

export interface TestContracts {
  token: ASKToken;
  stakingManager: StakingManager;
  skillRegistry: SkillRegistry;
  attribution: Attribution;
}

export async function deployFullSuite(): Promise<TestContracts> {
  const [owner, user1, user2, ...rest] = await ethers.getSigners();

  // Deploy token first
  const Token = await ethers.getContractFactory("ASKToken");
  const token = await Token.deploy();

  // Deploy StakingManager
  const StakingManager = await ethers.getContractFactory("StakingManager");
  const stakingManager = await StakingManager.deploy(token.getAddress());

  // Deploy SkillRegistry with dependencies
  const SkillRegistry = await ethers.getContractFactory("SkillRegistry");
  const skillRegistry = await SkillRegistry.deploy(
    token.getAddress(),
    stakingManager.getAddress()
  );

  // Deploy Attribution
  const Attribution = await ethers.getContractFactory("Attribution");
  const attribution = await Attribution.deploy();

  // Set StakingManager on Attribution
  await attribution.setStakingManager(stakingManager.getAddress());

  return { token, stakingManager, skillRegistry, attribution };
}

export async function loadFixture(deployer: any) {
  return deployFullSuite();
}
```

### Per-Contract Fixtures

```typescript
// test/ASKToken.fixture.ts
import { ethers } from "hardhat";

export async function deployTokenFixture() {
  const [owner, user1, user2] = await ethers.getSigners();

  const Token = await ethers.getContractFactory("ASKToken");
  const token = await Token.deploy();

  return { token, owner, user1, user2 };
}
```

## Test Structure Convention

```
test/
  ASKToken/
    ASKToken.unit.test.ts      # All unit tests for ASKToken
    ASKToken.behavior.test.ts   # Shared behavior tests (for inheritance)
  StakingManager/
    StakingManager.unit.test.ts
    StakingManager.reputation.test.ts
    StakingManager.antiSlash.test.ts
  SkillRegistry/
    SkillRegistry.unit.test.ts
    SkillRegistry.reputation-gates.test.ts
  Attribution/
    Attribution.unit.test.ts
    Attribution.cross-contract.test.ts
  integration/
    full-suite.test.ts          # All contracts working together
    reputation-flow.test.ts
    anti-slash-flow.test.ts
```

## Coverage Targets

| Category | Target | Rationale |
|----------|--------|-----------|
| Functions | 100% | Every function must execute in tests |
| Branches | 95% | Every conditional path covered |
| Statements | 95% | Maximum practical coverage |
| Lines | 90% | Some unreachable code acceptable |

**Critical functions requiring 100% coverage:**
- Any function modifying state (stake, unstake, slash, register, verify)
- Access control checks (onlyOwner, require statements)
- Arithmetic operations (especially with decimals)
- Cross-contract calls

## Anti-Patterns to Avoid

| Anti-Pattern | Why Bad | Correct Approach |
|--------------|---------|------------------|
| Testing implementation details | Fragile tests break on refactor | Test behavior, not internals |
| No revert testing | Missing error path validation | Explicitly test require/revert conditions |
| Skipping event assertions | Events are the API for off-chain clients | Assert all events with correct args |
| Hardcoded values without constants | Magic numbers obscure intent | Use named constants from contracts |
| No time-dependent tests | Staking locks are time-based | Use Hardhat evm_increaseTime |
| Testing in isolation when integration matters | Reputation checks span contracts | Integration tests for cross-contract flows |

## Time-Dependent Testing

StakingManager uses time locks (90 days). Use Hardhat time manipulation:

```typescript
import { ethers, network } from "hardhat";

describe("StakingManager", function () {
  describe("unstake", function () {
    it("should unstake after lock period", async function () {
      const { stakingManager, token, user } = await loadFixture();

      // Stake tokens
      await stakingManager.connect(user).stake(skillId, amount);

      // Fast forward 90 days
      await network.provider.send("evm_increaseTime", [90 * 24 * 60 * 60]);
      await network.provider.send("evm_mine");

      // Now unstake should work
      await expect(stakingManager.connect(user).unstake(skillId))
        .to.emit(stakingManager, "Unstaked");
    });

    it("should revert before lock period ends", async function () {
      const { stakingManager, user } = await loadFixture();

      await stakingManager.connect(user).stake(skillId, amount);

      // Only 89 days passed
      await network.provider.send("evm_increaseTime", [89 * 24 * 60 * 60]);
      await network.provider.send("evm_mine");

      await expect(stakingManager.connect(user).unstake(skillId))
        .to.be.revertedWith("Still locked");
    });
  });
});
```

## Event Testing Pattern

```typescript
it("should emit SkillRegistered with correct args", async function () {
  const { skillRegistry, token, user } = await loadFixture();

  await expect(
    skillRegistry.connect(user).registerSkill(
      "TestSkill",
      "Description",
      "trigger",
      "ipfs://Qm...",
      0, // RiskLevel.LOW
      "1.0.0"
    )
  )
    .to.emit(skillRegistry, "SkillRegistered")
    .withArgs(user.address, 0, "TestSkill");
});
```

## Sources

- [Hardhat Testing Guide](https://hardhat.org/tutorial/testing-contracts) - Primary testing documentation
- [OpenZeppelin Test Environment](https://docs.openzeppelin.com/learn/developing-smart-contracts) - Best practices for Solidity testing
- [Chai Matchers for Hardhat](https://hardhat.org/hardhat-chai-matchers/docs/overview) - Contract-specific assertions
- [Waffle Testing Patterns](https://ethereum-waffle.readthedocs.io/en/latest/) - Alternative patterns for reference