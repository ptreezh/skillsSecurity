# Phase 14: SkillRegistry + Attribution Unit Tests - Research

**Researched:** 2026-05-17
**Domain:** Solidity smart contract testing (Hardhat + Chai)
**Confidence:** HIGH

## Summary

Phase 14 requires comprehensive unit tests for SkillRegistry and Attribution contracts. Key testing challenges include: (1) SkillRegistry requires tokens to be staked during registration - users need tokens and contract needs approval, (2) Reputation thresholds enforce different minimums based on risk level (500/2000/5000), (3) Attribution requires setStakingManager() call after deployment (already done in fixtures), (4) Cross-contract interactions between SkillRegistry/Attribution and StakingManager.

**Primary recommendation:** Use `deployContracts()` fixture from `test/fixtures.cjs` which handles deployment order and Attribution wiring. Focus tests on (a) reputation gate enforcement, (b) fingerprint consistency, (c) cross-contract notifications, (d) double-like prevention.

## User Constraints (from CONTEXT.md)

### Locked Decisions

| ID | Decision | Rationale |
|----|----------|-----------|
| D-01 | Two independent test files | SKIL vs ATTR concerns cleanly separated |
| D-02 | `test/contracts/SkillRegistry.test.cjs` | Follows Phase 12/13 naming convention |
| D-03 | `test/contracts/Attribution.test.cjs` | Follows Phase 12/13 naming convention |
| D-04 | Use `deployContracts` fixture | Ensures correct deployment order and Attribution wiring |
| D-05 | Chai expect assertion style | Phase 12/13 consistency |
| D-06 | BDD `describe/it` structure | Phase 12/13 consistency |

### SkillRegistry Test Structure

| ID | Coverage | Description |
|----|----------|-------------|
| D-08 | SKIL-01 | Register with L1-L5 reputation thresholds |
| D-09 | SKIL-02 | computeFingerprint consistency tests |
| D-10 | SKIL-03 | registerSkill -> verifySkill -> events flow |
| D-11 | SKIL-04 | getUserReputation integration with StakingManager |

### Attribution Test Structure

| ID | Coverage | Description |
|----|----------|-------------|
| D-12 | ATTR-01 | addContribution creates tracking |
| D-13 | ATTR-02 | likeSkill prevents double-like (hasLiked) |
| D-14 | ATTR-03 | Cross-contract notification setPositiveContribution |
| D-15 | ATTR-04 | setPositiveContribution triggers StakingManager |

### Cross-Contract Testing

| ID | Description |
|----|-------------|
| D-16 | SkillRegistry calls StakingManager.getUserReputation() |
| D-17 | Attribution calls StakingManager.setPositiveContribution() |
| D-18 | Attribution.setStakingManager() called in fixture (line 41) |

### Reputation Thresholds

| Risk Level | Register Threshold | Verify Threshold |
|------------|-------------------|------------------|
| LOW | 0 (no check) | 100 |
| MEDIUM | 500 | 500 |
| HIGH | 2000 | 1000 |
| CRITICAL | 5000 | 2000 |

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SKIL-01 | Test reputation tier gates (L1-L5 thresholds) | D-08, D-26: registerSkill enforces thresholds |
| SKIL-02 | Test fingerprint generation for skill verification | D-09: computeFingerprint uses keccak256 |
| SKIL-03 | Test skill verification request and approval flow | D-10: registerSkill -> verifySkill -> events |
| SKIL-04 | Test effective reputation checks | D-11, D-16: getUserReputation integration |
| ATTR-01 | Test contribution creation and tracking | D-12: addContribution stores in mapping |
| ATTR-02 | Test like mechanism with double-like prevention | D-13: hasLiked mapping check |
| ATTR-03 | Test cross-contract notification to StakingManager | D-14: setPositiveContribution call |
| ATTR-04 | Test positive contribution marking via setPositiveContribution() | D-15: addTestReport triggers on positive score |

## Standard Stack

### Core Testing Libraries
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| hardhat | ^2.28.6 | Testing framework | Required per project setup |
| chai | ^4.5.0 | Assertion library | Phase 12/13 convention |
| @nomicfoundation/hardhat-chai-matchers | ^2.1.2 | Chai matchers (revertedWith, emits) | Standard Hardhat testing |
| @nomicfoundation/hardhat-network-helpers | ^1.1.2 | Time manipulation (time, mine) | 90-day lock testing |
| ethers | ^6.16.0 | Contract interaction | Hardhat default |

### Test Infrastructure
| Component | Path | Purpose |
|-----------|------|---------|
| Fixture | `test/fixtures.cjs` | deployContracts() handles correct deployment order |
| ASKToken tests | `test/contracts/ASKToken.test.cjs` | Phase 12 pattern reference |
| StakingManager tests | `test/contracts/StakingManager.test.cjs` | Phase 13 pattern reference |

## Architecture Patterns

### Test Structure (following Phase 12/13)

```javascript
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deployContracts } = require("../fixtures.cjs");

describe("SkillRegistry", function() {
  const fixture = deployContracts;

  async function deploy() {
    const { token, staking, registry, attribution, owner, user1, user2, accounts } =
      await loadFixture(fixture);
    return { token, staking, registry, attribution, owner, user1, user2, accounts };
  }

  describe("registerSkill", function() {
    it("should register LOW risk skill without reputation check", async function() {
      const { token, registry, owner, user1 } = await deploy();
      // Setup: user1 needs tokens for staking
      await token.transfer(user1, ethers.parseEther("100"));
      await token.connect(user1).approve(registry.target, ethers.parseEther("100"));
      // Register should succeed
    });
  });
});
```

### Key Test Patterns

**1. Token Setup for Staking (Critical)**
```javascript
// User needs tokens AND contract needs approval
await token.transfer(user1, ethers.parseEther("100"));
await token.connect(user1).approve(registry.target, ethers.parseEther("100"));
await registry.connect(user1).registerSkill(name, desc, trigger, ipfs, RiskLevel.LOW, "v1.0");
```

**2. Reputation Setup via StakingManager**
```javascript
// To give user reputation: use slashLiker with positive penalty
await staking.slashLiker(user1.address, 500, "Test reputation"); // +500 reputation

// Verify effective reputation
const effective = await staking.getUserReputation(user1.address);
expect(effective).to.equal(500);
```

**3. Time-based Unlock Testing (for verifySkill lock scenarios if any)**
```javascript
const { time, mine } = require("@nomicfoundation/hardhat-network-helpers");
await time.increase(90 * 24 * 60 * 60 + 1);
await mine();
```

**4. Event Assertion Pattern**
```javascript
await expect(tx)
  .to.emit(registry, "SkillRegistered")
  .withArgs(user1.address, 0, "TestSkill");

await expect(tx)
  .to.emit(registry, "FingerprintGenerated")
  .withArgs(0, expectedFingerprint);
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Deployment ordering | Custom deploy script | `deployContracts()` from fixtures.cjs | Handles ASKToken -> StakingManager -> SkillRegistry -> Attribution correctly |
| Attribution wiring | Manual setStakingManager calls | Already done in fixture (line 41) | Prevents "stakingManager not set" errors |
| Time manipulation | Manual evm_increaseTime | `hardhat-network-helpers` time + mine | Consistent with Phase 13 tests |
| Reputation setup | Direct state manipulation | `staking.slashLiker()` | Proper integration test, tests cross-contract flow |

## Common Pitfalls

### Pitfall 1: Token Approval Missing (BLOCKING)
**What goes wrong:** registerSkill reverts with "Stake failed" because user has no tokens or contract not approved.

**Root cause:** SkillRegistry.registerSkill calls `token.transferFrom(msg.sender, address(this), stakeAmount)` which requires:
1. User has sufficient token balance
2. User has approved registry to spend tokens

**How to avoid:** Always setup tokens and approval before registerSkill:
```javascript
await token.transfer(user1, ethers.parseEther("200")); // Sufficient for all risk levels
await token.connect(user1).approve(registry.target, ethers.parseEther("200"));
```

### Pitfall 2: Attribution.stakingManager is address(0)
**What goes wrong:** Cross-contract calls to StakingManager fail silently or revert.

**Root cause:** Attribution constructor takes no arguments. setStakingManager() must be called after deployment.

**How to avoid:** Use `deployContracts()` fixture - line 41 calls `await attribution.setStakingManager(staking)`.

### Pitfall 3: Reputation Threshold Confusion
**What goes wrong:** Test expects HIGH skill to require 1000 reputation, but getUserReputation returns lower value.

**Root cause:** Confusing register thresholds (D-23, D-24, D-25) with verify thresholds (D-26). Different requirements!

**Register thresholds:** MEDIUM=500, HIGH=2000, CRITICAL=5000
**Verify thresholds:** LOW=100, MEDIUM=500, HIGH=1000, CRITICAL=2000

**How to avoid:** Set up exact reputation values and document which threshold being tested.

### Pitfall 4: Effective Reputation vs Total Reputation
**What goes wrong:** User has 1000 total reputation but 900 effective (100 locked). HIGH skill requires 2000 effective but test only gives 2000 total.

**Root cause:** getUserReputation returns `userReputation - lockedAmount`, not raw userReputation.

**How to avoid:** Use slashLiker with positive penalty to increase reputation without locking:
```javascript
await staking.slashLiker(user.address, +500, "Test"); // Directly adds to userReputation
```

## Code Examples

### SkillRegistry Tests

**SKIL-01: Reputation Tier Gates**
```javascript
describe("registerSkill - Reputation Thresholds", function() {
  it("should revert MEDIUM skill when effective reputation < 500", async function() {
    const { token, registry, user1 } = await deploy();
    // user1 has 0 reputation
    await token.transfer(user1, ethers.parseEther("100"));
    await token.connect(user1).approve(registry.target, ethers.parseEther("100"));
    await expect(
      registry.connect(user1).registerSkill("Test", "", "", "", 1, "v1") // MEDIUM=1
    ).to.be.revertedWith("Insufficient effective reputation for MEDIUM skill");
  });

  it("should register MEDIUM skill when effective reputation >= 500", async function() {
    const { token, staking, registry, user1 } = await deploy();
    // Give user 500 reputation (positive penalty)
    await staking.slashLiker(user1.address, 500, "Test reputation");
    await token.transfer(user1, ethers.parseEther("100"));
    await token.connect(user1).approve(registry.target, ethers.parseEther("100"));
    await expect(
      registry.connect(user1).registerSkill("Test", "", "", "", 1, "v1") // MEDIUM=1
    ).to.emit(registry, "SkillRegistered");
  });
});
```

**SKIL-02: Fingerprint Consistency**
```javascript
describe("computeFingerprint", function() {
  it("should generate consistent fingerprint for same inputs", async function() {
    const { registry } = await deploy();
    const ipfsHash = "QmTest123";
    const creator = "0x123...";
    const timestamp = 1234567890;

    const fp1 = await registry.computeFingerprint(ipfsHash, creator, timestamp);
    const fp2 = await registry.computeFingerprint(ipfsHash, creator, timestamp);

    expect(fp1).to.equal(fp2);
  });

  it("should generate different fingerprint for different inputs", async function() {
    const { registry } = await deploy();
    const fp1 = await registry.computeFingerprint("QmA", "0x123", 1000);
    const fp2 = await registry.computeFingerprint("QmB", "0x123", 1000);

    expect(fp1).to.not.equal(fp2);
  });

  it("should match fingerprint stored during registration", async function() {
    const { token, registry, user1 } = await deploy();
    await token.transfer(user1, ethers.parseEther("100"));
    await token.connect(user1).approve(registry.target, ethers.parseEther("100"));

    const ipfsHash = "QmTestHash";
    const tx = await registry.connect(user1).registerSkill(
      "Skill", "desc", "trigger", ipfsHash, 0, "v1"
    );
    const receipt = await tx.wait();
    const blockTimestamp = (await receipt.block).timestamp;

    // Compute expected fingerprint
    const expectedFp = await registry.computeFingerprint(
      ipfsHash, user1.address, blockTimestamp
    );

    // Verify stored fingerprint
    const storedFp = await registry.getFingerprint(0);
    expect(storedFp).to.equal(expectedFp);
  });
});
```

**SKIL-03: Verification Flow**
```javascript
describe("verifySkill", function() {
  it("should verify skill and emit SkillVerified event", async function() {
    const { token, staking, registry, owner, user1, user2 } = await deploy();
    // Setup: register skill first (needs token approval)
    await token.transfer(user1, ethers.parseEther("100"));
    await token.connect(user1).approve(registry.target, ethers.parseEther("100"));
    await registry.connect(user1).registerSkill("Test", "", "", "", 0, "v1");

    // Give user2 enough reputation to verify (LOW=100)
    await staking.slashLiker(user2.address, 100, "Test");

    await expect(registry.connect(user2).verifySkill(0, true))
      .to.emit(registry, "SkillVerified")
      .withArgs(user2.address, 0);
  });

  it("should call setPositiveContribution on successful verification", async function() {
    const { token, staking, registry, owner, user1, user2 } = await deploy();
    await token.transfer(user1, ethers.parseEther("100"));
    await token.connect(user1).approve(registry.target, ethers.parseEther("100"));
    await registry.connect(user1).registerSkill("Test", "", "", "", 0, "v1");

    await staking.slashLiker(user2.address, 100, "Test");

    // Should trigger PositiveContributionSet event from StakingManager
    await expect(registry.connect(user2).verifySkill(0, true))
      .to.emit(staking, "PositiveContributionSet")
      .withArgs(user2.address);
  });

  it("should revert when verifier has insufficient reputation", async function() {
    const { token, staking, registry, user1, user2 } = await deploy();
    await token.transfer(user1, ethers.parseEther("100"));
    await token.connect(user1).approve(registry.target, ethers.parseEther("100"));
    await registry.connect(user1).registerSkill("Test", "", "", "", 0, "v1");

    // user2 has 0 reputation (< 100 required for LOW)
    await expect(
      registry.connect(user2).verifySkill(0, true)
    ).to.be.revertedWith("Insufficient effective reputation");
  });
});
```

### Attribution Tests

**ATTR-01: addContribution**
```javascript
describe("addContribution", function() {
  it("should add contribution and emit event", async function() {
    const { attribution, owner, user1 } = await deploy();
    // ContributionType: GENESIS=0, FORK=1, AUDIT=2, BUGFIX=3, TRANSLATION=4
    await expect(
      attribution.addContribution(0, user1.address, 7000, 0, "QmTest")
    ).to.emit(attribution, "ContributionAdded"); // If event exists
  });

  it("should track contribution in skillContributions mapping", async function() {
    const { attribution, owner, user1 } = await deploy();
    await attribution.addContribution(0, user1.address, 5000, 0, "QmA");

    const contributions = await attribution.skillContributions(0);
    expect(contributions.length).to.equal(1);
    expect(contributions[0].contributor).to.equal(user1.address);
    expect(contributions[0].share).to.equal(5000); // 50%
  });

  it("should revert when non-owner tries to add", async function() {
    const { attribution, user1, user2 } = await deploy();
    await expect(
      attribution.connect(user1).addContribution(0, user2.address, 5000, 0, "Qm")
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});
```

**ATTR-02: likeSkill Double-Like Prevention**
```javascript
describe("likeSkill", function() {
  it("should record like and emit SkillLiked event", async function() {
    const { staking, attribution, user1 } = await deploy();
    // Give user reputation (minimum 0 required per code)
    await staking.slashLiker(user1.address, 10, "Test");

    await expect(attribution.connect(user1).likeSkill(1))
      .to.emit(attribution, "SkillLiked")
      .withArgs(user1.address, 1);
  });

  it("should prevent double-liking same skill", async function() {
    const { staking, attribution, user1 } = await deploy();
    await staking.slashLiker(user1.address, 10, "Test");

    await attribution.connect(user1).likeSkill(1);

    await expect(
      attribution.connect(user1).likeSkill(1)
    ).to.be.revertedWith("Already liked");
  });

  it("should allow liking different skills", async function() {
    const { staking, attribution, user1 } = await deploy();
    await staking.slashLiker(user1.address, 10, "Test");

    await attribution.connect(user1).likeSkill(1);
    await attribution.connect(user1).likeSkill(2); // Different skill

    const likes2 = await attribution.skillLikes(2);
    expect(likes2.length).to.equal(1);
  });
});
```

**ATTR-03/ATTR-04: Cross-Contract Notification**
```javascript
describe("Cross-Contract Integration", function() {
  it("should trigger setPositiveContribution on positive test report", async function() {
    const { staking, attribution, owner, user1 } = await deploy();

    // addTestReport with positive score
    await expect(
      attribution.addTestReport(0, user1.address, 3, 10) // positive score
    ).to.emit(staking, "PositiveContributionSet")
      .withArgs(user1.address);
  });

  it("should NOT trigger setPositiveContribution on negative score", async function() {
    const { staking, attribution, owner, user1 } = await deploy();

    // Negative score - no notification
    await attribution.addTestReport(0, user1.address, 1, -5);

    expect(await staking.hasPositiveContribution(user1.address)).to.be.false;
  });

  it("should update hasPositiveContribution mapping", async function() {
    const { staking, attribution, owner, user1 } = await deploy();

    await attribution.addTestReport(0, user1.address, 5, 20);

    expect(await staking.hasPositiveContribution(user1.address)).to.be.true;
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual deployment scripts | `deployContracts()` fixture | Phase 11 | Ensures correct dependency order |
| Hard-coded time advancement | `hardhat-network-helpers` time + mine | Phase 13 | Cleaner, more reliable tests |
| Direct state manipulation | Cross-contract integration via slashLiker | Phase 13 | More realistic integration tests |

**Current testing best practices:**
- Use `loadFixture` for snapshot isolation
- Use `loadFixture` in beforeEach for state isolation
- Chai expect for assertions (Phase 12/13 convention)
- Test events with `.to.emit().withArgs()`

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Attribution emits "ContributionAdded" event | ATTR-01 code examples | Event name may differ — need to verify contract |
| A2 | StakingManager.setPositiveContribution is onlyOwner | ATTR-04 verification | Requires owner call — verify in StakingManager |
| A3 | SkillRegistry.verifySkill triggers StakingManager.setPositiveContribution | SKIL-04 integration | Cross-contract call verified in contract code |

**If this table is empty:** All claims in this research were verified or cited - no user confirmation needed.

## Open Questions

1. **Event name for contributions**
   - What we know: Attribution has addContribution but checking if it emits event
   - What's unclear: Contract code shows no explicit emit for addContribution
   - Recommendation: Verify in contract and add test accordingly

2. **Attribution.getUserReputation integration**
   - What we know: Delegates to StakingManager.getUserReputation
   - What's unclear: Need tests for this delegation
   - Recommendation: Add tests similar to SKIL-04 pattern

3. **slashLiker called on zero StakingManager**
   - What we know: slashLiker checks `if (address(stakingManager) != address(0))`
   - What's unclear: Test behavior when stakingManager not set (though fixture sets it)
   - Recommendation: Document for completeness but fixture handles wiring

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Running tests | ✓ | v20+ | N/A |
| npm | Package install | ✓ | 10+ | N/A |
| Hardhat | Test execution | ✓ | 2.28.6 | N/A |
| chai | Assertions | ✓ | 4.5.0 | N/A |
| hardhat-network-helpers | Time manipulation | ✓ | 1.1.2 | N/A |

**All dependencies available:** No fallback strategies needed.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Mocha + Chai (via Hardhat) |
| Config file | hardhat.config.js |
| Quick run command | `npx hardhat test test/contracts/SkillRegistry.test.cjs` |
| Full suite command | `npx hardhat test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SKIL-01 | Reputation tier gates (L1-L5) enforce correctly | Unit | `npx hardhat test test/contracts/SkillRegistry.test.cjs --grep "reputation"` | Need create |
| SKIL-02 | Fingerprint generation produces consistent hashes | Unit | `npx hardhat test test/contracts/SkillRegistry.test.cjs --grep "Fingerprint"` | Need create |
| SKIL-03 | Skill verification request -> approval flow completes | Integration | `npx hardhat test test/contracts/SkillRegistry.test.cjs --grep "verifySkill"` | Need create |
| SKIL-04 | getUserReputation integration with StakingManager | Unit | `npx hardhat test test/contracts/SkillRegistry.test.cjs --grep "effective reputation"` | Need create |
| ATTR-01 | Attribution creation tracks contributor and value | Unit | `npx hardhat test test/contracts/Attribution.test.cjs --grep "addContribution"` | Need create |
| ATTR-02 | Like mechanism prevents double-liking | Unit | `npx hardhat test test/contracts/Attribution.test.cjs --grep "likeSkill"` | Need create |
| ATTR-03 | Cross-contract notification triggers StakingManager | Integration | `npx hardhat test test/contracts/Attribution.test.cjs --grep "PositiveContribution"` | Need create |
| ATTR-04 | setPositiveContribution marks contribution | Unit | `npx hardhat test test/contracts/Attribution.test.cjs --grep "setPositiveContribution"` | Need create |

### Sampling Rate
- **Per task commit:** `npx hardhat test test/contracts/SkillRegistry.test.cjs && npx hardhat test test/contracts/Attribution.test.cjs`
- **Per wave merge:** `npx hardhat test`
- **Phase gate:** All tests green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `test/contracts/SkillRegistry.test.cjs` — SKIL-01 ~ SKIL-04 coverage
- [ ] `test/contracts/Attribution.test.cjs` — ATTR-01 ~ ATTR-04 coverage
- [ ] Framework install: Already complete (Phase 11)
- [ ] `test/conftest.py` — N/A (JavaScript project)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | Ownable access control (onlyOwner modifier) |
| V4 Access Control | Yes | Function-level onlyOwner checks |
| V5 Input Validation | Yes | Solidity require statements in contracts |

### Known Threat Patterns for Solidity Contracts

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Reentrancy on token transfers | Tampering | Checks-Effects-Interactions pattern used in contracts |
| Cross-contract call failure | Denial | Explicit zero address checks before calls |
| Integer overflow | Information Disclosure | Solidity 0.8.x built-in checked math |
| Access control bypass | Spoofing | onlyOwner modifier on all admin functions |

## Sources

### Primary (HIGH confidence)
- `contracts/SkillRegistry.sol` - Contract under test, lines 1-173
- `contracts/Attribution.sol` - Contract under test, lines 1-169
- `contracts/StakingManager.sol` - Integration partner, lines 1-208
- `test/fixtures.cjs` - Test infrastructure, lines 1-53
- `test/contracts/StakingManager.test.cjs` - Phase 13 test patterns, lines 1-462

### Secondary (MEDIUM confidence)
- `test/contracts/ASKToken.test.cjs` - Phase 12 test patterns (reference)
- `.planning/phases/14-skill-attribution-tests/14-CONTEXT.md` - Phase decisions
- `.planning/REQUIREMENTS.md` - SKIL and ATTR requirement definitions

### Tertiary (LOW confidence)
- Hardhat documentation (version should be verified against package.json)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified in package.json
- Architecture: HIGH - Patterns directly from Phase 12/13
- Pitfalls: HIGH - Based on actual contract code analysis

**Research date:** 2026-05-17
**Valid until:** 2026-06-17 (30 days for stable project)

---

*Phase: 14-skill-attribution-tests*
*Research complete: 2026-05-17*