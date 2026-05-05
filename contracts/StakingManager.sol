// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./ASKToken.sol";

contract StakingManager is Ownable {
    struct StakeInfo {
        uint256 amount;
        uint256 lockedUntil;
        bool slashed;
    }
    
    ASKToken public immutable token;
    
    mapping(address => mapping(uint256 => StakeInfo)) public stakes;
    mapping(address => uint256[]) public userStakeIds;
    
    // 新增：反噬记录（宪法第三条）
    mapping(address => int256) public userReputation;
    mapping(address => bool) public hasLiked;  // 防重复点赞
    
    // 事件
    event Staked(address indexed user, uint256 skillId, uint256 amount);
    event Unstaked(address indexed user, uint256 skillId, uint256 amount);
    event Slash(address indexed user, uint256 skillId, uint256 amount);
    event AntiSlash(address indexed user, int256 penalty, string reason);  // 新增
    
    constructor(address _token) Ownable() {
        token = ASKToken(_token);
    }
    
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
        info.amount = 0;

        token.transfer(msg.sender, amount);
        emit Unstaked(msg.sender, _skillId, amount);
    }
    
    // Slash（仅admin）
    function slash(address _user, uint256 _skillId, uint256 _amount) external onlyOwner {
        StakeInfo storage info = stakes[_user][_skillId];
        require(info.amount >= _amount, "Insufficient stake");
        
        info.amount -= _amount;
        
        // 发送给举报者25%（宪法第三条）
        uint256 reporterReward = (_amount * 25) / 100;
        token.transfer(msg.sender, reporterReward);  // 简化：msg.sender 作为举报者
        
        emit Slash(_user, _skillId, _amount);
    }
    
    // 新增：反噬点赞者（宪法第三条：点赞有害技能）
    function slashLiker(address _liker, int256 _penalty, string memory _reason) external onlyOwner {
        userReputation[_liker] += _penalty;  // 可为正或负
        hasLiked[_liker] = false;  // 允许重新点赞（如果没被永久封禁）
        
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
    function getUserReputation(address _user) external view returns (int256) {
        return userReputation[_user];
    }
}
