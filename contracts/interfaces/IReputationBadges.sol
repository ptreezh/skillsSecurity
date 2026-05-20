// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IReputationBadges
/// @notice Interface for non-transferable reputation badges
interface IReputationBadges {
    /// @notice Badge types for reputation tracking
    enum BadgeType {
        SKILLSHARP_100,  // 100+ successful deliveries
        VERIFIED_DEVELOPER,  // Certified developer
        TOP_RATED,  // 4.5+ rating
        EARLY_ADOPTER,  // Early user
        SECURITY_AUDITOR,  // Security auditor
        CODE_REVIEWER  // Code reviewer
    }

    /// @notice Badge info for a specific token
    struct BadgeInfo {
        BadgeType badgeType;
        string evidence;
        uint256 issuedAt;
    }

    /// @notice Emitted when a badge is issued
    event BadgeIssued(
        address indexed recipient,
        BadgeType indexed badgeType,
        uint256 indexed tokenId,
        string evidence
    );

    /// @notice Emitted when issuer is changed
    event IssuerChanged(address indexed newIssuer);

    /// @notice Issue a badge to a recipient
    /// @param recipient The badge recipient
    /// @param badgeType The type of badge
    /// @param evidence The evidence/metadata for the badge
    function issueBadge(
        address recipient,
        BadgeType badgeType,
        string memory evidence
    ) external;

    /// @notice Get badge info by token ID
    /// @param tokenId The token ID
    /// @return BadgeInfo for the token
    function getBadgeInfo(uint256 tokenId) external view returns (BadgeInfo memory);

    /// @notice Get user's badge count for a specific type
    /// @param user The user address
    /// @param badgeType The badge type
    /// @return Count of badges of this type
    function getUserBadgeCount(
        address user,
        BadgeType badgeType
    ) external view returns (uint256);

    /// @notice Set the issuer address
    /// @param newIssuer The new issuer address
    function setIssuer(address newIssuer) external;
}
