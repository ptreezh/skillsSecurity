// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockDeployerRewards
 * @notice Mock contract for testing RevenueDistributor
 */
contract MockDeployerRewards {
    mapping(address => bool) public isDeployer;
    mapping(address => uint256) public deployerTier;
    mapping(address => uint256) public totalUsers;
    address[] internal _deployerAddresses;

    function addDeployer(address deployer, uint256 tier) external {
        isDeployer[deployer] = true;
        deployerTier[deployer] = tier;
        // Mock: Bronze=5, Silver=15, Gold=25 users
        totalUsers[deployer] = tier * 10 + 5;
        _deployerAddresses.push(deployer);
    }

    function getDeployerCount() external view returns (uint256) {
        return _deployerAddresses.length;
    }

    function deployerList(uint256 index) external view returns (address) {
        require(index < _deployerAddresses.length, "Invalid index");
        return _deployerAddresses[index];
    }

    function getGovernanceWeight(address deployer) external view returns (uint256) {
        if (!isDeployer[deployer]) return 0;
        return (totalUsers[deployer] * 1e18) + (deployerTier[deployer] * 100e18);
    }

    function isGoldTier(address deployer) external view returns (bool) {
        return deployerTier[deployer] == 2;
    }
}