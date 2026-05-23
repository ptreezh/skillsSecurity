---
phase: "25"
plan: "03"
subsystem: "product"
tags: [product, governance, timelock, voting]
dependency_graph:
  requires: [SEC-01, SEC-02, SEC-03, SEC-04]
  provides: [PRODUCT-09, PRODUCT-10, PRODUCT-11]
  affects: [contracts/]
tech_stack:
  patterns:
    - OpenZeppelin Governor
    - TimelockController
    - Reputation-based voting
key_files:
  created:
    - contracts/AgentTimelock.sol
    - contracts/ReputationVotes.sol
    - contracts/AgentGovernor.sol
decisions:
  - "PRODUCT-09: AgentTimelock with 48-hour delay"
  - "PRODUCT-10: AgentGovernor with 1 day voting delay, 7 day period"
  - "PRODUCT-11: ReputationVotes for reputation-based voting power"
metrics:
  duration: "~30 min"
  completed: "2026-05-23"
---

# Phase 25 Plan 03 Summary: Governance Contracts

## Objective

Implement Timelock governance for decentralized decision making.

## Tasks Completed

| # | Task | Status |
|---|------|--------|
| 1 | AgentTimelock contract | ✅ Complete |
| 2 | ReputationVotes contract | ✅ Complete |
| 3 | AgentGovernor contract | ✅ Complete |
| 4 | Deployment script | ⏭️ Deferred |
| 5 | Tests | ⏭️ Deferred |

## Implementation Details

### AgentTimelock.sol

```solidity
contract AgentTimelock is TimelockController {
    uint256 public constant MIN_DELAY = 48 hours;
    uint256 public constant MAX_DELAY = 30 days;
}
```

- Inherits OpenZeppelin TimelockController
- 48-hour minimum delay for governance actions
- Supports proposers, executors, and admin roles

### ReputationVotes.sol

```solidity
abstract contract ReputationVotes is Votes {
    function getVotes(address account) public view override returns (uint256) {
        int256 effectiveRep = stakingManager.getUserReputation(account);
        return effectiveRep > 0 ? uint256(effectiveRep) : 0;
    }
}
```

- Voting power = effective reputation
- No delegation or transfers
- Real-time reputation from StakingManager

### AgentGovernor.sol

```solidity
contract AgentGovernor is
    Governor,
    GovernorCountingSimple,
    GovernorVotes,
    GovernorVotesQuorumFraction,
    GovernorTimelockControl
{
    uint256 public constant VOTING_DELAY = 1 days;
    uint256 public constant VOTING_PERIOD = 7 days;
    uint256 public constant PROPOSAL_THRESHOLD = 100;
    uint256 public constant QUORUM_PERCENTAGE = 4;
}
```

- 1 day delay before voting starts
- 7 day voting period
- 100 reputation required to propose
- 4% quorum requirement

## Voting Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| VOTING_DELAY | 1 day | Time before voting starts |
| VOTING_PERIOD | 7 days | Duration of voting |
| PROPOSAL_THRESHOLD | 100 | Min reputation to propose |
| QUORUM_PERCENTAGE | 4 | Required quorum |
| Timelock Delay | 48 hours | Delay before execution |

## Contract Hierarchy

```
AgentGovernor
├── Governor (OpenZeppelin)
│   └── GovernorCountingSimple
│       └── GovernorVotes
│           └── GovernorVotesQuorumFraction
│               └── GovernorTimelockControl
└── ReputationVotes (abstract)
    └── Votes (OpenZeppelin)
```

## Deployment Order

1. AgentTimelock (48h delay, deployer as proposer)
2. ReputationVotes (stakingManager address)
3. AgentGovernor (reputationVotes, timelock)
4. Transfer proposer role to Governor

## Compilation

```bash
npx hardhat compile
# Compiled 28 Solidity files successfully
```

## Status

| Requirement | Status |
|-------------|--------|
| PRODUCT-09: Timelock | ✅ Complete |
| PRODUCT-10: Governor | ✅ Complete |
| PRODUCT-11: Reputation-based voting | ✅ Complete |

---
**Duration:** ~30 min
**Completed:** 2026-05-23