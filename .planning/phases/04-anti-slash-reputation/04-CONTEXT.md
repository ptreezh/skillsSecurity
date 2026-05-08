# Phase 4: 反噬与声望系统 - Context

**Gathered:** 2026-05-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete anti-slash mechanism and reputation system sections in SKILLS_STANDARD.md. Covers SLASH-01 through SLASH-04 (anti-slash) and REP-01 through REP-04 (reputation), plus INT-01 through INT-04 (integration).

</domain>

<decisions>
## Implementation Decisions

### Slash Evidence Standards (SLASH-01)
- **Multi-layer evidence required** for slashing skill creators
- Evidence must include:
  1. Code review with specific vulnerability citations
  2. Security scan results (Slither or equivalent)
  3. Signed attestation from reporter
  4. Harm documentation (if applicable)

### Slash Recovery Process (SLASH-03)
- **Slow earning recovery** — No lockout period
- Recovery rate: 5% of original slashed reputation per month
- Activity requirements: Must continue positive contributions
- No automatic recovery — must be earned

### Reputation Accumulation (REP-01)
- **No cap** on maximum reputation accumulation
- Reputation can grow indefinitely through positive contributions
- Exact point values to be finalized in planning

### Reputation Decay (REP-03)
- **No decay** for inactive users
- Reputation stays stable regardless of activity level
- Rationale: Rewards long-term contributors without punishing breaks

### Privilege Tiers (REP-02)
- **Tiered thresholds with expanded system:**
  - L1 观察者 (Observer): 0+ reputation
  - L2 贡献者 (Contributor): 100+ reputation
  - L3 验证者 (Verifier): 500+ reputation
  - L4 守护者 (Guardian): 2000+ reputation
  - L5 长老 (Elder): 5000+ reputation
- Each tier has distinct privileges that accumulate

### Token Migration (REP-04)
- **1:1 conversion** — 1 reputation point = 1 token
- **No restrictions** at token launch
- Free conversion for all reputation holders
- Rationale: Fair treatment of early contributors

### Committee Structure (SLASH-02)
- Uses existing committee from Phase 3 appeal process
- 3 elders (声望≥5000) review slash accusations
- Committee structure already defined in Section 6.3

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Main document
- `SKILLS_STANDARD.md` — Main document being updated
  - Section 6.1: Anti-slash trigger conditions (existing)
  - Section 6.2: Anti-slash execution contract (existing)
  - Section 6.3: Appeal process (Phase 3 additions)
  - Section 7: Reputation system (existing)

### Contract implementations
- `contracts/StakingManager.sol` — Reputation tracking, slashLiker function
- `contracts/SkillRegistry.sol` — Skill state management
- `contracts/Attribution.sol` — Contribution tracking

### Prior phase context
- `.planning/phases/02-classification-standards/02-CONTEXT.md` — Classification and verification decisions
- `.planning/phases/03-tracing-process/03-CONTEXT.md` — Appeal process, state machine decisions

### Requirements tracking
- `.planning/REQUIREMENTS.md` — SLASH-01~04, REP-01~04, INT-01~04

</canonical_refs>

<codebase_context>
## Existing Code Insights

### Reusable Assets
- Section 6.3 appeal process flowchart (Phase 3) — reuse for slash workflow
- Reputation level enum from Phase 2 context
- Committee structure already defined

### Established Patterns
- ASCII flowchart style for process diagrams
- Table format for evidence requirements
- Committee review process from appeal flow

### Integration Points
- Slash decisions connect to StakingManager.sol
- Reputation changes affect user privileges
- Token migration affects future token contract

</codebase_context>

<specifics>
## Specific Ideas

- Multi-layer evidence: "Code review + scan + attestation + harm docs"
- Recovery: "Slow earning at 5% per month, no lockout"
- Privileges: "Clear tier progression with meaningful differences"
- Token: "1:1 conversion, no restrictions"

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-anti-slash-reputation*
*Context gathered: 2026-05-08*
