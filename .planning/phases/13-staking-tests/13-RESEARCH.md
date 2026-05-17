# Phase 13: StakingManager 单元测试 - Research

**Researched:** 2026-05-17
**Domain:** Solidity smart contract testing / StakingManager
**Confidence:** HIGH

## Summary

Phase 13 covers complete unit test coverage for the StakingManager contract. The contract implements staking with 90-day lock periods, slash mechanism with reporter rewards, reputation lock/recovery with anti-slash (anti-frack) mechanism, and time-based unlock via evm manipulation. Testing requires `@nomicfoundation/hardhat-network-helpers` for time manipulation and follows established patterns from Phase 12 (ASKToken.test.cjs).

**Primary recommendation:** Use `loadFixture` with `deployContracts` fixture, Chai expect assertions, and `time/increase()` + `mine()` from hardhat-network-helpers for time-based tests.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 模块化结构 — 每个功能区域一个独立 describe 块
- **D-02:** 文件位置：`test/contracts/StakingManager.test.cjs`
- **D-03:** 使用 `deployContracts` fixture from `test/fixtures.cjs`
- **D-04:** Chai expect 断言风格
- **D-05:** BDD `describe/it` 描述结构
- **D-06:** 与 Phase 12 ASKToken 测试保持风格一致
- **D-07:** STAK-01: Stake/Unstake 测试 + lock period revert + no stake revert
- **D-08:** STAK-02: Slash 测试 + insufficient stake revert
- **D-09:** STAK-03: Reputation lock 测试 + getUserReputation 验证
- **D-10:** STAK-04: Recovery 测试 + getRecoverableReputation/claimRecoverableReputation
- **D-11:** STAK-05: 时间测试 — evm_increaseTime + evm_mine 验证 90 天 unlock
- **D-12:** 标准覆盖 — 所有功能测试，边界值验证
- **D-13:** Access control 测试 — onlyOwner modifier 验证
- **D-14:** Event 测试 — Staked, Unstaked, Slash, RecoveryClaimed 事件
- **D-15:** 使用 `evm_increaseTime` 和 `evm_mine` 模拟时间流逝
- **D-16:** 验证 `lockedUntil` 时间戳后的 unstake 行为
- **D-17:** 测试 `userReputation` 和 `lockedAmount` 的交互
- **D-18:** 测试 `getUserReputation()` 返回 `total - locked` 的逻辑
- **D-19:** 测试 `getRecoverableReputation()` 返回正确结构
- **D-20:** 测试 5% 每月恢复速率
- **D-21:** 测试 `hasPositiveContribution` 要求
- **D-22:** 测试 `setPositiveContribution()` 调用
- **D-23:** 测试 recovery 不能超过 locked amount
- **D-24:** 使用 chai-matchers `emit` + `withArgs` 验证事件参数

### Deferred Ideas (OUT OF SCOPE)
None

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| STAK-01 | Test stake and unstake with proper lock period | stake() creates StakeInfo with 90-day lock, unstake() requires block.timestamp > lockedUntil |
| STAK-02 | Test slash mechanism with evidence validation | slash() transfers tokens to reporter (25%), onlyOwner can call |
| STAK-03 | Test reputation lock and recovery mechanism | slashLiker() creates ReputationLock, getUserReputation() returns total - locked |
| STAK-04 | Test getRecoverableReputation() and claimRecoverableReputation() | 5% monthly recovery based on originalSlashAmount, requires positive contribution |
| STAK-05 | Test time-based unlock (90-day period) with evm_increaseTime + evm_mine | time/increase() + mine() from hardhat-network-helpers |

</phase_requirements>

---

## Standard Stack

### Core Testing Tools
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| chai | ^4.5.0 | Assertion library | BDD-style expect syntax |
| @nomicfoundation/hardhat-chai-matchers | ^2.1.2 | Chai matchers for contract assertions | Enables `.to.emit()`, `.to.be.revertedWith()` |
| @nomicfoundation/hardhat-network-helpers | ^1.1.2 | Time manipulation helpers | `time/increase()` + `mine()` for evm timestamp control |

### Project-Specific Fixtures
| File | Purpose |
|------|---------|
| test/fixtures.cjs | `deployContracts()` returns `{ token, staking, registry, attribution, owner, user1, user2, accounts }` |

**Version verification:**
- chai: ^4.5.0 [VERIFIED: package.json]
- hardhat-network-helpers: ^1.1.2 [VERIFIED: package.json]

**Installation:**
All dependencies already installed per package.json. No additional packages needed.

---

## Architecture Patterns

### Recommended Project Structure
```
test/contracts/
├── ASKToken.test.cjs       # Phase 12 reference
└── StakingManager.test.cjs # Phase 13 target
```

### Pattern 1: loadFixture with deployContracts
**What:** Use Hardhat's `loadFixture` wrapper with project's `deployContracts` fixture
**When to use:** Every test to ensure clean state isolation
**Example:**
```javascript
// Source: ASKToken.test.cjs lines 1-12
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deployContracts } = require("../fixtures.cjs");

describe("StakingManager", function() {
  const fixture = deployContracts;

  async function deploy() {
    const { token, staking, owner, user1, user2, accounts } = await loadFixture(fixture);
    return { token, staking, owner, user1, user2, accounts };
  }
  // ...
});
```

### Pattern 2: Time Manipulation for Lock Periods
**What:** Use `time/increase()` and `mine()` from hardhat-network-helpers
**When to use:** STAK-01 unstake tests, STAK-05 time-based unlock tests
**Example:**
```javascript
// Source: hardhat-network-helpers documentation
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Time-based unlock", function() {
  it("should unstake after 90 days", async function() {
    const { staking, user1 } = await deploy();
    const skillId = 1;
    const amount = ethers.parseEther("100");

    // Stake tokens (90-day lock starts now)
    await staking.connect(user1).stake(skillId, amount);

    // Fast forward 91 days (90 days + 1 day buffer)
    await time.increase(90 * 24 * 60 * 60 + 1);
    await time.mine(); // Mine a new block with updated timestamp

    // Now unstake should succeed
    await expect(staking.connect(user1).unstake(skillId))
      .to.emit(staking, "Unstaked");
  });
});
```

### Pattern 3: Event Testing with chai-matchers
**What:** Use `.to.emit()` + `.withArgs()` for event parameter verification
**When to use:** D-14 Event tests for Staked, Unstaked, Slash, RecoveryClaimed
**Example:**
```javascript
// Source: ASKToken.test.cjs lines 198-208
await expect(token.mint(user1, amount))
  .to.emit(token, "Transfer")
  .withArgs(ethers.ZeroAddress, user1.address, amount);
```

### Pattern 4: Access Control Testing
**What:** Test onlyOwner modifier with non-owner signer
**When to use:** D-13 access control tests for slash, slashLiker, setPositiveContribution
**Example:**
```javascript
// Source: ASKToken.test.cjs lines 57-65
it("should revert when non-owner tries to slash", async function() {
  const { staking, user1, user2 } = await deploy();
  await expect(
    staking.connect(user1).slash(user2.address, 1, 100)
  ).to.be.revertedWith("Ownable: caller is not the owner");
});
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Time manipulation | Custom evm timestamp setter | `time/increase()` from hardhat-network-helpers | Handles block.timestamp updates correctly |
| Event testing | Manual event emission checks | chai-matchers `.to.emit()` | Built-in assertion with parameter matching |
| State isolation | beforeEach/afterEach cleanup | `loadFixture` from hardhat-network-helpers | Snapshots state between tests automatically |

---

## Common Pitfalls

### Pitfall 1: Time Not Advancing After `time.increase()`
**What goes wrong:** `block.timestamp` remains at current value after calling `time.increase()`
**Why it happens:** Need to mine a new block to commit the timestamp change
**How to avoid:** Always call `await time.mine()` after `await time.increase()`
**Warning signs:** unstake() reverts with "Still locked" even after time advance

### Pitfall 2: Token Transfer Without Approval
**What goes wrong:** staking.stake() or staking.unstake() fails silently
**Why it happens:** StakingManager calls token.transfer() but tokens need approval first
**How to avoid:** Ensure test setup transfers tokens to user and user approves staking contract, OR mint directly to user and check balance
**Warning signs:** "ERC20: insufficient balance" or "ERC20: transfer amount exceeds balance"

### Pitfall 3: Lock Period Too Short
**What goes wrong:** Time advancement not enough for 90-day lock
**Why it happens:** 90 days = 90 * 24 * 60 * 60 = 7776000 seconds, but test uses 90 days exactly
**How to avoid:** Use `90 * 24 * 60 * 60 + 1` to ensure block.timestamp > lockedUntil
**Warning signs:** unstake() reverts with "Still locked" by 1 second

### Pitfall 4: Stale Fixture State
**What goes wrong:** Tests pass individually but fail in sequence
**Why it happens:** Contract state not reset between tests
**How to avoid:** Use `loadFixture` which creates fresh deployment per test
**Warning signs:** Tests depend on execution order

---

## Code Examples

### Test Structure (STAK-01: Stake/Unstake)
```javascript
// Source: Pattern from ASKToken.test.cjs adapted for StakingManager
describe("Stake", function() {
  it("should stake tokens and lock for 90 days", async function() {
    const { staking, token, user1 } = await deploy();
    const skillId = 1;
    const amount = ethers.parseEther("100");

    // Transfer tokens to user1 (StakingManager needs tokens)
    await token.transfer(user1.address, amount);
    await token.connect(user1).approve(staking.target, amount);

    await expect(staking.connect(user1).stake(skillId, amount))
      .to.emit(staking, "Staked")
      .withArgs(user1.address, skillId, amount);

    const stakeInfo = await staking.stakes(user1.address, skillId);
    expect(stakeInfo.amount).to.equal(amount);
    expect(stakeInfo.slashed).to.equal(false);
    // lockedUntil should be approximately block.timestamp + 90 days
  });

  it("should revert when user already slashed", async function() {
    const { staking, token, user1 } = await deploy();
    // Setup: user has already been slashed for this skillId
    // ...
    await expect(
      staking.connect(user1).stake(skillId, amount)
    ).to.be.revertedWith("Already slashed");
  });
});

describe("Unstake", function() {
  it("should unstake after lock period expires", async function() {
    const { staking, token, user1 } = await deploy();
    const skillId = 1;
    const amount = ethers.parseEther("100");

    // Setup stake
    await token.transfer(user1.address, amount);
    await token.connect(user1).approve(staking.target, amount);
    await staking.connect(user1).stake(skillId, amount);

    // Advance time past 90 days
    await time.increase(90 * 24 * 60 * 60 + 1);
    await time.mine();

    await expect(staking.connect(user1).unstake(skillId))
      .to.emit(staking, "Unstaked")
      .withArgs(user1.address, skillId, amount);
  });

  it("should revert when still locked", async function() {
    const { staking, token, user1 } = await deploy();
    // Stake without advancing time
    await token.transfer(user1.address, ethers.parseEther("100"));
    await token.connect(user1).approve(staking.target, ethers.parseEther("100"));
    await staking.connect(user1).stake(skillId, ethers.parseEther("100"));

    await expect(staking.connect(user1).unstake(skillId))
      .to.be.revertedWith("Still locked");
  });

  it("should revert when no stake exists", async function() {
    const { staking, user1 } = await deploy();
    await expect(staking.connect(user1).unstake(999))
      .to.be.revertedWith("No stake");
  });
});
```

### Test Structure (STAK-02: Slash)
```javascript
describe("Slash", function() {
  it("should slash tokens and reward reporter", async function() {
    const { staking, token, owner, user1, user2 } = await deploy();
    const skillId = 1;
    const slashAmount = ethers.parseEther("50");

    // Setup: user1 stakes tokens
    await token.transfer(user1.address, ethers.parseEther("100"));
    await token.connect(user1).approve(staking.target, ethers.parseEther("100"));
    await staking.connect(user1).stake(skillId, ethers.parseEther("100"));

    const initialOwnerBalance = await token.balanceOf(owner.address);

    // Slash 50 tokens
    await staking.slash(user1.address, skillId, slashAmount);

    // Reporter (owner) gets 25% reward
    const expectedReward = slashAmount * 25n / 100n;
    expect(await token.balanceOf(owner.address))
      .to.equal(initialOwnerBalance + expectedReward);

    const stakeInfo = await staking.stakes(user1.address, skillId);
    expect(stakeInfo.amount).to.equal(ethers.parseEther("100") - slashAmount);
  });

  it("should revert when insufficient stake", async function() {
    const { staking, owner, user1 } = await deploy();
    await expect(
      staking.slash(user1.address, 1, ethers.parseEther("1000"))
    ).to.be.revertedWith("Insufficient stake");
  });

  it("should revert when non-owner tries to slash", async function() {
    const { staking, token, user1, user2 } = await deploy();
    await token.transfer(user1.address, ethers.parseEther("100"));
    await token.connect(user1).approve(staking.target, ethers.parseEther("100"));
    await staking.connect(user1).stake(1, ethers.parseEther("100"));

    await expect(
      staking.connect(user2).slash(user1.address, 1, ethers.parseEther("50"))
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});
```

### Test Structure (STAK-03: Reputation Lock)
```javascript
describe("Reputation Lock", function() {
  it("should lock reputation on slashLiker", async function() {
    const { staking, owner, user1 } = await deploy();
    const penalty = -10;

    await staking.slashLiker(user1.address, penalty, "Liked harmful skill");

    const lockInfo = await staking.reputationLocks(user1.address);
    expect(lockInfo.lockedAmount).to.equal(10);
    expect(lockInfo.lastClaimTime).to.be.gt(0);
  });

  it("should return effective reputation (total - locked)", async function() {
    const { staking, owner, user1 } = await deploy();
    const penalty = -20;

    // User has +30 reputation
    await staking.setPositiveContribution(user1.address);
    await staking.claimRecoverableReputation(); // Adds to reputation if needed
    // Alternatively, manually set via slashLiker first

    await staking.slashLiker(user1.address, penalty, "Liked harmful skill");

    // After slash: userReputation = +10, lockedAmount = 20
    // effective = +10 - 20 = -10, but returns max(0, -10) = 0
    const effective = await staking.getUserReputation(user1.address);
    expect(effective).to.equal(0);
  });
});
```

### Test Structure (STAK-04: Recovery)
```javascript
describe("Recovery", function() {
  it("should calculate 5% monthly recovery", async function() {
    const { staking, owner, user1 } = await deploy();

    // Slash with -100 penalty (100 locked)
    await staking.slashLiker(user1.address, -100, "Test slash");
    expect((await staking.reputationLocks(user1.address)).lockedAmount).to.equal(100);

    // Set positive contribution and advance 1 month
    await staking.setPositiveContribution(user1.address);
    await time.increase(30 * 24 * 60 * 60);
    await time.mine();

    // Claim recovery: 100 * 5% = 5
    await staking.claimRecoverableReputation();

    const lockInfo = await staking.reputationLocks(user1.address);
    expect(lockInfo.lockedAmount).to.equal(95); // 100 - 5
  });

  it("should revert without positive contribution", async function() {
    const { staking, owner, user1 } = await deploy();
    await staking.slashLiker(user1.address, -50, "Test slash");
    await time.increase(30 * 24 * 60 * 60);
    await time.mine();

    await expect(staking.claimRecoverableReputation())
      .to.be.revertedWith("No positive contribution");
  });

  it("should revert when wait period not met", async function() {
    const { staking, owner, user1 } = await deploy();
    await staking.slashLiker(user1.address, -50, "Test slash");
    await staking.setPositiveContribution(user1.address);
    // Only 15 days passed
    await time.increase(15 * 24 * 60 * 60);
    await time.mine();

    await expect(staking.claimRecoverableReputation())
      .to.be.revertedWith("Must wait at least 1 month");
  });
});
```

### Test Structure (STAK-05: Time-based Unlock)
```javascript
describe("Time-based Unlock (STAK-05)", function() {
  it("should allow unstake exactly at 90 days", async function() {
    const { staking, token, user1 } = await deploy();

    await token.transfer(user1.address, ethers.parseEther("100"));
    await token.connect(user1).approve(staking.target, ethers.parseEther("100"));
    await staking.connect(user1).stake(1, ethers.parseEther("100"));

    // Get stake info to check lockedUntil
    const stakeInfo = await staking.stakes(user1.address, 1);
    const lockedUntil = stakeInfo.lockedUntil;

    // Advance to exactly lockedUntil
    await time.increaseTo(lockedUntil + 1n);
    await time.mine();

    await expect(staking.connect(user1).unstake(1))
      .to.emit(staking, "Unstaked");
  });

  it("should block unstake at 89 days", async function() {
    const { staking, token, user1 } = await deploy();

    await token.transfer(user1.address, ethers.parseEther("100"));
    await token.connect(user1).approve(staking.target, ethers.parseEther("100"));
    await staking.connect(user1).stake(1, ethers.parseEther("100"));

    // Get stake info to check lockedUntil
    const stakeInfo = await staking.stakes(user1.address, 1);
    const lockedUntil = stakeInfo.lockedUntil;

    // Advance to 1 second before lockedUntil
    await time.increaseTo(lockedUntil - 1n);
    await time.mine();

    await expect(staking.connect(user1).unstake(1))
      .to.be.revertedWith("Still locked");
  });
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual time testing | `time/increase()` + `time.mine()` | hardhat-network-helpers ^1.0.0 | Precise timestamp control |
| Raw event parsing | chai-matchers `.to.emit()` | hardhat-chai-matchers ^2.0.0 | Readable assertions |
| beforeEach cleanup | `loadFixture` snapshot | @nomicfoundation/hardhat-network-helpers | Test isolation guaranteed |

**Deprecated/outdated:**
- `evm_increaseTime` (old API) -> `time/increase()` (new API) [ASUMED - verify in docs]
- `evm_mine` (old API) -> `time.mine()` (new API) [ASUMED - verify in docs]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `time.increase()` and `time.mine()` are correct modern API for hardhat-network-helpers | Common Pitfalls, Code Examples | Test code may fail — verify API against installed version |
| A2 | `stakes[address][skillId]` mapping syntax for reading stake info | Code Examples | May need `.stakes(address, skillId)` function call |
| A3 | `token.transfer()` in unstake requires prior `approve()` call | Pitfall 2 | Token transfer may fail without approval |

---

## Open Questions

1. **Token approval requirement for stake/unstake**
   - What we know: StakingManager.stake() calls `token.transfer()` internally
   - What's unclear: Does the contract assume tokens are already in user wallet, or does user need to approve?
   - Recommendation: Check if staking contract pulls tokens (requires approve) or tokens sent directly to contract

2. **Direct token transfer vs Pull pattern**
   - What we know: unstake() calls `token.transfer(msg.sender, amount)`
   - What's unclear: If stake() pulls tokens via transferFrom or if user must send tokens first
   - Recommendation: Add setup test to verify token mechanics before writing stake tests

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies beyond local Hardhat node)

All dependencies are project-local devDependencies. No external tools, services, or CLIs required beyond `npm test` which runs `hardhat test`.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Mocha (Hardhat built-in) |
| Assertion Library | Chai ^4.5.0 |
| Contract Assertions | @nomicfoundation/hardhat-chai-matchers ^2.1.2 |
| Time Helpers | @nomicfoundation/hardhat-network-helpers ^1.1.2 |
| Config file | hardhat.config.js (mocha config via environment) |
| Quick run command | `npx hardhat test test/contracts/StakingManager.test.cjs` |
| Full suite command | `npm test` (runs all tests) |
| Coverage command | `npm run coverage` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| STAK-01 | Stake tokens with 90-day lock | unit | `npx hardhat test test/contracts/StakingManager.test.cjs --grep "Stake"` | NO - Wave 0 |
| STAK-01 | Unstake after lock expires | unit | `npx hardhat test test/contracts/StakingManager.test.cjs --grep "Unstake"` | NO - Wave 0 |
| STAK-01 | Revert when still locked | unit | `npx hardhat test test/contracts/StakingManager.test.cjs --grep "still locked"` | NO - Wave 0 |
| STAK-02 | Slash mechanism works | unit | `npx hardhat test test/contracts/StakingManager.test.cjs --grep "Slash"` | NO - Wave 0 |
| STAK-02 | Reporter receives 25% | unit | Same grep | NO - Wave 0 |
| STAK-03 | slashLiker creates lock | unit | `npx hardhat test test/contracts/StakingManager.test.cjs --grep "Reputation Lock"` | NO - Wave 0 |
| STAK-03 | getUserReputation subtracts locked | unit | Same grep | NO - Wave 0 |
| STAK-04 | getRecoverableReputation returns struct | unit | `npx hardhat test test/contracts/StakingManager.test.cjs --grep "Recovery"` | NO - Wave 0 |
| STAK-04 | claimRecoverableReputation 5% rate | unit | Same grep | NO - Wave 0 |
| STAK-05 | Time advancement via evm manipulation | unit | `npx hardhat test test/contracts/StakingManager.test.cjs --grep "Time"` | NO - Wave 0 |

### Sampling Rate
- **Per task commit:** `npx hardhat test test/contracts/StakingManager.test.cjs`
- **Per wave merge:** `npm test`
- **Phase gate:** All tests green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `test/contracts/StakingManager.test.cjs` — covers STAK-01 through STAK-05
- [ ] `test/fixtures.cjs` — already exists, no gaps
- Framework install: All dependencies already in package.json — no gaps

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | N/A — testing framework |
| V3 Session Management | no | N/A — testing framework |
| V4 Access Control | yes | onlyOwner modifier tests — verify non-owner reverts |
| V5 Input Validation | yes | Revert message tests for require() checks |
| V6 Cryptography | no | N/A — no cryptographic operations in StakingManager |

### Known Threat Patterns for StakingManager

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthorized slash | Spoofing | onlyOwner modifier on slash(), slashLiker() |
| Double recovery | Tampering | hasPositiveContribution reset after claim |
| Integer underflow | Denial | Solidity ^0.8.20 checked math |
| Lock period bypass | Tampering | block.timestamp comparison in unstake() |

---

## Sources

### Primary (HIGH confidence)
- `contracts/StakingManager.sol` — Contract under test, all functions analyzed
- `test/fixtures.cjs` — Existing deployContracts fixture
- `test/contracts/ASKToken.test.cjs` — Phase 12 test patterns
- `package.json` — Verified package versions

### Secondary (MEDIUM confidence)
- hardhat-network-helpers API patterns [ASSUMED - based on training, needs verification]

### Tertiary (LOW confidence)
- `time/increase()` and `time.mine()` API naming [UNVERIFIED - verify against installed version]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified from package.json and ASKToken.test.cjs
- Architecture: HIGH — patterns directly from ASKToken.test.cjs
- Pitfalls: MEDIUM — based on training knowledge, not verified against actual test failures

**Research date:** 2026-05-17
**Valid until:** 2026-06-17 (30 days — testing framework stable)