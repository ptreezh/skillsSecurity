// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DeployerRewards
 * @notice Tiered incentive system for deployers who promote AgentSkills platform
 * @dev Deployers earn rewards based on their tier level when they refer new users
 */
contract DeployerRewards is Ownable {
    error AlreadyRegistered();
    error NotRegistered();
    error InvalidTier();
    error MonthlyLimitReached();
    error ZeroAddress();
    error InvalidStakeAmount();

    // =========================================================================
    // Constants
    // =========================================================================
    uint256 public constant BASIS_POINTS = 10000;

    // =========================================================================
    // Tier Configuration
    // =========================================================================
    struct TierConfig {
        uint256 minUsers;           // Minimum total users required
        uint256 minActiveUsers;     // Minimum active users required
        uint256 firstReward;        // First-time registration reward
        uint256 activeRewardRate;   // Reward rate in basis points (e.g., 1000 = 10%)
        uint256 monthlyLimit;       // Monthly referral limit (0 = unlimited)
    }

    // =========================================================================
    // State Variables
    // =========================================================================
    IERC20 public askToken;

    // Tier configurations (index 0 = Bronze, 1 = Silver, 2 = Gold)
    TierConfig[3] public tierConfigs;

    // Deployer information
    struct DeployerInfo {
        string domain;
        uint256 tier;
        uint256 totalUsers;
        uint256 activeUsers;
        uint256 totalRewards;
        uint256 pendingRewards;
        uint256 monthlyCount;
        uint256 monthStart;
        uint256 registeredAt;
        bool isActive;
        bool hasClaimedFirstReward;
    }

    mapping(address => DeployerInfo) public deployers;
    mapping(address => bool) public isDeployer;

    // User binding information
    struct UserBinding {
        address deployer;
        uint256 firstStakeTime;
        bool hasClaimed;
    }

    mapping(address => UserBinding) public userBindings;
    mapping(address => address) public userToDeployer;

    address[] public deployerList;

    // =========================================================================
    // Events
    // =========================================================================
    event DeployerRegistered(address indexed deployer, string domain, uint256 tier);
    event DeployerUpgraded(address indexed deployer, uint256 oldTier, uint256 newTier);
    event UserRegistered(address indexed user, address indexed deployer);
    event RewardDistributed(address indexed deployer, uint256 amount, uint256 userReward);
    event TierConfigUpdated(uint256 indexed tier, TierConfig config);

    // =========================================================================
    // Constructor
    // =========================================================================
    constructor(address _askToken) {
        if (_askToken == address(0)) revert ZeroAddress();
        askToken = IERC20(_askToken);

        // Initialize tier configurations
        // Tier 0: Bronze
        tierConfigs[0] = TierConfig({
            minUsers: 0,
            minActiveUsers: 0,
            firstReward: 1000 * 10**18,  // 1000 ASK
            activeRewardRate: 1000,       // 10%
            monthlyLimit: 10
        });

        // Tier 1: Silver
        tierConfigs[1] = TierConfig({
            minUsers: 20,
            minActiveUsers: 10,
            firstReward: 3000 * 10**18,  // 3000 ASK
            activeRewardRate: 1500,       // 15%
            monthlyLimit: 50
        });

        // Tier 2: Gold
        tierConfigs[2] = TierConfig({
            minUsers: 100,
            minActiveUsers: 50,
            firstReward: 5000 * 10**18,  // 5000 ASK
            activeRewardRate: 2000,       // 20%
            monthlyLimit: 0               // Unlimited
        });
    }

    // =========================================================================
    // External Functions
    // =========================================================================

    /**
     * @notice Register a new deployer with default Bronze tier
     * @param domain Deployer's domain or name
     */
    function registerDeployer(string calldata domain) external {
        if (bytes(domain).length == 0) revert ZeroAddress();

        if (isDeployer[msg.sender]) revert AlreadyRegistered();

        DeployerInfo storage info = deployers[msg.sender];
        info.domain = domain;
        info.tier = 0; // Bronze by default
        info.isActive = true;
        info.registeredAt = block.timestamp;
        info.monthStart = block.timestamp;

        isDeployer[msg.sender] = true;
        deployerList.push(msg.sender);

        emit DeployerRegistered(msg.sender, domain, 0);
    }

    /**
     * @notice Process user registration and distribute rewards
     * @param user User address
     * @param stakeAmount User's first stake amount
     */
    function onUserRegistered(address user, uint256 stakeAmount) external {
        if (user == address(0)) revert ZeroAddress();
        if (stakeAmount == 0) revert InvalidStakeAmount();

        DeployerInfo storage deployerInfo = deployers[msg.sender];
        if (!isDeployer[msg.sender]) revert NotRegistered();

        // Check monthly limit (0 = unlimited)
        TierConfig memory tierConfig = tierConfigs[deployerInfo.tier];
        if (tierConfig.monthlyLimit > 0) {
            _resetMonthlyCountIfNeeded(msg.sender);
            if (deployerInfo.monthlyCount >= tierConfig.monthlyLimit) {
                revert MonthlyLimitReached();
            }
            deployerInfo.monthlyCount++;
        }

        // Record user binding
        userBindings[user] = UserBinding({
            deployer: msg.sender,
            firstStakeTime: block.timestamp,
            hasClaimed: false
        });
        userToDeployer[user] = msg.sender;

        // Update deployer stats
        deployerInfo.totalUsers++;

        // Calculate and distribute rewards
        uint256 deployerReward = (stakeAmount * tierConfig.activeRewardRate) / BASIS_POINTS;
        uint256 userReward = (stakeAmount * 500) / BASIS_POINTS; // 5% to user

        if (deployerReward > 0) {
            deployerInfo.pendingRewards += deployerReward;
            deployerInfo.totalRewards += deployerReward;

            // Transfer rewards from contract to deployer
            if (askToken.balanceOf(address(this)) >= deployerReward) {
                askToken.transfer(msg.sender, deployerReward);
            }
        }

        emit UserRegistered(user, msg.sender);
        emit RewardDistributed(msg.sender, deployerReward, userReward);

        // Check for tier upgrade
        _checkAndUpgradeTier(msg.sender);
    }

    /**
     * @notice Calculate and update tier based on current stats
     * @param deployer Deployer address
     */
    function calculateTier(address deployer) external {
        if (!isDeployer[deployer]) revert NotRegistered();
        _checkAndUpgradeTier(deployer);
    }

    /**
     * @notice Get deployer statistics
     * @param deployer Deployer address
     */
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
    ) {
        DeployerInfo storage info = deployers[deployer];
        return (
            info.domain,
            info.tier,
            info.totalUsers,
            info.activeUsers,
            info.totalRewards,
            info.pendingRewards,
            info.monthlyCount,
            info.registeredAt,
            info.isActive
        );
    }

    /**
     * @notice Get referral link for deployer
     * @param deployer Deployer address
     */
    function getReferralLink(address deployer) external view returns (string memory) {
        if (!isDeployer[deployer]) revert NotRegistered();
        return string(abi.encodePacked("https://app.agentskills.io/ref/", _toString(deployer)));
    }

    /**
     * @notice Check if address is registered deployer
     * @param account Address to check
     */
    function checkIsDeployer(address account) external view returns (bool) {
        return isDeployer[account];
    }

    /**
     * @notice Get tier configuration
     * @param tierIndex Tier index (0-2)
     */
    function getTierInfo(uint256 tierIndex) external view returns (TierConfig memory) {
        if (tierIndex >= 3) revert InvalidTier();
        return tierConfigs[tierIndex];
    }

    /**
     * @notice Set tier configuration (owner only)
     * @param tierIndex Tier index (0-2)
     * @param config New tier configuration
     */
    function setTierConfig(uint256 tierIndex, TierConfig calldata config) external onlyOwner {
        if (tierIndex >= 3) revert InvalidTier();
        tierConfigs[tierIndex] = config;
        emit TierConfigUpdated(tierIndex, config);
    }

    /**
     * @notice Get deployer count
     */
    function getDeployerCount() external view returns (uint256) {
        return deployerList.length;
    }

    /**
     * @notice Claim pending deployer rewards
     */
    function claimRewards() external {
        if (!isDeployer[msg.sender]) revert NotRegistered();

        DeployerInfo storage info = deployers[msg.sender];
        uint256 amount = info.pendingRewards;

        if (amount == 0) revert NotRegistered();

        info.pendingRewards = 0;
        askToken.transfer(msg.sender, amount);
    }

    /**
     * @notice Update user as active (called by external system)
     * @param user User address
     */
    function setUserActive(address user, address deployer) external {
        if (!isDeployer[deployer]) revert NotRegistered();

        DeployerInfo storage info = deployers[deployer];
        info.activeUsers++;
    }

    // =========================================================================
    // Internal Functions
    // =========================================================================

    /**
     * @notice Check and upgrade tier if thresholds are met
     */
    function _checkAndUpgradeTier(address deployer) internal {
        DeployerInfo storage info = deployers[deployer];
        uint256 oldTier = info.tier;
        uint256 newTier = oldTier;

        // Check each tier from highest to lowest
        for (uint256 i = 2; i >= 1; i--) {
            TierConfig memory config = tierConfigs[i];
            if (info.totalUsers >= config.minUsers && info.activeUsers >= config.minActiveUsers) {
                newTier = i;
                break;
            }
        }

        if (newTier > oldTier) {
            info.tier = newTier;
            emit DeployerUpgraded(deployer, oldTier, newTier);
        }
    }

    /**
     * @notice Reset monthly count if new month started
     */
    function _resetMonthlyCountIfNeeded(address deployer) internal {
        DeployerInfo storage info = deployers[deployer];
        uint256 currentMonth = block.timestamp / 30 days;
        uint256 storedMonth = info.monthStart / 30 days;

        if (currentMonth > storedMonth) {
            info.monthlyCount = 0;
            info.monthStart = block.timestamp;
        }
    }

    /**
     * @notice Convert address to string
     */
    function _toString(address x) internal pure returns (string memory) {
        bytes memory b = new bytes(42);
        b[0] = "0";
        b[1] = "x";
        for (uint256 i = 0; i < 20; i++) {
            // Extract byte from most significant to least significant
            uint256 byteVal = uint256(uint160(x)) / (2 ** (8 * (19 - i))) % 256;
            uint8 hi = uint8(byteVal / 16);
            uint8 lo = uint8(byteVal % 16);
            b[2 + i * 2] = hi < 10 ? bytes1(hi + 48) : bytes1(hi + 87);
            b[2 + i * 2 + 1] = lo < 10 ? bytes1(lo + 48) : bytes1(lo + 87);
        }
        return string(b);
    }
}