# Requirements: AgentSkills

**Defined:** 2026-05-15
**Core Value:** Skills with accountability — every action is traceable, every contributor is credited, every violation has consequences.

## v1.2 Requirements

Requirements for v1.2 技术债补齐 (tech debt closure). Each maps to roadmap phases.

### Reputation Recovery

- [ ] **RECOV-01**: Implement `getRecoverableReputation()` function in StakingManager.sol
- [ ] **RECOV-02**: Implement `claimRecoverableReputation()` function with monthly recovery logic
- [ ] **RECOV-03**: Add ReputationLock struct to track locked reputation per user
- [ ] **RECOV-04**: Implement 5% monthly recovery rate calculation
- [ ] **RECOV-05**: Add recovery eligibility checks (positive contributions required)

### Reputation Locking

- [ ] **LOCK-01**: Track locked reputation amount separate from total balance
- [ ] **LOCK-02**: Locked reputation not counted for voting power
- [ ] **LOCK-03**: Locked reputation not counted for feature unlocking
- [ ] **LOCK-04**: Only recovered reputation becomes unlocked

### Documentation Update

- [ ] **DOCU-01**: Update SKILLS_STANDARD.md Section 6.4 to remove "future implementation" note
- [ ] **DOCU-02**: Add implementation notes to Section 6.2 compatibility table

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| RECOV-01 | Phase 1 | Pending |
| RECOV-02 | Phase 1 | Pending |
| RECOV-03 | Phase 1 | Pending |
| RECOV-04 | Phase 2 | Pending |
| RECOV-05 | Phase 2 | Pending |
| LOCK-01 | Phase 2 | Pending |
| LOCK-02 | Phase 2 | Pending |
| LOCK-03 | Phase 2 | Pending |
| LOCK-04 | Phase 2 | Pending |
| DOCU-01 | Phase 3 | Pending |
| DOCU-02 | Phase 3 | Pending |

**Coverage:**
- v1.2 requirements: 11 total
- Mapped to phases: 11
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-15*
*Last updated: 2026-05-15 after v1.2 started*