// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/// @title StakingManager
/// @notice Reputation-based staking system for AgentSkills
/// @dev Security: ReentrancyGuard, CEI pattern, overflow protection, Pausable
contract StakingManager is Ownable, ReentrancyGuard, Pausable {
    struct StakeInfo {
        uint256 amount;
        uint256 lockedUntil;
        bool slashed;
    }

    mapping(address => mapping(uint256 => StakeInfo)) public stakes;
    mapping(address => uint256[]) public userStakeIds;
    mapping(address => bool) public hasStaked;
    uint256 public stakerCount;

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

    /// @notice Aggregate effective reputation (clamped per-user), incremental voting-power basis
    int256 public totalEffectiveReputation;
    /// @notice Per-user effective reputation last counted into totalEffectiveReputation
    mapping(address => int256) internal lastCountedEffective;

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
    event ReputationChanged(address indexed user, int256 delta, int256 newReputation);

    /// @notice Governance contract address for secure actions
    address public governance;

    /// @notice Reputation oracle contract (e.g. ReputationIncentives)
    address public reputationOracle;

    /// @notice Authorized callers for setPositiveContribution (SkillRegistry, Attribution)
    /// @dev grill-down #10: was open to anyone → restricted to governance + authorized callers
    mapping(address => bool) public authorizedCallers;

    /// @notice Modifier to restrict to governance contract
    modifier onlyGovernance() {
        require(msg.sender == governance, "Not governance");
        _;
    }

    /// @notice Modifier to restrict to reputation oracle
    modifier onlyReputationOracle() {
        require(msg.sender == reputationOracle, "Not reputation oracle");
        _;
    }

    /// @notice Modifier: governance or registered authorized caller
    modifier onlyGovernanceOrAuthorized() {
        require(
            msg.sender == governance || authorizedCallers[msg.sender],
            "Not governance or authorized"
        );
        _;
    }

    /// @notice Set governance contract address (owner only)
    /// @param _gov Governance contract address
    function setGovernance(address _gov) external onlyOwner {
        require(_gov != address(0), "Invalid address");
        governance = _gov;
    }

    /// @notice Set reputation oracle contract address (owner only)
    /// @param _oracle Reputation oracle contract address
    function setReputationOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "Invalid address");
        reputationOracle = _oracle;
    }

    /// @notice Add an authorized caller for setPositiveContribution (owner only)
    /// @dev SkillRegistry and Attribution must be authorized to credit reputation
    /// @param _caller Authorized caller address
    function addAuthorizedCaller(address _caller) external onlyOwner {
        require(_caller != address(0), "Invalid address");
        authorizedCallers[_caller] = true;
    }

    /// @notice Remove an authorized caller (owner only)
    /// @param _caller Caller to deauthorize
    function removeAuthorizedCaller(address _caller) external onlyOwner {
        authorizedCallers[_caller] = false;
    }

    constructor() Ownable() {}

    /// @notice Pause critical operations in emergencies (owner only)
    function pause() external onlyOwner whenNotPaused {
        _pause();
    }

    /// @notice Resume operations after emergency pause (owner only)
    function unpause() external onlyOwner whenPaused {
        _unpause();
    }

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

        if (!hasStaked[msg.sender]) {
            hasStaked[msg.sender] = true;
            stakerCount++;
        }

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
        _syncEffectiveTotal(_liker);

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
        _syncEffectiveTotal(msg.sender);

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

    /// @notice Get aggregate effective reputation (incremental, no iteration)
    /// @return Total effective reputation across all users
    function getTotalReputation() external view returns (int256) {
        return totalEffectiveReputation;
    }

    /// @notice Effective reputation for a user (internal, clamped at zero)
    /// @param _user User address
    /// @return Effective reputation (>= 0)
    function _effectiveReputation(address _user) internal view returns (int256) {
        ReputationLock storage lock = reputationLocks[_user];
        int256 effective = userReputation[_user] - int256(lock.lockedAmount);
        return effective >= 0 ? effective : int256(0);
    }

    /// @notice Sync per-user effective reputation into aggregate (idempotent)
    /// @dev Called after every reputation mutation; O(1) delta update
    /// @param _user User address whose reputation changed
    function _syncEffectiveTotal(address _user) internal {
        int256 current = _effectiveReputation(_user);
        int256 previous = lastCountedEffective[_user];
        if (current != previous) {
            totalEffectiveReputation += current - previous;
            lastCountedEffective[_user] = current;
        }
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
        _syncEffectiveTotal(msg.sender);

        emit RecoveryClaimed(msg.sender, actualRecovery, lock.lockedAmount);
    }

    /// @notice Mark user as having positive contribution (governance or authorized caller)
    /// @dev grill-down #10: was open to anyone → restricted to governance + authorized callers (SkillRegistry, Attribution)
    /// @param _user User address
    function setPositiveContribution(address _user) external nonReentrant onlyGovernanceOrAuthorized {
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
        _syncEffectiveTotal(_user);
    }

    /// @notice Adjust reputation by delta (restricted to reputation oracle, e.g. ReputationIncentives)
    /// @dev v2: single authoritative writer for reputation incentives. Positive for rewards, negative for slashing.
    /// @param _user User address
    /// @param _delta Reputation adjustment (can be negative)
    function addReputation(address _user, int256 _delta) external onlyReputationOracle {
        require(_user != address(0), "Invalid address");
        if (_delta == 0) return;
        userReputation[_user] += _delta;
        ReputationLock storage lock = reputationLocks[_user];
        if (lock.lockedAmount > 0 && userReputation[_user] < 0) {
            // Clamp at negative balance: lock absorbs part of the slash to prevent instant wipe
            userReputation[_user] = 0;
        }
        _syncEffectiveTotal(_user);
        emit ReputationChanged(_user, _delta, userReputation[_user]);
    }
}
