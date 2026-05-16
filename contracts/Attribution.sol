// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./StakingManager.sol";

contract Attribution is Ownable {
    constructor() Ownable() {}

    /// @notice 设置 StakingManager 地址（用于跨合约通知）
    /// @dev 只能在初始化时或通过治理合约设置
    /// @param _addr StakingManager 合约地址
    function setStakingManager(address _addr) external onlyOwner {
        stakingManager = StakingManager(_addr);
    }

    struct Contribution {
        address contributor;
        uint256 share;        // percentage * 100 (e.g., 7000 = 70%)
        ContributionType ctype;
        uint256 timestamp;
        string contentHash;
    }
    
    // 新增：测试报告（宪法第三条：全链条追溯）
    struct TestReport {
        address reporter;
        uint256 severity;    // 1-5，5=严重
        int256 score;      // 可为负（发现严重Bug得正，误报得负）
        uint256 timestamp;
    }
    
    // 新增：点赞记录（宪法第三条：反噬机制）
    struct Like {
        address user;
        uint256 skillId;
        uint256 timestamp;
    }
    
    enum ContributionType { GENESIS, FORK, AUDIT, BUGFIX, TRANSLATION }
    
    mapping(uint256 => Contribution[]) public skillContributions;
    mapping(uint256 => uint256) public contributionCount;
    mapping(address => uint256[]) public contributorSkills;
    
    // 新增：测试报告
    mapping(uint256 => TestReport[]) public skillTestReports;
    mapping(uint256 => uint256) public testReportCount;
    
    // 新增：点赞记录 + 反噬
    mapping(uint256 => Like[]) public skillLikes;
    mapping(uint256 => uint256) public likeCount;
    mapping(address => int256) public userReputation;
    mapping(address => bool) public hasLiked;  // 防重复点赞

    StakingManager public stakingManager;
    
    // 分成验证
    function validateSplit(uint256 _skillId, uint256[] calldata _shares) 
        external pure returns (bool) {
        uint256 total;
        for (uint256 i = 0; i < _shares.length; i++) {
            total += _shares[i];
        }
        return total == 10000; // 必须是100%
    }
    
    // 添加贡献
    function addContribution(
        uint256 _skillId,
        address _contributor,
        uint256 _share,
        ContributionType _ctype,
        string memory _contentHash
    ) external onlyOwner {
        Contribution memory c = Contribution({
            contributor: _contributor,
            share: _share,
            ctype: _ctype,
            timestamp: block.timestamp,
            contentHash: _contentHash
        });
        
        skillContributions[_skillId].push(c);
        contributorSkills[_contributor].push(_skillId);
        contributionCount[_skillId]++;
    }
    
    // 新增：添加测试报告（宪法第三条：全链条追溯）
    function addTestReport(
        uint256 _skillId,
        address _reporter,
        uint256 _severity,
        int256 _score
    ) external onlyOwner {
        TestReport memory report = TestReport({
            reporter: _reporter,
            severity: _severity,
            score: _score,
            timestamp: block.timestamp
        });
        
        skillTestReports[_skillId].push(report);
        testReportCount[_skillId]++;

        // 更新用户声誉（测试者得分）
        userReputation[_reporter] += _score;

        // 如果得分 > 0（发现有效漏洞），通知 StakingManager 设置正面贡献
        if (_score > 0 && address(stakingManager) != address(0)) {
            stakingManager.setPositiveContribution(_reporter);
        }
    }
    
    // 新增：点赞技能（宪法第三条：反噬机制）
    function likeSkill(uint256 _skillId) external {
        require(!hasLiked[msg.sender], "Already liked");
        require(userReputation[msg.sender] >= 0, "Need reputation");  // 基本验证
        
        // 检查技能是否已被标记有害（反噬机制）
        // 注意：这里简化了，实际需要查询 SkillRegistry
        // 如果是，点赞者声誉 -5（反噬）
        // 为简化，暂不实现完整反噬逻辑（需跨合约调用）
        
        Like memory likeRec = Like({
            user: msg.sender,
            skillId: _skillId,
            timestamp: block.timestamp
        });
        
        skillLikes[_skillId].push(likeRec);
        likeCount[_skillId]++;
        hasLiked[msg.sender] = true;
        
        // 简单反噬：如果技能被标记（通过事件）
        // 实际实现需在 SkillRegistry 中标记后回调
        userReputation[msg.sender] += 2;  // 正常点赞 +2 声誉
    }
    
    // 新增：计算收入分成
    function calculateSplit(
        uint256 _skillId, 
        uint256 _amount
    ) external view returns (address[] memory, uint256[] memory) {
        Contribution[] storage contributions = skillContributions[_skillId];
        uint256 len = contributions.length;
        
        address[] memory receivers = new address[](len);
        uint256[] memory amounts = new uint256[](len);
        
        for (uint256 i = 0; i < len; i++) {
            receivers[i] = contributions[i].contributor;
            amounts[i] = (_amount * contributions[i].share) / 10000;
        }
        
        return (receivers, amounts);
    }
    
    // 新增：查询用户声誉（宪法第二条：渐进变现）
    function getUserReputation(address _user) external view returns (int256) {
        return userReputation[_user];
    }
    
    // 新增：反噬机制（宪法第三条）
    function slashLiker(address _liker, int256 _penalty) external onlyOwner {
        userReputation[_liker] += _penalty;  // 可为正或负
        emit AntiSlash(_liker, _penalty, "Liked harmful skill");
    }
    
    event AntiSlash(address indexed user, int256 penalty, string reason);
}
