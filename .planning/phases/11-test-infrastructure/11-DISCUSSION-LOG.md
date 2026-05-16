# Phase 11: Test Infrastructure - Discussion Log

> **Audit trail only.** Do not use as input to planning, research or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-16
**Phase:** 11-test-infrastructure
**Areas discussed:** Fixture organization, Coverage tool, Network configuration

---

## Fixture Organization

| Option | Description | Selected |
|--------|-------------|----------|
| Single fixtures.js | All 4 contracts in one file. Simple and co-located. | ✓ |
| Per-contract fixtures | Separate fixture files per contract. More modular. | |
| You decide | Standard Hardhat pattern with minimal structure. | |

**User's choice:** Single fixtures.js
**Notes:** Simpler for 4 contracts, keeps related code together

---

## Coverage Tool

| Option | Description | Selected |
|--------|-------------|----------|
| solidity-coverage | Full Istanbul coverage, needs verification | ✓ |
| hardhat-gas-reporter | Lighter weight, built-in | |
| No coverage tool | Skip for now, focus on tests first | |

**User's choice:** solidity-coverage
**Notes:** Comprehensive coverage reporting

---

## Network Configuration

| Option | Description | Selected |
|--------|-------------|----------|
| Update now | Replace Mumbai with Amoy in Phase 11 | ✓ |
| Update in Phase 16 | Keep Mumbai placeholder, update later | |
| You decide | Let me decide the approach | |

**User's choice:** Update now
**Notes:** Cleaner setup, Mumbai is deprecated anyway

---

*Discussion completed: 2026-05-16*
