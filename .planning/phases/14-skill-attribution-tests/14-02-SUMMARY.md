---
phase: 14
plan: 02
subsystem: Attribution
tags: [attribution, contribution, like-skill, test-report, cross-contract, test]
dependency_graph:
  requires:
    - 14-01 (Attribution contract already deployed via fixtures)
  provides:
    - ATTR-01
    - ATTR-02
    - ATTR-03
    - ATTR-04
  affects:
    - Attribution contract (addContribution, likeSkill, addTestReport)
    - StakingManager contract (setPositiveContribution, getUserReputation)
tech_stack:
  added:
    - hardhat test framework
    - chai assertions
    - loadFixture for snapshot isolation
  patterns:
    - Test helper: giveEffectiveReputation via StakingManager.setEffectiveReputation
    - Array element access: mapping(skillId, index) syntax for solidity mappings of arrays
    - Fresh user isolation: each test uses fresh accounts to avoid hasPositiveContribution conflicts
key_files:
  created:
    - test/contracts/Attribution.test.cjs
decisions:
  - "Solidity mapping(array): Access dynamic arrays via mapping(key, index) syntax, not mapping(key)[]. This is required for ethers v6 compatibility."
  - "setPositiveContribution idempotency: setPositiveContribution is idempotent but throws on re-set. Tests must use unique reporters or a fresh snapshot per test."
  - "accounts[] vs named users: Named destructuring (user1, user2) may conflict with prior tests in the same describe block. Use accounts[N] for distinct users within a single test."
  - "hasLiked is global per user: Once a user likes any skill, they cannot like any other skill. This is by design, not a bug."
metrics:
  duration: "2026-05-17T05:15:xxZ to 2026-05-17T05:16:xxZ"
  completed: "2026-05-17"
  tasks_completed: 3
  files_created: 1
  tests_passed: 25
  tests_failed: 0
---

# Phase 14 Plan 02: Attribution Tests ATTR-01 to ATTR-04 Summary

## One-liner

Full Attribution contract test coverage for ATTR-01 through ATTR-04: contribution creation, like mechanism, and cross-contract notification with StakingManager.

## What Was Built

`test/contracts/Attribution.test.cjs` with 25 passing tests covering:

### ATTR-01: Contribution Creation

- Owner can add GENESIS contribution and verify struct fields (contributor, share, ctype, contentHash)
- All 5 contribution types (GENESIS, FORK, AUDIT, BUGFIX, TRANSLATION) tested
- Multiple contributions accumulate for the same skill (skillContributions[skillId] grows)
- contributionCount mapping updated correctly after each addContribution
- contributorSkills mapping tracks which skills a user contributed to
- Non-owner reverts with "Ownable: caller is not the owner"
- Share values (percentage * 100) stored and retrieved correctly

### ATTR-02: Like Mechanism

- SkillLiked event emitted with correct (user, skillId) arguments
- hasLiked[user] set to true after likeSkill
- skillLikes[skillId] array populated with Like struct (user, skillId, timestamp)
- likeCount[skillId] incremented after like
- Global hasLiked prevention: same user cannot like a different skill (hasLiked is per-user, not per-skill)
- Different users can like the same skill simultaneously
- Fresh user with 0 effective reputation can like (>= 0 check passes)
- User with positive reputation can like

### ATTR-03 & ATTR-04: Cross-Contract Integration

- ATTR-04: score > 0 triggers StakingManager.setPositiveContribution (PositiveContributionSet event emitted, hasPositiveContribution[user] = true)
- ATTR-03: negative score does NOT trigger setPositiveContribution
- ATTR-03: zero score does NOT trigger setPositiveContribution
- Score of 1 (positive) triggers correctly
- Score of -1 (negative) does not trigger
- skillTestReports[skillId] array populated with TestReport struct (reporter, severity, score, timestamp)
- testReportCount[skillId] incremented correctly
- Non-owner reverts with "Ownable: caller is not the owner"
- Severity values (1-5) preserved correctly in test report
- Large negative score (-100) correctly does not trigger and is stored in report

## Deviations from Plan

### Auto-fixed Issue: Solidity array mapping syntax (ethers v6 compatibility)

- **Found during:** Task 1 (ATT R-01 contribution tests)
- **Issue:** Accessing `skillContributions(skillId)` returned a Solidity error "no matching fragment". The contract uses `mapping(uint256 => Contribution[])` which in ethers v6 requires `(skillId, index)` syntax, not `skillContributions(skillId)[index]`.
- **Fix:** Changed all array element access from `contributions[0]` to `contributions(skillId, 0)`. This applies to skillContributions, skillLikes, skillTestReports, and contributorSkills.
- **Files modified:** test/contracts/Attribution.test.cjs
- **Commit:** 683f4c9

### Auto-fixed Issue: setPositiveContribution idempotency conflict

- **Found during:** Task 3 (addTestReport tests)
- **Issue:** Two tests added test reports for the same reporter (user1) with positive scores. The second call to addTestReport triggered setPositiveContribution which reverted with "Already set".
- **Fix:** Changed tests to use unique reporters. "testReportCount is incremented correctly" uses (user1, accounts[0], accounts[1]). "severity values are preserved" uses (user1, accounts[0], accounts[1]).
- **Files modified:** test/contracts/Attribution.test.cjs
- **Commit:** 683f4c9

### Auto-fixed Issue: user2/user3 conflict with fixture

- **Found during:** Task 2 (likeSkill tests)
- **Issue:** `different users can like the same skill` test used `user1, user2, user3` from named destructuring, but these had already been used in prior tests within the describe block. user2 was the same as the fixture's user2 who had been used in earlier tests, causing state conflicts.
- **Fix:** Changed to use `accounts[0], accounts[1], accounts[2]` which are fresh per loadFixture snapshot.
- **Files modified:** test/contracts/Attribution.test.cjs
- **Commit:** 683f4c9

## Threat Flags

None - test-only changes with no production security impact.

## Self-Check

- All 25 tests pass
- Attribution.test.cjs created with 387 lines
- ATTR-01 to ATTR-04 test coverage complete
- Commit hash: 683f4c9