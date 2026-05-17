# Phase 13: StakingManager 单元测试 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-17
**Phase:** 13-staking-tests
**Mode:** discuss
**Areas discussed:** Test coverage scope

---

## Test Coverage Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Standard coverage | Test each contract function in separate describe blocks with focus on edge cases and revert conditions | ✓ |
| Minimal tests only | Focus on happy paths and critical revert cases only | |

**User's choice:** Standard coverage
**Notes:** Comprehensive testing with edge cases and revert conditions for all StakingManager functionality

## Decisions Made

### Test Organization
- Module structure with separate describe blocks per functional area
- File location: `test/contracts/StakingManager.test.cjs`
- Use `deployContracts` fixture from `test/fixtures.cjs`

### Coverage Strategy
- Standard coverage for all functionality
- Access control tests for onlyOwner modifier
- Event tests for Staked, Unstaked, Slash, RecoveryClaimed

### Time Manipulation
- Use `evm_increaseTime` and `evm_mine` for simulating time passage
- Verify 90-day lock period unlock behavior

### Reputation Lock
- Test `userReputation` and `lockedAmount` interaction
- Test `getUserReputation()` returns `total - locked`
- Test `getRecoverableReputation()` returns correct structure

### Recovery Mechanism
- Test 5% monthly recovery rate
- Test `hasPositiveContribution` requirement
- Test recovery cannot exceed locked amount

---

*Discussion completed: 2026-05-17*