# AgentSkills Roadmap - Milestone v1.1

**Milestone:** v1.1 标准文档完善
**Started:** 2026-05-06
**Goal:** Complete SKILLS_STANDARD.md v1.1 with full specifications

---

## Phase 1: 文档结构完善

**Goal:** Organize and structure SKILLS_STANDARD.md for v1.1 finalization

**Requirements covered:**
- DOCS-01, DOCS-02, DOCS-03

**Plans:**
- [x] 01-01-PLAN.md - TOC, section numbering, cross-references

**Success criteria:**
1. Document status updated to "正式版 v1.1"
2. All sections properly numbered
3. Table of contents auto-generated
4. No broken cross-references

---

## Phase 2: 分类与验证标准

**Goal:** Complete skill classification and security verification sections

**Requirements covered:**
- CLASS-01, CLASS-02, CLASS-03, CLASS-04
- SEC-01, SEC-02, SEC-03, SEC-04

**Plans:**
- [x] 02-01-PLAN.md - Section 2 updates (classification standards)
- [x] 02-02-PLAN.md - Section 3 updates (verification standards)

**Success criteria:**
1. 5+ concrete examples per risk level
2. Risk assessment decision tree included
3. Verification checklists are actionable
4. Verifier slash conditions documented
5. Staking amounts verified against contracts

---

## Phase 3: 追溯与流程标准

**Goal:** Complete responsibility tracing and on-chain process sections

**Requirements covered:**
- TRACE-01, TRACE-02, TRACE-03, TRACE-04
- PROC-01, PROC-02, PROC-03, PROC-04

**Plans:**
- [x] 03-01-PLAN.md - Sections 4 and 5 (tracing and process standards)

**Success criteria:**
1. Fingerprint algorithm fully documented
2. Minimum audit trail events defined
3. IPFS storage format specified
4. State machine with all transitions
5. Error codes for each failure mode
6. Gas cost estimates included

---

## Phase 4: 反噬与声望系统

**Goal:** Complete anti-slash mechanism and reputation system sections

**Requirements covered:**
- SLASH-01, SLASH-02, SLASH-03, SLASH-04
- REP-01, REP-02, REP-03, REP-04
- INT-01, INT-02, INT-03, INT-04

**Plans:**
- [x] 04-01-PLAN.md - Complete anti-slash and reputation sections
- [x] 04-02-PLAN.md - Fix contract reference mismatches (gap closure)

**Success criteria:**
1. Evidence standards for accusations defined
2. Review committee structure documented
3. Recovery process after slashing specified
4. Exact point values for all actions
5. Reputation-to-privilege mapping complete
6. Contract references verified against implementations
7. ABI reference appendix created

---

---

## Phase 5: 文档修复

**Goal:** Fix documentation inconsistencies identified in milestone audit

**Requirements covered:**
- DOCS-01, DOCS-02 (gap closure)

**Plans:**
- [x] 05-01-PLAN.md - TOC and anchor fixes

**Success criteria:**
1. TOC section 9.2 entry updated to "ABI参考"
2. Section order: 9.3 before 9.4

---

## Phase 6: 标准一致性

**Goal:** Standardize cross-references and values across sections

**Requirements covered:**
- SEC-04, SLASH-01 (gap closure)

**Plans:**
- [x] 06-01-PLAN.md - Reputation penalty and cross-reference fixes

**Success criteria:**
1. Section 3.4 reputation penalty standardized to -200
2. Cross-reference from Section 3.4 to Section 6.1 added

---

## Phase 7: 合约对齐

**Goal:** Align documentation with current contract capabilities

**Requirements covered:**
- SLASH-03, INT-02 (gap closure)

**Plans:**
- [ ] 07-01-PLAN.md - Document future implementation notes

**Success criteria:**
1. Section 6.4 notes that recovery functions are future implementation
2. Section 6.2 compatibility table cross-referenced from Section 6.4

---

## Summary

| Phase | Focus | Requirements | Status |
|-------|-------|-------------|--------|
| 1 | 文档结构完善 | 3 | Completed |
| 2 | 分类与验证标准 | 8 | Completed |
| 3 | 追溯与流程标准 | 8 | Completed |
| 4 | 反噬与声望系统 | 12 | Completed |
| 5 | 文档修复 | 2 | Planned |
| 6 | 标准一致性 | 2 | Planned |
| 7 | 合约对齐 | 2 | Planned |

**Total:** 31 requirements across 7 phases (4 original + 3 gap closure)

---
*Roadmap created: 2026-05-06*
*Updated: 2026-05-08*