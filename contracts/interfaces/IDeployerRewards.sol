// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IDeployerRewards
 * @notice Interface for DeployerRewards contract integration
 * @dev Used by RevenueDistributor and Governance for 四自 system
 */
interface IDeployerRewards {
    function isDeployer(address account) external view returns (bool);
    function getDeployerStats(address deployer) external view returns (
        string memory domain,
        uint256 tier,
        uint256 totalUsers,
        uint256 activeUsers,
        uint256 totalRewards,
        uint256 pendingRewards,
        uint256 monthlyCount,
        uint256 registeredAt,
        bool isActive
    );
    function getGovernanceWeight(address deployer) external view returns (uint256);
    function isGoldTier(address deployer) external view returns (bool);
    function getDeployerCount() external view returns (uint256);
    function deployerList(uint256 index) external view returns (address);
}