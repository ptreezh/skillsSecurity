# Phase 01: 文档结构完善 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-06
**Phase:** 01-docs-structure
**Areas discussed:** TOC generation, Cross-reference format

---

## TOC Generation

| Option | Description | Selected |
|--------|-------------|----------|
| Static markdown list | Manual numbered list at top, static snapshot | ✓ |
| Auto-generated TOC | Generate via plugin/script, dynamic | |
| IDE-side navigation | Extension generates clickable TOC | |

**User's choice:** Static markdown list
**Notes:** Simpler, no dependencies, works in standard markdown viewers

---

## Cross-Reference Format

| Option | Description | Selected |
|--------|-------------|----------|
| Section anchors | Same-page anchors: see [3.1 安全验证标准](#31-安全验证标准) | ✓ |
| Relative file links | GitHub-style ref links, chapter references | |
| Just section numbers | Use numbers only: "见 3.1" | |

**User's choice:** Section anchors
**Notes:** Works in standard markdown viewers, no external dependencies

---

## Claude's Discretion

- Exact TOC list format (numbering style, indentation)
- Specific anchor text for each section reference
- Version header update wording

## Deferred Ideas

None