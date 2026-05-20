# Phase 22: 无代币核心基础设施 - Plan 02 Summary

**Plan:** 22-02
**Completed:** 2026-05-20
**Wave:** 2

## Objective

禁用代币相关合约，改为基于 ETH 和声望的替代实现。

## Deliverables

| Artifact | Path | Status |
|----------|------|--------|
| ASKToken (deprecated) | contracts/ASKToken.sol | ✅ Updated |
| DeployerRewards (deprecated) | contracts/DeployerRewards.sol | ✅ Updated |
| RevenueDistributor (deprecated) | contracts/RevenueDistributor.sol | ✅ Updated |

## Implementation Details

### ASKToken
- All public functions now revert with "Deprecated: No token architecture"
- Functions: getVotes, delegate, mint, transfer, transferFrom
- isDeprecated() returns true
- Historical state preserved

### DeployerRewards
- All entry points revert with deprecation message
- Functions: registerDeployer, onUserRegistered, calculateTier, claimRewards, getDividend, getGovernanceWeight, etc.
- isDeprecated() returns true
- 50 slot gap for upgrade compatibility

### RevenueDistributor
- All functions revert with deprecation message
- Functions: setDeployerRewards, setTreasury, setStakingPool, distribute, etc.
- isDeprecated() returns true
- 50 slot gap for upgrade compatibility

## Deprecation Messages

All deprecated contracts use consistent messaging:
- ASKToken: "Deprecated: No token architecture"
- DeployerRewards: "Deprecated: Use SelfSustainingEcosystem for role-based incentives"
- RevenueDistributor: "Deprecated: Use RevenueSplit for service fee distribution"

## Migration Path

| Old Contract | New Replacement |
|--------------|-----------------|
| ASKToken | RevenueSplit |
| DeployerRewards | SelfSustainingEcosystem |
| RevenueDistributor | RevenueSplit |

## Commits

- `daee501` feat(22-02): deprecate token contracts

---

*Plan 02 of 02 for Phase 22*
*Self-Check: PASSED*