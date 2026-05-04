# AgentSkills智能合约架构与实现技术方案

> 本文档为AgentSkills信用代币生态系统的智能合约架构和Solidity实现进行系统性技术设计
> 涵盖合约架构、核心合约接口、安全考虑和实现细节

---

## 一、合约架构概述

### 1.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│              AgentSkills Smart Contract Architecture          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐       │
│  │                    Inherited Contracts                   │       │
│  │   ├── ERC20 (ASK Token)                               │       │
│  │   ├── ERC20Votes (Snapshot + Delegation)              │       │
│  │   ├── ERC20Burnable (Burn mechanism)              │       │
│  │   ├── Ownable (Access control)                  │       │
│  │   └── Pausable (Emergency pause)                │       │
│  └─────────────────────────────────────────────────────────────┘       │
│                                                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐              │
│  │   ASKToken  │ │ SkillRegistry│ │Attribution │              │
│  │   (ERC20) │ │  (Skill)   │ │  (Trace)   │              │
│  └──────────────┘ └──────────────┘ └──────────────┘              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐              │
│  │StakingMgr   │ │TreasuryDAO │ │ SkillVault │              │
│  │  (Stake)  │ │  (Gov)    │ │ (Escrow)   │              │
│  └──────────────┘ └──────────────┘ └──────────────┘              │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐       │
│  │              Oracle / Chainlink Bridge                  │       │
│  │   • Price Feed                                        │       │
│  │   • Randomness                                     │       │
│  │   • Cross-chain                                   │       │
│  └─────────────────────────────────────────────────────────────┘       │
│                                                                  │
└───────────────────────────────────���─────────────────────────────────────┘
```

### 1.2 合约层级关系

| 合约名称 | 层级 | 依赖 | 功能 |
|----------|------|------|------|
| **ASKToken** | 核心 | OZ ERC20 | ASK代币 |
| **SkillRegistry** | 核心 | ASKToken | 技能注册/更新 |
| **Attribution** | 核心 | SkillRegistry | 贡献追溯 |
| **StakingManager** | 核心 | ASKToken | 质押/slashing |
| **TreasuryDAO** | 治理 | ASKToken | 资金管理 |
| **SkillVault** | 金融 | ASKToken | 收益分配 |

---

## 二、核心合约详解

### 2.1 ASKToken (ERC20)

```
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ASKToken is ERC20, ERC20Burnable, ERC20Votes, Ownable {
    
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18;
    
    // 分配常量
    uint256 public constant COMMUNITY_TREASURY = 400_000_000 * 10**18;
    uint256 public constant EARLY_BACKERS = 200_000_000 * 10**18;
    uint256 public constant USER_GROWTH = 150_000_000 * 10**18;
    uint256 public constant VALIDATOR = 150_000_000 * 10**18;
    uint256 public constant TEAM = 100_000_000 * 10**18;
    
    constructor() ERC20("AgentSkills Token", "ASK") Ownable(msg.sender) {
        // 初始化分配 (简化版本)
        _mint(msg.sender, MAX_SUPPLY);
    }
    
    // 投票支持
    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "Max supply exceeded");
        _mint(to, amount);
    }
    
    // Chainlink兼容
    function _afterTokenTransfer(address from, address to, uint256 amount) 
        internal override(ERC20, ERC20Votes) {
        super._afterTokenTransfer(from, to, amount);
    }
}
```

### 2.2 SkillRegistry

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

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
}

enum RiskLevel { LOW, MEDIUM, HIGH, CRITICAL }

contract SkillRegistry is Ownable {
    // 事件
    event SkillRegistered(address indexed owner, uint256 indexed skillId, string name);
    event SkillUpdated(address indexed owner, uint256 indexed skillId, string version);
    event SkillVerified(address indexed auditor, uint256 indexed skillId);
    event SkillSlashed(uint256 indexed skillId, uint256 slashAmount);
    
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
    
    constructor(address _token) Ownable(msg.sender) {
        token = ASKToken(_token);
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
        
        nameTaken[_name] = true;
        ownerSkills[msg.sender].push(skillId);
        
        emit SkillRegistered(msg.sender, skillId, _name);
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
}
```

### 2.3 Attribution (贡献追溯)

```solidity
contract Attribution is Ownable {
    struct Contribution {
        address contributor;
        uint256 share;        // percentage * 100 (e.g., 7000 = 70%)
        ContributionType ctype;
        uint256 timestamp;
        string contentHash;
    }
    
    enum ContributionType { GENESIS, FORK, AUDIT, BUGFIX, TRANSLATION }
    
    mapping(uint256 => Contribution[]) public skillContributions;
    mapping(uint256 => uint256) public contributionCount;
    mapping(address => uint256[]) public contributorSkills;
    
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
    
    // 计算收入分成
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
}
```

### 2.4 StakingManager (质押管理)

```solidity
contract StakingManager is Ownable {
    struct StakeInfo {
        uint256 amount;
        uint256 lockedUntil;
        bool slashed;
    }
    
    mapping(address => mapping(uint256 => StakeInfo)) public stakes;
    mapping(address => uint256[]) public userStakeIds;
    
    // 质押
    function stake(uint256 _skillId, uint256 _amount) external {
        require(!stakes[msg.sender][_skillId].slashed, "Already slashed");
        
        stakes[msg.sender][_skillId] = StakeInfo({
            amount: _amount,
            lockedUntil: block.timestamp + 90 days,
            slashed: false
        });
        
        userStakeIds[msg.sender].push(_skillId);
    }
    
    // 解除质押 (锁定期后)
    function unstake(uint256 _skillId) external {
        StakeInfo storage stake = stakes[msg.sender][_skillId];
        require(stake.amount > 0, "No stake");
        require(block.timestamp > stake.lockedUntil, "Still locked");
        
        uint256 amount = stake.amount;
        stake.amount = 0;
        
        token.transfer(msg.sender, amount);
    }
    
    // Slash (仅admin)
    function slash(address _user, uint256 _skillId, uint256 _amount) external onlyOwner {
        StakeInfo storage stake = stakes[user][_skillId];
        require(stake.amount >= _amount, "Insufficient stake");
        
        stake.amount -= _amount;
        
        // 发送给举报者25%
        uint256 reporterReward = (_amount * 25) / 100;
        token.transfer(reporter, reporterReward);
    }
}
```

### 2.5 TreasuryDAO (治理金库)

```solidity
contract TreasuryDAO is Ownable, ERC20Votes {
    struct Proposal {
        address proposer;
        string description;
        uint256 amount;
        address recipient;
        uint256 votesFor;
        uint256 votesAgainst;
        bool executed;
        uint256 createdAt;
    }
    
    mapping(uint256 => Proposal) public proposals;
    uint256 public proposalCount;
    uint256 public constant PROPOSAL_THRESHOLD = 1_000_000 * 10**18; // 1M ASK
    uint256 public constant QUORUM = 10_000_000 * 10**18; // 10M ASK
    
    // 提案
    function propose(
        string memory _description,
        uint256 _amount,
        address _recipient
    ) external returns (uint256) {
        require(getVotes(msg.sender) >= PROPOSAL_THRESHOLD, "Not enough votes");
        
        uint256 proposalId = proposalCount++;
        proposals[proposalId] = Proposal({
            proposer: msg.sender,
            description: _description,
            amount: _amount,
            recipient: _recipient,
            votesFor: 0,
            votesAgainst: 0,
            executed: false,
            createdAt: block.timestamp
        });
        
        return proposalId;
    }
    
    // 投票
    function vote(uint256 _proposalId, bool _support) external {
        Proposal storage proposal = proposals[_proposalId];
        require(!proposal.executed, "Executed");
        
        uint256 votes = getVotes(msg.sender);
        
        if (_support) {
            proposal.votesFor += votes;
        } else {
            proposal.votesAgainst += votes;
        }
    }
    
    // 执行
    function execute(uint256 _proposalId) external {
        Proposal storage proposal = proposals[_proposalId];
        require(!proposal.executed, "Already executed");
        require(proposal.votesFor >= QUORUM, "No quorum");
        
        proposal.executed = true;
        token.transfer(proposal.recipient, proposal.amount);
    }
    
    // 紧急暂停
    function emergencyWithdraw(uint256 _amount) external onlyOwner {
        require(address(this).balance >= _amount, "Insufficient");
        token.transfer(owner(), _amount);
    }
}
```

---

## 三、部署配置

### 3.1 部署脚本 (Hardhat)

```javascript
// scripts/deploy.js
async function main() {
    console.log("Deploying AgentSkills Contracts...");
    
    // 1. 部署ASK Token
    const ASKToken = await ethers.getContractFactory("ASKToken");
    const askToken = await ASKToken.deploy();
    await askToken.deployed();
    console.log("ASKToken deployed to:", askToken.address);
    
    // 2. 部署SkillRegistry
    const SkillRegistry = await ethers.getContractFactory("SkillRegistry");
    const skillRegistry = await SkillRegistry.deploy(askToken.address);
    await skillRegistry.deployed();
    console.log("SkillRegistry deployed to:", skillRegistry.address);
    
    // 3. 部署Attribution
    const Attribution = await ethers.getContractFactory("Attribution");
    const attribution = await Attribution.deploy();
    await attribution.deployed();
    console.log("Attribution deployed to:", attribution.address);
    
    // 4. ���署StakingManager
    const StakingManager = await ethers.getContractFactory("StakingManager");
    const stakingManager = await StakingManager.deploy(askToken.address);
    await stakingManager.deployed();
    console.log("StakingManager deployed to:", stakingManager.address);
    
    // 5. 部署TreasuryDAO
    const TreasuryDAO = await ethers.getContractFactory("TreasuryDAO");
    const treasuryDAO = await TreasuryDAO.deploy();
    await treasuryDAO.deployed();
    console.log("TreasuryDAO deployed to:", treasuryDAO.address);
    
    // 配置
    await askToken.transferOwnership(treasuryDAO.address);
}
```

### 3.2 测试网配置

```
Network: Polygon Mumbai Testnet
RPC: https://rpc-mumbai.maticvigil.com
Chain ID: 80001
Explorer: https://mumbai.polygonscan.com

Faucet: https://faucet.polygon.technology/
```

---

## 四、安全考虑

### 4.1 常见攻击防护

| 攻击类型 | 防护措施 | 合约位置 |
|----------|----------|----------|
| **重入攻击** | Check-Effects-Interactions | All |
| **整数溢出** | SafeMath/ Sol 0.8+ | All |
| **假ETH攻击** | receive()验证 | TreasuryDAO |
| **治理攻击** | 延迟执行 | TreasuryDAO |
| **Rugpull** | 多签 + timelock | TreasuryDAO |

### 4.2 审计清单

```solidity
// 必需的安全检查
────────────────────────────────────────

✓ 访问控制: Ownable + AccessControl
✓ 初始化: initializer modifier
✓ 暂停机制: Pausable
✓ 速率限制: ERC20Permit rate limiting
✓ 紧急提取: emergency withdraw
✓ 时间锁: 24h delay for governance
✓ 多签: 3/5 multisig for treasury
```

### 4.3 OpenZeppelin 合约推荐

```
依赖版本:
├── @openzeppelin/contracts@4.9.5
└── @openzeppelin/contracts-upgradeable@4.9.5

推荐合约:
├── ERC20
├── ERC20Burnable
├── ERC20Votes
├── Ownable
├── Pausable
├── AccessControl
├── ReentrancyGuard
└── Initializable (proxy)
```

---

## 五、前端集成

### 5.1 ethers.js / viem 连接

```javascript
import { ethers } from 'ethers';

// Provider
const provider = new ethers.JsonRpcProvider('https://rpc-mumbai.maticvigil.com');

// Token合约
const ASKTokenABI = [...]; // ABI
const askToken = new ethers.Contract(
    '0x...', // 部署地址
    ASKTokenABI,
    provider
);

// 读取余额
const balance = await askToken.balanceOf(userAddress);

// 质押
const stake = async (skillId, amount) => {
    const tx = await skillRegistry.stake(skillId, amount);
    await tx.wait();
};
```

### 5.2 Subgraph建议

```graphql
# 用于The Graph索引
type Skill @entity {
    id: ID!
    owner: Address!
    name: String!
    riskLevel: Int!
    stakeAmount: BigInt!
    verified: Boolean!
    createdAt: BigInt!
}

type Contribution @entity {
    id: ID!
    skillId: BigInt!
    contributor: Address!
    share: BigInt!
    timestamp: BigInt!
}
```

---

## 六、性能与可扩展性

### 6.1 Gas优化

- **批量操作**: 实现批量mint/transfer
- **存储优化**: 使用mapping而非array for lookups
- **事件**: 事件而非存储 for history

### 6.2 L2迁移路径

```
Phase 1: Polygon PoS (当前)
├── Gas: ~0.001 MATIC/tx
├── Tps: ~65k
└── 成本: $0.001-0.01/tx

Phase 2: Arbitrum/Optimism
├── Gas: ~0.001-0.01 ETH/tx
├── Tps: ~500k
└── 成本: $0.05-0.1/tx

Phase 3: Custom L2
├── 完全自定义
├── 零Gas交易
└── 完全主权
```

---

## 七、待进一步探讨

1. **代理模式** - 是否使用UUPS代理支持升级？
2. **多签钱包** - 使用Gnosis Safe？
3. **跨链桥** - 跨链策略？
4. **NFT集成** - 是否需要验证NFT？
5. **链下数���** - IPFS设计？

---

## 八、总结与建议

### 推荐技术栈

- **语言**: Solidity 0.8.20+
- **框架**: Hardhat + Waffle
- **测试**: Hardhat + Ethers + Waffle
- **部署**: Polygon PoS (Testnet→Mainnet)
- **监控**: Tenderly + Dune

### 下一步行动

1. **完善ABI** - 导出完整合约ABI
2. **测试覆盖** - 编写单元测试
3. **形式化验证** - Certora Prover
4. **审计准备** - Trail of Bits / OpenZeppelin

*本文档为技术初步设计，需要进一步实现和测试验证*