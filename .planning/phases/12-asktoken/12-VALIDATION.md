# Phase 12: ASKToken 单元测试 - Validation

**Created:** 2026-05-17
**Phase:** 12-asktoken

## Validation Criteria

### Per-Task Verification

| Task | Criteria | Command |
|------|----------|---------|
| 1. Mint Tests | `npx hardhat test test/contracts/ASKToken.test.js --grep "Mint"` exits 0 | 5 tests pass |
| 2. Burn Tests | `npx hardhat test test/contracts/ASKToken.test.js --grep "Burn"` exits 0 | 4 tests pass |
| 3. Delegate Tests | `npx hardhat test test/contracts/ASKToken.test.js --grep "Delegate"` exits 0 | 4 tests pass |
| 4. Event Tests | `npx hardhat test test/contracts/ASKToken.test.js --grep "Events"` exits 0 | 5 tests pass |

### Phase Gate

- **Full suite:** `npx hardhat test test/contracts/ASKToken.test.js` — all 18 tests pass
- **Coverage gate:** Report generated, no regressions from prior phases

### Success Metrics

1. Only owner/minter can mint tokens (ASKT-01) — verified by access control tests
2. Burning tokens correctly reduces user balance (ASKT-02) — verified by balance assertions
3. Delegation updates vote weight tracking (ASKT-03) — verified by getVotes() checks
4. Mint, Burn, Delegate events emit with correct parameters (ASKT-04) — verified by emit().withArgs()

---

*Validation strategy derived from 12-RESEARCH.md Validation Architecture section*