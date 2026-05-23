// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./AgentPausable.sol";

/// @title StakingManager
/// @notice Reputation-based staking system for AgentSkills
/// @dev Security: ReentrancyGuard, CEI pattern, overflow protection, Pausable
contract StakingManager is Ownable, ReentrancyGuard, AgentPausable {
    struct StakeInfo {
        uint256 amount;
        uint256 lockedUntil;
        bool slashed;
    }

    mapping(address => mapping(uint256 => StakeInfo)) public stakes;
    mapping(address => uint256[]) public userStakeIds;

    // Reputation tracking
    mapping(address => int256) public userReputation;
    mapping(address => bool) public hasLiked;

    /// Reputation lock structure (anti-slash mechanism)
    struct ReputationLock {
        uint256 lockedAmount;
        uint256 lastClaimTime;
    }

    mapping(address => ReputationLock) public reputationLocks;
    mapping(address => uint256) public originalSlashAmount;
    mapping(address => bool) public hasPositiveContribution;

    /// 5% monthly recovery rate = 500 basis points
    uint256 public constant RECOVERY_RATE_PER_MONTH = 500;

    // Events
    event RecoveryClaimed(address indexed user, uint256 amount, uint256 remainingLocked);
    event ReputationLocked(address indexed user, uint256 amount);
    event PositiveContributionSet(address indexed user);
    event Staked(address indexed user, uint256 skillId, uint256 amount);
    event Unstaked(address indexed user, uint256 skillId, uint256 amount);
    event Slash(address indexed user, uint256 skillId, uint256 amount);
    event AntiSlash(address indexed user, int256 penalty, string reason);

    /// @notice Governance contract address for secure actions
    address public governance;

    /// @notice Modifier to restrict to governance contract
    modifier onlyGovernance() {
        require(msg.sender == governance, "Not governance");
        _;
    }

    /// @notice Set governance contract address (owner only)
    /// @param _gov Governance contract address
    function setGovernance(address _gov) external onlyOwner {
        require(_gov != address(0), "Invalid address");
        governance = _gov;
    }

    constructor() Ownable() {}

    /// @notice Stake reputation on a skill
    /// @param _skillId Skill ID to stake on
    /// @param _amount Amount of reputation to stake
    function stake(uint256 _skillId, uint256 _amount) external nonReentrant whenNotPaused {
        require(!stakes[msg.sender][_skillId].slashed, "Already slashed");

        stakes[msg.sender][_skillId] = StakeInfo({
            amount: _amount,
            lockedUntil: block.timestamp + 90 days,
            slashed: false
        });

        userStakeIds[msg.sender].push(_skillId);

        emit Staked(msg.sender, _skillId, _amount);
    }

    /// @notice Unstake after lock period (90 days)
    /// @param _skillId Skill ID to unstake from
    function unstake(uint256 _skillId) external nonReentrant whenNotPaused {
        StakeInfo storage info = stakes[msg.sender][_skillId];
        require(info.amount > 0, "No stake");
        require(block.timestamp > info.lockedUntil, "Still locked");

        uint256 amount = info.amount;
        // Reset all fields to clean state
        info.amount = 0;
        info.lockedUntil = 0;
        info.slashed = false;

        emit Unstaked(msg.sender, _skillId, amount);
    }

    /// @notice Slash a user's stake (governance only in production)
    /// @param _user User address
    /// @param _skillId Skill ID
    /// @param _amount Amount to slash
    function slash(address _user, uint256 _skillId, uint256 _amount) external nonReentrant onlyGovernance whenNotPaused {
        StakeInfo storage info = stakes[_user][_skillId];
        require(info.amount >= _amount, "Insufficient stake");

        info.amount -= _amount;

        emit Slash(_user, _skillId, _amount);
    }

    /// @notice Anti-slash mechanism: penalize users who liked harmful skills
    /// @param _liker User address to penalize
    /// @param _penalty Penalty amount (negative value)
    /// @param _reason Reason for penalty
    function slashLiker(address _liker, int256 _penalty, string memory _reason) external nonReentrant onlyGovernance whenNotPaused {
        // CHECKS
        require(_liker != address(0), "Invalid address");
        require(_penalty < 0, "Penalty must be negative");

        // EFFECTS (state updates before external calls)
        uint256 penaltyAmount = uint256(-_penalty);
        ReputationLock storage lock = reputationLocks[_liker];
        lock.lockedAmount += penaltyAmount;
        if (lock.lastClaimTime == 0) {
            lock.lastClaimTime = block.timestamp;
        }

        originalSlashAmount[_liker] += penaltyAmount;
        userReputation[_liker] += _penalty;

        // Emit events before external state modifications
        emit ReputationLocked(_liker, penaltyAmount);
        emit AntiSlash(_liker, _penalty, _reason);

        // INTERACTIONS (external calls last)
        hasLiked[_liker] = false;
    }

    /// @notice Like a skill
    /// @param _skillId Skill ID to like
    function likeSkill(uint256 _skillId) external nonReentrant whenNotPaused {
        require(!hasLiked[msg.sender], "Already liked");
        require(userReputation[msg.sender] >= 0, "Need reputation");

        hasLiked[msg.sender] = true;
        userReputation[msg.sender] += 2;

        emit Staked(msg.sender, _skillId, 2); // Reuse Staked event for likes
    }

    /// @notice Get effective reputation (total - locked)
    /// @param _user User address
    /// @return Effective reputation
    function getUserReputation(address _user) external view returns (int256) {
        ReputationLock storage lock = reputationLocks[_user];
        int256 effective = userReputation[_user] - int256(lock.lockedAmount);
        return effective >= 0 ? effective : int256(0);
    }

    /// @notice Get recoverable reputation info
    /// @param _user User address
    /// @return lockedAmount Current locked amount
    /// @return lastClaimTime Last claim timestamp
    function getRecoverableReputation(address _user)
        external
        view
        returns (uint256 lockedAmount, uint256 lastClaimTime)
    {
        ReputationLock storage lock = reputationLocks[_user];
        return (lock.lockedAmount, lock.lastClaimTime);
    }

    /// @notice Claim recoverable reputation
    /// @dev 5% monthly recovery, requires positive contribution
    function claimRecoverableReputation() external nonReentrant {
        ReputationLock storage lock = reputationLocks[msg.sender];

        require(lock.lockedAmount > 0, "No locked reputation");
        require(hasPositiveContribution[msg.sender], "No positive contribution");

        uint256 monthsElapsed = (block.timestamp - lock.lastClaimTime) / 30 days;
        require(monthsElapsed >= 1, "Must wait at least 1 month");

        // SECURITY: Cap at 10 years to prevent overflow
        require(monthsElapsed <= 120, "Max 10 years");

        // SECURITY: Use checked arithmetic (Solidity 0.8+)
        // Calculate: originalSlash x 5% x months
        uint256 maxRecovery = (originalSlashAmount[msg.sender] * RECOVERY_RATE_PER_MONTH * monthsElapsed) / 10000;

        // Cap at remaining locked amount
        uint256 actualRecovery = maxRecovery > lock.lockedAmount
            ? lock.lockedAmount
            : maxRecovery;

        // Update state
        lock.lockedAmount -= actualRecovery;
        lock.lastClaimTime = block.timestamp;
        hasPositiveContribution[msg.sender] = false;

        userReputation[msg.sender] += int256(actualRecovery);

        emit RecoveryClaimed(msg.sender, actualRecovery, lock.lockedAmount);
    }

    /// @notice Mark user as having positive contribution (called by other contracts)
    /// @param _user User address
    function setPositiveContribution(address _user) external nonReentrant {
        require(!hasPositiveContribution[_user], "Already set");
        hasPositiveContribution[_user] = true;
        emit PositiveContributionSet(_user);
    }

    /// @notice Set effective reputation directly (restricted to owner)
    /// @dev Used for governance actions, testing, or corrections
    /// @param _user User address
    /// @param _effectiveRep Effective reputation value
    function setEffectiveReputation(address _user, int256 _effectiveRep) external onlyOwner {
        userReputation[_user] = _effectiveRep;
        ReputationLock storage lock = reputationLocks[_user];
        lock.lockedAmount = 0;
    }
}
