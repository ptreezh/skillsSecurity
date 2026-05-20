// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title DeployerRewards
/// @notice Tiered incentive system for deployers who promote AgentSkills platform
/// @dev Deployers earn rewards based on their tier level when they refer new users
///      DEPRECATED: AgentSkills has moved to no-token architecture.
///      Use SelfSustainingEcosystem for role-based incentives.
///      This contract is preserved for historical state reference only.
contract DeployerRewards is Ownable {
    bool public deprecated = true;

    /// @notice Deprecated
    constructor(address _askToken) Ownable() {
        // Preserve historical state - no initialization needed for deprecated contract
        _askToken; // silence unused warning
    }

    /// @notice Deprecated - registerDeployer no longer functional
    function registerDeployer(string calldata domain) external pure {
        domain; // silence unused warning
        revert("Deprecated: Use SelfSustainingEcosystem for role-based incentives");
    }

    /// @notice Deprecated - onUserRegistered no longer functional
    function onUserRegistered(address user, uint256 stakeAmount) external pure {
        user; stakeAmount; // silence unused warning
        revert("Deprecated: Use SelfSustainingEcosystem for role-based incentives");
    }

    /// @notice Deprecated
    function calculateTier(address deployer) external pure {
        deployer; // silence unused warning
        revert("Deprecated: Use SelfSustainingEcosystem for role-based incentives");
    }

    /// @notice Deprecated - returns empty stats
    function getDeployerStats(address deployer) external pure returns (
        string memory domain,
        uint256 tier,
        uint256 totalUsers,
        uint256 activeUsers,
        uint256 totalRewards,
        uint256 pendingRewards,
        uint256 monthlyCount,
        uint256 registeredAt,
        bool isActive
    ) {
        deployer; // silence unused warning
        return ("", 0, 0, 0, 0, 0, 0, 0, false);
    }

    /// @notice Deprecated
    function getReferralLink(address deployer) external pure returns (string memory) {
        deployer; // silence unused warning
        revert("Deprecated: Use SelfSustainingEcosystem for referral tracking");
    }

    /// @notice Deprecated
    function checkIsDeployer(address account) external pure returns (bool) {
        account; // silence unused warning
        revert("Deprecated: Use SelfSustainingEcosystem for role management");
    }

    /// @notice Deprecated
    function getTierInfo(uint256 tierIndex) external pure returns (TierConfig memory) {
        tierIndex; // silence unused warning
        revert("Deprecated: Use SelfSustainingEcosystem for tier management");
    }

    /// @notice Deprecated
    function setTierConfig(uint256 tierIndex, TierConfig calldata config) external pure {
        tierIndex; config; // silence unused warning
        revert("Deprecated: Use SelfSustainingEcosystem for tier management");
    }

    /// @notice Deprecated
    function getDeployerCount() external pure returns (uint256) {
        revert("Deprecated: Use SelfSustainingEcosystem for deployer count");
    }

    /// @notice Deprecated
    function claimRewards() external pure {
        revert("Deprecated: Use SelfSustainingEcosystem for reward claims");
    }

    /// @notice Deprecated
    function setUserActive(address user, address deployer) external pure {
        user; deployer; // silence unused warning
        revert("Deprecated: Use SelfSustainingEcosystem for user activity");
    }

    /// @notice Deprecated
    function getDividend(address deployer) external pure returns (uint256) {
        deployer; // silence unused warning
        revert("Deprecated: Use SelfSustainingEcosystem for dividends");
    }

    /// @notice Deprecated
    function claimDividend(address deployer, uint256 amount) external pure {
        deployer; amount; // silence unused warning
        revert("Deprecated: Use SelfSustainingEcosystem for dividends");
    }

    /// @notice Deprecated
    function getGovernanceWeight(address deployer) external pure returns (uint256) {
        deployer; // silence unused warning
        revert("Deprecated: Use SelfSustainingEcosystem for governance weight");
    }

    /// @notice Deprecated
    function isGoldTier(address deployer) external pure returns (bool) {
        deployer; // silence unused warning
        revert("Deprecated: Use SelfSustainingEcosystem for tier info");
    }

    /// @notice Deprecated
    function getEffectiveReferrals(address deployer) external pure returns (uint256) {
        deployer; // silence unused warning
        revert("Deprecated: Use SelfSustainingEcosystem for referrals");
    }

    /// @notice Deprecated
    function getRewardRate(address deployer) external pure returns (uint256) {
        deployer; // silence unused warning
        revert("Deprecated: Use SelfSustainingEcosystem for reward rates");
    }

    /// @notice Check if contract is deprecated
    function isDeprecated() external pure returns (bool) {
        return true;
    }

    // Reserved storage slots for upgrade compatibility
    uint256[50] private __gap;

    // Tier configuration struct - preserved for historical reference
    struct TierConfig {
        uint256 minUsers;
        uint256 minActiveUsers;
        uint256 firstReward;
        uint256 activeRewardRate;
        uint256 monthlyLimit;
    }
}