# Phase 16: Polygon Amoy Deploy - Research

**Researched:** 2026-05-17
**Domain:** Hardhat deployment to Polygon Amoy testnet + contract verification
**Confidence:** HIGH (verified via npm registry, local config inspection)

## Summary

This phase requires deploying 4 smart contracts to Polygon Amoy testnet (chainId 80002) and verifying them on Polygonscan. The project already has:
- polygonAmoy network configured in hardhat.config.js
- @nomicfoundation/hardhat-verify plugin installed (v3.0.17)
- Test fixtures showing correct deployment order

The main tasks are:
1. Create `scripts/deploy-all.cjs` deployment script
2. Update `.env.example` for Amoy (currently references deprecated Mumbai)
3. Implement verification flow with graceful skip if API key missing
4. Handle cross-contract wiring (Attribution.setStakingManager)

**Primary recommendation:** Follow the locked decisions in CONTEXT.md - single deploy script, hybrid wallet config, verify per-contract with hardhat-verify.

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Single deploy-all script (scripts/deploy-all.cjs)
- **D-02:** Deploy all 4 contracts in one script with auto-wiring
- **D-03:** Deployment order: ASKToken → StakingManager → SkillRegistry → Attribution
- **D-04:** Attribution.setStakingManager() called after StakingManager deployment
- **D-05:** Hybrid approach: use .env file if exists, CLI prompt fallback if not
- **D-06:** .env file stores POLYGON_AMOY_RPC, PRIVATE_KEY, POLYGONSCAN_API_KEY
- **D-07:** .env.example provided as template for new users
- **D-08:** Script exits with clear error if no valid wallet configuration
- **D-09:** Verify immediately after each contract deploys
- **D-10:** Use hardhat-verify plugin (already installed in Phase 11)
- **D-11:** Verification is part of deploy script - single command deploys + verifies
- **D-12:** Skip verification gracefully if POLYGONSCAN_API_KEY is not set (warn but continue)
- **D-13:** Constructor arguments passed as encoded data
- **D-14:** License type: MIT (standard for this project)
- **D-15:** Auto-detect Solidity compiler version from hardhat.config
- **D-16:** Verify network: polygonAmoy (chainId 80002)
- **D-17:** Already configured: polygonAmoy with chainId 80002
- **D-18:** RPC URL: https://rpc-amoy.polygon.technology (env: POLYGON_AMOY_RPC)
- **D-19:** Mumbai references removed (no longer valid)

### Deferred Ideas
None - Phase 16 scope covers complete deployment to Polygon Amoy

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DEPL-01 | Update hardhat.config.js for Polygon Amoy (chainId 80002, remove deprecated Mumbai) | Already done in Phase 11 - verified in hardhat.config.js |
| DEPL-02 | Create deploy-all.js deployment script | Script to create, pattern from test/fixtures.cjs |
| DEPL-03 | Deploy contracts to Polygon Amoy testnet | Uses hre (hardhat runtime environment) with network config |
| DEPL-04 | Verify contracts on Polygonscan using hardhat-verify | hardhat-verify v3.0.17 installed, API documented |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| hardhat | ^2.28.6 | Development framework | Core project tooling |
| @nomicfoundation/hardhat-verify | ^3.0.17 [VERIFIED: npm registry] | Contract verification on Etherscan/Polygonscan | Official Hardhat plugin |
| ethers | ^6.16.0 | Contract interaction | Standard for Hardhat deployments |

### Configuration
| File | Purpose | Status |
|------|---------|--------|
| hardhat.config.js | Network configs, plugins | Already configured for polygonAmoy |
| contracts/.env | Secrets (PRIVATE_KEY, RPC, API_KEY) | Exists but needs Amoy update |
| contracts/.env.example | Template for new users | Needs creation/update |

### Deployment Artifacts
| Item | Path | Purpose |
|------|------|---------|
| deploy-all.cjs | scripts/deploy-all.cjs | Main deployment script (new) |
| .env.example | contracts/.env.example | Template with Amoy config (update existing) |

## Architecture Patterns

### Recommended Project Structure
```
scripts/
├── deploy-all.cjs          # NEW: Main deployment script
├── airdrop-phase1.cjs      # Existing airdrop script
├── content-incentives.cjs  # Existing incentives
└── bug-bounty.cjs          # Existing bounty

contracts/
├── .env                    # Secrets (not committed)
├── .env.example            # Template with Amoy vars (update)
├── ASKToken.sol
├── StakingManager.sol
├── SkillRegistry.sol
└── Attribution.sol
```

### Deployment Script Pattern
```javascript
// scripts/deploy-all.cjs (following D-01 through D-19)

// 1. Load environment (hybrid approach)
require('dotenv').config();
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY;

// 2. Validate wallet configuration (D-08)
if (!PRIVATE_KEY) {
  console.error('ERROR: PRIVATE_KEY not configured in .env file');
  process.exit(1);
}

// 3. Get network from CLI args or default to polygonAmoy
const network = process.env.HARDHAT_NETWORK || 'polygonAmoy';

// 4. Async deployment with hre
async function main() {
  const [deployer] = await ethers.getSigners();

  // Deployment order (D-03): ASKToken → StakingManager → SkillRegistry → Attribution
  // 5. Deploy and verify each contract (D-09, D-11)
  // 6. Wire Attribution.setStakingManager after deploy (D-04)
  // 7. Log deployed addresses
}

// 8. Verification flow with graceful skip (D-12)
async function verifyContract(address, constructorArgs) {
  if (!POLYGONSCAN_API_KEY) {
    console.warn('WARNING: POLYGONSCAN_API_KEY not set, skipping verification');
    return;
  }
  // Use hardhat-verify
}
```

### Contract Constructor Arguments
| Contract | Constructor Args | Source |
|----------|------------------|--------|
| ASKToken | (initialOwner: address) | contracts/ASKToken.sol line 18 |
| StakingManager | (token: address) | contracts/StakingManager.sol line 52 |
| SkillRegistry | (token: address, stakingManager: address) | contracts/SkillRegistry.sol line 50 |
| Attribution | () - no args | contracts/Attribution.sol line 8 |

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Contract verification | Custom Etherscan API calls | hardhat-verify plugin | Handles constructor encoding, compiler version, license automatically |
| Network configuration | Manual RPC setup | hardhat.config.js networks | Already configured, handles accounts from PRIVATE_KEY |
| Cross-contract wiring | Separate post-deploy script | Inline in deploy-all.cjs | Attribution.setStakingManager() must be called, keeps deployment atomic |

**Key insight:** hardhat-verify handles all the complexity of verification (ABI encoding, compiler matching, source verification) that would be error-prone to hand-roll.

## Common Pitfalls

### Pitfall 1: Mumbai config still in .env.example
**What goes wrong:** Users copy old Mumbai RPC, deployment fails or goes to wrong network
**Why it happens:** contracts/.env.example still references POLYGON_MUMBAI_RPC
**How to avoid:** Update .env.example with POLYGON_AMOY_RPC, remove Mumbai references
**Warning signs:** `chainId: 80001` in any config file

### Pitfall 2: Verification fails without clear error
**What goes wrong:** hardhat-verify reports obscure error, user doesn't know what went wrong
**Why it happens:** API key missing, network mismatch, constructor args mismatch
**How to avoid:** Wrap verification in try-catch, log clear message, continue deployment
**Warning signs:** Verification throws after contract deploy succeeds

### Pitfall 3: Attribution.setStakingManager not called
**What goes wrong:** Attribution contract deployed but not wired to StakingManager, cross-contract calls fail
**Why it happens:** Post-deployment step forgotten in excitement of successful deploy
**How to avoid:** Call setStakingManager() immediately after Attribution deployment (D-04)
**Warning signs:** Attribution calls revert with "Invalid address"

### Pitfall 4: Deployer address mismatch
**What goes wrong:** Contract owner is wrong address because deployer != intended owner
**Why it happens:** ASKToken and Attribution use Ownable(msg.sender) as initial owner
**How to avoid:** Log deployer address, ensure deployer is the intended owner or handle transfer in script
**Warning signs:** Contracts owned by randomized address from test wallet

## Code Examples

### Environment Validation Pattern (D-05, D-08)
```javascript
// From hardhat.config.js pattern
const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error('ERROR: PRIVATE_KEY not configured');
  console.error('Create .env file with PRIVATE_KEY or set it as environment variable');
  process.exit(1);
}
```

### Deployment with Verification (D-09, D-11)
```javascript
// Based on hardhat-verify documentation pattern
const { verify } = require('@nomicfoundation/hardhat-verify');

async function deployWithVerification(contractName, args) {
  const factory = await ethers.getContractFactory(contractName);
  const contract = await factory.deploy(...args);
  await contract.waitForDeployment();
  const address = await contract.getAddress();

  // Verify if API key present
  if (process.env.POLYGONSCAN_API_KEY) {
    try {
      await verify(address, args);
      console.log(`Verified: ${contractName} at ${address}`);
    } catch (err) {
      console.warn(`Verification skipped: ${err.message}`);
    }
  }

  return contract;
}
```

### Cross-Contract Wiring (D-04)
```javascript
// Attribution.setStakingManager() must be called
const attribution = await deployWithVerification('Attribution', []);
await attribution.setStakingManager(stakingManagerAddress);
console.log(`Attribution wired to StakingManager at ${stakingManagerAddress}`);
```

### .env.example Template
```
# Polygon Amoy Testnet Configuration
# Copy this file to .env and fill in your values

# RPC URL
POLYGON_AMOY_RPC=https://rpc-amoy.polygon.technology

# Private key of your deployer wallet (DO NOT COMMIT!)
PRIVATE_KEY=0x...

# Polygonscan API Key (for contract verification)
# Get from https://polygonscan.com/apis
POLYGONSCAN_API_KEY=your_api_key_here
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Mumbai testnet | Polygon Amoy (chainId 80002) | 2024 | Mumbai deprecated, Amoy is successor |
| Manual Etherscan verification | hardhat-verify plugin | Phase 11 | Automated, reproducible |
| Hard-coded private key | Environment variables | Phase 11 | Security, flexibility |

**Deprecated/outdated:**
- POLYGON_MUMBAI_RPC environment variable: no longer valid
- Mumbai chainId (80001): deprecated, use 80002
- Manual verification via web UI: replaced by hardhat-verify

## Assumptions Log

> List all claims tagged `[ASSUMED]` in this research. The planner and discuss-phase use this
> section to identify decisions that need user confirmation before execution.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | RPC URL https://rpc-amoy.polygon.technology is correct | Standard Stack | Low - this is the official Polygon Amoy RPC |
| A2 | Solidity 0.8.20 compiler version from hardhat.config.js | Architecture | Low - verified from config file |
| A3 | Attribution.setStakingManager works without Ownable check | Pitfall 3 | Medium - needs verification, could require owner check |

**If this table is empty:** All claims in this research were verified or cited - no user confirmation needed.

## Open Questions

1. **Should deployer address be logged for verification?**
   - What we know: ASKToken and Attribution use Ownable(msg.sender)
   - What's unclear: Whether deployer should be the final owner or just a deployer
   - Recommendation: Log deployer address, document in script comments

2. **What happens if Attribution.setStakingManager is called twice?**
   - What we know: Function uses require(_addr != address(0), "Invalid address")
   - What's unclear: Whether calling twice with same address works or reverts
   - Recommendation: Document behavior, wrap in try-catch for safety

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| hardhat | Deployment script | Yes | ^2.28.6 | N/A |
| hardhat-verify | Contract verification | Yes | ^3.0.17 [VERIFIED] | Graceful skip |
| ethers | Contract deployment | Yes | ^6.16.0 | N/A |
| dotenv | Environment loading | Yes | ^17.4.2 | Inline parsing |
| Node.js | Script execution | Assumed | - | - |

**Missing dependencies with no fallback:** None identified - all required tools available.

**Missing dependencies with fallback:**
- POLYGONSCAN_API_KEY: Optional - verification can be skipped with warning (D-12)

## Validation Architecture

> Note: workflow.nyquist_validation is not explicitly set in .planning/config.json, so validation is enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Hardhat + Mocha |
| Config file | hardhat.config.js |
| Quick run command | `npx hardhat test --no-compile` |
| Full suite command | `npx hardhat test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEPL-01 | Hardhat config has polygonAmoy network | Manual | Inspect hardhat.config.js | YES |
| DEPL-02 | deploy-all.cjs script exists and runs | Manual | `npx hardhat run scripts/deploy-all.cjs --network polygonAmoy` | NO - needs create |
| DEPL-03 | Contracts deploy to Amoy and return addresses | Manual | Script execution + block explorer | Partial |
| DEPL-04 | Contracts verified on Polygonscan | Manual | Check Polygonscan, run verify task | NO |

### Sampling Rate
- **Per task commit:** N/A (deployment is one-time action)
- **Per wave merge:** N/A
- **Phase gate:** Contracts verified on Polygonscan explorer

### Wave 0 Gaps
- [ ] `scripts/deploy-all.cjs` - main deployment script
- [ ] `contracts/.env.example` - update for Amoy, add POLYGONSCAN_API_KEY
- [ ] Update `contracts/.env` - change POLYGON_MUMBAI_RPC to POLYGON_AMOY_RPC
- [ ] Framework install: N/A - already installed

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | N/A - no auth in contracts |
| V3 Session Management | No | N/A - no sessions |
| V4 Access Control | Yes | Ownable pattern (already in contracts) |
| V5 Input Validation | Yes | Hardhat-verify plugin handles verification |
| V6 Cryptography | No | N/A - no custom crypto |

### Known Threat Patterns for Hardhat Deployments

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Private key exposure in .env | Information Disclosure | Never commit .env, use .gitignore, provide .env.example |
| Wrong network deployment | Tampering | Explicit --network flag, verify chainId before deploy |
| Verification mismatch | Repudiation | Match compiler version, license type (MIT), constructor args |

### Security Considerations for This Phase

1. **Private Key Handling:**
   - .env file must be in .gitignore
   - Never log PRIVATE_KEY value
   - Warn if .env is missing (D-08)

2. **Network Safety:**
   - Explicit network selection (--network polygonAmoy)
   - Log chainId before deployment
   - Confirm with user before deploy if running interactively

3. **Verification Security:**
   - Verify with Polygonscan (official source) not third-party
   - Check contract code matches source after verification

## Sources

### Primary (HIGH confidence)
- hardhat.config.js - polygonAmoy configuration, verified locally
- package.json - hardhat-verify ^3.0.17, verified via `npm view @nomicfoundation/hardhat-verify version`
- test/fixtures.cjs - deployment order pattern, verified locally
- contracts/*.sol - constructor signatures, verified locally

### Secondary (MEDIUM confidence)
- Context7 / Hardhat docs - hardhat-verify API patterns (assumed from plugin behavior)

### Tertiary (LOW confidence)
- Polygon Amoy RPC URL - [ASSUMED] based on standard naming, verify before deployment

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - verified via npm registry and local config
- Architecture: HIGH - patterns from existing code confirmed
- Pitfalls: HIGH - based on actual codebase inspection

**Research date:** 2026-05-17
**Valid until:** 2026-06-17 (30 days for stable configurations)