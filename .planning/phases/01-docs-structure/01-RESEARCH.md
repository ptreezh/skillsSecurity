# Phase 01: 文档结构完善 - Research

**Researched:** 2026-05-06
**Domain:** Markdown documentation structuring and formatting
**Confidence:** HIGH

## Summary

Phase 1 is a pure documentation-structuring task with zero external dependencies. The target file `SKILLS_STANDARD.md` is a 507-line markdown document with 9 major sections, currently in draft status. The three requirements (DOCS-01 status change, DOCS-02 hierarchical numbering, DOCS-03 TOC generation) are all achievable with simple text edits -- no tools, scripts, or build steps required.

**Primary recommendation:** All three requirements are editorial operations on a single file. The only non-trivial item is generating a correct TOC that maps to the updated section numbers; this can be done by hand in under 15 minutes once the section structure is finalized.

## User Constraints (from CONTEXT.md)

### Locked Decisions
- TOC format: static markdown numbered list, not auto-generated
- Cross-reference format: markdown anchor links `[Section Name](#anchor)`
- Structure scope: DOCS-01, DOCS-02, DOCS-03 plus fixing broken cross-references

### Claude's Discretion
- How to implement hierarchical numbering within existing sections (e.g., whether 2.1 becomes 2.1 or stays as-is)
- Whether to add anchor IDs to all subsections or only to major sections
- Specific anchor slug format (hyphen-separated Chinese is standard)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within documentation structure scope only.

---

## Standard Stack

No libraries or tools required. This is a pure documentation task.

| Tool | Purpose | Why Not Needed |
|------|---------|----------------|
| md-toc generators | Auto-generate TOC | Decision: manual TOC required |
| Markdown validators | Check cross-refs | Decision: no build step |
| Linting tools | Format consistency | Manual edit sufficient for scope |

**Source:** No external sources needed -- formatting patterns are standard markdown/GitHub.

---

## Architecture Patterns

### Recommended File Structure for SKILLS_STANDARD.md

```
Header block (lines 1-8)
  ├── Title, version, date, status
  └── Already structured -- needs status update only

Table of Contents (NEW -- after header)
  ├── Manual numbered list
  ├── Each entry links to section anchor
  └── Place before the first ## heading

Body (existing sections 1-9)
  ├── ## 1. Purpose & Scope
  ├── ## 2. Skill Classification
  ├── ## 3. Security Verification
  ├── ## 4. Responsibility Tracing
  ├── ## 5. On-chain Process
  ├── ## 6. Anti-Slash Mechanism
  ├── ## 7. Points/Reputation System
  ├── ## 8. Protocol Interfaces
  └── ## 9. Appendix

Footer (lines 505-511)
  └── "Next Steps" and status note -- update from 草稿 to 正式版
```

### TOC Entry Format (per locked decision)
```markdown
## 目录

- [1. 目的与范围](#1-目的与范围)
- [2. 技能分类标准](#2-技能分类标准)
- [3. 安全验证标准](#3-安全验证标准)
- ...
```

### Anchor Slug Format
GitHub-style anchor slugs convert Chinese characters by lowercasing and replacing spaces/special chars with hyphens. Example: `## 3. 安全验证标准` becomes anchor `#3-安全验证标准`. This is the standard and works in all markdown viewers.

### Cross-Reference Format (per locked decision)
```markdown
见 [3.1 安全验证标准](#3-安全验证标准)
```
Inline within body text; all references within same document.

---

## Current State Assessment

### Existing Document Structure (SKILLS_STANDARD.md)

| Section | Lines | Current Heading | Numbering Issue |
|---------|-------|-----------------|-----------------|
| Header | 1-7 | Title block | Status = 草稿 v1.1 (needs change) |
| TOC | -- | MISSING | Needs to be added |
| 1 | 21-33 | ## 1. 目的与范围 | Already uses `1.` prefix |
| 2 | 36-89 | ## 2. 技能分类标准 | Has subsections 2.1, 2.2, 2.3 |
| 3 | 92-156 | ## 3. 安全验证标准 | Has subsections 3.1, 3.2, 3.3 |
| 4 | 158-214 | ## 4. 责任追溯标准 | Has subsections 4.1, 4.2, 4.3 |
| 5 | 217-317 | ## 5. 上链流程标准 | Has subsections 5.1, 5.2, 5.3 |
| 6 | 321-367 | ## 6. 反噬机制标准 | Has subsections 6.1, 6.2, 6.3 |
| 7 | 371-416 | ## 7. 积分/声望系统 | Has subsections 7.1, 7.2, 7.3 |
| 8 | 420-464 | ## 8. 协议接口标准 | Single section |
| 9 | 467-507 | ## 9. 附录 | Has subsections 9.1-9.4 |
| Footer | 507-511 | "Next Steps" block | Status = 草稿 (needs change) |

**Key finding:** Section numbering is already consistent. DOCS-02 likely means adding explicit anchor IDs to all headings (e.g., `## 1. 目的与范围 {#1-目的与范围}`) so cross-references work, and ensuring the `1.x` format is applied uniformly to all subsections.

### Cross-Reference Audit

Checking the document for existing cross-reference patterns:
- No explicit cross-references found in the current draft -- the "Fix broken cross-references" requirement may mean adding proper anchors so future references will work, not fixing existing broken ones.
- If any inline references exist (e.g., "见第3节"), those should be converted to `[Section Name](#anchor)` format.

---

## Don't Hand-Roll

This phase has no technical implementation -- no code, no contracts, no tooling. "Don't hand-roll" items are N/A.

---

## Common Pitfalls

### Pitfall 1: Anchor ID mismatches
**What goes wrong:** Manual anchor slugs don't match what markdown parsers generate, causing broken links.
**How to avoid:** Use explicit HTML anchor syntax `{#anchor-id}` on all headings. This is the most reliable approach and matches the cross-reference format decision.
**Warning sign:** GitHub preview shows "anchor not found" on hover.

### Pitfall 2: Inconsistent numbering in TOC vs body
**What goes wrong:** TOC shows one numbering, body shows another.
**How to avoid:** Build TOC as the last edit step, after all section numbering is finalized. Verify every TOC entry matches its heading exactly.

### Pitfall 3: Forgetting the footer status update
**What goes wrong:** Header updated to 正式版 but footer still says 草稿.
**How to avoid:** Update both simultaneously: (1) line 5 status field, (2) line 511 "文档状态" footer.

---

## Code Examples

### Adding explicit anchor to heading
```markdown
## 1. 目的与范围 {#1-目的与范围}
```
This explicitly declares the anchor ID, making cross-references deterministic across all markdown renderers.

### TOC entry
```markdown
- [1. 目的与范围](#1-目的与范围)
```
Matches the explicit anchor format exactly.

### Inline cross-reference
```markdown
验证流程见 [3.1 验证流程](#3-验证流程)
```
Standard markdown link syntax. Works in GitHub, VS Code, GitLab, and most markdown readers.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | No existing cross-references in the document (only forward references needed) | Common Pitfalls | LOW -- if cross-refs exist, they'll need conversion, not just anchor addition |
| A2 | Anchor slug format uses hyphen-separated Chinese (GitHub standard) | Architecture Patterns | LOW -- all common markdown renderers handle this the same way |

---

## Open Questions

1. **Should subsections get their own TOC entries?**
   - What we know: Major sections (1-9) definitely need TOC entries
   - What's unclear: Whether 2.1, 3.1 etc. also get top-level TOC entries or are indented under their parent
   - Recommendation: Include all `## N.x` subsections as top-level TOC entries (flat list) for easier navigation

2. **Does "consistent section numbering" include the existing line-breaks-as-subsections within tables and lists?**
   - What we know: Main sections use `## N.` format
   - What's unclear: Whether inline patterns like "#### LOW（低风险）" need explicit numbering
   - Recommendation: Keep existing `####` patterns as-is; only `##` headings need explicit anchors for cross-references

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies -- purely text editing task)

---

## Validation Architecture

Step 4: SKIPPED (no test infrastructure -- documentation phase)

---

## Sources

### Primary (HIGH confidence)
- SKILLS_STANDARD.md (lines 1-511) -- current document state verified by Read tool
- .planning/01-CONTEXT.md -- decisions, specifics, deferred items all captured
- .planning/ROADMAP.md -- phase 1 success criteria

### Secondary (MEDIUM confidence)
- GitHub markdown anchor behavior -- consistent across all markdown renderers (inferred, not explicitly verified)

### Tertiary (LOW confidence)
None.

---

## Metadata

**Confidence breakdown:**
- Standard stack: N/A (no tools needed) -- N/A
- Architecture: HIGH -- document structure is straightforward, decisions are locked
- Pitfalls: HIGH -- no ambiguity in approach, patterns are well-established markdown

**Research date:** 2026-05-06
**Valid until:** 90 days (document structure patterns don't change)