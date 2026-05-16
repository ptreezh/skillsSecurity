# Phase 9: 锁定机制实现 - Research

**Researched:** 2026-05-16
**Domain:** Solidity Smart Contract - Reputation Lock and Positive Contribution Tracking
**Confidence:** HIGH

## Summary

Phase 9 implements the reputation lock mechanism and positive contribution tracking system. Building on Phase 8's recovery infrastructure (ReputationLock, getRecoverableReputation, claimRecoverableReputation), this phase adds the ability for external contracts to mark users as having positive contributions, and ensures locked reputation is excluded from voting power and feature unlocking calculations.

The core challenge is integrating the lock mechanism across multiple contracts (StakingManager, SkillRegistry, Attribution) while maintaining the established pattern that Attribution.sol maintains an independent reputation system unrelated to the locking mechanism.

**Primary recommendation:** Implement `setPositiveContribution()` in StakingManager with idempotency check, integrate with SkillRegistry's skill registration and verification flows, and modify Attribution.addTestReport() to call StakingManager when valid bug reports are submitted.

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** 贡献合约主动调用 `StakingManager.setPositiveContribution(user)` 设置标记

- **D-02:** `setPositiveContribution()` 执行幂等性检查：`require(!hasPositiveContribution[user], "Already set")`

- **D-03:** 贡献类型包括：创建通过验证的技能、成功验证他人技能、报告有效漏洞、修复已有技能问题

- **D-04:** 功能解锁检查时采用内联计算：`effectiveReputation = userReputation - reputationLocks[user].lockedAmount`

- **D-05:** 现有调用点（SkillRegistry.registerSkill()、verifySkill() 等）需修改为使用内联计算

- **D-06:** 投票权计算同样使用内联排除方式

- **D-07:** Attribution.sol 保持独立的声望系统（积分），不与 StakingManager 锁定机制关联

- **D-08:** 锁定机制仅在 StakingManager 中生效，Attribution.sol 不受锁定影响

- **D-09:** `setPositiveContribution()` 内部自动检查恢复资格并允许立即领取

- **D-10:** `claimRecoverableReputation()` 的 `require(hasPositiveContribution[msg.sender])` 检查由正面贡献事件自动触发重置

- **D-11:** 新增 `setPositiveContribution(address user)` 函数（external, onlyOwner）

- **D-12:** 修改 SkillRegistry 质押检查函数，使用内联计算排除锁定金额

- **D-13:** 修改 Attribution.addTestReport()，贡献成功后调用 StakingManager.setPositiveContribution()

### Claude's Discretion

- 具体的事件监听实现细节
- 内联计算的代码位置选择
- 错误消息的具体措辞

### Deferred Ideas

None — discussion stayed within phase scope

</user_constraints>

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RECOV-04 | Implement 5% monthly recovery rate calculation | Section 4.3: Recovery Formula |
| RECOV-05 | Add recovery eligibility checks (positive contributions required) | Section 4.4: Eligibility Requirements |
| LOCK-01 | Implement setPositiveContribution() function with idempotency | Section 3.1: Positive Contribution Tracking |
| LOCK-02 | Integrate lock exclusion in SkillRegistry feature checks | Section 3.2: Feature Unlock Integration |
| LOCK-03 | Update Attribution.addTestReport() to trigger positive contribution | Section 3.3: Attribution Integration |
| LOCK-04 | Ensure cross-contract reputation consistency | Section 3.4: Cross-Contract Architecture |

---

## Standard Stack

### Core (Smart Contract)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Solidity | 0.8.20 | Smart contract language | Current project standard |
| OpenZeppelin | ^4.9.6 | Access control (Ownable) | Already used in project |
| Hardhat | ^2.19.4 | Development framework | Already used in project |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| chai | ^4.x | Assertions | Unit testing (if added) |
| @nomicfoundation/hardhat-toolbox | ^3.x | Hardhat utilities | Integration testing |

**Installation:**
```bash
# Already installed via package.json
npm install @openzeppelin/contracts hardhat
```

---

## Architecture Patterns

### Recommended Project Structure

```
contracts/
├── StakingManager.sol        # Modified: add setPositiveContribution()
├── SkillRegistry.sol        # Modified: inline lock exclusion in checks
├── Attribution.sol          # Modified: call StakingManager on valid reports
└── ...
```

### Pattern 1: setPositiveContribution() with Idempotency

**What:** Function to mark user as having positive contribution since last recovery claim

**When to use:** When positive contribution occurs (skill approved, verification passed, valid bug report, etc.)

**Implementation:**
```solidity
// Source: 09-CONTEXT.md D-02 + D-11
/// @notice 设置用户有正面贡献（外部合约调用）
/// @dev 幂等性检查：已设置则 revert
/// @param _user 用户地址
function setPositiveContribution(address _user) external onlyOwner {
    require(!hasPositiveContribution[_user], "Already set");
    hasPositiveContribution[_user] = true;
    emit PositiveContributionSet(_user);
}
```

### Pattern 2: Inline Lock Exclusion for Feature Checks

**What:** Calculate effective reputation by subtracting locked amount inline

**When to use:** When checking if user qualifies for feature (skill creation, verification, etc.)

**Implementation:**
```solidity
// Source: 09-CONTEXT.md D-04, D-05, D-06
// Calculate effective reputation for feature unlock
int256 effectiveReputation = userReputation - int256(reputationLocks[user].lockedAmount);

// Example: L3 verification requirement (500+ reputation)
if (effectiveReputation < 500) {
    revert("Insufficient effective reputation");
}
```

### Pattern 3: Attribution Integration via Cross-Contract Call

**What:** Attribution calls StakingManager when valid contributions occur

**When to use:** When valid bug reports are submitted and confirmed

**Implementation:**
```solidity
// Source: 09-CONTEXT.md D-13
// In Attribution.sol
function addTestReport(...) external onlyOwner {
    // ... existing logic ...

    // Update user reputation
    userReputation[_reporter] += _score;

    // D-13: If score is positive (valid bug found), notify StakingManager
    if (_score > 0) {
        stakingManager.setPositiveContribution(_reporter);
    }
}
```

### Pattern 4: Automatic Recovery Check on Positive Contribution

**What:** When positive contribution is set, user can immediately claim recovery

**When to use:** To allow users to claim recovery immediately after contributing

**Implementation:**
```solidity
// Source: 09-CONTEXT.md D-09, D-10
// In setPositiveContribution():
// - hasPositiveContribution is set to true
// - User can now call claimRecoverableReputation()
// - claimRecoverableReputation() will pass the check
```

### Anti-Patterns to Avoid

- **Calling setPositiveContribution multiple times:** Idempotency check prevents this
- **Locking Attribution reputation:** Attribution.sol keeps independent reputation (D-07, D-08)
- **Creating new getEffectiveReputation() function:** Use inline calculation per D-04

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Positive contribution tracking | Custom event listener | Direct function call from Attribution | Simpler, more reliable |
| Reputation lock exclusion | New getEffectiveReputation() function | Inline calculation | Minimal code change |
| Recovery eligibility | Manual admin check | Automatic via setPositiveContribution() | Consistent, auditable |

**Key insight:** The lock mechanism is intentionally simple. External contracts call `setPositiveContribution()` when valid contributions occur, and the recovery claim automatically includes these checks.

---

## Common Pitfalls

### Pitfall 1: Stale Positive Contribution Flag
**What goes wrong:** User sets positive contribution, claims some recovery, but flag remains true for next claim without new contribution.
**Why it happens:** claimRecoverableReputation() resets the flag, but if called multiple times in same block, subsequent calls succeed without new contributions.
**How to avoid:** claimRecoverableReputation() resets hasPositiveContribution to false, and setPositiveContribution() requires it to be false (idempotency).
**Warning signs:** Users claiming recovery more frequently than expected.

### Pitfall 2: Cross-Contract Dependency Without Interface
**What goes wrong:** Attribution needs to call StakingManager.setPositiveContribution(), but direct import creates tight coupling.
**Why it happens:** Not using interface pattern for cross-contract calls.
**How to avoid:** Either use IStakingManager interface or accept tight coupling (owner can call both contracts).
**Warning signs:** Contract deployment failures, circular dependency issues.

### Pitfall 3: Inline Calculation Inconsistency
**What goes wrong:** Some places use getUserReputation(), others use direct userReputation, causing inconsistent lock exclusion.
**Why it happens:** Missing systematic review of all places that check reputation.
**How to avoid:** Document all reputation check points and update consistently.
**Warning signs:** Users with locked reputation can still unlock features in some places.

---

## Code Examples

### 1. setPositiveContribution() Implementation

```solidity
// Source: 09-CONTEXT.md D-11 + D-02

/// @notice 设置用户有正面贡献（D-01: 由贡献合约主动调用）
/// @dev 幂等性检查：已设置则 revert（D-02）
/// @param _user 用户地址
function setPositiveContribution(address _user) external onlyOwner {
    require(!hasPositiveContribution[_user], "Already set");  // D-02 idempotency
    hasPositiveContribution[_user] = true;
    emit PositiveContributionSet(_user);
}
```

### 2. SkillRegistry Integration with Inline Lock Exclusion

```solidity
// Source: 09-CONTEXT.md D-12
// Modify SkillRegistry to check effective reputation

// In registerSkill() - check effective reputation before allowing skill creation
function registerSkill(...) external returns (uint256) {
    // ... existing checks ...

    // D-12: Check effective reputation (exclude locked)
    int256 effectiveRep = stakingManager.getUserReputation(msg.sender);
    // Or inline if stakingManager reference available

    // For L2 skill creation: need 100+ effective reputation
    if (_riskLevel == RiskLevel.MEDIUM && effectiveRep < 500) {
        revert("Insufficient effective reputation for MEDIUM skill");
    }
    if (_riskLevel == RiskLevel.HIGH && effectiveRep < 2000) {
        revert("Insufficient effective reputation for HIGH skill");
    }

    // ... rest of registration ...
}
```

### 3. Attribution Integration

```solidity
// Source: 09-CONTEXT.md D-13
// Modify Attribution.addTestReport() to notify StakingManager

// Add StakingManager reference
contract Attribution is Ownable {
    StakingManager public stakingManager;

    function setStakingManager(address _addr) external onlyOwner {
        stakingManager = StakingManager(_addr);
    }

    function addTestReport(
        uint256 _skillId,
        address _reporter,
        uint256 _severity,
        int256 _score
    ) external onlyOwner {
        // ... existing logic ...

        // Update user reputation
        userReputation[_reporter] += _score;

        // D-13: If score is positive (valid bug found), notify StakingManager
        if (_score > 0 && address(stakingManager) != address(0)) {
            stakingManager.setPositiveContribution(_reporter);
        }
    }
}
```

### 4. Inline Lock Exclusion Helper

```solidity
// Helper function for inline calculation (optional, could be in SkillRegistry)
function getEffectiveReputation(
    address _user,
    int256 _totalReputation,
    uint256 _lockedAmount
) internal pure returns (int256) {
    int256 effective = _totalReputation - int256(_lockedAmount);
    return effective >= 0 ? effective : int256(0);
}

// Usage in skill verification
function verifySkill(uint256 _skillId, bool _pass) external {
    // Check effective reputation of verifier
    (uint256 lockedAmount, ) = stakingManager.getRecoverableReputation(msg.sender);
    int256 effectiveRep = stakingManager.getUserReputation(msg.sender);
    // effectiveRep already excludes locked amount from getUserReputation()

    require(effectiveRep >= getVerifierRequirement(skills[_skillId].riskLevel),
        "Insufficient effective reputation");

    // ... rest of verification ...
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No positive contribution tracking | setPositiveContribution() called by contribution contracts | v1.2 (this phase) | Enables recovery eligibility |
| Total reputation for feature checks | Effective reputation (total - locked) for feature checks | v1.2 (this phase) | Locked reputation excluded from voting/unlock |
| Attribution unrelated to recovery | Attribution notifies StakingManager on valid contributions | v1.2 (this phase) | Integrated contribution tracking |

**Deprecated/outdated:**
- Direct use of getUserReputation() without lock exclusion (now needs inline subtraction)
- Attribution treating all contributions the same (now positive scores trigger recovery eligibility)

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Attribution can directly call StakingManager.setPositiveContribution() | Attribution Integration | If circular dependency, need interface pattern |
| A2 | SkillRegistry has reference to StakingManager | SkillRegistry Integration | Would need to add reference or use different pattern |
| A3 | Positive score in addTestReport indicates valid contribution | Attribution Integration | If negative scoring needed for eligibility, logic changes |

---

## Open Questions

### Q1: How to handle SkillRegistry reference to StakingManager?
**Status:** Need verification

**What we know:** SkillRegistry needs to check effective reputation for skill creation thresholds. It currently has a reference to ASKToken for staking.

**What's unclear:** Does SkillRegistry already have or need a reference to StakingManager for this integration?

**Recommendation:** Check if SkillRegistry has StakingManager reference. If not, either:
1. Add StakingManager reference to constructor
2. Have admin pass StakingManager address when checking effective reputation

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies identified — pure Solidity contract modifications with Hardhat already installed)

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Hardhat (JavaScript tests) |
| Config file | `hardhat.config.cjs` |
| Quick run command | `npx hardhat test` |
| Full suite command | `npx hardhat test --grep "lock\|positive\|recovery"` |

**Note:** Project has existing test infrastructure (`tests/audit-independence.test.js`) but no Solidity-specific tests. Existing framework (Hardhat + chai) can be used.

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command |
|--------|----------|-----------|-------------------|
| LOCK-01 | setPositiveContribution() sets flag idempotently | unit | `npx hardhat test --grep "setPositiveContribution"` |
| LOCK-02 | SkillRegistry checks effective reputation | unit | `npx hardhat test --grep "effectiveReputation"` |
| LOCK-03 | Attribution calls StakingManager on positive score | integration | `npx hardhat test --grep "Attribution.*StakingManager"` |
| LOCK-04 | Cross-contract reputation consistency | integration | `npx hardhat test --grep "cross.*reputation"` |
| RECOV-05 | Recovery eligibility with positive contribution | unit | `npx hardhat test --grep "recovery.*eligibility"` |

### Wave 0 Gaps
- [ ] `contracts/test/LockMechanism.test.js` — covers LOCK-01 through LOCK-04
- [ ] Framework: Already installed (Hardhat + chai)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V4 Access Control | yes | onlyOwner on setPositiveContribution, proper role checks in all functions |
| V5 Input Validation | yes | Address validation, positive amount checks |
| V6 Cryptography | no | No cryptographic operations in this phase |
| V1 Authentication | no | Contract-level, no user auth needed |

### Known Threat Patterns for Positive Contribution Tracking

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthorized setPositiveContribution call | Elevation of Privilege | onlyOwner modifier required |
| Double-setting positive contribution | Repudiation | Idempotency check: require(!hasPositiveContribution) |
| Attribution calling StakingManager without validation | Spoofing | OnlyOwner on both sides, validated scoring |
| Lock exclusion bypass in SkillRegistry | Tampering | Inline calculation, consistent checks |

---

## Sources

### Primary (HIGH confidence)
- 09-CONTEXT.md - User decisions for this phase (D-01 through D-13)
- 08-CONTEXT.md - Prior phase context (ReputationLock struct, recovery functions)
- 08-RESEARCH.md - Prior phase research (recovery patterns)
- SKILLS_STANDARD.md Section 6.4 - 惩罚恢复流程 (recovery mechanism spec)
- SKILLS_STANDARD.md Section 7.2-7.3 - 声望系统 (feature unlock requirements)
- contracts/StakingManager.sol - Current implementation with Phase 8 additions
- contracts/SkillRegistry.sol - Current implementation needing integration
- contracts/Attribution.sol - Current implementation needing integration

### Secondary (MEDIUM confidence)
- Solidity 0.8.x documentation - function visibility, modifiers

### Tertiary (LOW confidence)
- General Solidity best practices - applied from training data

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Consistent with Phase 8 implementation
- Architecture: HIGH - Clear decisions in 09-CONTEXT.md
- Pitfalls: HIGH - Based on Phase 8 lessons learned

**Research date:** 2026-05-16
**Valid until:** 2026-06-16 (stable domain, no fast-moving changes expected)