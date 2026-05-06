# Phase 01: 文档结构完善 - Context

**Gathered:** 2026-05-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Organize and structure SKILLS_STANDARD.md for v1.1 finalization. This phase covers documentation formatting only — content improvements are handled in subsequent phases.

</domain>

<decisions>
## Implementation Decisions

### TOC generation
- Use static markdown list at top of document
- Manual numbered list, not auto-generated
- Simple and requires no build dependencies

### Cross-reference format
- Use section anchors with markdown links: `[Section Name](#section-anchor)`
- Example: `see [3.1 安全验证标准](#31-安全验证标准)`
- All references point within the same document

### Structure scope (carried from roadmap)
- DOCS-01: Status change to 正式版 v1.1
- DOCS-02: Consistent section numbering (1.x, 2.x format)
- DOCS-03: Table of contents generated
- Fix broken cross-references

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project context
- `.planning/ROADMAP.md` — Phase 1 goals and success criteria
- `.planning/PROJECT.md` — Core value and current milestone
- `SKILLS_STANDARD.md` — The document being structured (current 507-line draft)

### Requirements tracking
- `.planning/REQUIREMENTS.md` — DOCS-01, DOCS-02, DOCS-03 requirements

[No external specs — requirements are fully captured in decisions above]
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- SKILLS_STANDARD.md: Already exists with 9 sections (lines 1-507)
- Status field at line 5: `**状态：** 草稿 v1.1`
- Section structure uses numbered headers (## 1, ## 2, etc.)

### Established Patterns
- Current numbering: Simple `## N` format
- Target numbering: Hierarchical `1.x` format per DOCS-02

### Integration Points
- Version header (lines 1-7) needs update for 正式版 status
- TOC should be inserted after the version header block
- Cross-references need update throughout document

</code_context>

<specifics>
## Specific Ideas

- Keep the document self-contained (no external dependencies for rendering)
- TOC and cross-refs should work in standard markdown viewers (GitHub, VS Code, etc.)
- Focus on findable and maintainable structure

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope (documentation structure only)

### Reviewed Todos (not folded)
None

</deferred>

---

*Phase: 01-docs-structure*
*Context gathered: 2026-05-06*