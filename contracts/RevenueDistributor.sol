// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title RevenueDistributor
/// @notice Self-operation revenue allocator - automatically distributes protocol revenue to deployers
///      DEPRECATED: AgentSkills has moved to no-token architecture.
///      Use RevenueSplit for service fee distribution.
///      This contract is preserved for historical state reference only.
contract RevenueDistributor is Ownable {
    bool public deprecated = true;

    /// @notice Deprecated
    constructor(address _askToken) Ownable() {
        _askToken; // silence unused warning
    }

    /// @notice Deprecated
    function setDeployerRewards(address _deployerRewards) external pure {
        _deployerRewards; // silence unused warning
        revert("Deprecated: Use RevenueSplit for service fee distribution");
    }

    /// @notice Deprecated
    function setTreasury(address _treasury) external pure {
        _treasury; // silence unused warning
        revert("Deprecated: Use RevenueSplit for service fee distribution");
    }

    /// @notice Deprecated
    function setStakingPool(address _stakingPool) external pure {
        _stakingPool; // silence unused warning
        revert("Deprecated: Use RevenueSplit for service fee distribution");
    }

    /// @notice Deprecated
    function updateDistributionRatios(
        uint16 _toDeployers,
        uint16 _toTreasury,
        uint16 _toStakingPool
    ) external pure {
        _toDeployers; _toTreasury; _toStakingPool; // silence unused warning
        revert("Deprecated: Use RevenueSplit for service fee distribution");
    }

    /// @notice Deprecated
    function updateDeployerShares(
        uint16 _bronze,
        uint16 _silver,
        uint16 _gold
    ) external pure {
        _bronze; _silver; _gold; // silence unused warning
        revert("Deprecated: Use RevenueSplit for service fee distribution");
    }

    /// @notice Deprecated
    function distribute() external pure {
        revert("Deprecated: Use RevenueSplit for service fee distribution");
    }

    /// @notice Check if contract is deprecated
    function isDeprecated() external pure returns (bool) {
        return true;
    }

    // Reserved storage slots for upgrade compatibility
    uint256[50] private __gap;
}