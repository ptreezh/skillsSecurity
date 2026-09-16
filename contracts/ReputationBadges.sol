// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IReputationBadges.sol";

/// @title ReputationBadges
/// @notice Non-transferable reputation badges（纯声誉事件记账，零 token 标准）
/// @dev W1.4 改造：移除 ERC721，徽章为不可转移的纯链上声誉凭证
///      接口 IReputationBadges 保持不变（SelfSustainingEcosystem._issueTierBadge 依赖）
contract ReputationBadges is Ownable, IReputationBadges {
    // State
    address public issuer;

    // Badge data（按自增 badgeId 索引，非 ERC721 token）
    mapping(uint256 => BadgeType) public badgeTypes;
    mapping(uint256 => string) public badgeEvidence;
    mapping(uint256 => uint256) public badgeIssuedAt;
    uint256 private _badgeIdCounter;

    // User badge tracking
    mapping(address => mapping(uint256 => uint256)) public userBadgeCount; // user → badgeType(uint) → count
    mapping(address => uint256[]) public userBadgeIds;                     // user → badgeId 列表（前端读取路径）

    constructor() Ownable() {
        issuer = _msgSender();
    }

    /// @notice Issue a badge to a recipient（纯记账：无 token 铸造，仅记录 + 事件）
    /// @param recipient The badge recipient
    /// @param badgeType The type of badge
    /// @param evidence The evidence/metadata for the badge
    function issueBadge(
        address recipient,
        BadgeType badgeType,
        string memory evidence
    ) external override onlyIssuer {
        require(recipient != address(0), "Invalid recipient");
        require(bytes(evidence).length > 0, "Evidence required");

        uint256 badgeId = _badgeIdCounter++;
        badgeTypes[badgeId] = badgeType;
        badgeEvidence[badgeId] = evidence;
        badgeIssuedAt[badgeId] = block.timestamp;
        userBadgeCount[recipient][uint256(badgeType)]++;
        userBadgeIds[recipient].push(badgeId);

        emit BadgeIssued(recipient, badgeType, badgeId, evidence);
    }

    /// @notice Get badge info by badge ID
    /// @param badgeId The badge ID
    /// @return BadgeInfo for the badge
    function getBadgeInfo(uint256 badgeId) external view override returns (BadgeInfo memory) {
        require(badgeId < _badgeIdCounter, "Badge does not exist");
        return BadgeInfo({
            badgeType: badgeTypes[badgeId],
            evidence: badgeEvidence[badgeId],
            issuedAt: badgeIssuedAt[badgeId]
        });
    }

    /// @notice Get user's badge count for a specific type
    /// @param user The user address
    /// @param badgeType The badge type
    /// @return Count of badges of this type
    function getUserBadgeCount(
        address user,
        BadgeType badgeType
    ) external view override returns (uint256) {
        return userBadgeCount[user][uint256(badgeType)];
    }

    /// @notice Get all badge IDs held by a user（前端读取路径，W1.4 新增）
    /// @param user The user address
    /// @return Array of badge IDs
    function getUserBadges(address user) external view returns (uint256[] memory) {
        return userBadgeIds[user];
    }

    /// @notice Set the issuer address
    /// @param newIssuer The new issuer address
    function setIssuer(address newIssuer) external override onlyOwner {
        require(newIssuer != address(0), "Invalid issuer");
        issuer = newIssuer;
        emit IssuerChanged(newIssuer);
    }

    /// @dev Modifier to restrict to issuer only
    modifier onlyIssuer() {
        require(msg.sender == issuer, "Only issuer");
        _;
    }
}