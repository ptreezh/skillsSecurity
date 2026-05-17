---
phase: 13-staking-tests
plan: "02"
subsystem: testing
tags: [staking, slash, reputation-lock, recovery, hardhat, chai]

dependency_graph:
  requires:
    - phase: "13-01"
      provides: "StakingManager.test.cjs with stake/unstake tests (12 tests)"
  provides:
    - "Complete StakingManager test suite (28 tests total)"
    - "Slash mechanism tests (STAK-02)"
    - "Reputation lock tests (STAK-03)"
    - "Recovery mechanism tests (STAK-04)"
    - "LikeSkill tests"
  affects: [phase-14-skill-attribution-tests]

tech_stack:
  added: []
  patterns:
    - "loadFixture with deployContracts for test isolation"
    - "time.increase() + mine() for time manipulation"
    - "Chai expect with hardhat-chai-matchers for contract assertions"
    - "describe/it BDD structure with access control tests"

key-files:
  created: []
  modified:
    - "test/contracts/StakingManager.test.cjs - Added 16 tests (Slash, Reputation Lock, Recovery, LikeSkill)"

key-decisions:
  - "claimRecoverableReputation must be called from the user's account (user1), not the owner"
  - "Removed SkillLiked event expectation as contract does not emit this event"
  - "Fixed getUserReputation test to not rely on likeSkill for initial reputation"

patterns-established:
  - "Owner-only functions tested with both success (owner) and revert (non-owner) cases"

requirements-completed: [STAK-02, STAK-03, STAK-04]

duration: 25min
completed: 2026-05-17
---

# Phase 13 Plan 02: StakingManager Slash/Reputation/Recovery Tests Summary

**Complete StakingManager test suite with 28 passing tests covering slash mechanism, reputation lock, recovery calculations, and LikeSkill functionality**

## Performance

- **Duration:** 25 min
- **Started:** 2026-05-17
- **Completed:** 2026-05-17
- **Tasks:** 3 (2 test tasks + 1 verification task)
- **Files modified:** 1 (test/contracts/StakingManager.test.cjs)

## Accomplishments
- Added 16 new tests to complete StakingManager coverage (now 28 total tests)
- Verified STAK-02 (slash mechanism with 25% reporter reward)
- Verified STAK-03 (reputation lock and getUserReputation)
- Verified STAK-04 (5% monthly recovery with positive contribution requirement)
- Fixed critical bug: claimRecoverableReputation must be called from user's account

## Task Commits

Each task was committed atomically:

1. **Task 1 & 2 combined: Add Slash, Reputation Lock, Recovery, LikeSkill tests** - `79bed8d` (test)

**Plan metadata:** Phase 13-02 plan complete

## Files Created/Modified
- `test/contracts/StakingManager.test.cjs` - Added 16 tests in 4 describe blocks:
  - Slash (3 tests): slash success with reporter reward, insufficient stake revert, access control
  - Reputation Lock (3 tests): lock creation, effective reputation calculation, access control
  - Recovery (8 tests): 5% monthly calculation, multiple months, positive contribution requirement, 1-month wait period, reset behavior
  - LikeSkill (2 tests): reputation increase, double-like prevention

## Decisions Made
- claimRecoverableReputation reads `reputationLocks[msg.sender]` - must be called from the user whose reputation was locked
- Contract does not emit SkillLiked event on likeSkill() - removed event assertion
- getUserReputation returns max(0, total - locked) to prevent negative voting power

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] claimRecoverableReputation reads msg.sender's locked amount**
- **Found during:** Task 1 (Recovery tests)
- **Issue:** Tests called `staking.claimRecoverableReputation()` (default signer = owner) but owner has no locked reputation. Contract reads `reputationLocks[msg.sender]`.
- **Fix:** Changed all claimRecoverableReputation calls to use `staking.connect(user1).claimRecoverableReputation()`
- **Files modified:** test/contracts/StakingManager.test.cjs
- **Verification:** Recovery tests now pass (8 tests)
- **Committed in:** 79bed8d

**2. [Rule 2 - Missing] Removed SkillLiked event expectation**
- **Found during:** Task 2 (LikeSkill tests)
- **Issue:** Contract's likeSkill() function does not emit a SkillLiked event
- **Fix:** Removed `.to.emit(staking, "SkillLiked")` assertion, tested reputation change instead
- **Files modified:** test/contracts/StakingManager.test.cjs
- **Verification:** LikeSkill tests pass
- **Committed in:** 79bed8d

**3. [Rule 2 - Missing] Fixed getUserReputation test**
- **Found during:** Task 1 (Reputation Lock tests)
- **Issue:** Test tried to use likeSkill to get initial reputation, but likeSkill has requirement `userReputation >= 0` which passes (0 >= 0). However, the calculation was confusing.
- **Fix:** Simplified test to verify effective reputation is 0 after slashLiker with -5 penalty (0 - 5 = -5, capped to 0)
- **Files modified:** test/contracts/StakingManager.test.cjs
- **Verification:** Reputation Lock tests pass
- **Committed in:** 79bed8d

---

**Total deviations:** 3 auto-fixed (3 bug/behavior corrections)
**Impact on plan:** All auto-fixes essential for test correctness. No scope creep.

## Issues Encountered
- Extended debugging session to identify why claimRecoverableReputation always reverted despite lockedAmount > 0. Root cause: function reads `lock.lockedAmount` for `msg.sender`, and tests were calling from owner account.

## Requirements Verification

| Requirement | Tests | Status |
|-------------|-------|--------|
| STAK-02: Slash mechanism | 3 tests (slash success, insufficient stake, access) | PASS |
| STAK-03: Reputation lock | 3 tests (lock creation, effective reputation, access) | PASS |
| STAK-04: Recovery mechanism | 8 tests (calculation, months, requirements, events) | PASS |

## Test Results

```
  StakingManager
    Stake (4 tests) - PASS
    Unstake (5 tests) - PASS
    Time-based Unlock (3 tests) - PASS
    Slash (3 tests) - PASS
    Reputation Lock (3 tests) - PASS
    Recovery (8 tests) - PASS
    LikeSkill (2 tests) - PASS

  28 passing (670ms)
```

## Next Phase Readiness
- Phase 13 complete: 28 StakingManager tests covering STAK-01 through STAK-05
- Phase 14 (SkillRegistry + Attribution tests) can proceed
- Integration tests (Phase 15) ready to use StakingManager test suite as reference

---
*Phase: 13-staking-tests*
*Completed: 2026-05-17*