# Phase 16: Polygon Amoy Deploy - Context

**Gathered:** 2026-05-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Deploy all contracts to Polygon Amoy testnet (chainId 80002), configure the deployment script, verify contracts on Polygonscan. Depends on Phase 15 integration tests passing first.

</domain>

<decisions>
## Implementation Decisions

### Deployment Script Structure
- **D-01:** Single deploy-all script (scripts/deploy-all.cjs)
- **D-02:** Deploy all 4 contracts in one script with auto-wiring
- **D-03:** Deployment order: ASKToken → StakingManager → SkillRegistry → Attribution
- **D-04:** Attribution.setStakingManager() called after StakingManager deployment

### Deployer Wallet Management
- **D-05:** Hybrid approach: use .env file if exists, CLI prompt fallback if not
- **D-06:** .env file stores POLYGON_AMOY_RPC, PRIVATE_KEY, POLYGONSCAN_API_KEY
- **D-07:** .env.example provided as template for new users
- **D-08:** Script exits with clear error if no valid wallet configuration

### Contract Verification Flow
- **D-09:** Verify immediately after each contract deploys
- **D-10:** Use hardhat-verify plugin (already installed in Phase 11)
- **D-11:** Verification is part of deploy script — single command deploys + verifies
- **D-12:** Skip verification gracefully if POLYGONSCAN_API_KEY is not set (warn but continue)

### Polygonscan Verification Approach
- **D-13:** Constructor arguments passed as encoded data
- **D-14:** License type: MIT (standard for this project)
- **D-15:** Auto-detect Solidity compiler version from hardhat.config
- **D-16:** Verify network: polygonAmoy (chainId 80002)

### Network Configuration (from Phase 11)
- **D-17:** Already configured: polygonAmoy with chainId 80002
- **D-18:** RPC URL: https://rpc-amoy.polygon.technology (env: POLYGON_AMOY_RPC)
- **D-19:** Mumbai references removed (no longer valid)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Contract Dependencies
- `contracts/ASKToken.sol` — Constructor: (owner)
- `contracts/StakingManager.sol` — Constructor: (tokenAddress)
- `contracts/SkillRegistry.sol` — Constructor: (tokenAddress, stakingManagerAddress)
- `contracts/Attribution.sol` — No constructor args, needs setStakingManager() after deploy

### Configuration
- `hardhat.config.cjs` — Already configured for polygonAmoy (from Phase 11)
- `test/fixtures.cjs` — Deployment order pattern (ASKToken → StakingManager → SkillRegistry → Attribution)

### Prior Phase Decisions
- `.planning/phases/11-test-infrastructure/11-CONTEXT.md` — Plugin installation, Mumbai → Amoy migration
- `.planning/phases/15-integration-tests/15-CONTEXT.md` — Deployment order, cross-contract wiring

### Verification
- `SKILLS_STANDARD.md` §6.2 — Contract interface reference
- hardhat-verify docs — Constructor args encoding

</canonical_refs>

<codebase_context>
## Existing Code Insights

### Existing Scripts
- Multiple .cjs scripts in scripts/ directory
- No existing deploy-all script (needs to be created)

### Existing Config
- hardhat.config.cjs already has polygonAmoy network configured
- @nomicfoundation/hardhat-verify plugin already installed

### Contract Constructor Args
1. ASKToken: (initialOwner: address)
2. StakingManager: (token: address)
3. SkillRegistry: (token: address, stakingManager: address)
4. Attribution: no constructor args

### Post-Deployment Wiring
- Attribution.sol requires: attributionContract.setStakingManager(stakingManagerAddress)

</codebase_context>

<specifics>
## Specific Ideas

- Single deploy command should be: `npx hardhat run scripts/deploy-all.cjs --network polygonAmoy`
- Output should include deployed contract addresses for verification
- .env.example should include all 3 required variables with placeholder comments

</specifics>

<deferred>
## Deferred Ideas

None — Phase 16 scope covers complete deployment to Polygon Amoy

</deferred>

---

*Phase: 16-polygon-amoy-deploy*
*Context gathered: 2026-05-17*