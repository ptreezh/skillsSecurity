// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ReputationRole
 * @notice Shared role enumeration for reputation incentives (single source of truth)
 * @dev Keeps Governance and ReputationIncentives in sync (grill-down #15)
 * @dev Order must match legacy enum to preserve role indexes across migration
 */
enum ReputationRole {
    CREATOR,    // Skill creator
    AUDITOR,    // Skill verifier
    REFERRER,   // Promotion referrer
    DISPUTER,   // Dispute resolver
    NODE,       // Node operator
    CURATOR     // Content curator
}

/**
 * @title IReputationIncentives
 * @notice Interface for reputation-based role incentives (zero-token architecture)
 * @dev Only governance may mutate reward config; balances are reputation-only
 */
interface IReputationIncentives {
    /**
     * @notice Set base reward for a role (governance-only)
     * @param role Role to configure
     * @param amount New base reward in reputation units
     */
    function setRoleBaseReward(ReputationRole role, uint256 amount) external;

    /**
     * @notice Get base reward for a role
     * @param role Role to query
     * @return Current base reward in reputation units
     */
    function getRoleBaseReward(ReputationRole role) external view returns (uint256);
}