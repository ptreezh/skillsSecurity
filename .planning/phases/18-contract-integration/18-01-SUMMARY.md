---
phase: "18"
plan: "01"
subsystem: frontend-contract-integration
tags: [contract-integration, frontend, polygon-amoy, ethers]
dependency_graph:
  requires: []
  provides: [ContractService, WalletService-contract-integration, component-hooks]
  affects: [SkillBrowser, UserProfile, Leaderboard]
tech_stack:
  added: [ethers.js v6]
  patterns: [contract-abstraction, provider-signer-pattern, graceful-fallback]
key_files:
  created:
    - src/abi/ASKToken.json
    - src/abi/SkillRegistry.json
    - src/abi/StakingManager.json
    - src/abi/Attribution.json
    - src/services/ContractService.jsx
  modified:
    - src/services/WalletService.js
    - src/components/SkillBrowser.jsx
    - src/pages/UserProfile.jsx
    - src/pages/Leaderboard.jsx
decisions:
  - "Extracted ABIs from Hardhat artifacts to src/abi/ for frontend use"
  - "ContractService provides unified interface to all contracts"
  - "Demo mode fallback when contracts not deployed"
  - "ContractService.isInitialized() to check connection status"
metrics:
  duration: "~5 minutes"
  completed_date: "2026-05-18"
---

# Phase 18 Plan 01: Contract Integration Summary

## One-liner

Created ContractService with ABI loading and integrated contract hooks into frontend components for Polygon Amoy deployment.

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create ContractService with ABI extraction | 1680813 | src/abi/*, src/services/ContractService.jsx |
| 2 | Update WalletService with ContractService integration | e67b45e | src/services/WalletService.js |
| 3 | Update SkillBrowser with contract hooks | 849dafd | src/components/SkillBrowser.jsx |
| 4 | Update UserProfile with contract hooks | 89f70cc | src/pages/UserProfile.jsx |
| 5 | Update Leaderboard with contract hooks | fcaab77 | src/pages/Leaderboard.jsx |

## What Was Built

### ContractService (src/services/ContractService.jsx)
Unified contract interaction layer with:
- ABI loading from src/abi/ directory
- Network config for Polygon Amoy (chainId: 80002)
- Contract initialization with provider/signer
- Helper functions: getSkills(), getReputation(), likeSkill(), stake(), etc.
- Demo mode when contracts not deployed (returns empty arrays/zero values)
- isInitialized() check for connection status

### Contract ABIs (src/abi/)
Extracted from Hardhat compiled artifacts:
- ASKToken.json - ERC20 token contract
- SkillRegistry.json - Skill registration and verification
- StakingManager.json - Reputation and staking logic
- Attribution.json - Like tracking and attribution

### WalletService Integration
- connect() now initializes ContractService
- Loads deployments.json for contract addresses
- Provides getProvider(), getSigner(), getContracts() methods
- Falls back to demo mode when no wallet extension

### Component Hooks
All components now:
- Fetch data from contracts when deployed
- Fall back to demo data gracefully
- Show loading states during fetch
- Display connection status indicator
- Handle errors with user-friendly messages

## Key Functions

```javascript
// Initialize contracts
await ContractService.initContractsWithSigner(signer, addresses)

// Check if connected
ContractService.isInitialized() // returns boolean

// Fetch skills from chain
const skills = await ContractService.getSkills()

// Like a skill (writes to chain)
const result = await ContractService.likeSkill(skillId)

// Get user reputation
const reputation = await ContractService.getReputation(address)
```

## Verified Artifacts

| File | Status |
|------|--------|
| src/abi/ASKToken.json | FOUND |
| src/abi/SkillRegistry.json | FOUND |
| src/abi/StakingManager.json | FOUND |
| src/abi/Attribution.json | FOUND |
| src/services/ContractService.jsx | FOUND |

## Commits

- `1680813`: feat(18): create ContractService with ABI loading
- `e67b45e`: feat(18): integrate ContractService into WalletService
- `849dafd`: feat(18): add ContractService hooks to SkillBrowser
- `89f70cc`: feat(18): add ContractService hooks to UserProfile
- `fcaab77`: feat(18): add ContractService hooks to Leaderboard

## Notes

- ABIs extracted from existing compiled artifacts (Phase 16)
- Contract addresses loaded from /deployments.json (created after Phase 16 deployment)
- Full leaderboard requires event indexer (currently returns empty, shows demo data)
- All components work in both demo mode and live mode