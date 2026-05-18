---
phase: 19
plan: deployer-rewards-selfops-integration
subsystem: deployer-incentives
tags: [four-self, selfops, governance, revenue-distribution]
dependency-graph:
  requires:
    - phase-18-deployer-rewards
  provides:
    - RevenueDistributor contract
    - Governance deployer integration
    - HealthReporter contract
    - SelfOpsPanel frontend
tech-stack:
  added:
    - Solidity: RevenueDistributor, HealthReporter, DeployerRewards extensions, Governance extensions
    - React: SelfOpsPanel component
  patterns:
    - Tiered distribution (Bronze 40%, Silver 60%, Gold 80%)
    - Gold priority allocation in revenue distribution
    - Deployer voting weight in governance
    - Health report incentive system
key-files:
  created:
    - contracts/RevenueDistributor.sol
    - contracts/HealthReporter.sol
    - contracts/interfaces/IDeployerRewards.sol
    - contracts/test/mocks/MockDeployerRewards.sol
    - tests/RevenueDistributor.test.js
    - src/pages/SelfOpsPanel.jsx
    - src/pages/SelfOpsPanel.css
    - test/e2e/selfops-flow.test.js
  modified:
    - contracts/DeployerRewards.sol
    - contracts/DAO/Governance.sol
    - src/main.jsx
decisions:
  - "RevenueDistributor splits income: 50% to deployers, 30% to treasury, 20% to staking"
  - "DeployerRewards interface enables cross-contract integration"
  - "Governance voting power: reputation + tokens + deployer weight"
  - "Gold tier deployers have veto power (30% opposition threshold)"
metrics:
  duration: "~25 minutes"
  completed: "2026-05-18T11:35:00Z"
  tasks: 6
  commits: 6
---

# Phase 19 Plan: Deployer Rewards × Four-Self Integration Summary

**One-liner:** Deployer incentives integrated with four-self system (自运营/自推广/自进化/自运维) for comprehensive deployer governance and revenue sharing.

## Completed Tasks

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 1 | Extend DeployerRewards (dividend + governance interfaces) | `d092c60` | COMPLETE |
| 2 | Create RevenueDistributor | `0597b64` | COMPLETE |
| 3 | Extend Governance (deployer voting power) | `c9970fb` | COMPLETE |
| 4 | Create HealthReporter | `be2e9f5` | COMPLETE |
| 5 | Create SelfOpsPanel frontend | `b47d471` | COMPLETE |
| 6 | Add E2E tests | `e46493c` | COMPLETE |

## Components Built

### Smart Contracts

**1. RevenueDistributor** (`contracts/RevenueDistributor.sol`)
- Automatic revenue distribution to deployers
- Distribution ratios: 50% deployers, 30% treasury, 20% staking pool
- Tiered shares: Bronze 40%, Silver 60%, Gold 80%
- Priority allocation for Gold tier deployers
- Configurable via governance

**2. HealthReporter** (`contracts/HealthReporter.sol`)
- Self-operation (自运维) incentive system
- Bug reports: 50 ASK (requires validation)
- Status reports: 10 ASK (immediate reward)
- Stress test: 100 ASK (immediate reward)
- Monthly limit: 10 reports per deployer

**3. DeployerRewards Extensions**
- `getDividend()` - Get pending dividends
- `claimDividend()` - Claim from RevenueDistributor
- `getGovernanceWeight()` - Voting power for DAO
- `isGoldTier()` - Gold tier check for privileges

**4. Governance Extensions** (`contracts/DAO/Governance.sol`)
- Deployer voting weight integration
- `setDeployerRewards()` - Configure DeployerRewards contract
- `castGoldVeto()` - Gold tier deployer veto power

### Frontend Components

**SelfOpsPanel** (`src/pages/SelfOpsPanel.jsx`)
- Four tabs: Revenue, Promotion, Governance, Health
- Tier badge display (Bronze/Silver/Gold)
- Dividend tracking and tier benefits
- Referral link tracking
- Voting power display
- Health action cards with rewards

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Protocol Revenue Sources                  │
│         (staking fees, gas rebates, premium features)        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              RevenueDistributor (自动分红)                   │
├─────────────┬─────────────────┬─────────────────────────────┤
│  Deployers  │    Treasury     │      Staking Pool           │
│    50%      │      30%        │          20%                │
└──────┬──────┴─────────────────┴─────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│           DeployerRewards (按等级分配)                       │
├─────────────┬─────────────────┬─────────────────────────────┤
│ 🥉 Bronze   │  🥈 Silver      │      🥇 Gold                │
│    40%      │      60%        │        80%                  │
└─────────────┴─────────────────┴─────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 自进化: Governance (扩展)                    │
├─────────────┬─────────────────┬─────────────────────────────┤
│  声誉投票   │  代币投票       │     部署者权重               │
│  L4+ 权重   │  ASK 持有量     │     用户数 × 等级加成        │
│             │                 │     🥇 黄金否决权            │
└─────────────┴─────────────────┴─────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 自运维: HealthReporter                       │
├─────────────┬─────────────────┬─────────────────────────────┤
│  Bug报告    │  状态报告       │     压力测试                 │
│  +50 ASK    │  +10 ASK        │     +100 ASK                │
└─────────────┴─────────────────┴─────────────────────────────┘
```

## Key Decisions

1. **Revenue Split**: 50% to deployers, 30% treasury, 20% staking - balanced approach
2. **Gold Priority**: Gold deployers get priority allocation before weight-based distribution
3. **Veto Threshold**: 30% Gold opposition can pause proposals - preventive measure
4. **Health Rewards**: Immediate rewards for status/stress tests, validated for bugs

## Commits

- `d092c60` - feat(19): extend DeployerRewards with dividend and governance interfaces
- `0597b64` - feat(19): add RevenueDistributor for automatic deployer dividends
- `c9970fb` - feat(19): extend Governance with deployer voting power
- `be2e9f5` - feat(19): add HealthReporter for self-operation node incentives
- `b47d471` - feat(19): add SelfOpsPanel with four-self integration
- `e46493c` - test(19): add self-ops system e2e tests

## Deviations from Plan

None - plan executed exactly as written.

## Testing

- RevenueDistributor: 4 passing tests
- E2E tests for SelfOpsPanel (Playwright)
- Contract compilation: All successful

## Self-Check: PASSED

All files created and committed. All contracts compile successfully. Tests passing.