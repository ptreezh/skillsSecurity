# Phase 03: 追溯与流程标准 - Context

**Gathered:** 2026-05-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete responsibility tracing (Section 4) and on-chain process (Section 5) sections in SKILLS_STANDARD.md. This phase covers:
- TRACE-01: Fingerprint algorithm documentation (already exists in doc)
- TRACE-02: Minimum audit trail events definition
- TRACE-03: IPFS storage format specification
- TRACE-04: Traceability verification test cases
- PROC-01: Complete state machine with all transitions
- PROC-02: Error codes for each failure mode
- PROC-03: Gas cost estimates for each operation
- PROC-04: Appeal process with timeline

Note: Section 6 (反噬机制) is Phase 4 scope (SLASH requirements).

</domain>

<decisions>
## Implementation Decisions

### Audit Trail Events (TRACE-02)
- **Full event chain** approach — record all lifecycle operations
- Minimum audit trail events:
  1. `SKILL_CREATED` — Skill creation with fingerprint
  2. `SKILL_SUBMITTED` — Submitted to verification pool
  3. `VERIFIER_ASSIGNED` — Verifier assigned to skill
  4. `VERIFICATION_VOTED` — Each verifier vote (approve/reject)
  5. `SKILL_APPROVED` / `SKILL_REJECTED` — Verification result
  6. `SKILL_CHAINED` — Skill registered on-chain
  7. `SKILL_INVOKED` — Skill called by user
  8. `SLASH_TRIGGERED` — Anti-slash penalty applied (if applicable)

### IPFS Storage Format (TRACE-03)
- **Hybrid storage approach** — on-chain + off-chain separation
- On-chain (essential, indexed): skillId, fingerprint, creator, riskLevel, verificationStatus, timestamps
- IPFS (verifiable, detailed): full skill metadata, code, documentation, audit reports, verification evidence
- IPFS metadata structure: JSON with schema version, content type, signature, timestamp
- Rationale: Fast on-chain queries + complete off-chain verification data

### State Machine (PROC-01)
- **Core + sub-states approach** — maintain core states with embedded sub-states
- Core states: DRAFT → PENDING → VERIFYING → APPROVED → ACTIVE → (SLAUGHTERED)
- Sub-states embedded within VERIFYING:
  - `VERIFYING_WAITING` — Waiting for verifier assignment
  - `VERIFYING_IN_PROGRESS` — Active voting in progress
  - `VERIFYING_EXPIRED` — Verification timeout exceeded
- Sub-states within APPROVED:
  - `APPROVED_PENDING_CHAIN` — Approved, awaiting on-chain registration
  - `APPROVED_CHAINING` — On-chain transaction in progress
- Appeal state: `UNDER_APPEAL` — Skill under appeal review (between APPROVED and ACTIVE, or SLAUGHTERED and recovery)

### Error Codes (PROC-02)
- **Module-prefixed error codes** — MODULE_NUMBER format
- Modules:
  - `REG_xxx` — Registration errors (SkillRegistry)
  - `VAL_xxx` — Verification errors
  - `CHN_xxx` — Chain/on-chain errors
  - `ATR_xxx` — Attribution errors
  - `STK_xxx` — Staking errors
- Each error includes: code, description, action, retry flag

### Gas Estimates (PROC-03)
- Include gas cost estimates for each operation in documentation
- Use Hardhat gas reporter for actual measurements
- Key operations to document:
  - Skill registration
  - Verifier assignment
  - Verification voting
  - On-chain skill activation
  - Slash execution

### Appeal Process (PROC-04)
- Appeal window: 7 days from penalty notification
- Appeal committee: 3 elders (长老) required for review
- Timeline:
  - Day 0: Penalty notification
  - Day 1-7: Submit appeal with evidence
  - Day 8-10: Committee review
  - Day 11: Resolution (uphold/reverse/partial)
- Evidence requirements for appeal:
  - Original review records
  - Counter-evidence (if any)
  - Third-party security assessment (optional)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Main document
- `SKILLS_STANDARD.md` — Document being updated (Section 4 for TRACE, Section 5 for PROC)

### Contract implementations
- `contracts/SkillRegistry.sol` — Skill registration, state management, error handling
- `contracts/Attribution.sol` — Attribution tracking
- `contracts/StakingManager.sol` — Staking, anti-slash mechanisms

### Prior phase context
- `.planning/phases/02-classification-standards/02-CONTEXT.md` — Classification and verification decisions
- `.planning/phases/01-docs-structure/01-CONTEXT.md` — Document structure decisions

### Requirements tracking
- `.planning/REQUIREMENTS.md` — TRACE-01~04, PROC-01~04 requirements

[No external specs — requirements fully captured above]
</canonical_refs>

<codebase_context>
## Existing Code Insights

### Reusable Assets
- `skillAuditTrail` mapping in SkillRegistry.sol (lines 494-514) — Simple string array format
- `computeFingerprint` function — Already documented in section 4.1
- RiskLevel enum (LOW=0, MEDIUM=1, HIGH=2, CRITICAL=3) — Used for level-based configurations

### Established Patterns
- ASCII diagram style in SKILLS_STANDARD.md (sections 3.1, 5.1)
- JSON format for on-chain data (section 5.2)
- State machine flowchart style (section 5.3)

### Integration Points
- Audit trail connects to Attribution.sol for contribution tracking
- State machine transitions trigger StakingManager.sol stake locking/unlocking
- IPFS metadata validation during verification phase

</codebase_context>

<specifics>
## Specific Ideas

- Audit event format: `{timestamp}-{actor}-{action}-{details}` pattern
- IPFS metadata should include content hash, signature, and timestamp for verification
- Appeal process should have automatic notification system
- Gas estimates should be updated after testnet deployment

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope (tracing and process standards)

### Reviewed Todos (not folded)
None

</deferred>

---

*Phase: 03-tracing-process*
*Context gathered: 2026-05-07*