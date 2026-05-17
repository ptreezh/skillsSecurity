# Phase 14: SkillRegistry + Attribution 单元测试 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-17
**Phase:** 14-skill-attribution-tests
**Mode:** discuss
**Areas discussed:** Test file organization

---

## Test File Organization

| Option | Description | Selected |
|--------|-------------|----------|
| Two separate test files | test/SkillRegistry.test.cjs and test/Attribution.test.cjs | ✓ |
| Single combined test file | One combined test file | |

**User's choice:** Two separate test files
**Notes:** Clear separation, easier to debug, follows Phase 12/13 patterns

## Decisions Made

### Test Organization
- Two independent test files
- test/contracts/SkillRegistry.test.cjs for SkillRegistry tests
- test/contracts/Attribution.test.cjs for Attribution tests
- Use deployContracts fixture

### Coverage Scope
- SKIL-01: Reputation tier gates (L1-L5) for skill registration
- SKIL-02: Fingerprint generation consistency
- SKIL-03: Skill verification flow
- SKIL-04: getUserReputation integration
- ATTR-01: Contribution creation and tracking
- ATTR-02: Like prevention (double-like check)
- ATTR-03: Cross-contract notifications
- ATTR-04: setPositiveContribution trigger

### Cross-Contract Testing
- SkillRegistry → StakingManager.getUserReputation()
- Attribution → StakingManager.setPositiveContribution()
- Attribution.setStakingManager() critical setup step

---

*Discussion completed: 2026-05-17*