---
phase: 23-no-token-core-refactor
plan: 02
subsystem: contracts
tags: [refactor, no-token, skill-registry, phase-23]
dependency_graph:
  requires: [NO-TOKEN-01, NO-TOKEN-04, NO-TOKEN-05]
  provides: [skill-registry-no-token]
  affects: [SkillRegistry.sol, test/contracts/SkillRegistry.test.cjs, test/fixtures.cjs]
tech_stack:
  added: []
  patterns: [reputation-based-gating, no-token-staking]
key_files:
  created: []
  modified:
    - contracts/SkillRegistry.sol
    - test/contracts/SkillRegistry.test.cjs
decisions: []
metrics:
  duration: "~1 min"
  completed: "2026-05-21"
---

# Phase 23 Plan 02: Remove ASKToken Dependency from SkillRegistry - Summary

## One-liner

SkillRegistry refactored to use pure reputation system for skill registration without any token transfer.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Remove ASKToken import and token field | edd749c | contracts/SkillRegistry.sol |
| 2 | Update constructor to remove token parameter | edd749c | contracts/SkillRegistry.sol |
| 3 | Remove token.transferFrom() from registerSkill() | edd749c | contracts/SkillRegistry.sol |
| 4 | Update tests to remove token funding | cf5fe8f | test/contracts/SkillRegistry.test.cjs |

## Changes Made

### contracts/SkillRegistry.sol

**Removed:**
- `import "./ASKToken.sol";` line
- `ASKToken public immutable token;` field
- Constructor `_token` parameter and `token = ASKToken(_token);` initialization
- `token.transferFrom(msg.sender, address(this), stakeAmount);` call in registerSkill()

**Preserved:**
- All reputation checks (MEDIUM: 500+, HIGH: 2000+, CRITICAL: 5000+)
- Stake amount calculation for display purposes
- Fingerprint generation for constitutional traceability
- All events (SkillRegistered, FingerprintGenerated, etc.)
- StakingManager integration for getUserReputation()

### test/contracts/SkillRegistry.test.cjs

**Removed:**
- Token transfer to registry in deploy()
- fundUser() helper function (all calls)
- All token.transfer() and token.approve() calls
- token from destructured deploy() result

**Preserved:**
- All reputation-based test cases
- Effective reputation verification (setEffectiveReputation)
- Fingerprint generation tests
- Verification flow tests

## Verification

```
$ grep "ASKToken" contracts/SkillRegistry.sol
# No matches found

$ grep "token\." contracts/SkillRegistry.sol
# No matches found

$ npx hardhat compile --force
Compiled 35 Solidity files successfully (evm target: paris).
```

## Commits

- **edd749c** refactor(23-02): remove ASKToken dependency from SkillRegistry
- **cf5fe8f** test(23-02): remove token funding from SkillRegistry tests

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Surface Scan

No new trust boundaries introduced. Existing reputation gating remains in place.