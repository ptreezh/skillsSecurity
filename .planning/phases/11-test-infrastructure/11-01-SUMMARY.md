---
phase: 11-test-infrastructure
plan: 01
type: execute
wave: 1
status: completed
completed: 2026-05-17
---

## Summary

Installed Hardhat test toolbox plugins and updated network configuration.

### What was built

- **Test toolbox packages installed:**
  - @nomicfoundation/hardhat-chai-matchers v2.1.2 (emit, revertedWith assertions)
  - @nomicfoundation/hardhat-network-helpers v1.1.2 (loadFixture, evm_increaseTime, evm_mine)
  - @nomicfoundation/hardhat-verify v2.1.3 (PolygonScan verification)
  - solidity-coverage v0.8.17 (coverage reporting)

- **Network configuration updated:**
  - Removed polygonMumbai (chainId 80001, deprecated)
  - Added polygonAmoy (chainId 80002) per D-06
  - All 4 plugin require statements added to hardhat.config.js

### Key decisions

- Renamed hardhat.config.cjs to hardhat.config.js for ESM compatibility
- Added "type": "module" to package.json
- Downgraded to hardhat@^2.28.6 for solidity-coverage compatibility

### Artifacts created

| Path | Purpose |
|------|---------|
| `hardhat.config.js` | Hardhat config with all plugins and polygonAmoy network |
| `test/fixtures.cjs` | Contract deployment fixture (loadFixture compatible) |
| `test/smoke.fixture.test.cjs` | Smoke test verifying fixture works |

### Verification results

```
npx hardhat compile --force
✓ 11 Solidity files compiled successfully

npx hardhat test test/smoke.fixture.test.cjs
✓ should deploy all contracts successfully (538ms)
✓ should wire contracts correctly
✓ should have correct contract dependencies
3 passing (551ms)
```

### Deviations from plan

None - all acceptance criteria met as specified.