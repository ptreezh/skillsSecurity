// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IRevenueSplit.sol";

/// @title RevenueSplit
/// @notice Service fee distribution with 70/10/5/5/10 split
/// @dev Uses basis points (10000 = 100%) for precision
contract RevenueSplit is IRevenueSplit, ReentrancyGuard, Ownable {
    // Fee percentages in basis points (1 bp = 0.01%)
    uint256 public constant CREATOR_FEE = 7000;   // 70%
    uint256 public constant REFERRER_FEE = 1000;  // 10%
    uint256 public constant AUDITOR_FEE = 500;    // 5%
    uint256 public constant DISPUTE_FEE = 500;     // 5%
    uint256 public constant PLATFORM_FEE = 1000;  // 10%
    uint256 public constant TOTAL_BP = 10000;     // 100%

    // Share mappings
    mapping(address => uint256) public creatorShares;
    mapping(address => uint256) public referrerShares;
    mapping(address => uint256) public auditorShares;
    uint256 public disputeFund;
    uint256 public platformBalance;

    // Track last withdrawal time per user to prevent griefing
    mapping(address => uint256) public lastWithdrawTime;
    uint256 public constant WITHDRAW_COOLDOWN = 1 hours;

    constructor() Ownable() {}

    /// @notice Deposit fees and split among recipients
    /// @param creator The skill creator address
    /// @param auditor The auditor address
    /// @param referrer The referrer address
    function deposit(
        address creator,
        address auditor,
        address referrer
    ) external payable override nonReentrant {
        require(msg.value > 0, "Must send ETH");
        require(creator != address(0), "Invalid creator");
        require(auditor != address(0), "Invalid auditor");
        require(referrer != address(0), "Invalid referrer");

        uint256 amount = msg.value;

        // Calculate shares
        uint256 creatorAmount = (amount * CREATOR_FEE) / TOTAL_BP;
        uint256 referrerAmount = (amount * REFERRER_FEE) / TOTAL_BP;
        uint256 auditorAmount = (amount * AUDITOR_FEE) / TOTAL_BP;
        uint256 disputeAmount = (amount * DISPUTE_FEE) / TOTAL_BP;
        uint256 platformAmount = (amount * PLATFORM_FEE) / TOTAL_BP;

        // Accumulate shares
        creatorShares[creator] += creatorAmount;
        referrerShares[referrer] += referrerAmount;
        auditorShares[auditor] += auditorAmount;
        disputeFund += disputeAmount;
        platformBalance += platformAmount;

        emit FeeDeposited(creator, referrer, auditor, amount);
    }

    /// @notice Withdraw accumulated share for caller
    function withdraw() external override nonReentrant {
        require(
            block.timestamp >= lastWithdrawTime[msg.sender] + WITHDRAW_COOLDOWN,
            "Cooldown active"
        );

        uint256 amount = calculateShare(msg.sender);
        require(amount > 0, "No share to withdraw");

        // Determine role and reduce appropriate mapping
        uint256 creatorShare = creatorShares[msg.sender];
        uint256 referrerShare = referrerShares[msg.sender];
        uint256 auditorShare = auditorShares[msg.sender];

        if (creatorShare > 0) {
            creatorShares[msg.sender] = 0;
            _safeTransfer(payable(msg.sender), creatorShare);
            emit Withdrawn(msg.sender, "CREATOR", creatorShare);
        } else if (referrerShare > 0) {
            referrerShares[msg.sender] = 0;
            _safeTransfer(payable(msg.sender), referrerShare);
            emit Withdrawn(msg.sender, "REFERRER", referrerShare);
        } else if (auditorShare > 0) {
            auditorShares[msg.sender] = 0;
            _safeTransfer(payable(msg.sender), auditorShare);
            emit Withdrawn(msg.sender, "AUDITOR", auditorShare);
        } else {
            // Platform withdrawal
            require(msg.sender == owner(), "Only owner can withdraw platform funds");
            platformBalance = 0;
            _safeTransfer(payable(msg.sender), amount);
            emit Withdrawn(msg.sender, "PLATFORM", amount);
        }

        lastWithdrawTime[msg.sender] = block.timestamp;
    }

    /// @notice Calculate current share for an address
    /// @param user The user address
    /// @return The accumulated share amount
    function calculateShare(address user) public view returns (uint256) {
        return creatorShares[user] + referrerShares[user] + auditorShares[user];
    }

    /// @notice Emergency withdrawal by owner
    /// @param to Recipient address
    function emergencyWithdraw(address to) external override onlyOwner {
        require(to != address(0), "Invalid address");
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance");
        _safeTransfer(payable(to), balance);
        emit EmergencyWithdraw(to, balance);
    }

    /// @notice Get contract balance
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /// @notice Get share breakdown for an address
    /// @param user The user address
    /// @return creator The creator share amount
    /// @return referrer The referrer share amount
    /// @return auditor The auditor share amount
    function getShareBreakdown(address user) external view returns (
        uint256 creator,
        uint256 referrer,
        uint256 auditor
    ) {
        return (creatorShares[user], referrerShares[user], auditorShares[user]);
    }

    /// @dev Pull payment pattern to prevent reentrancy
    function _safeTransfer(address to, uint256 amount) internal {
        (bool success, ) = to.call{value: amount}("");
        require(success, "Transfer failed");
    }

    /// @dev Allow contract to receive ETH
    receive() external payable {}
}
