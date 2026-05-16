---
phase: 09-lock-mechanism
reviewed: 2026-05-16T00:00:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - contracts/StakingManager.sol
  - contracts/SkillRegistry.sol
  - contracts/Attribution.sol
findings:
  critical: 2
  warning: 3
  info: 4
  total: 9
status: issues_found
---

# Phase 09: Code Review Report

**Reviewed:** 2026-05-16T00:00:00Z
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

Reviewed three Solidity contracts for phase 09 lock-mechanism. Found 2 critical issues including a circular import that will cause compilation failure and inconsistent reputation tracking across contracts. Also identified security gaps in staking integration and missing cross-contract validation. Code quality issues include redundant state, magic numbers, and incomplete implementation of the anti-slash (retaliation) mechanism.

## Critical Issues

### CR-01: Circular Import in StakingManager.sol

**File:** `contracts/StakingManager.sol:7`
**Issue:** The file imports itself: `import "./StakingManager.sol";`. This will cause a compilation error. The import should be removed as the contract definitions are already available within the file.
**Fix:**
```solidity
// Remove line 7: import "./StakingManager.sol";
// If cross-references to StakingManager are needed within this file, they work
// because this IS the StakingManager contract.
```

### CR-02: Inconsistent Reputation Tracking Across Contracts

**File:** `contracts/StakingManager.sol:20`, `contracts/Attribution.sol:53`
**Issue:** Both contracts independently track `userReputation` via separate mappings. This creates inconsistency where:
- SkillRegistry queries `StakingManager.getUserReputation()` (line 78)
- Attribution has its own `userReputation` mapping (line 53)
- A user's reputation can differ between the two systems

This violates the principle of single source of truth for reputation.

**Fix:** Consolidate reputation tracking to a single contract. Option 1: Make StakingManager the authoritative source and have Attribution query it. Option 2: Have a separate Reputation contract that both StakingManager and Attribution reference.

```solidity
// In Attribution.sol, replace:
mapping(address => int256) public userReputation;

// With a reference to StakingManager's reputation:
function getUserReputation(address _user) external view returns (int256) {
    return stakingManager.getUserReputation(_user);
}
```

## Warnings

### WR-01: Staking Integration Gap in SkillRegistry

**File:** `contracts/SkillRegistry.sol:75`
**Issue:** Tokens transferred to SkillRegistry via `token.transferFrom(msg.sender, address(this), stakeAmount)` are held by the SkillRegistry contract, not staked in StakingManager. There is no mechanism to:
1. Transfer stakes to StakingManager
2. Track individual stakes in StakingManager for each skill
3. Enable proper slashing through StakingManager

**Fix:** Either:
```solidity
// Option 1: Transfer to StakingManager
require(token.transferFrom(msg.sender, address(stakingManager), stakeAmount), "Stake failed");
// And update StakingManager.stake() accordingly

// Option 2: Implement proper stake tracking in SkillRegistry with withdrawal mechanism
```

### WR-02: Unstaking State Reset Bug

**File:** `contracts/StakingManager.sol:72-82`
**Issue:** In `unstake()`, only `info.amount` is reset to 0. The fields `lockedUntil` and `slashed` are not reset. If a user stakes again with the same `_skillId`:
- `slashed` remains true from the previous stake, causing the require at line 58 to fail
- `lockedUntil` retains old timestamp, potentially causing confusion

**Fix:**
```solidity
function unstake(uint256 _skillId) external {
    StakeInfo storage info = stakes[msg.sender][_skillId];
    require(info.amount > 0, "No stake");
    require(block.timestamp > info.lockedUntil, "Still locked");

    uint256 amount = info.amount;
    // Reset all fields to clean state
    info.amount = 0;
    info.lockedUntil = 0;
    info.slashed = false;

    token.transfer(msg.sender, amount);
    emit Unstaked(msg.sender, _skillId, amount);
}
```

### WR-03: Missing Zero-Address Validation

**File:** `contracts/Attribution.sol:13-15`
**Issue:** `setStakingManager()` allows setting `address(0)`, which would cause downstream calls like `stakingManager.setPositiveContribution()` (lines 110-112) to fail silently or revert.
**Fix:**
```solidity
function setStakingManager(address _addr) external onlyOwner {
    require(_addr != address(0), "Invalid address");
    stakingManager = StakingManager(_addr);
}
```

## Info

### IN-01: Redundant State Tracking

**File:** `contracts/SkillRegistry.sol:38, 139`
**Issue:** Both `verifiedSkills[_skillId]` (line 38, 138) and `skills[_skillId].verified` (line 139) are maintained. The first mapping is redundant since `skills[_skillId].verified` provides the same information.
**Fix:** Remove the `verifiedSkills` mapping and the redundant assignment at line 138.

### IN-02: Magic Numbers Without Context

**File:** `contracts/StakingManager.sol:62, 92, 39`
**Issue:** Values like `90 days` (lock period), `25` (reporter reward percentage), and `500` (recovery rate basis points) are magic numbers without descriptive constants.
**Fix:**
```solidity
uint256 public constant LOCK_DURATION = 90 days;
uint256 public constant REPORTER_REWARD_PERCENT = 25;  // basis points
uint256 public constant RECOVERY_RATE_PER_MONTH = 500; // already defined, keep consistent naming
```

### IN-03: Incomplete Anti-Slash Implementation

**File:** `contracts/Attribution.sol:120-123`
**Issue:** The cross-contract check for harmful skills is commented out, leaving the retaliation mechanism incomplete. When a skill is later discovered to be harmful, users who liked it are not penalized.
**Fix:** Implement cross-contract callback or event listener to identify when a liked skill is flagged harmful, then trigger `slashLiker()`.

### IN-04: Redundant likeSkill Implementation

**File:** `contracts/StakingManager.sol:127-134`, `contracts/Attribution.sol:116-138`
**Issue:** Both contracts implement `likeSkill()` with similar logic. This duplication can lead to inconsistency and makes maintenance harder.
**Fix:** Consolidate to a single contract. If Attribution is the authoritative source for contributions and likes, remove `likeSkill()` from StakingManager.

---

_Reviewed: 2026-05-16T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_