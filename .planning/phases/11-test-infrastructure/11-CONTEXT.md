# Phase 11: Test Infrastructure - Context

**Gathered:** 2026-05-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Install Hardhat test toolbox, create test fixture system with correct deployment order, configure Mocha + solidity-coverage. Sets foundation for all subsequent testing phases.

</domain>

<decisions>
## Implementation Decisions

### Fixture Organization
- **D-01:** Single `test/fixtures.js` file for all 4 contracts
- **D-02:** Deployment order: ASKToken → StakingManager → SkillRegistry → Attribution
- **D-03:** Attribution.setStakingManager() called after deployment in fixture

### Coverage Tool
- **D-04:** Install and configure solidity-coverage for detailed Istanbul coverage reports
- **D-05:** Run coverage as part of test command

### Network Configuration
- **D-06:** Update hardhat.config.cjs: Replace polygonMumbai (chainId 80001) with polygonAmoy (chainId 80002)
- **D-07:** Remove deprecated Mumbai references entirely

### Plugins to Install
- **D-08:** @nomicfoundation/hardhat-chai-matchers — Contract assertions (emit, revertedWith)
- **D-09:** @nomicfoundation/hardhat-network-helpers — Time manipulation, loadFixture
- **D-10:** @nomicfoundation/hardhat-verify — PolygonScan verification (for Phase 16)
- **D-11:** solidity-coverage — Coverage reporting

### Test Structure
- **D-12:** Use Mocha test runner (default Hardhat)
- **D-13:** Test directory: `test/contracts/` for unit tests, `test/integration/` for integration
- **D-14:** Coverage target: 80%+ line coverage

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Contracts (for fixture dependencies)
- `contracts/ASKToken.sol` — Constructor args for fixture
- `contracts/StakingManager.sol` — Constructor args, requires token address
- `contracts/SkillRegistry.sol` — Constructor args, requires token + stakingManager
- `contracts/Attribution.sol` — Requires setStakingManager() call after deployment

### Configuration
- `hardhat.config.cjs` — Current config to update
- `SKILLS_STANDARD.md` §6.2 — Contract interface reference

### Research
- `.planning/research/SUMMARY.md` — Fixture patterns, deployment order
- `.planning/research/PITFALLS.md` — Cross-contract dependency order critical

</canonical_refs>

<codebase_context>
## Existing Code Insights

### Reusable Assets
- None yet — Phase 11 creates test infrastructure

### Established Patterns
- Hardhat framework with CJS config (hardhat.config.cjs)
- Solidity 0.8.20 with optimizer (200 runs)

### Integration Points
- Fixtures must wire contracts together in dependency order
- Attribution.sol requires setStakingManager() after deployment
- All contracts use OpenZeppelin imports

</codebase_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-test-infrastructure*
*Context gathered: 2026-05-16*
