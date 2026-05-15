# Phase 8: 恢复函数实现 - Research

**Researched:** 2026-05-15
**Domain:** Solidity Smart Contract - Reputation Recovery System
**Confidence:** HIGH

## Summary

Phase 8 implements reputation recovery functions for the AgentSkills staking system. The core challenge is implementing a monthly recovery mechanism (5% of original slash per month) with eligibility checks based on positive contributions. This requires adding a `ReputationLock` struct to track locked amounts and last claim timestamps, modifying `getUserReputation()` to return effective (non-locked) reputation, and implementing two new functions: `getRecoverableReputation()` and `claimRecoverableReputation()`.

**Primary recommendation:** Implement `ReputationLock` as a separate mapping in StakingManager, track positive contributions via a simple boolean or counter, and use a monthly time-based recovery formula based on the original slash amount.

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** `ReputationLock` struct with two fields:
  - `lockedAmount`: 当前锁定的声望金额
  - `lastClaimTime`: 上次领取恢复的时间戳（uint256）

- **D-02:** `getUserReputation()` 返回有效声望 = `userReputation - lockedAmount`
  - 锁定金额存储在 `ReputationLock.lockedAmount`
  - 调用者使用返回值进行投票/功能判断

- **D-03:** 用户必须有自上次领取后的正面贡献才能领取恢复
  - 需要在合约层面追踪正面贡献事件
  - 简单布尔检查（是否有贡献）

- **D-04:** 每月恢复公式：`originalSlash × 5% × months elapsed`
  - 基于原始惩罚金额计算
  - 恢复速度恒定，不随剩余金额递减

- **D-05:** `getRecoverableReputation(address _user)` 返回 `(lockedAmount, lastClaimTime)`

- **D-06:** `claimRecoverableReputation()` 执行领取逻辑

### Claude's Discretion

- Positive contribution tracking mechanism (boolean vs counter)
- Event emissions for recovery operations
- Edge case handling (first-time claim, zero locked amount)

### Deferred Ideas

None — discussion stayed within phase scope

</user_constraints>

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RECOV-01 | Implement `getRecoverableReputation()` function | Section 4.2: Recovery Query Function |
| RECOV-02 | Implement `claimRecoverableReputation()` with monthly recovery | Section 4.3: Recovery Claim Logic |
| RECOV-03 | Add ReputationLock struct to track locked reputation | Section 3.1: Struct Design |
| RECOV-04 | Implement 5% monthly recovery rate calculation | Section 4.3: Recovery Formula |
| RECOV-05 | Add recovery eligibility checks (positive contributions required) | Section 4.4: Eligibility Requirements |

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
├── StakingManager.sol        # Main contract (to be modified)
├── ReputationLock.sol       # NEW: Optional separate module for lock tracking
└── ...

test/
├── StakingManager.test.js    # NEW: Unit tests for recovery functions
└── ...
```

### Pattern 1: ReputationLock Struct

**What:** Data structure to track user's locked reputation and claim timing

**When to use:** When implementing the recovery mechanism

**Implementation:**
```solidity
// Source: Based on SKILLS_STANDARD.md Section 6.4 + 08-CONTEXT.md D-01
struct ReputationLock {
    uint256 lockedAmount;    // 当前锁定的声望金额
    uint256 lastClaimTime;   // 上次领取恢复的时间戳（uint256）
}

// Mapping to store locks per user
mapping(address => ReputationLock) public reputationLocks;

// Additional tracking for original slash amount (needed for recovery calculation)
mapping(address => uint256) public originalSlashAmount;
```

### Pattern 2: Recovery Eligibility Tracking

**What:** Track whether user has positive contributions since last claim

**When to use:** Before allowing recovery claim

**Implementation:**
```solidity
// Simple boolean approach - tracks if user has contributed since last claim
mapping(address => bool) public hasPositiveContribution;

// Alternative: Counter approach for multiple contributions
mapping(address => uint256) public contributionCountSinceLastClaim;
```

### Pattern 3: Modified getUserReputation()

**What:** Return effective reputation (total minus locked)

**When to use:** When any code queries user reputation for voting/privileges

**Implementation:**
```solidity
// Source: 08-CONTEXT.md D-02
function getUserReputation(address _user) external view returns (int256) {
    ReputationLock storage lock = reputationLocks[_user];
    return userReputation[_user] - int256(lock.lockedAmount);
}
```

### Pattern 4: Monthly Recovery Formula

**What:** Calculate recoverable amount based on time elapsed

**Formula:** `recoverable = originalSlash × 5% × months elapsed`

**Implementation:**
```solidity
// Source: SKILLS_STANDARD.md Section 6.4 + 08-CONTEXT.md D-04
uint256 public constant RECOVERY_RATE_PER_MONTH = 500; // 5% = 500 basis points

function calculateRecoverableAmount(
    uint256 _originalSlash,
    uint256 _lastClaimTime
) internal view returns (uint256) {
    uint256 monthsElapsed = (block.timestamp - _lastClaimTime) / 30 days;
    // 5% per month, capped so we never recover more than original
    uint256 maxRecovery = (_originalSlash * 500 * monthsElapsed) / 10000;
    return maxRecovery > _originalSlash ? _originalSlash : maxRecovery;
}
```

### Anti-Patterns to Avoid

- **Locking all reputation:** Don't lock the entire `userReputation`. Only lock the amount that was slashed.
- **Linear recovery based on remaining:** The formula uses original slash amount, not remaining locked amount. Recovery speed is constant.
- **No eligibility check:** Must verify positive contributions before allowing claim.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Time calculation | Custom month/day logic | `block.timestamp - lastClaimTime) / 30 days` | Solidity 0.8+ handles overflow, simple math |
| Reputation storage | Separate storage for locked | `userReputation - lockedAmount` | Single source of truth, easier to reason about |
| Recovery cap | Complex iterative calculation | Simple formula with max cap | Gas efficient, predictable |

**Key insight:** The recovery mechanism is intentionally simple (5% monthly, no diminishing returns) to encourage long-term engagement. Over-complicating the math serves no purpose.

---

## Common Pitfalls

### Pitfall 1: Integer Overflow in Recovery Calculation
**What goes wrong:** Multiplication in `(_originalSlash * 500 * monthsElapsed)` can overflow for large values.
**Why it happens:** `uint256` multiplication with large numbers.
**How to avoid:** Use safe math or struct the calculation to check for overflow. In Solidity 0.8+, arithmetic reverts on overflow, but this could cause transaction failure.
**Warning signs:** Tests failing with "panic code 0x11" (overflow).

### Pitfall 2: Missing Original Slash Storage
**What goes wrong:** Cannot calculate recovery if we only store locked amount.
**Why it happens:** Recovery formula uses original slash amount, not remaining locked.
**How to avoid:** Store both `lockedAmount` and `originalSlashAmount` separately.
**Warning signs:** Users getting less recovery than expected.

### Pitfall 3: Eligibility Check Bypass
**What goes wrong:** Users can claim recovery without positive contributions.
**Why it happens:** Not integrating contribution tracking with claim function.
**How to avoid:** Add `require(hasPositiveContribution[msg.sender], "No positive contribution")` at the start of `claimRecoverableReputation()`.
**Warning signs:** No events emitted for contribution tracking.

### Pitfall 4: First-Time Claim Edge Case
**What goes wrong:** New users with no prior claim have `lastClaimTime = 0`, causing division issues.
**Why it happens:** `(block.timestamp - 0) / 30 days` returns very large months value.
**How to avoid:** Initialize `lastClaimTime` to `block.timestamp` on first slash, or add special handling for `lastClaimTime == 0`.
**Warning signs:** First claim always returns maximum recovery.

---

## Code Examples

### 1. Complete Recovery Implementation

```solidity
// Source: Based on 08-CONTEXT.md decisions + SKILLS_STANDARD.md Section 6.4

// ReputationLock struct (D-01)
struct ReputationLock {
    uint256 lockedAmount;    // 当前锁定的声望金额
    uint256 lastClaimTime;   // 上次领取恢复的时间戳
}

// Storage mappings
mapping(address => ReputationLock) public reputationLocks;
mapping(address => uint256) public originalSlashAmount;
mapping(address => bool) public hasPositiveContribution;

// Events (for transparency)
event ReputationSlashed(address indexed user, uint256 amount, uint256 lockedAmount);
event RecoveryClaimed(address indexed user, uint256 amount, uint256 remaining);

// Get recoverable reputation (RECOV-01)
function getRecoverableReputation(address _user) 
    external 
    view 
    returns (uint256 lockedAmount, uint256 lastClaimTime) 
{
    ReputationLock storage lock = reputationLocks[_user];
    return (lock.lockedAmount, lock.lastClaimTime);
}

// Claim recoverable reputation (RECOV-02)
function claimRecoverableReputation() external {
    ReputationLock storage lock = reputationLocks[msg.sender];
    require(lock.lockedAmount > 0, "No locked reputation");
    require(hasPositiveContribution[msg.sender], "No positive contribution");
    
    // Calculate months elapsed since last claim
    uint256 monthsElapsed = (block.timestamp - lock.lastClaimTime) / 30 days;
    require(monthsElapsed >= 1, "Must wait at least 1 month");
    
    // Calculate recoverable: originalSlash * 5% * months (D-04)
    uint256 maxRecovery = (originalSlashAmount[msg.sender] * 500 * monthsElapsed) / 10000;
    uint256 actualRecovery = maxRecovery > lock.lockedAmount 
        ? lock.lockedAmount 
        : maxRecovery;
    
    // Update state
    lock.lockedAmount -= actualRecovery;
    lock.lastClaimTime = block.timestamp;
    hasPositiveContribution[msg.sender] = false; // Reset until next contribution
    
    // Emit event
    emit RecoveryClaimed(msg.sender, actualRecovery, lock.lockedAmount);
}

// Internal function to slash reputation with lock (called from slashLiker)
function slashWithLock(address _user, int256 _penalty) internal {
    uint256 slashAmount = uint256(-_penalty);
    
    // Initialize lock (D-01, D-03)
    ReputationLock storage lock = reputationLocks[_user];
    lock.lockedAmount += slashAmount;
    lock.lastClaimTime = block.timestamp;
    
    // Store original slash for recovery calculation (D-04)
    originalSlashAmount[_user] += slashAmount;
    
    emit ReputationSlashed(_user, slashAmount, lock.lockedAmount);
}
```

### 2. Modified getUserReputation (D-02)

```solidity
// Returns effective reputation = total - locked (D-02)
function getUserReputation(address _user) external view returns (int256) {
    ReputationLock storage lock = reputationLocks[_user];
    int256 effective = userReputation[_user] - int256(lock.lockedAmount);
    return effective >= 0 ? effective : 0;
}
```

### 3. Contribution Tracking for Eligibility (D-03)

```solidity
// Called when user earns positive reputation (e.g., skill approved, verification passed)
function recordPositiveContribution(address _user) internal {
    hasPositiveContribution[_user] = true;
}

// Or use a counter for multiple contributions
mapping(address => uint256) public contributionCountSinceLastClaim;

function recordPositiveContribution(address _user) internal {
    contributionCountSinceLastClaim[_user]++;
    hasPositiveContribution[_user] = contributionCountSinceLastClaim[_user] > 0;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Simple userReputation mapping | ReputationLock + effective reputation | v1.2 (this phase) | Enables recovery without losing history |
| No recovery mechanism | 5% monthly recovery | v1.2 (this phase) | Incentivizes good behavior after mistakes |
| No eligibility check | Positive contribution required | v1.2 (this phase) | Prevents passive recovery |

**Deprecated/outdated:**
- `getUserReputation()` returning raw value (now returns effective value)
- Simple `slashLiker()` without lock tracking (now needs to integrate with lock)

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | 30 days = 1 month for recovery calculation | Recovery Formula | If actual month-based calculation needed, formula would change |
| A2 | Recovery continues indefinitely until fully recovered | Recovery Formula | If there's a time limit, additional logic needed |
| A3 | Positive contributions are binary (yes/no) not weighted | Eligibility | If weighted contributions needed, tracking changes significantly |

---

## Open Questions

1. **How to track positive contributions cross-function?**
   - What we know: Need a way to mark when user has contributed positively since last claim
   - What's unclear: Which functions should set `hasPositiveContribution = true`? All positive reputation events?
   - Recommendation: Create an internal `_recordContribution()` function called by positive reputation events

2. **Should locked reputation affect voting immediately or only on claim?**
   - What we know: Effective reputation excludes locked amount (D-02)
   - What's unclear: Is there a delay before locked amount takes effect?
   - Recommendation: Lock takes effect immediately (conservative, clear)

3. **Gas optimization for mapping lookups:**
   - What we know: Multiple storage reads for recovery calculation
   - What's unclear: Is the current gas cost acceptable?
   - Recommendation: Accept current gas for clarity, optimize only if measurements show problem

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies identified — pure Solidity contract implementation with Hardhat already installed)

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Hardhat (JavaScript tests) |
| Config file | `hardhat.config.cjs` |
| Quick run command | `npx hardhat test` |
| Full suite command | `npx hardhat test --grep "recover"` |

**Note:** Project has existing test infrastructure (`tests/audit-independence.test.js`) but no Solidity-specific tests. Existing framework (Hardhat + chai) can be used.

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command |
|--------|----------|-----------|-------------------|
| RECOV-03 | ReputationLock struct exists with correct fields | unit | `npx hardhat test --grep "ReputationLock"` |
| RECOV-01 | getRecoverableReputation returns correct values | unit | `npx hardhat test --grep "getRecoverableReputation"` |
| RECOV-02 | claimRecoverableReputation calculates correctly | unit | `npx hardhat test --grep "claimRecoverableReputation"` |
| RECOV-04 | 5% monthly recovery formula works | unit | `npx hardhat test --grep "recovery rate"` |
| RECOV-05 | Eligibility check prevents unauthorized claims | unit | `npx hardhat test --grep "eligibility"` |

### Wave 0 Gaps
- [ ] `contracts/test/StakingManager.recovery.test.js` — covers RECOV-01 through RECOV-05
- [ ] Framework: Already installed (Hardhat + chai)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V4 Access Control | yes | onlyOwner modifier on slash, user functions for claim |
| V5 Input Validation | yes | Reentrancy guards, bounds checking on recovery amounts |
| V1 Authentication | no | Contract-level, no user auth needed |

### Known Threat Patterns for Solidity Reputation Systems

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Arithmetic overflow in recovery calculation | Denial of Service | Solidity 0.8+ reverts on overflow, add checks for large values |
| Reentrancy via callback | Tampering | Solidity 0.8+ checks, simple state updates (no external calls in claim) |
| Double-claim viarace condition | Repudiation | State update before external call, `hasPositiveContribution` check |
| Griefing (tiny contributions to unlock) | Denial of Service | Gas cost naturally limits; consider minimum contribution threshold |

---

## Sources

### Primary (HIGH confidence)
- SKILLS_STANDARD.md Section 6.4 - 惩罚恢复流程 (official spec for recovery mechanism)
- SKILLS_STANDARD.md Section 6.2 - 接口兼容性说明 (documents missing functions to implement)
- 08-CONTEXT.md - User decisions for this phase (locked decisions D-01 through D-06)
- 04-CONTEXT.md - Prior phase decisions (5% recovery, no lockout, positive contributions required)
- contracts/StakingManager.sol - Current contract implementation to extend

### Secondary (MEDIUM confidence)
- Solidity 0.8.x documentation - arithmetic handling, overflow behavior

### Tertiary (LOW confidence)
- General Solidity best practices - applied from training data

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Solid context from existing project files
- Architecture: HIGH - Clear decisions in 08-CONTEXT.md
- Pitfalls: HIGH - Based on documented edge cases and Solidity behavior

**Research date:** 2026-05-15
**Valid until:** 2026-06-15 (stable domain, no fast-moving changes expected)