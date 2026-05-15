# Phase 8: 恢复函数实现 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-15
**Phase:** 08-recovery-functions
**Areas discussed:** ReputationLock Struct, Locked Reputation Handling, Recovery Eligibility, Recovery Calculation

---

## ReputationLock Struct

| Option | Description | Selected |
|--------|-------------|----------|
| ReputationLock struct with basic fields (recommended) | Add lockedAmount + lastClaimTime fields to track lock state per user. Simple, minimal storage. | ✓ |
| Lock records per incident | Track each slash incident as a separate lock record. More granular but complex. | |
| Lock record with lastRecoveryTime | Separate timestamp for each monthly recovery calculation. Easier to calculate partial recovery. | |

**User's choice:** ReputationLock struct with basic fields (recommended)
**Notes:** Simple approach that covers requirements

---

## Locked Reputation Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Separate lockedAmount in struct (recommended) | Locked amount stored in ReputationLock.lockedAmount, getUserReputation() returns effective (total - locked). | ✓ |
| Keep userReputation unchanged | Always return raw userReputation value. Callers use getEffectiveReputation() for voting. | |
| Split into unlocked + locked mappings | userReputation only tracks unlocked. Locked portion managed separately. | |

**User's choice:** Separate lockedAmount in struct (recommended)
**Notes:** Clean separation, getUserReputation() handles effective calculation

---

## Recovery Eligibility

| Option | Description | Selected |
|--------|-------------|----------|
| Has positive contribution since last claim (recommended) | Check if user has any positive contributions since last claim. Simple boolean check. | ✓ |
| Contribution threshold (e.g., 3+ verifications) | Require minimum contribution threshold (e.g., 1 verified skill). Higher bar for recovery. | |
| Time-based cooldown only | Only check current time vs cooldown. No contribution tracking needed. | |

**User's choice:** Has positive contribution since last claim (recommended)
**Notes:** Aligns with spec requirement for positive contributions

---

## Recovery Calculation

| Option | Description | Selected |
|--------|-------------|----------|
| Original slash × 5% × months elapsed (recommended) | Calculate (originalSlash * 5%) * (months elapsed). Simple, matches spec. | ✓ |
| Remaining locked × 5% × months | Calculate (remaining locked * 5%) * (months since last claim). Smaller amounts over time. | |
| Accumulative (grows until claimed) | Track accumulated recoverable amount separately. Only grows, never shrinks. | |

**User's choice:** Original slash × 5% × months elapsed (recommended)
**Notes:** Standard approach, matches SKILLS_STANDARD.md specification

---

## Claude's Discretion

- Contribution tracking mechanism design
- Exact data structure for tracking positive contributions
- Event definitions for reputation changes

---

## Deferred Ideas

None