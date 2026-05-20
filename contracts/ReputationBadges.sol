// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IReputationBadges.sol";

/// @title ReputationBadges
/// @notice Non-transferable reputation badges (ERC-721)
/// @dev Badges cannot be transferred once issued
contract ReputationBadges is ERC721, Ownable, IReputationBadges {
    // State
    address public issuer;

    // Token data
    mapping(uint256 => BadgeType) public badgeTypes;
    mapping(uint256 => string) public badgeEvidence;
    mapping(uint256 => uint256) public badgeIssuedAt;

    // User badge tracking
    mapping(address => mapping(uint256 => uint256)) public userBadgeCount;
    uint256 private _tokenIdCounter;

    constructor() ERC721("AgentSkills Badges", "ASKB") Ownable() {
        issuer = _msgSender();
    }

    /// @notice Issue a badge to a recipient
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

        uint256 tokenId = _tokenIdCounter++;
        _safeMint(recipient, tokenId);
        
        badgeTypes[tokenId] = badgeType;
        badgeEvidence[tokenId] = evidence;
        badgeIssuedAt[tokenId] = block.timestamp;
        userBadgeCount[recipient][uint256(badgeType)]++;

        emit BadgeIssued(recipient, badgeType, tokenId, evidence);
    }

    /// @notice Get badge info by token ID
    /// @param tokenId The token ID
    /// @return BadgeInfo for the token
    function getBadgeInfo(uint256 tokenId) external view override returns (BadgeInfo memory) {
        require(_exists(tokenId), "Token does not exist");
        return BadgeInfo({
            badgeType: badgeTypes[tokenId],
            evidence: badgeEvidence[tokenId],
            issuedAt: badgeIssuedAt[tokenId]
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

    /// @notice Set the issuer address
    /// @param newIssuer The new issuer address
    function setIssuer(address newIssuer) external override onlyOwner {
        require(newIssuer != address(0), "Invalid issuer");
        issuer = newIssuer;
        emit IssuerChanged(newIssuer);
    }

    /// @dev CRITICAL: Override transferFrom to prevent transfers
    function transferFrom(
        address,
        address,
        uint256
    ) public pure override {
        revert("Badges are non-transferable");
    }

    /// @dev CRITICAL: Override safeTransferFrom to prevent transfers
    function safeTransferFrom(
        address,
        address,
        uint256
    ) public pure override {
        revert("Badges are non-transferable");
    }

    /// @dev CRITICAL: Override safeTransferFrom with data to prevent transfers
    function safeTransferFrom(
        address,
        address,
        uint256,
        bytes memory
    ) public pure override {
        revert("Badges are non-transferable");
    }

    /// @dev Override tokenURI to provide badge metadata
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "Token does not exist");
        BadgeType bt = badgeTypes[tokenId];
        return string(abi.encodePacked(
            "data:application/json,",
            '{"name":"',
            _badgeTypeToString(bt),
            '","description":"AgentSkills Reputation Badge","attributes":[{"trait_type":"Type","value":"',
            _badgeTypeToString(bt),
            '"},{"trait_type":"IssuedAt","value":',
            Strings.toString(badgeIssuedAt[tokenId]),
            '}]}'
        ));
    }

    /// @dev Helper to convert badge type to string
    function _badgeTypeToString(BadgeType bt) internal pure returns (string memory) {
        if (bt == BadgeType.SKILLSHARP_100) return "SKILLSHARP_100";
        if (bt == BadgeType.VERIFIED_DEVELOPER) return "VERIFIED_DEVELOPER";
        if (bt == BadgeType.TOP_RATED) return "TOP_RATED";
        if (bt == BadgeType.EARLY_ADOPTER) return "EARLY_ADOPTER";
        if (bt == BadgeType.SECURITY_AUDITOR) return "SECURITY_AUDITOR";
        if (bt == BadgeType.CODE_REVIEWER) return "CODE_REVIEWER";
        return "UNKNOWN";
    }

    /// @dev Modifier to restrict to issuer only
    modifier onlyIssuer() {
        require(msg.sender == issuer, "Only issuer");
        _;
    }
}
