---
phase: 11-test-infrastructure
plan: 02
type: execute
wave: 2
status: completed
completed: 2026-05-17
depends_on: 11-01
---

## Summary

Created test fixture system with correct deployment order for all 4 contracts.

### What was built

- **test/fixtures.cjs** — deployment fixture with `deployContracts()` function
- **test/smoke.fixture.test.cjs** — smoke tests verifying all contracts deploy and wire correctly
- **package.json** — updated with `test` and `coverage` scripts

### Key implementation details

**Deployment order (per D-02):**
1. ASKToken — no constructor args, mints MAX_SUPPLY to deployer
2. StakingManager — requires ASKToken address
3. SkillRegistry — requires ASKToken + StakingManager addresses
4. Attribution — no constructor args, but requires `setStakingManager()` call

**Critical wiring (per D-03 and PITFALL #1):**
```javascript
// Attribution.setStakingManager() MUST be called after deployment
await attribution.setStakingManager(staking);
```

**Ethers v6 compatibility:**
- Use `Contract.deploy()` without `.deployed()` 
- Use `Contract.waitForDeployment()` for await
- Pass contract instances directly (not `.address`) to constructors

### Verification results

```
npm run test
✓ should deploy all contracts successfully (490ms)
✓ should wire contracts correctly
✓ should have correct contract dependencies
3 passing (506ms)
```

### Artifacts created

| Path | Purpose |
|------|---------|
| `test/fixtures.cjs` | Shared deployment fixture for all test phases (12-15) |
| `test/smoke.fixture.test.cjs` | Smoke test verifying fixture correctness |

### Dependencies satisfied

- Depends on Plan 11-01 (test toolbox installed)
- All 4 contracts deploy and wire correctly
- Attribution.stakingManager() returns correct address (not zero)
- loadFixture provides snapshot isolation for tests