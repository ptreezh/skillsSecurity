# Phase 02: 分类与验证标准 - Context

**Gathered:** 2026-05-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete skill classification and security verification sections in SKILLS_STANDARD.md. Covers CLASS-01 through CLASS-04 (classification) and SEC-01 through SEC-04 (security verification).

</domain>

<decisions>
## Implementation Decisions

### Risk Classification Examples (CLASS-01)
- Each risk level (LOW/MEDIUM/HIGH/CRITICAL) requires 5+ concrete examples
- Current document has only 3 examples per level
- Expand to minimum 5 examples per risk level

### AI-Generated Code Classification (CLASS-02)
- Add explicit classification rules for AI-generated code
- Define boundary conditions for AI-assisted vs AI-autonomous skills
- Add specific criteria for when AI-generated code requires elevated verification

### Risk Assessment Decision Tree (CLASS-03)
- Create ASCII flowchart for risk classification decision process
- Tree should guide creators through: read/write, reversibility, fund exposure, data impact
- Follow existing document style (ASCII diagrams already used in sections 3.1, 5.1)

### Staking Amount Alignment (CLASS-04)
- **UPDATE DOCUMENT to match contract values**
- Contract uses: 10/50/100/200 ether (MIN_STAKE_LOW/MEDIUM/HIGH/CRITICAL)
- Document currently says: 50/100/200/500 (points)
- Align document "积分要求" with contract `MIN_STAKE_*` constants:
  - LOW: 10 ether
  - MEDIUM: 50 ether
  - HIGH: 100 ether
  - CRITICAL: 200 ether

### Verification Checklist (SEC-01)
- Formalize verification checklist as actionable markdown
- Separate checklists for: creator self-check, verifier review, auditor audit
- Each checklist item should be actionable (begin with verb, specify what to check)

### Verification Timeouts (SEC-02)
- **Keep existing schedule from document section 3.2**
- LOW: 7 days, MEDIUM: 5 days, HIGH: 3 days, CRITICAL: 1 day
- Note: This is verification phase timeout, not stake lock period (90 days is separate)

### Verification Conflict Resolution (SEC-03)
- Use majority voting: 2/3 or more verifiers must approve
- If threshold not met: skill enters "re-review" state
- Re-review process: 3 options - modify and resubmit, appeal to committee, or withdraw

### Verifier Slash Conditions (SEC-04)
- **Full definition of verifier slash conditions**
- Verifier slash triggers:
  - Approved malicious skill (caused actual harm): 100% reputation penalty
  - Approved malicious skill (no harm): 50% reputation penalty
  - Repeated misjudgment (3+ wrong decisions): reputation freeze
- Evidence requirements: code review comments, security scan results, signed attestation
- Appeal process: 7-day window, review by committee

### Classification Standards Section Structure
- Section 2.1: Risk level table (update stake amounts)
- Section 2.2: Risk criteria descriptions (add AI-generated code rules)
- Section 2.3: Solidity implementation (verify constants match updated document)

### Verification Standards Section Structure
- Section 3.1: Verification flow (add conflict resolution sub-section)
- Section 3.2: Verifier requirements (update timeouts if changed)
- Section 3.3: Verification checklist (expand with actionable items)
- New section 3.4: Verifier slash conditions

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Standards document
- `SKILLS_STANDARD.md` — Main document being updated (current lines 75-195 cover sections 2 and 3)

### Contract implementations
- `contracts/SkillRegistry.sol` — MIN_STAKE_* constants (lines 41-44), riskLevel enum (line 23)
- `contracts/StakingManager.sol` — Reputation tracking, slashLiker function (lines 76-81)

### Prior phase context
- `.planning/phases/01-docs-structure/01-CONTEXT.md` — Document structure decisions (TOC format, cross-reference style)

### Requirements tracking
- `.planning/REQUIREMENTS.md` — CLASS-01, CLASS-02, CLASS-03, CLASS-04, SEC-01, SEC-02, SEC-03, SEC-04

</canonical_refs>

<codebase_context>
## Existing Code Insights

### Reusable Assets
- SKILLS_STANDARD.md: Existing ASCII flowcharts in sections 3.1, 5.1 can serve as style reference
- Contract constants: MIN_STAKE_LOW (10), MIN_STAKE_MEDIUM (50), MIN_STAKE_HIGH (100), MIN_STAKE_CRITICAL (200)
- RiskLevel enum: LOW=0, MEDIUM=1, HIGH=2, CRITICAL=3

### Established Patterns
- ASCII diagram style already used in document
- Cross-reference format: `[Section Name](#anchor)` already established
- Risk level table format already established

### Integration Points
- Staking amounts in section 2.1 table need update
- Verification flow in section 3.1 needs conflict resolution
- New section 3.4 will reference StakingManager.sol slashLiker function

</codebase_context>

<specifics>
## Specific Ideas

- AI-generated code classification: "Skills where >50% of code is AI-generated should be classified at least one level higher than similar human-written skills"
- Decision tree questions: 1) Does it modify external state? 2) Is it reversible? 3) Are funds involved? 4) Is user data exposed?
- Verifier evidence: Must include signed code review attestation with specific vulnerability citations

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope (classification and verification)

### Reviewed Todos (not folded)
None

</deferred>

---

*Phase: 02-classification-standards*
*Context gathered: 2026-05-07*
