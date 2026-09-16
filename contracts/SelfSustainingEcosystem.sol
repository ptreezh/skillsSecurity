// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/IReputationBadges.sol";
import "./interfaces/IReputationIncentives.sol";
import "./StakingManager.sol";
import "./SkillRegistry.sol";
import "./Attribution.sol";

/// @title SelfSustainingEcosystem (ReputationIncentives 语义改造，设计文档 W1.3)
/// @notice 基于角色的声誉激励系统：角色注册/升级/贡献记账 + 声誉奖励发放 + 健康报告真实聚合
/// @dev 无代币、无 ETH：addReputation 写入 StakingManager.userReputation 单一权威源（grill-down #1）
///      女巫检测边界在后端身份层；合约层仅做报告唯一性去重 + 时间窗口限频（grill-down #17）
contract SelfSustainingEcosystem is Ownable, ReentrancyGuard, IReputationIncentives {
    // Tier levels
    enum RoleTier {
        BRONZE,     // Base tier
        SILVER,     // Mid tier
        GOLD        // Top tier
    }

    // Role info
    struct RoleInfo {
        ReputationRole role;
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

    // Health report structure（真实聚合，无硬编码 0）
    struct HealthReport {
        uint256 totalUsers;              // 注册过角色的用户总数
        uint256 activeRoles;             // 角色注册总数
        uint256 totalContributions;      // 本合约贡献总数
        uint256 totalRewardsDistributed; // 本合约已发放声誉奖励
        uint256 averageTier;             // 加权平均 tier（0/1/2）
        RoleTier[] dominantTier;         // 人数最多的 tier（可能并列）
        uint256 totalSkills;             // SkillRegistry 技能总数（真实聚合）
        uint256 totalStakers;            // StakingManager 活跃质押用户数（真实聚合）
        uint256 totalEffectiveReputation;// StakingManager 总有效声誉（真实聚合）
        uint256 totalAttributedContributions; // Attribution 全局贡献数（真实聚合）
    }

    // 治理参数
    uint256 public constant REPORT_REWARD = 10;          // 每次有效报告奖励声誉分
    uint256 public constant REPORT_COOLDOWN = 1 days;    // 同一地址报告时间窗口

    // State
    mapping(address => RoleInfo[]) public userRoles;
    mapping(address => mapping(ReputationRole => uint256)) public roleRewards;
    uint256 public totalContributions;
    uint256 public totalRewardsDistributed;
    uint256 public totalUsers;               // 增量维护：首次注册角色 +1
    uint256 public activeRoles;              // 增量维护：每次角色注册 +1
    uint256[3] public tierCounts;            // 增量维护：各 tier 在册人数

    // Tier configurations
    TierConfig[3] public tierConfigs;

    // Role base rewards（纯声誉分数标量，无代币单位）
    mapping(ReputationRole => uint256) public roleBaseReward;

    // 防刷状态（grill-down #17：合约层去重 + 限频）
    mapping(bytes32 => bool) public submittedReports;          // skillId+reportHash 唯一性
    mapping(address => uint256) public lastReportTime;         // 时间窗口限频

    // 外部集成（真实聚合数据源）
    StakingManager public stakingManager;
    SkillRegistry public skillRegistry;
    Attribution public attribution;

    // 治理（grill-down #15：setRoleBaseReward 仅治理可调）
    address public governance;

    // Reputation badges integration
    IReputationBadges public reputationBadges;
    bool public reputationBadgesSet;

    // Events
    event RoleRegistered(address indexed user, ReputationRole indexed role);
    event RoleUpgraded(address indexed user, ReputationRole indexed role, RoleTier oldTier, RoleTier newTier);
    event ContributionRecorded(address indexed user, ReputationRole indexed role, uint256 amount, uint256 total);
    event RewardClaimed(address indexed user, uint256 amount);
    event ReputationBadgesSet(address indexed badges);
    event ReportSubmitted(address indexed reporter, uint256 indexed skillId, bytes32 reportHash, uint256 reward);
    event GovernanceSet(address indexed governance);
    event StakingManagerSet(address indexed stakingManager);

    modifier onlyGovernance() {
        require(msg.sender == governance, "Not governance");
        _;
    }

    constructor() Ownable() {
        // Initialize tier configs（纯声誉分数标量：BRONZE 1x / SILVER 1.5x / GOLD 2x）
        tierConfigs[0] = TierConfig(0, 1000, 0);           // BRONZE: 1x multiplier
        tierConfigs[1] = TierConfig(10, 1500, 5);        // SILVER: 1.5x multiplier
        tierConfigs[2] = TierConfig(50, 2000, 20);        // GOLD: 2x multiplier

        // Set base rewards per role（设计文档 W1.3：100 ether → 纯标量 100）
        roleBaseReward[ReputationRole.CREATOR] = 100;
        roleBaseReward[ReputationRole.AUDITOR] = 50;
        roleBaseReward[ReputationRole.REFERRER] = 75;
        roleBaseReward[ReputationRole.DISPUTER] = 60;
        roleBaseReward[ReputationRole.NODE] = 200;
        roleBaseReward[ReputationRole.CURATOR] = 40;
    }

    /// @notice Register a role for the caller
    /// @param role The role to register
    function registerRole(ReputationRole role) external {
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

        if (userRoles[msg.sender].length == 1) {
            totalUsers++;          // 首次注册角色计入用户数
        }
        activeRoles++;
        tierCounts[uint256(RoleTier.BRONZE)]++;

        emit RoleRegistered(msg.sender, role);
    }

    /// @notice Upgrade tier for a role if thresholds are met
    /// @param role The role to upgrade
    function upgradeTier(ReputationRole role) external {
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
        _applyTierChange(info, oldTier, newTier);

        emit RoleUpgraded(msg.sender, role, oldTier, newTier);

        // Issue badge if threshold met and ReputationBadges is set
        if (reputationBadgesSet) {
            _issueTierBadge(msg.sender, newTier);
        }
    }

    /// @notice Record a contribution for a role
    /// @param role The role for contribution
    /// @param amount The contribution amount
    function recordContribution(ReputationRole role, uint256 amount) external {
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
    function calculateRewards(address user, ReputationRole role) external view returns (uint256) {
        RoleInfo storage info = _getRoleInfo(user, role);
        uint256 baseReward = roleBaseReward[role];
        uint256 multiplier = tierConfigs[uint256(info.tier)].rewardMultiplier;
        return (baseReward * multiplier * info.contributions) / 10000;
    }

    /// @notice Claim accumulated rewards（真实发放：声誉写入 StakingManager 权威源，无 ETH）
    function claimRewards() external nonReentrant {
        uint256 totalReward = 0;

        RoleInfo[] storage roles = userRoles[msg.sender];
        for (uint256 i = 0; i < roles.length; i++) {
            ReputationRole role = roles[i].role;
            uint256 reward = roleRewards[msg.sender][role];
            if (reward > 0) {
                totalReward += reward;
                roleRewards[msg.sender][role] = 0;
            }
        }

        require(totalReward > 0, "No rewards to claim");
        require(address(stakingManager) != address(0), "StakingManager not set");

        totalRewardsDistributed += totalReward;
        // 声誉写入唯一权威源 StakingManager.userReputation
        stakingManager.addReputation(msg.sender, int256(totalReward));

        emit RewardClaimed(msg.sender, totalReward);
    }

    /// @notice 提交技能测试/审计报告（grill-down #17：唯一性去重 + 时间窗口限频）
    /// @dev 女巫检测在后端身份层（ChainMaker 代签身份由管理员分配，非开放注册）；本合约诚实标注边界
    /// @param skillId 被报告技能 ID
    /// @param reportHash 报告内容指纹（防止同一报告重复提交）
    function submitReport(uint256 skillId, bytes32 reportHash) external nonReentrant {
        require(skillId > 0, "Invalid skillId");
        require(reportHash != bytes32(0), "Invalid reportHash");

        // 唯一性去重
        bytes32 key = keccak256(abi.encodePacked(skillId, reportHash));
        require(!submittedReports[key], "Report already submitted");

        // 时间窗口限频
        require(block.timestamp >= lastReportTime[msg.sender] + REPORT_COOLDOWN, "Report cooldown active");

        submittedReports[key] = true;
        lastReportTime[msg.sender] = block.timestamp;

        require(address(stakingManager) != address(0), "StakingManager not set");
        stakingManager.addReputation(msg.sender, int256(REPORT_REWARD));

        emit ReportSubmitted(msg.sender, skillId, reportHash, REPORT_REWARD);
    }

    /// @notice Generate health report of the ecosystem（真实聚合，无硬编码 0）
    /// @return HealthReport with system-wide metrics from SkillRegistry / StakingManager / Attribution / self
    function generateHealthReport() external view returns (HealthReport memory) {
        uint256 totalSkills = address(skillRegistry) != address(0) ? skillRegistry.nextSkillId() : 0;
        uint256 totalStakers = address(stakingManager) != address(0) ? stakingManager.stakerCount() : 0;
        uint256 totalRep = address(stakingManager) != address(0)
            ? (stakingManager.getTotalReputation() > 0 ? uint256(stakingManager.getTotalReputation()) : 0)
            : 0;
        uint256 totalAttributedContributions = address(attribution) != address(0)
            ? attribution.totalContributions()
            : 0;

        // 平均 tier（0=BRONZE, 1=SILVER, 2=GOLD）
        uint256 avgTier = 0;
        if (totalUsers > 0) {
            avgTier = (tierCounts[1] + 2 * tierCounts[2]) / totalUsers;
        }

        // dominant tier：人数最多的 tier（可并列）
        RoleTier[] memory dominant = new RoleTier[](3);
        uint256 dominantCount = 0;
        uint256 maxCount = 0;
        for (uint256 i = 0; i < 3; i++) {
            if (tierCounts[i] >= maxCount) {
                if (tierCounts[i] > maxCount) {
                    maxCount = tierCounts[i];
                    dominantCount = 0;
                }
                dominant[dominantCount] = RoleTier(i);
                dominantCount++;
            }
        }
        // 收缩为实际长度
        RoleTier[] memory dominantTier = new RoleTier[](dominantCount);
        for (uint256 i = 0; i < dominantCount; i++) {
            dominantTier[i] = dominant[i];
        }

        HealthReport memory report = HealthReport({
            totalUsers: totalUsers,
            activeRoles: activeRoles,
            totalContributions: totalContributions,
            totalRewardsDistributed: totalRewardsDistributed,
            averageTier: avgTier,
            dominantTier: dominantTier,
            totalSkills: totalSkills,
            totalStakers: totalStakers,
            totalEffectiveReputation: totalRep,
            totalAttributedContributions: totalAttributedContributions
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

    /// @notice Set governance contract（grill-down #15：setRoleBaseReward 仅治理可调）
    function setGovernance(address _governance) external onlyOwner {
        require(_governance != address(0), "Invalid address");
        governance = _governance;
        emit GovernanceSet(_governance);
    }

    /// @notice Set StakingManager（声誉权威源 + 健康报告聚合数据源）
    function setStakingManager(address _stakingManager) external onlyOwner {
        require(_stakingManager != address(0), "Invalid address");
        stakingManager = StakingManager(_stakingManager);
        emit StakingManagerSet(_stakingManager);
    }

    /// @notice Set SkillRegistry（健康报告聚合数据源）
    function setSkillRegistry(address _skillRegistry) external onlyOwner {
        require(_skillRegistry != address(0), "Invalid address");
        skillRegistry = SkillRegistry(_skillRegistry);
    }

    /// @notice Set Attribution（健康报告聚合数据源）
    function setAttribution(address _attribution) external onlyOwner {
        require(_attribution != address(0), "Invalid address");
        attribution = Attribution(_attribution);
    }

    /// @notice IReputationIncentives：治理动作 UPDATE_REWARD_CONFIG 的真实执行目标（grill-down #15）
    /// @param role 角色
    /// @param amount 新的基础奖励（纯声誉分数标量）
    function setRoleBaseReward(ReputationRole role, uint256 amount) external override onlyGovernance {
        roleBaseReward[role] = amount;
    }

    /// @notice IReputationIncentives：查询角色基础奖励
    function getRoleBaseReward(ReputationRole role) external view override returns (uint256) {
        return roleBaseReward[role];
    }

    /// @notice Get role info for a user
    /// @param user The user address
    /// @param role The role to query
    /// @return RoleInfo for the role
    function getRoleInfo(address user, ReputationRole role) external view returns (RoleInfo memory) {
        return _getRoleInfo(user, role);
    }

    /// @notice Get all roles for a user
    /// @param user The user address
    /// @return Array of RoleInfo
    function getUserRoles(address user) external view returns (RoleInfo[] memory) {
        return userRoles[user];
    }

    /// @notice Add rewards to a user role（记账；claimRewards 时经 addReputation 写入权威源）
    /// @param user The user address
    /// @param role The role
    /// @param amount The reward amount（纯声誉分数标量）
    function addRewards(address user, ReputationRole role, uint256 amount) external onlyOwner {
        roleRewards[user][role] += amount;
    }

    // Internal helpers
    function _getRoleInfo(address user, ReputationRole role) internal view returns (RoleInfo storage) {
        RoleInfo[] storage roles = userRoles[user];
        for (uint256 i = 0; i < roles.length; i++) {
            if (roles[i].role == role) {
                return roles[i];
            }
        }
        revert("Role not registered");
    }

    /// @notice 维护 tier 计数（升级时旧 tier -1、新 tier +1）
    function _applyTierChange(RoleInfo storage info, RoleTier oldTier, RoleTier newTier) internal {
        require(tierCounts[uint256(oldTier)] > 0, "Tier count underflow");
        tierCounts[uint256(oldTier)]--;
        tierCounts[uint256(newTier)]++;
        info.tier = newTier;
    }

    function _upgradeToTier(address user, ReputationRole role, RoleTier newTier) internal {
        RoleInfo storage info = _getRoleInfo(user, role);
        RoleTier oldTier = info.tier;
        _applyTierChange(info, oldTier, newTier);
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
}