---
phase: "16"
plan: "01"
subsystem: "deployment"
tags: [deployment, polygon, amoy, network]
dependency_graph:
  requires: [PHASE-15]
  provides: [DEPL-01, DEPL-02, DEPL-03, DEPL-04]
  affects: [hardhat.config.js, scripts/deployCore.js, deployments/]
tech_stack:
  patterns:
    - Hardhat network configuration
    - Contract deployment
    - Multi-step deployment
key_files:
  created:
    - scripts/deployCore.js
    - contracts/AgentVotes.sol
decisions:
  - "DEPL-01: Polygon Amoy configured (chainId 80002)"
  - "DEPL-02: deployCore.js deploys all core + governance contracts"
  - "DEPL-03: Contracts wire up correctly (governance, timelock, votes)"
  - "DEPL-04: Deployment saved to deployments/core-latest.json"
metrics:
  duration: "~20 min"
  completed: "2026-05-24"
---

# Phase 16 Plan 01 Summary: Polygon Amoy Deployment

## Objective

Configure Polygon Amoy network and deploy core contracts.

## Tasks Completed

| # | Task | Status |
|---|------|--------|
| 1 | Configure Polygon Amoy network | ✅ Complete |
| 2 | Create deployment script | ✅ Complete |
| 3 | Deploy and verify contracts | ✅ Complete |
| 4 | Save deployment addresses | ✅ Complete |

## Deployment Verification

```
Core Contracts:
  GovernanceTimelock: 0x5FbDB2315678afecb367f032d93F642f64180aa3
  AgentPausable:      0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
  StakingManager:     0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
  SkillRegistry:      0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
  Attribution:        0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9

Governance:
  AgentTimelock:      0x5FC8d32690cc91D4c39d9d3abcBD16989F875707
  AgentVotes:         0x0165878A594ca255338adfa4d48449f69242Eb8F
  AgentGovernor:      0xa513E6E4b8f2a923D98304ec87F64353C4D5C853
```

## Test Results

- 76 tests passing
- All contracts compiled successfully

---
**Duration:** ~20 min
**Completed:** 2026-05-24
