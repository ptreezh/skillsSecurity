---
phase: 15
plan: 01
subsystem: integration
tags: [integration, deployment, reputation-flow, test]
dependency_graph:
  requires: []
  provides: [INTG-01, INTG-02]
  affects: [test/contracts/Integration.test.cjs]
tech_stack:
  added: [chai, hardhat-network-helpers]
  patterns: [loadFixture, event assertions, time manipulation]
key_files:
  created: [test/contracts/Integration.test.cjs]
decisions:
  - "Fixed BigNumber issue by extracting skillId from transaction receipt events instead of using return value"
  - "Used loadFixture for snapshot isolation across all test cases"
  - "Extracted staking variable from destructured result to fix ReferenceError"
start_time: "2026-05-17T05:52:13Z"
duration_seconds: 60
---

# Phase 15 Plan 01: Integration Tests - INTG-01 & INTG-02

## Summary

Created `test/contracts/Integration.test.cjs` with comprehensive integration tests covering full deployment verification (INTG-01) and reputation flow end-to-end (INTG-02).

## One-liner

INTG-01 and INTG-02 integration tests for deployment wiring and reputation flow (register -> verify -> positive contribution -> recovery).

## Tasks Completed

| Task | Name | Status | Commit |
|------|------|--------|--------|
| 1 | INTG-01: Full Deployment Verification | 4 tests passing | ddb982e |
| 2 | INTG-02: Reputation Flow | 5 tests passing | ddb982e |
| 3 | Test File Structure | Verified | ddb982e |

## Test Results

```
Integration Tests
  INTG-01: Full Deployment
    ✔ should deploy all contracts in correct order
    ✔ should wire SkillRegistry to StakingManager
    ✔ should wire Attribution to StakingManager
    ✔ should have correct token references in all contracts
  INTG-02: Reputation Flow
    ✔ should complete full reputation flow: register -> verify -> positive contribution
    ✔ should not trigger positive contribution when verify with pass=false
    ✔ should lock reputation on slash then allow recovery after positive contribution
    ✔ should verify reputation flow with MEDIUM skill requiring 500 reputation
    ✔ should emit SkillRegistered and SkillVerified events in reputation flow

9 passing
```

## Acceptance Criteria Verification

### INTG-01
- [x] `grep -n "INTG-01" test/contracts/Integration.test.cjs` returns 4+ test cases
- [x] `grep -n "stakingManager" test/contracts/Integration.test.cjs` finds staking wiring verification
- [x] `grep -n "token.target" test/contracts/Integration.test.cjs` finds token reference checks

### INTG-02
- [x] `grep -n "INTG-02" test/contracts/Integration.test.cjs` returns 5+ test cases
- [x] `grep -n "PositiveContributionSet" test/contracts/Integration.test.cjs` finds event assertion
- [x] `grep -n "claimRecoverableReputation" test/contracts/Integration.test.cjs` finds recovery flow
- [x] `grep -n "getRecoverableReputation" test/contracts/Integration.test.cjs` finds recoverable query
- [x] `grep -n "time.increase" test/contracts/Integration.test.cjs` finds time advancement for recovery

## Deviations from Plan

None - plan executed exactly as written.

## Commits

- `ddb982e` test(15-01): add Integration tests for INTG-01 and INTG-02

## Self-Check

- [x] Integration.test.cjs exists
- [x] Commit ddb982e exists in git log
- [x] All 9 tests pass
- [x] All acceptance criteria verified