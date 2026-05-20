// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IRevenueSplit
/// @notice Interface for service fee distribution contract
interface IRevenueSplit {
    /// @notice Emitted when fees are deposited
    event FeeDeposited(
        address indexed creator,
        address indexed referrer,
        address indexed auditor,
        uint256 amount
    );

    /// @notice Emitted when a withdrawal occurs
    event Withdrawn(
        address indexed recipient,
        bytes32 indexed role,
        uint256 amount
    );

    /// @notice Emitted in emergency withdrawal
    event EmergencyWithdraw(address indexed to, uint256 amount);

    /// @notice Deposit fees and split among recipients
    /// @param creator The skill creator address
    /// @param auditor The auditor address
    /// @param referrer The referrer address
    function deposit(
        address creator,
        address auditor,
        address referrer
    ) external payable;

    /// @notice Withdraw accumulated share for caller
    function withdraw() external;

    /// @notice Emergency withdrawal by owner
    /// @param to Recipient address
    function emergencyWithdraw(address to) external;
}
