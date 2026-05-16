# AgentSkills Roadmap

## Milestones

- ✅ **v1.1 标准文档完善** — Phases 1-7 (shipped 2026-05-15)
- 🚧 **v1.2 技术债补齐** — Phases 8-10 (in progress)

---

## Milestones Summary

### ✅ v1.1 标准文档完善 (Phases 1-7)

**Shipped:** 2026-05-15
**Requirements:** 32/32 complete

**Tech Debt (Resolved in v1.2):**
- Recovery functions not implemented → v1.2
- Reputation lock mechanism → v1.2

---

### 🚧 v1.2 技术债补齐 (Phases 8-10)

**Started:** 2026-05-15
**Goal:** 实现声望恢复函数和锁定机制

**Requirements:**
- RECOV-01 ~ RECOV-05: 恢复函数
- LOCK-01 ~ LOCK-04: 锁定机制
- DOCU-01 ~ DOCU-02: 文档更新

---

## Phases

### Phase 8: 恢复函数实现

**Goal:** 实现 getRecoverableReputation() 和 claimRecoverableReputation()

**Requirements covered:**
- RECOV-01, RECOV-02, RECOV-03

**Plans:**
- [x] 08-01-PLAN.md - ReputationLock struct, recovery functions

**Success criteria:**
1. `getRecoverableReputation()` returns locked amount and next claim time
2. `claimRecoverableReputation()` transfers recovered reputation to user balance
3. `ReputationLock` struct tracks per-user lock state

---

### Phase 9: 锁定机制实现

**Goal:** 完成声望锁定和恢复逻辑

**Requirements covered:**
- RECOV-04, RECOV-05, LOCK-01, LOCK-02, LOCK-03, LOCK-04

**Plans:**
- [x] 09-01-PLAN.md — Lock mechanism and recovery integration

**Success criteria:**
1. Locked reputation excluded from voting power calculation
2. Locked reputation excluded from feature unlock calculation
3. 5% monthly recovery rate implemented
4. Recovery eligibility verified before claim

---

### Phase 10: 文档更新

**Goal:** 更新 SKILLS_STANDARD.md 反映已实现的功能

**Requirements covered:**
- DOCU-01, DOCU-02

**Plans:**
1/1 plans complete

**Success criteria:**
1. Section 6.4 "future implementation" note removed
2. Section 6.2 compatibility table updated with implemented functions

---

## Phase Progress

| Phase | Focus | Requirements | Status |
|-------|-------|-------------|--------|
| 1-7 | v1.1 标准文档完善 | 32 | ✅ Complete |
| 8 | 恢复函数实现 | 3 | ✅ Complete |
| 9 | 锁定机制实现 | 6 | ✅ Complete |
| 10 | 1/1 | Complete    | 2026-05-16 |

---

*Roadmap created: 2026-05-06*
*Last updated: 2026-05-16 after phase 10 planned*