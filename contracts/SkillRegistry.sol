// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "./ASKToken.sol";

struct Skill {
    address owner;
    string name;
    string description;
    string trigger;
    string metadataIPFS;
    RiskLevel riskLevel;
    uint256 stakeAmount;
    bool verified;
    uint256 createdAt;
    uint256 updatedAt;
    string version;
    bytes32 fingerprint;  // 新增：宪法第三条 全链条追溯
}

enum RiskLevel { LOW, MEDIUM, HIGH, CRITICAL }

contract SkillRegistry is Ownable {
    // 事件
    event SkillRegistered(address indexed owner, uint256 indexed skillId, string name);
    event SkillUpdated(address indexed owner, uint256 indexed skillId, string version);
    event SkillVerified(address indexed auditor, uint256 indexed skillId);
    event SkillSlashed(uint256 indexed skillId, uint256 slashAmount);
    event FingerprintGenerated(uint256 indexed skillId, bytes32 fingerprint);  // 新增
    
    // 映射
    mapping(uint256 => Skill) public skills;
    mapping(address => uint256[]) public ownerSkills;
    mapping(uint256 => string[]) public skillAuditTrail;
    mapping(uint256 => bool) public verifiedSkills;
    mapping(string => bool) public nameTaken;
    
    uint256 public nextSkillId;
    uint256 public constant MIN_STAKE_LOW = 10 ether;
    uint256 public constant MIN_STAKE_MEDIUM = 50 ether;
    uint256 public constant MIN_STAKE_HIGH = 100 ether;
    uint256 public constant MIN_STAKE_CRITICAL = 200 ether;
    
    ASKToken public immutable token;
    
    constructor(address _token) Ownable() {
        token = ASKToken(_token);
    }
    
    // 计算指纹（宪法第三条：全链条追溯）
    function computeFingerprint(
        string memory _ipfsHash,
        address _creator,
        uint256 _timestamp
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(_ipfsHash, _creator, _timestamp));
    }
    
    function registerSkill(
        string memory _name,
        string memory _description,
        string memory _trigger,
        string memory _metadataIPFS,
        RiskLevel _riskLevel,
        string memory _version
    ) external returns (uint256) {
        require(!nameTaken[_name], "Name taken");
        
        uint256 stakeAmount = _getStakeAmount(_riskLevel);
        require(token.transferFrom(msg.sender, address(this), stakeAmount), "Stake failed");
        
        uint256 skillId = nextSkillId++;
        Skill storage skill = skills[skillId];
        skill.owner = msg.sender;
        skill.name = _name;
        skill.description = _description;
        skill.trigger = _trigger;
        skill.metadataIPFS = _metadataIPFS;
        skill.riskLevel = _riskLevel;
        skill.stakeAmount = stakeAmount;
        skill.verified = false;
        skill.createdAt = block.timestamp;
        skill.updatedAt = block.timestamp;
        skill.version = _version;
        
        // 生成指纹（宪法第三条）
        skill.fingerprint = computeFingerprint(_metadataIPFS, msg.sender, block.timestamp);
        
        nameTaken[_name] = true;
        ownerSkills[msg.sender].push(skillId);
        
        emit SkillRegistered(msg.sender, skillId, _name);
        emit FingerprintGenerated(skillId, skill.fingerprint);
        return skillId;
    }
    
    function verifySkill(uint256 _skillId, bool _pass) external {
        require(_skillId < nextSkillId, "Invalid skill");
        
        verifiedSkills[_skillId] = _pass;
        skills[_skillId].verified = _pass;
        
        emit SkillVerified(msg.sender, _skillId);
    }
    
    function slashSkill(uint256 _skillId, uint256 _amount) external onlyOwner {
        Skill storage skill = skills[_skillId];
        require(skill.stakeAmount > 0, "Already slashed");
        
        uint256 slashAmount = _amount > skill.stakeAmount 
            ? skill.stakeAmount 
            : _amount;
        skill.stakeAmount -= slashAmount;
        
        emit SkillSlashed(_skillId, slashAmount);
    }
    
    function _getStakeAmount(RiskLevel _riskLevel) internal pure returns (uint256) {
        if (_riskLevel == RiskLevel.LOW) return MIN_STAKE_LOW;
        if (_riskLevel == RiskLevel.MEDIUM) return MIN_STAKE_MEDIUM;
        if (_riskLevel == RiskLevel.HIGH) return MIN_STAKE_HIGH;
        return MIN_STAKE_CRITICAL;
    }
    
    // 查询指纹（宪法第三条：可追溯）
    function getFingerprint(uint256 _skillId) external view returns (bytes32) {
        require(_skillId < nextSkillId, "Invalid skill");
        return skills[_skillId].fingerprint;
    }
}
