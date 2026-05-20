// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/IReputationBadges.sol";

/// @title SelfSustainingEcosystem
/// @notice Role-based ecosystem with incentives and health reports
/// @dev Manages CREATOR, AUDITOR, REFERRER, DISPUTER, NODE, CURATOR roles
contract SelfSustainingEcosystem is Ownable, ReentrancyGuard {
    // Role types
    enum Role {
        CREATOR,    // Skill creator
        AUDITOR,    // Skill verifier
        REFERRER,   // Promotion referrer
        DISPUTER,   // Dispute resolver
        NODE,       // Node operator
        CURATOR     // Content curator
    }

    // Tier levels
    enum RoleTier {
        BRONZE,     // Base tier
        SILVER,     // Mid tier
        GOLD        // Top tier
    }

    // Role info
    struct RoleInfo {
        Role role;
        RoleTier tier;
        uint256 contributions;
        uint256 lastActive;
        uint256 registeredAt;
    }

    // Tier configuration
    struct TierConfig {
        uint256 minContributions;
        uint256 rewardMultiplier;  // basis points
        uint256 badgeThreshold;
    }

    // Health report structure
    struct HealthReport {
        uint256 totalUsers;
        uint256 activeRoles;
        uint256 totalContributions;
        uint256 totalRewardsDistributed;
        uint256 averageTier;
        RoleTier[] dominantTier;
    }

    // State
    mapping(address => RoleInfo[]) public userRoles;
    mapping(address => mapping(Role => uint256)) public roleRewards;
    uint256 public totalContributions;
    uint256 public totalRewardsDistributed;

    // Tier configurations
    TierConfig[3] public tierConfigs;

    // Role base rewards
    mapping(Role => uint256) public roleBaseReward;

    // Reputation badges integration
    IReputationBadges public reputationBadges;
    bool public reputationBadgesSet;

    // Events
    event RoleRegistered(address indexed user, Role indexed role);
    event RoleUpgraded(address indexed user, Role indexed role, RoleTier oldTier, RoleTier newTier);
    event ContributionRecorded(address indexed user, Role indexed role, uint256 amount, uint256 total);
    event RewardClaimed(address indexed user, uint256 amount);
    event ReputationBadgesSet(address indexed badges);

    constructor() Ownable() {
        // Initialize tier configs
        tierConfigs[0] = TierConfig(0, 1000, 0);           // BRONZE: 1x multiplier
        tierConfigs[1] = TierConfig(10, 1500, 5);        // SILVER: 1.5x multiplier
        tierConfigs[2] = TierConfig(50, 2000, 20);        // GOLD: 2x multiplier

        // Set base rewards per role
        roleBaseReward[Role.CREATOR] = 100 ether;
        roleBaseReward[Role.AUDITOR] = 50 ether;
        roleBaseReward[Role.REFERRER] = 75 ether;
        roleBaseReward[Role.DISPUTER] = 60 ether;
        roleBaseReward[Role.NODE] = 200 ether;
        roleBaseReward[Role.CURATOR] = 40 ether;
    }

    /// @notice Register a role for the caller
    /// @param role The role to register
    function registerRole(Role role) external {
        // Check if role already exists
        RoleInfo[] storage roles = userRoles[msg.sender];
        for (uint256 i = 0; i < roles.length; i++) {
            require(roles[i].role != role, "Role already registered");
        }

        // Add new role with BRONZE tier
        roles.push(RoleInfo({
            role: role,
            tier: RoleTier.BRONZE,
            contributions: 0,
            lastActive: block.timestamp,
            registeredAt: block.timestamp
        }));

        emit RoleRegistered(msg.sender, role);
    }

    /// @notice Upgrade tier for a role if thresholds are met
    /// @param role The role to upgrade
    function upgradeTier(Role role) external {
        RoleInfo storage info = _getRoleInfo(msg.sender, role);
        require(info.tier != RoleTier.GOLD, "Already at max tier");

        RoleTier newTier;
        if (info.tier == RoleTier.BRONZE && info.contributions >= tierConfigs[1].minContributions) {
            newTier = RoleTier.SILVER;
        } else if (info.tier == RoleTier.SILVER && info.contributions >= tierConfigs[2].minContributions) {
            newTier = RoleTier.GOLD;
        } else {
            revert("Contribution threshold not met");
        }

        RoleTier oldTier = info.tier;
        info.tier = newTier;

        emit RoleUpgraded(msg.sender, role, oldTier, newTier);

        // Issue badge if threshold met and ReputationBadges is set
        if (reputationBadgesSet) {
            _issueTierBadge(msg.sender, newTier);
        }
    }

    /// @notice Record a contribution for a role
    /// @param role The role for contribution
    /// @param amount The contribution amount
    function recordContribution(Role role, uint256 amount) external {
        RoleInfo storage info = _getRoleInfo(msg.sender, role);
        info.contributions += amount;
        info.lastActive = block.timestamp;
        totalContributions += amount;

        emit ContributionRecorded(msg.sender, role, amount, info.contributions);

        // Auto-upgrade if thresholds met
        if (info.tier == RoleTier.BRONZE && info.contributions >= tierConfigs[1].minContributions) {
            _upgradeToTier(msg.sender, role, RoleTier.SILVER);
        } else if (info.tier == RoleTier.SILVER && info.contributions >= tierConfigs[2].minContributions) {
            _upgradeToTier(msg.sender, role, RoleTier.GOLD);
        }
    }

    /// @notice Calculate rewards for a user and role
    /// @param user The user address
    /// @param role The role
    /// @return The calculated reward amount
    function calculateRewards(address user, Role role) external view returns (uint256) {
        RoleInfo storage info = _getRoleInfo(user, role);
        uint256 baseReward = roleBaseReward[role];
        uint256 multiplier = tierConfigs[uint256(info.tier)].rewardMultiplier;
        return (baseReward * multiplier * info.contributions) / 10000;
    }

    /// @notice Claim accumulated rewards
    function claimRewards() external nonReentrant {
        uint256 totalReward = 0;

        RoleInfo[] storage roles = userRoles[msg.sender];
        for (uint256 i = 0; i < roles.length; i++) {
            Role role = roles[i].role;
            uint256 reward = roleRewards[msg.sender][role];
            if (reward > 0) {
                totalReward += reward;
                roleRewards[msg.sender][role] = 0;
            }
        }

        require(totalReward > 0, "No rewards to claim");

        totalRewardsDistributed += totalReward;
        (bool success, ) = msg.sender.call{value: totalReward}("");
        require(success, "Transfer failed");

        emit RewardClaimed(msg.sender, totalReward);
    }

    /// @notice Generate health report of the ecosystem
    /// @return HealthReport with system-wide metrics
    function generateHealthReport() external view returns (HealthReport memory) {
        HealthReport memory report = HealthReport({
            totalUsers: 0,
            activeRoles: 0,
            totalContributions: totalContributions,
            totalRewardsDistributed: totalRewardsDistributed,
            averageTier: uint256(RoleTier.BRONZE),
            dominantTier: new RoleTier[](0)
        });
        return report;
    }

    /// @notice Set reputation badges contract
    /// @param badges The ReputationBadges contract address
    function setReputationBadges(address badges) external onlyOwner {
        require(badges != address(0), "Invalid address");
        reputationBadges = IReputationBadges(badges);
        reputationBadgesSet = true;
        emit ReputationBadgesSet(badges);
    }

    /// @notice Get role info for a user
    /// @param user The user address
    /// @param role The role to query
    /// @return RoleInfo for the role
    function getRoleInfo(address user, Role role) external view returns (RoleInfo memory) {
        return _getRoleInfo(user, role);
    }

    /// @notice Get all roles for a user
    /// @param user The user address
    /// @return Array of RoleInfo
    function getUserRoles(address user) external view returns (RoleInfo[] memory) {
        return userRoles[user];
    }

    /// @notice Add rewards to a user role
    /// @param user The user address
    /// @param role The role
    /// @param amount The reward amount
    function addRewards(address user, Role role, uint256 amount) external onlyOwner {
        roleRewards[user][role] += amount;
    }

    // Internal helpers
    function _getRoleInfo(address user, Role role) internal view returns (RoleInfo storage) {
        RoleInfo[] storage roles = userRoles[user];
        for (uint256 i = 0; i < roles.length; i++) {
            if (roles[i].role == role) {
                return roles[i];
            }
        }
        revert("Role not registered");
    }

    function _upgradeToTier(address user, Role role, RoleTier newTier) internal {
        RoleInfo storage info = _getRoleInfo(user, role);
        RoleTier oldTier = info.tier;
        info.tier = newTier;
        emit RoleUpgraded(user, role, oldTier, newTier);

        if (reputationBadgesSet) {
            _issueTierBadge(user, newTier);
        }
    }

    function _issueTierBadge(address user, RoleTier tier) internal {
        if (tier == RoleTier.SILVER) {
            reputationBadges.issueBadge(
                user,
                IReputationBadges.BadgeType.CODE_REVIEWER,
                "Silver tier achieved in ecosystem"
            );
        } else if (tier == RoleTier.GOLD) {
            reputationBadges.issueBadge(
                user,
                IReputationBadges.BadgeType.VERIFIED_DEVELOPER,
                "Gold tier achieved in ecosystem"
            );
        }
    }

    /// @dev Allow contract to receive ETH for rewards
    receive() external payable {}
}