// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract StakingManager is Ownable {
    struct StakeInfo {
        uint256 amount;
        uint256 lockedUntil;
        bool slashed;
    }
    
        
    mapping(address => mapping(uint256 => StakeInfo)) public stakes;
    mapping(address => uint256[]) public userStakeIds;
    
    // 新增：反噬记录（宪法第三条）
    mapping(address => int256) public userReputation;
    mapping(address => bool) public hasLiked;  // 防重复点赞

    /// 声望锁定结构（宪法第三条：反噬机制）
    struct ReputationLock {
        uint256 lockedAmount;    // 当前锁定的声望金额
        uint256 lastClaimTime;   // 上次领取恢复的时间戳
    }

    /// 声望锁定映射（每用户）
    mapping(address => ReputationLock) public reputationLocks;

    /// 原始惩罚金额（用于恢复计算，公式基于原始金额，非剩余金额）
    mapping(address => uint256) public originalSlashAmount;

    /// 是否有自上次领取后的正面贡献
    mapping(address => bool) public hasPositiveContribution;

    /// 每月恢复比例：5% = 500 basis points
    uint256 public constant RECOVERY_RATE_PER_MONTH = 500;

    /// 恢复事件
    event RecoveryClaimed(address indexed user, uint256 amount, uint256 remainingLocked);
    event ReputationLocked(address indexed user, uint256 amount);
    event PositiveContributionSet(address indexed user);
    
    // 事件
    event Staked(address indexed user, uint256 skillId, uint256 amount);
    event Unstaked(address indexed user, uint256 skillId, uint256 amount);
    event Slash(address indexed user, uint256 skillId, uint256 amount);
    event AntiSlash(address indexed user, int256 penalty, string reason);  // 新增
    
    constructor() Ownable() {}
    
    // 质押
    function stake(uint256 _skillId, uint256 _amount) external {
        require(!stakes[msg.sender][_skillId].slashed, "Already slashed");
        
        stakes[msg.sender][_skillId] = StakeInfo({
            amount: _amount,
            lockedUntil: block.timestamp + 90 days,
            slashed: false
        });
        
        userStakeIds[msg.sender].push(_skillId);
        
        emit Staked(msg.sender, _skillId, _amount);
    }
    
    // 解除质押（锁定期后）
    function unstake(uint256 _skillId) external {
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
    
    // Slash（仅admin）
    function slash(address _user, uint256 _skillId, uint256 _amount) external onlyOwner {
        StakeInfo storage info = stakes[_user][_skillId];
        require(info.amount >= _amount, "Insufficient stake");
        
        info.amount -= _amount;

        // No token transfer in no-token model - slash simply reduces stake
        emit Slash(_user, _skillId, _amount);
    }
    
    /// @notice 反噬点赞者（宪法第三条：点赞有害技能）
    /// @dev 惩罚时创建/更新 ReputationLock，用于后续恢复计算
    /// @param _liker 被惩罚的用户地址
    /// @param _penalty 惩罚金额（负数表示扣除声望）
    /// @param _reason 惩罚原因
    function slashLiker(address _liker, int256 _penalty, string memory _reason) external onlyOwner {
        // 计算惩罚的绝对值（用于锁定）
        uint256 penaltyAmount = uint256(-_penalty);

        // 更新用户的 ReputationLock（RECOV-03：追踪锁定金额）
        ReputationLock storage lock = reputationLocks[_liker];
        lock.lockedAmount += penaltyAmount;
        if (lock.lastClaimTime == 0) {
            lock.lastClaimTime = block.timestamp;  // 首次惩罚，设置起始时间
        }

        // 记录原始惩罚金额用于恢复计算（D-04）
        originalSlashAmount[_liker] += penaltyAmount;

        // 更新用户声望（可为负数）
        userReputation[_liker] += _penalty;

        // 重置点赞状态，允许重新点赞（如果没被永久封禁）
        hasLiked[_liker] = false;

        emit ReputationLocked(_liker, penaltyAmount);
        emit AntiSlash(_liker, _penalty, _reason);
    }
    
    // 新增：点赞技能（需配合 Attribution 合约调用）
    function likeSkill(uint256 _skillId) external {
        require(!hasLiked[msg.sender], "Already liked");
        require(userReputation[msg.sender] >= 0, "Need reputation");  // 基本验证
        
        hasLiked[msg.sender] = true;
        userReputation[msg.sender] += 2;  // 正常点赞 +2 声誉
    }
    
    // 查询声誉（宪法第二条：渐进变现）
    /// @notice 查询用户声望（D-02：返回有效声望 = 总声望 - 锁定金额）
    /// @dev 锁定金额不计入可投票声望和可解锁功能声望
    /// @param _user 用户地址
    /// @return 有效声望（扣除锁定部分）
    function getUserReputation(address _user) external view returns (int256) {
        ReputationLock storage lock = reputationLocks[_user];
        int256 effective = userReputation[_user] - int256(lock.lockedAmount);
        return effective >= 0 ? effective : int256(0);
    }

    /// @notice 获取用户可恢复的声望信息（RECOV-01）
    /// @dev 返回锁定金额和上次领取时间
    /// @param _user 用户地址
    /// @return lockedAmount 当前锁定的声望金额
    /// @return lastClaimTime 上次领取恢复的时间戳（如果是0表示从未被锁定）
    function getRecoverableReputation(address _user)
        external
        view
        returns (uint256 lockedAmount, uint256 lastClaimTime)
    {
        ReputationLock storage lock = reputationLocks[_user];
        return (lock.lockedAmount, lock.lastClaimTime);
    }

    /// @notice 领取可恢复的声望（RECOV-02）
    /// @dev 5% 每月恢复（基于原始惩罚金额），需有正面贡献
    /// 要求：锁定金额 > 0，已有正面贡献，距上次领取 >= 1个月
    function claimRecoverableReputation() external {
        ReputationLock storage lock = reputationLocks[msg.sender];

        // 检查是否有锁定的声望
        require(lock.lockedAmount > 0, "No locked reputation");

        // 检查是否有正面贡献（D-03）
        require(hasPositiveContribution[msg.sender], "No positive contribution");

        // 计算距上次领取的月份数
        uint256 monthsElapsed = (block.timestamp - lock.lastClaimTime) / 30 days;
        require(monthsElapsed >= 1, "Must wait at least 1 month");

        // 计算可恢复金额：originalSlash x 5% x months（D-04）
        // 使用 originalSlashAmount 而非剩余 lockedAmount，保证恢复速度恒定
        uint256 maxRecovery = (originalSlashAmount[msg.sender] * RECOVERY_RATE_PER_MONTH * monthsElapsed) / 10000;

        // 实际恢复量不能超过剩余锁定金额
        uint256 actualRecovery = maxRecovery > lock.lockedAmount
            ? lock.lockedAmount
            : maxRecovery;

        // 更新状态
        lock.lockedAmount -= actualRecovery;
        lock.lastClaimTime = block.timestamp;
        hasPositiveContribution[msg.sender] = false;  // 重置，等待下次贡献

        // 将恢复的声望加回用户余额
        userReputation[msg.sender] += int256(actualRecovery);

        emit RecoveryClaimed(msg.sender, actualRecovery, lock.lockedAmount);
    }

    /// @notice 设置用户有正面贡献（由贡献合约主动调用）
    /// @dev 幂等性检查：已设置则 revert。为跨合约调用，无 onlyOwner 限制
    /// @param _user 用户地址
    function setPositiveContribution(address _user) external {
        require(!hasPositiveContribution[_user], "Already set");
        hasPositiveContribution[_user] = true;
        emit PositiveContributionSet(_user);
    }

    /// @notice Test-only: 直接设置有效声誉（绕过锁定机制）
    /// @dev 仅用于测试，不应在生产环境调用
    /// @param _user 用户地址
    /// @param _effectiveRep 期望的有效声誉值
    function setEffectiveReputation(address _user, int256 _effectiveRep) external onlyOwner {
        userReputation[_user] = _effectiveRep;
        // 清除锁定以反映有效声誉
        ReputationLock storage lock = reputationLocks[_user];
        lock.lockedAmount = 0;
    }
}
