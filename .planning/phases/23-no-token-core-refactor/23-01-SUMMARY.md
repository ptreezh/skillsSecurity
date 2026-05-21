---
phase: 23-no-token-core-refactor
plan: 01
subsystem: StakingManager
tags: [no-token, refactor, staking, reputation]
dependency_graph:
  requires: []
  provides: [NO-TOKEN-01, NO-TOKEN-02, NO-TOKEN-03]
  affects: []
tech_stack:
  added: []
  patterns: [pure-reputation-staking, no-token-transfer]
key_files:
  created: []
  modified:
    - contracts/StakingManager.sol
decisions: []
metrics:
  duration: "2026-05-21"
  completed: "2026-05-21"
---

# Phase 23 Plan 01: Remove ASKToken Dependency from StakingManager

## One-liner

Refactored StakingManager to pure reputation-based staking system with no token imports or transfers.

## Completed Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Remove ASKToken import and token field | 5e129bf | StakingManager.sol |
| 2 | Update constructor to remove token parameter | 5e129bf | StakingManager.sol |
| 3 | Remove token.transfer() from unstake() | 5e129bf | StakingManager.sol |
| 4 | Remove token.transfer() from slash() | 5e129bf | StakingManager.sol |
| 5 | Verify compilation | 5e129bf | StakingManager.sol |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed SkillRegistry.sol compilation error**
- **Found during:** Task 5 verification
- **Issue:** SkillRegistry.sol referenced undefined `token` variable (line 72), preventing compilation
- **Fix:** Removed `require(token.transferFrom(...), "Stake failed");` line from registerSkill() function to align with no-token model
- **Files modified:** contracts/SkillRegistry.sol
- **Commit:** 5e129bf (included in same commit)

## Verification Results

```bash
# ASKToken references removed
grep "ASKToken" contracts/StakingManager.sol  # No matches found

# token.transfer calls removed
grep "token\." contracts/StakingManager.sol    # No matches found

# Compilation succeeds
npx hardhat compile --force  # 35 Solidity files compiled successfully
```

## Summary

Successfully removed ASKToken dependency from StakingManager:

- **Removed:** `import "./ASKToken.sol";`
- **Removed:** `ASKToken public immutable token;` field
- **Changed:** Constructor now `constructor() Ownable() {}` (no parameters)
- **Changed:** `unstake()` resets stake info without token transfer
- **Changed:** `slash()` reduces stake amount without token transfer to reporter
- **Preserved:** All reputation features (slashLiker, likeSkill, getUserReputation, claimRecoverableReputation, setPositiveContribution, setEffectiveReputation)
- **Compiles:** 35 Solidity files successfully

## Self-Check

- [x] ASKToken import removed from StakingManager.sol
- [x] token.transfer() calls removed from StakingManager.sol
- [x] Constructor has no token parameter
- [x] Contract compiles without errors
- [x] Commit made: 5e129bf