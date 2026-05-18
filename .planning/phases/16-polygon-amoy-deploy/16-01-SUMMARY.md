---
phase: "16"
plan: "01"
subsystem: "deployment"
tags:
  - "polygon-amoy"
  - "deployment"
  - "infrastructure"
dependency_graph:
  requires: []
  provides:
    - "Polygon Amoy deployment tooling"
  affects:
    - "contracts"
tech_stack:
  added:
    - "hardhat-deploy patterns"
    - "CLI readline fallback"
  patterns:
    - "Deployment artifact persistence"
    - "Contract verification on Polygonscan"
key_files:
  created:
    - "contracts/scripts/deploy-all.cjs"
  modified:
    - "contracts/.env.example"
decisions:
  - "D-05: CLI fallback for missing PRIVATE_KEY (readline-based interactive prompt)"
  - "D-03: Correct deployment order per contract dependencies"
  - "D-04: Call setStakingManager() after Attribution deployment"
---

# Phase 16 Plan 01 Summary: Polygon Amoy Deployment Setup

## Objective

Update environment template for Polygon Amoy and create the deployment script.

## Commits

| Task | Name | Hash | Files |
|------|------|------|-------|
| 1 | .env.example for Amoy | `bc319c1` | .env.example |
| 2 | deploy-all.cjs script | `2941c41` | scripts/deploy-all.cjs |

## Task 01: Update .env.example for Polygon Amoy

**Status:** Complete

**What was done:**
- Replaced `POLYGON_MUMBAI_RPC` with `POLYGON_AMOY_RPC=https://rpc-amoy.polygon.technology`
- Added `POLYGONSCAN_API_KEY` variable for contract verification on Polygonscan
- Kept `PRIVATE_KEY` variable unchanged
- Added helpful comments for configuration

**Verification:**
```bash
grep -q "POLYGON_AMOY_RPC" contracts/.env.example && \
grep -q "POLYGONSCAN_API_KEY" contracts/.env.example && \
! grep -q "POLYGON_MUMBAI_RPC" contracts/.env.example && echo "PASS"
# Output: PASS
```

## Task 02: Create deploy-all.cjs script with CLI fallback

**Status:** Complete

**What was done:**
- Created comprehensive deployment script for Polygon Amoy testnet
- Deploys all 4 contracts in correct dependency order:
  1. ASKToken (no constructor args)
  2. StakingManager (requires ASKToken address)
  3. SkillRegistry (requires ASKToken + StakingManager addresses)
  4. Attribution (no constructor args, then setStakingManager() call)
- CLI fallback using readline when `.env` is missing `PRIVATE_KEY`
- Validates CLI input starts with "0x"
- Verifies contracts on Polygonscan using hardhat-verify plugin
- Gracefully skips verification if `POLYGONSCAN_API_KEY` not set
- Saves deployment info to `contracts/deployments.json`

**Verification:**
```bash
node -e "const fs=require('fs'); const c=fs.readFileSync('contracts/scripts/deploy-all.cjs','utf8'); \
checks=['dotenv','readline','PRIVATE_KEY not found','rl.question','0x','hre.ethers.getSigners',\
'ASKToken.deploy','StakingManager.deploy','SkillRegistry.deploy','Attribution.deploy',\
'setStakingManager','verify:verify']; checks.forEach(s=>{if(!c.includes(s)){console.error('MISSING:',s);process.exit(1);}}); \
console.log('PASS');"
# Output: PASS
```

## Deviations from Plan

None - plan executed exactly as written.

## Auto-fixed Issues

None.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

All files verified to exist:
- contracts/.env.example
- contracts/scripts/deploy-all.cjs
- .planning/phases/16-polygon-amoy-deploy/16-01-SUMMARY.md

---

**Duration:** Task execution ~2 minutes
**Completed:** 2026-05-17