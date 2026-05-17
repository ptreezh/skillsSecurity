# Phase 12: ASKToken 单元测试 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-17
**Phase:** 12-asktoken
**Areas discussed:** Test organization, Assertion style, Coverage priority, Event testing depth, Error cases

---

## Test Organization

| Option | Description | Selected |
|--------|-------------|----------|
| Single file | All tests in one comprehensive file | |
| Modular | One file per contract, organized by describe blocks | ✓ |

**User's choice:** Modular — one file per contract, each requirement in separate describe blocks

---

## Assertion Style

| Option | Description | Selected |
|--------|-------------|----------|
| Chai expect + BDD | describe/it with chai expect, chainable assertions | ✓ |

**User's choice:** Chai expect + BDD describe/it — consistent with existing fixtures.cjs style

---

## Coverage Priority

| Option | Description | Selected |
|--------|-------------|----------|
| Access control first | Focus on owner/minter restrictions | |
| Balanced coverage | Equal coverage across all 4 requirements | ✓ |

**User's choice:** Balanced coverage across ASKT-01~04

---

## Event Testing Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Spot-check | Verify event types only | |
| Full verification | Verify all event parameters with withArgs | ✓ |

**User's choice:** Full parameter verification using chai-matchers emit + withArgs

---

## Error Cases

| Option | Description | Selected |
|--------|-------------|----------|
| Happy paths only | Focus on successful operations | |
| Core reverts required | Test key require() statements for access/boundary | ✓ |

**User's choice:** Core reverts required — onlyOwner, insufficient balance, max supply

---

## Summary

User chose modular test organization (one file per contract), accepted recommendations for:
- Chai expect + BDD assertion style
- Balanced coverage across all 4 ASKT requirements
- Full event parameter verification
- Core revert scenarios required