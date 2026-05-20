# 部署者激励 × 四自系统融合实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 DeployerRewards 激励深度融合到自运维/自运营/自进化/自推广四大模块

**Architecture:**
- 自运营融合：Treasury 自动分配收益给部署者
- 自推广融合：ReferralManager 追踪推广效果并奖励
- 自进化融合：Governance 集成部署者治理权重
- 自运维融合：HealthMonitor 部署者节点激励

**Tech Stack:** Solidity + Hardhat + React + Node.js

---

## 任务概览

| 任务 | 描述 | 优先级 |
|------|------|--------|
| Task 1 | 扩展 DeployerRewards 合约（分红 + 治理权重接口） | P0 |
| Task 2 | 创建 RevenueDistributor 合约（自动分红系统） | P0 |
| Task 3 | 扩展 Governance 合约（集成部署者投票权重） | P1 |
| Task 4 | 创建 HealthReporter 合约（运维节点激励） | P2 |
| Task 5 | 创建前端四自集成面板 | P2 |
| Task 6 | 端到端测试 | P1 |

---

## Task 1: 扩展 DeployerRewards 合约（分红 + 治理权重接口）

**Files:**
- Modify: `contracts/DeployerRewards.sol`

**Step 1: 读取当前合约**

Run: `Read contracts/DeployerRewards.sol`

**Step 2: 添加分红和治理接口**

在合约末尾添加以下函数：

```solidity
// === 分红相关 ===

/// @notice 获取部署者待分红金额
/// @param deployer 部署者地址
/// @return 待分红的 ASK 数量
function getDividend(address deployer) external view returns (uint256) {
    if (!isDeployer[deployer]) return 0;
    DeployerInfo storage info = deployers[deployer];
    return info.pendingRewards;
}

/// @notice 领取分红（由 RevenueDistributor 调用）
/// @param deployer 部署者地址
/// @param amount 分红金额
function claimDividend(address deployer, uint256 amount) external {
    require(msg.sender == owner() || msg.sender == address(this), "Not authorized");
    DeployerInfo storage info = deployers[deployer];
    require(info.pendingRewards >= amount, "Insufficient dividend");

    info.pendingRewards -= amount;
    askToken.transfer(deployer, amount);
}

// === 治理权重接口 ===

/// @notice 获取部署者治理权重（用于 Governance 合约）
/// @param deployer 部署者地址
/// @return 治理权重分数
/// @dev 青铜: 1票/50用户, 白银: 1票/20用户, 黄金: 1票/10用户 + 额外加成
function getGovernanceWeight(address deployer) external view returns (uint256) {
    if (!isDeployer[deployer]) return 0;

    DeployerInfo storage info = deployers[deployer];

    // 基础权重：按用户数计算
    uint256 baseWeight = info.totalUsers * 1e18;

    // 等级加成
    uint256 tierBonus = 0;
    if (info.tier == 1) {
        tierBonus = 100e18;  // 白银: +100
    } else if (info.tier == 2) {
        tierBonus = 500e18; // 黄金: +500
    }

    return baseWeight + tierBonus;
}

/// @notice 检查是否是黄金部署者（拥有特殊权限）
/// @param deployer 部署者地址
/// @return 是否为黄金部署者
function isGoldTier(address deployer) external view returns (bool) {
    if (!isDeployer[deployer]) return false;
    return deployers[deployer].tier == 2;
}

/// @notice 获取部署者的有效推广用户数（用于奖励计算）
/// @param deployer 部署者地址
/// @return 有效推广用户数
function getEffectiveReferrals(address deployer) external view returns (uint256) {
    if (!isDeployer[deployer]) return 0;
    DeployerInfo storage info = deployers[deployer];
    return info.totalUsers;
}

/// @notice 获取奖励率（基点）
/// @param deployer 部署者地址
/// @return 奖励率（10000 = 100%）
function getRewardRate(address deployer) external view returns (uint256) {
    if (!isDeployer[deployer]) return 0;
    DeployerInfo storage info = deployers[deployer];
    TierConfig memory config = tierConfigs[info.tier];
    return config.activeRewardRate;
}
```

**Step 3: 编译合约**

Run: `cd contracts && npx hardhat compile`
Expected: SUCCESS

**Step 4: 运行现有测试**

Run: `cd contracts && npx hardhat test`
Expected: PASS (37 tests)

**Step 5: 提交**

```bash
git add contracts/DeployerRewards.sol
git commit -m "feat(19): extend DeployerRewards with dividend and governance interfaces"
```

---

## Task 2: 创建 RevenueDistributor 合约（自动分红系统）

**Files:**
- Create: `contracts/RevenueDistributor.sol`
- Create: `contracts/interfaces/IDeployerRewards.sol`

**Step 1: 创建接口文件**

Create: `contracts/interfaces/IDeployerRewards.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IDeployerRewards {
    function isDeployer(address account) external view returns (bool);
    function getDeployerStats(address deployer) external view returns (
        string memory domain,
        uint256 tier,
        uint256 totalUsers,
        uint256 activeUsers,
        uint256 totalRewards,
        uint256 pendingRewards,
        uint256 monthlyCount
    );
    function getGovernanceWeight(address deployer) external view returns (uint256);
    function isGoldTier(address deployer) external view returns (bool);
    function getDeployerCount() external view returns (uint256);
    function deployerList(uint256 index) external view returns (address);
}
```

**Step 2: 创建 RevenueDistributor 合约**

Create: `contracts/RevenueDistributor.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IDeployerRewards.sol";

/**
 * @title RevenueDistributor
 * @notice 自运营收入分配器 - 将协议收入自动分配给部署者
 * @dev 按部署者等级和推广效果自动计算分红比例
 */
contract RevenueDistributor is Ownable {

    // === 配置 ===
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant MIN_DISTRIBUTION = 1e18; // 最低分红 1 ASK

    // 分红比例配置（基点）
    struct DistributionRatios {
        uint16 toDeployers;        // 给部署者总分红比例 (e.g., 5000 = 50%)
        uint16 toTreasury;         // 给财政库比例
        uint16 toStakingPool;      // 给质押池比例
    }

    DistributionRatios public distributionRatios = DistributionRatios({
        toDeployers: 5000,    // 50%
        toTreasury: 3000,     // 30%
        toStakingPool: 2000   // 20%
    });

    // 部署者分红配置
    struct DeployerShare {
        uint16 bronze;       // 青铜部署者比例（基点）
        uint16 silver;       // 白银部署者比例（基点）
        uint16 gold;         // 黄金部署者比例（基点）
    }

    DeployerShare public deployerShares = DeployerShare({
        bronze: 4000,  // 青铜: 基础 40%
        silver: 6000,  // 白银: 60%
        gold: 8000     // 黄金: 80%
    });

    // === 状态 ===
    IERC20 public askToken;
    address public deployerRewards;
    address public treasury;
    address public stakingPool;

    // 累计分红记录
    mapping(address => uint256) public cumulativeDividends;
    mapping(address => uint256) public lastClaimedAt;

    // 事件
    event RevenueReceived(uint256 amount, uint256 toDeployers, uint256 toTreasury, uint256 toStaking);
    event DividendsDistributed(address indexed deployer, uint256 amount, uint256 totalDistributors);
    event DistributionRatiosUpdated(uint16 toDeployers, uint16 toTreasury, uint16 toStaking);
    event DeployerSharesUpdated(uint16 bronze, uint16 silver, uint16 gold);

    // === 错误 ===
    error InvalidRatio();
    error InsufficientBalance();
    error NoDeployersToDistribute();

    constructor(address _askToken) Ownable(msg.sender) {
        askToken = IERC20(_askToken);
    }

    // === 管理函数 ===

    function setDeployerRewards(address _deployerRewards) external onlyOwner {
        require(_deployerRewards != address(0), "Zero address");
        deployerRewards = _deployerRewards;
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Zero address");
        treasury = _treasury;
    }

    function setStakingPool(address _stakingPool) external onlyOwner {
        require(_stakingPool != address(0), "Zero address");
        stakingPool = _stakingPool;
    }

    function updateDistributionRatios(
        uint16 _toDeployers,
        uint16 _toTreasury,
        uint16 _toStakingPool
    ) external onlyOwner {
        if (_toDeployers + _toTreasury + _toStakingPool != BASIS_POINTS) {
            revert InvalidRatio();
        }
        distributionRatios = DistributionRatios({
            toDeployers: _toDeployers,
            toTreasury: _toTreasury,
            toStakingPool: _toStakingPool
        });
        emit DistributionRatiosUpdated(_toDeployers, _toTreasury, _toStakingPool);
    }

    function updateDeployerShares(
        uint16 _bronze,
        uint16 _silver,
        uint16 _gold
    ) external onlyOwner {
        if (_bronze > BASIS_POINTS || _silver > BASIS_POINTS || _gold > BASIS_POINTS) {
            revert InvalidRatio();
        }
        deployerShares = DeployerShare({
            bronze: _bronze,
            silver: _silver,
            gold: _gold
        });
        emit DeployerSharesUpdated(_bronze, _silver, _gold);
    }

    // === 分红函数 ===

    /// @notice 接收收入并自动分配
    /// @dev 任何人可调用，收入来源可以是staking收益、gas回注等
    function distribute() external {
        uint256 balance = askToken.balanceOf(address(this));
        require(balance >= MIN_DISTRIBUTION, "Insufficient balance");

        // 计算分配金额
        uint256 toDeployers = (balance * distributionRatios.toDeployers) / BASIS_POINTS;
        uint256 toTreasuryAmt = (balance * distributionRatios.toTreasury) / BASIS_POINTS;
        uint256 toStakingAmt = balance - toDeployers - toTreasuryAmt;

        // 分配给部署者
        if (toDeployers > 0) {
            _distributeToDeployers(toDeployers);
        }

        // 转账给财政库
        if (toTreasuryAmt > 0 && treasury != address(0)) {
            askToken.transfer(treasury, toTreasuryAmt);
        }

        // 转账给质押池
        if (toStakingAmt > 0 && stakingPool != address(0)) {
            askToken.transfer(stakingPool, toStakingAmt);
        }

        emit RevenueReceived(balance, toDeployers, toTreasuryAmt, toStakingAmt);
    }

    /// @notice 内部：分配给所有部署者
    function _distributeToDeployers(uint256 totalAmount) internal {
        if (deployerRewards == address(0)) return;

        uint256 deployerCount = IDeployerRewards(deployerRewards).getDeployerCount();
        if (deployerCount == 0) revert NoDeployersToDistribute();

        // 计算每个等级的权重
        uint256 totalWeight;
        address[] memory goldDeployers = new address[](deployerCount);
        uint256 goldCount;

        // 收集黄金部署者（优先分配）
        for (uint256 i = 0; i < deployerCount; i++) {
            address deployer = IDeployerRewards(deployerRewards).deployerList(i);
            if (IDeployerRewards(deployerRewards).isGoldTier(deployer)) {
                goldDeployers[goldCount++] = deployer;
            }
            totalWeight += IDeployerRewards(deployerRewards).getGovernanceWeight(deployer);
        }

        // 分配给黄金部署者（优先）
        uint256 goldShare = (totalAmount * deployerShares.gold) / BASIS_POINTS;
        if (goldShare > 0 && goldCount > 0) {
            uint256 perGold = goldShare / goldCount;
            for (uint256 i = 0; i < goldCount; i++) {
                address deployer = goldDeployers[i];
                if (perGold >= MIN_DISTRIBUTION) {
                    askToken.transfer(deployer, perGold);
                    cumulativeDividends[deployer] += perGold;
                    lastClaimedAt[deployer] = block.timestamp;
                    emit DividendsDistributed(deployer, perGold, goldCount);
                }
            }
        }

        // 剩余分配给所有部署者（按权重）
        uint256 remaining = totalAmount - goldShare;
        if (remaining > 0 && totalWeight > 0) {
            for (uint256 i = 0; i < deployerCount; i++) {
                address deployer = IDeployerRewards(deployerRewards).deployerList(i);
                // 跳过已获得黄金分配的
                if (IDeployerRewards(deployerRewards).isGoldTier(deployer)) continue;

                uint256 weight = IDeployerRewards(deployerRewards).getGovernanceWeight(deployer);
                uint256 share = (remaining * weight) / totalWeight;

                if (share >= MIN_DISTRIBUTION) {
                    askToken.transfer(deployer, share);
                    cumulativeDividends[deployer] += share;
                    lastClaimedAt[deployer] = block.timestamp;
                    emit DividendsDistributed(deployer, share, deployerCount);
                }
            }
        }
    }

    /// @notice 查询部署者累计分红
    function getCumulativeDividends(address deployer) external view returns (uint256) {
        return cumulativeDividends[deployer];
    }

    /// @notice 获取待分红总额
    function getPendingDividends() external view returns (uint256) {
        return askToken.balanceOf(address(this));
    }
}
```

**Step 3: 编译合约**

Run: `cd contracts && npx hardhat compile`
Expected: SUCCESS

**Step 4: 创建测试**

Create: `contracts/test/RevenueDistributor.test.js`

```javascript
import { ethers } from "hardhat"
import { expect } from "chai"

describe("RevenueDistributor", function () {
  let revenueDistributor
  let askToken
  let deployerRewards
  let owner, deployer1, deployer2, deployer3

  beforeEach(async function () {
    [owner, deployer1, deployer2, deployer3] = await ethers.getSigners()

    // 部署 Mock ASK Token
    const MockToken = await ethers.getContractFactory("MockERC20")
    askToken = await MockToken.deploy("AskToken", "ASK", ethers.utils.parseEther("1000000"))

    // 部署 Mock DeployerRewards
    const MockDeployerRewards = await ethers.getContractFactory("MockDeployerRewards")
    deployerRewards = await MockDeployerRewards.deploy()

    // 注册一些部署者
    await deployerRewards.addDeployer(deployer1.address, 0) // 青铜
    await deployerRewards.addDeployer(deployer2.address, 1) // 白银
    await deployerRewards.addDeployer(deployer3.address, 2) // 黄金

    // 部署 RevenueDistributor
    const RevenueDistributor = await ethers.getContractFactory("RevenueDistributor")
    revenueDistributor = await RevenueDistributor.deploy(askToken.address)

    // 设置配置
    await revenueDistributor.setDeployerRewards(deployerRewards.address)
  })

  describe("分红分配", function () {
    it("应该正确分配收入给部署者", async function () {
      // 转账 10000 ASK 给分红器
      await askToken.transfer(revenueDistributor.address, ethers.utils.parseEther("10000"))

      // 执行分红
      await revenueDistributor.distribute()

      // 检查部署者获得分红
      const balance1 = await askToken.balanceOf(deployer1.address)
      const balance3 = await askToken.balanceOf(deployer3.address)

      expect(balance1).to.be.gt(0)
      expect(balance3).to.be.gt(balance1) // 黄金应获得更多
    })
  })
})
```

**Step 5: 创建 Mock DeployerRewards（用于测试）**

Create: `contracts/test/mocks/MockDeployerRewards.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockDeployerRewards {
    mapping(address => bool) public isDeployer;
    mapping(address => uint256) public deployerTier;
    mapping(address => uint256) public totalUsers;
    address[] public deployerList;

    function addDeployer(address deployer, uint256 tier) external {
        isDeployer[deployer] = true;
        deployerTier[deployer] = tier;
        totalUsers[deployer] = tier * 10 + 5; // Mock: 青铜5, 白银15, 黄金25
        deployerList.push(deployer);
    }

    function getDeployerCount() external view returns (uint256) {
        return deployerList.length;
    }

    function deployerList(uint256 index) external view returns (address) {
        return deployerList[index];
    }

    function getGovernanceWeight(address deployer) external view returns (uint256) {
        if (!isDeployer[deployer]) return 0;
        return (totalUsers[deployer] * 1e18) + (deployerTier[deployer] * 100e18);
    }

    function isGoldTier(address deployer) external view returns (bool) {
        return deployerTier[deployer] == 2;
    }
}
```

**Step 6: 运行测试**

Run: `cd contracts && npx hardhat test test/RevenueDistributor.test.js`
Expected: PASS

**Step 7: 提交**

```bash
git add contracts/RevenueDistributor.sol contracts/interfaces/IDeployerRewards.sol
git add contracts/test/RevenueDistributor.test.js contracts/test/mocks/MockDeployerRewards.sol
git commit -m "feat(19): add RevenueDistributor for automatic deployer dividends"
```

---

## Task 3: 扩展 Governance 合约（集成部署者投票权重）

**Files:**
- Modify: `contracts/DAO/Governance.sol`
- Modify: `contracts/interfaces/IDeployerRewards.sol` (添加 getGovernanceWeight)

**Step 1: 更新 IDeployerRewards 接口**

Add to `contracts/interfaces/IDeployerRewards.sol`:

```solidity
/// @notice 获取部署者治理权重
/// @param deployer 部署者地址
/// @return 治理权重分数
function getGovernanceWeight(address deployer) external view returns (uint256);

/// @notice 检查是否是黄金部署者
/// @param deployer 部署者地址
/// @return 是否为黄金部署者
function isGoldTier(address deployer) external view returns (bool);
```

**Step 2: 更新 Governance 合约**

Replace the `getVotingPower` function in `contracts/DAO/Governance.sol`:

```solidity
// 添加接口
interface IDeployerRewards {
    function getGovernanceWeight(address deployer) external view returns (uint256);
    function isGoldTier(address deployer) external view returns (bool);
}

contract Governance {
    // ... existing code ...

    address public deployerRewards; // 新增

    // 新增：黄金部署者否决阈值
    uint256 public constant GOLD_VETO_THRESHOLD = 3000; // 30% 黄金反对票可暂停提案

    // 新增事件
    event GoldVeto(uint256 indexed proposalId, address deployer, uint256 vetoPower);
    event DeployerRewardsSet(address deployerRewards);

    // ... constructor update ...
    function setDeployerRewards(address _deployerRewards) external onlyOwner {
        deployerRewards = _deployerRewards;
        emit DeployerRewardsSet(_deployerRewards);
    }

    // 更新 getVotingPower 函数
    function getVotingPower(address account) public view returns (uint256) {
        // 1. 声誉投票（原有）
        int256 reputation = IStakingManager(stakingManager).getUserReputation(account);
        uint256 repVotes = reputation > 0 ? uint256(reputation / 1000) * 1e18 : 0;

        // 2. 代币投票（原有）
        uint256 tokenBalance = IERC20(askToken).balanceOf(account);
        uint256 tokenVotes = (tokenBalance / 10000) * 1e18;

        // 3. 部署者权重（新增）
        uint256 deployerVotes;
        if (deployerRewards != address(0)) {
            deployerVotes = IDeployerRewards(deployerRewards).getGovernanceWeight(account);
        }

        // 计算总权重
        uint256 total = repVotes + tokenVotes + deployerVotes;

        // 应用上限（10%）
        uint256 cap = getTotalVotingPower() / 10;
        return total > cap ? cap : total;
    }

    // 新增：黄金部署者否决
    function castGoldVeto(uint256 proposalId) external {
        require(proposalId < proposals.length, "Invalid proposal");
        require(deployerRewards != address(0), "DeployerRewards not set");

        bool isGold = IDeployerRewards(deployerRewards).isGoldTier(msg.sender);
        require(isGold, "Not a Gold deployer");

        Proposal storage proposal = proposals[proposalId];
        require(!proposal.hasVoted[msg.sender], "Already voted");
        require(!proposal.executed, "Already executed");

        uint256 weight = getVotingPower(msg.sender);
        proposal.hasVoted[msg.sender] = true;
        proposal.againstVotes += weight; // 反对票计入

        emit GoldVeto(proposalId, msg.sender, weight);
    }
}
```

**Step 3: 编译测试**

Run: `cd contracts && npx hardhat compile`
Expected: SUCCESS

**Step 4: 提交**

```bash
git add contracts/DAO/Governance.sol contracts/interfaces/IDeployerRewards.sol
git commit -m "feat(19): extend Governance with deployer voting power"
```

---

## Task 4: 创建 HealthReporter 合约（运维节点激励）

**Files:**
- Create: `contracts/HealthReporter.sol`

**Step 1: 创建合约**

Create: `contracts/HealthReporter.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title HealthReporter
 * @notice 自运维健康报告激励合约
 * @dev 部署者报告协议健康状态获得奖励
 */
contract HealthReporter is Ownable {

    // === 配置 ===
    struct RewardConfig {
        uint256 bugReportReward;      // Bug 报告奖励 (ASK)
        uint256 statusReportReward;  // 状态报告奖励 (ASK)
        uint256 stressTestReward;    // 压力测试参与奖励 (ASK)
        uint256 maxMonthlyReports;   // 每月最大报告数
    }

    RewardConfig public rewardConfig = RewardConfig({
        bugReportReward: 50e18,       // 50 ASK per bug report
        statusReportReward: 10e18,    // 10 ASK per status report
        stressTestReward: 100e18,     // 100 ASK per stress test
        maxMonthlyReports: 10         // 最多10次/月
    });

    // === 状态 ===
    IERC20 public askToken;
    address public deployerRewards;

    // 报告记录
    struct Report {
        address reporter;
        uint8 reportType;    // 1=Bug, 2=Status, 3=StressTest
        string description;
        uint256 timestamp;
        uint256 reward;
        bool validated;
    }

    Report[] public reports;
    mapping(address => uint256[]) public reporterReports;
    mapping(address => uint256) public reporterMonthlyCount;
    mapping(address => uint256) public reporterLastReset;

    // 已验证的 Bug (防重复奖励)
    mapping(bytes32 => bool) public validatedBugs;

    // 事件
    event ReportSubmitted(uint256 indexed reportId, address indexed reporter, uint8 reportType, uint256 reward);
    event ReportValidated(uint256 indexed reportId, uint256 reward);
    event BugValidated(bytes32 indexed bugHash);

    // 错误
    error MonthlyLimitReached();
    error InvalidReportType();
    error BugAlreadyValidated();
    error ZeroDescription();

    constructor(address _askToken) Ownable(msg.sender) {
        askToken = IERC20(_askToken);
    }

    // === 管理函数 ===

    function setDeployerRewards(address _deployerRewards) external onlyOwner {
        deployerRewards = _deployerRewards;
    }

    function updateRewardConfig(
        uint256 _bugReward,
        uint256 _statusReward,
        uint256 _stressReward,
        uint256 _maxMonthly
    ) external onlyOwner {
        rewardConfig = RewardConfig({
            bugReportReward: _bugReward,
            statusReportReward: _statusReward,
            stressTestReward: _stressReward,
            maxMonthlyReports: _maxMonthly
        });
    }

    // === 报告函数 ===

    /// @notice 提交健康报告（任何人都可以）
    /// @param reportType 1=Bug, 2=Status, 3=StressTest
    /// @param description 报告描述（IPFS hash 或明文）
    function submitReport(uint8 reportType, string calldata description) external {
        if (reportType < 1 || reportType > 3) revert InvalidReportType();
        if (bytes(description).length == 0) revert ZeroDescription();

        // 检查月度限制（仅对部署者）
        if (deployerRewards != address(0)) {
            _checkMonthlyLimit(msg.sender);
        }

        // 计算奖励
        uint256 reward;
        if (reportType == 1) {
            // Bug 报告需要验证后才发放
            reward = 0;
        } else if (reportType == 2) {
            reward = rewardConfig.statusReportReward;
        } else {
            reward = rewardConfig.stressTestReward;
        }

        // 创建报告
        Report memory report = Report({
            reporter: msg.sender,
            reportType: reportType,
            description: description,
            timestamp: block.timestamp,
            reward: reward,
            validated: false
        });

        reports.push(report);
        uint256 reportId = reports.length - 1;

        // 记录到报告人
        reporterReports[msg.sender].push(reportId);

        // 立即发放非 Bug 奖励
        if (reward > 0) {
            _transferReward(msg.sender, reward);
        }

        emit ReportSubmitted(reportId, msg.sender, reportType, reward);
    }

    /// @notice 验证 Bug 报告并发放奖励（仅 owner）
    /// @param reportId 报告 ID
    function validateBugReport(uint256 reportId) external onlyOwner {
        require(reportId < reports.length, "Invalid report ID");
        Report storage report = reports[reportId];
        require(report.reportType == 1, "Not a bug report");
        require(!report.validated, "Already validated");

        // 生成 Bug hash 防止重复
        bytes32 bugHash = keccak256(abi.encodePacked(report.description, report.reporter));
        require(!validatedBugs[bugHash], "Bug already validated");

        // 验证并发放奖励
        report.validated = true;
        validatedBugs[bugHash] = true;

        uint256 reward = rewardConfig.bugReportReward;
        report.reward = reward;

        _transferReward(report.reporter, reward);

        emit ReportValidated(reportId, reward);
        emit BugValidated(bugHash);
    }

    /// @notice 获取部署者的活跃状态（用于奖励判断）
    /// @param deployer 部署者地址
    /// @return 是否是活跃部署者
    function isActiveReporter(address deployer) external view returns (bool) {
        if (reporterReports[deployer].length == 0) return false;

        uint256 lastReportTime = reports[reporterReports[deployer][reporterReports[deployer].length - 1]].timestamp;
        return block.timestamp - lastReportTime < 30 days;
    }

    // === 内部函数 ===

    function _checkMonthlyLimit(address reporter) internal {
        uint256 currentMonth = block.timestamp / 30 days;
        uint256 storedMonth = reporterLastReset[reporter] / 30 days;

        if (currentMonth > storedMonth) {
            reporterMonthlyCount[reporter] = 0;
            reporterLastReset[reporter] = block.timestamp;
        }

        if (reporterMonthlyCount[reporter] >= rewardConfig.maxMonthlyReports) {
            revert MonthlyLimitReached();
        }

        reporterMonthlyCount[reporter]++;
    }

    function _transferReward(address to, uint256 amount) internal {
        require(askToken.balanceOf(address(this)) >= amount, "Insufficient balance");
        askToken.transfer(to, amount);
    }
}
```

**Step 2: 编译测试**

Run: `cd contracts && npx hardhat compile`
Expected: SUCCESS

**Step 3: 提交**

```bash
git add contracts/HealthReporter.sol
git commit -m "feat(19): add HealthReporter for node incentive system"
```

---

## Task 5: 创建前端四自集成面板

**Files:**
- Create: `src/pages/SelfOpsPanel.jsx`
- Modify: `src/main.jsx`

**Step 1: 创建 SelfOpsPanel 组件**

Create: `src/pages/SelfOpsPanel.jsx`

```jsx
import React, { useState, useEffect } from 'react'
import './SelfOpsPanel.css'

const SELF_OPS_CONFIG = {
  features: [
    {
      id: 'revenue',
      name: '自运营收益',
      icon: '💰',
      description: '自动获得协议收入分红',
      color: '#10b981'
    },
    {
      id: 'promotion',
      name: '自推广追踪',
      icon: '📣',
      description: '追踪你的推广效果',
      color: '#f59e0b'
    },
    {
      id: 'governance',
      name: '自进化治理',
      icon: '🏛️',
      description: '参与协议治理决策',
      color: '#8b5cf6'
    },
    {
      id: 'health',
      name: '自运维激励',
      icon: '🔧',
      description: '报告问题获得奖励',
      color: '#3b82f6'
    }
  ]
}

export default function SelfOpsPanel({ user, deployerStats }) {
  const [activeTab, setActiveTab] = useState('revenue')
  const [revenueData, setRevenueData] = useState(null)
  const [loading, setLoading] = useState(false)

  // 获取收益数据
  useEffect(() => {
    if (activeTab === 'revenue') {
      fetchRevenueData()
    }
  }, [activeTab, user])

  async function fetchRevenueData() {
    setLoading(true)
    try {
      // TODO: 从合约获取真实数据
      // Mock 数据
      setRevenueData({
        totalDividends: 1250,
        pendingDividends: 450,
        lastDistribution: '2026-05-15',
        distributionCount: 12
      })
    } catch (error) {
      console.error('Failed to fetch revenue data:', error)
    }
    setLoading(false)
  }

  const currentFeature = SELF_OPS_CONFIG.features.find(f => f.id === activeTab)

  return (
    <div className="self-ops-panel">
      <div className="panel-header">
        <h2>四自运营系统</h2>
        <span className="deployer-badge">
          {deployerStats?.tier === 2 ? '🥇 黄金部署者' :
           deployerStats?.tier === 1 ? '🥈 白银部署者' : '🥉 青铜部署者'}
        </span>
      </div>

      <div className="tabs">
        {SELF_OPS_CONFIG.features.map(feature => (
          <button
            key={feature.id}
            className={`tab ${activeTab === feature.id ? 'active' : ''}`}
            onClick={() => setActiveTab(feature.id)}
            style={{
              '--tab-color': feature.color,
              borderColor: activeTab === feature.id ? feature.color : 'transparent'
            }}
          >
            <span className="tab-icon">{feature.icon}</span>
            <span className="tab-name">{feature.name}</span>
          </button>
        ))}
      </div>

      <div className="tab-content" style={{ borderColor: currentFeature?.color }}>
        {activeTab === 'revenue' && (
          <div className="revenue-tab">
            <div className="stats-row">
              <div className="stat-card">
                <div className="stat-label">累计分红</div>
                <div className="stat-value">{revenueData?.totalDividends || 0} ASK</div>
              </div>
              <div className="stat-card highlight">
                <div className="stat-label">待分红</div>
                <div className="stat-value">{revenueData?.pendingDividends || 0} ASK</div>
              </div>
            </div>

            <div className="distribution-info">
              <p>上次分红: {revenueData?.lastDistribution || '暂无'}</p>
              <p>累计分红次数: {revenueData?.distributionCount || 0}</p>
            </div>

            <div className="tier-benefits">
              <h3>等级特权</h3>
              <ul>
                <li className={deployerStats?.tier >= 0 ? 'active' : ''}>
                  🥉 青铜: 获得 40% 分红份额
                </li>
                <li className={deployerStats?.tier >= 1 ? 'active' : ''}>
                  🥈 白银: 获得 60% 分红份额 + 优先分配
                </li>
                <li className={deployerStats?.tier >= 2 ? 'active' : ''}>
                  🥇 黄金: 获得 80% 分红份额 + VIP 专项分红
                </li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'promotion' && (
          <div className="promotion-tab">
            <h3>推广追踪</h3>
            <div className="stats-row">
              <div className="stat-card">
                <div className="stat-label">有效推广</div>
                <div className="stat-value">{deployerStats?.totalUsers || 0}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">本月新增</div>
                <div className="stat-value">{deployerStats?.monthlyCount || 0}</div>
              </div>
            </div>

            <div className="promotion-tools">
              <h4>推广工具</h4>
              <div className="tool-card">
                <span className="tool-icon">🔗</span>
                <div className="tool-info">
                  <span className="tool-name">推荐链接</span>
                  <code className="tool-value">
                    {deployerStats?.referralLink || 'https://app.agentskills.io?ref=...'}
                  </code>
                </div>
                <button className="btn btn-sm" onClick={() => {
                  navigator.clipboard.writeText(deployerStats?.referralLink || '')
                }}>
                  复制
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'governance' && (
          <div className="governance-tab">
            <h3>治理参与</h3>
            <div className="governance-info">
              <div className="voting-power">
                <span className="label">你的投票权重</span>
                <span className="value">{deployerStats?.totalUsers * 1 || 0} 票</span>
              </div>

              {deployerStats?.tier === 2 && (
                <div className="gold-perk">
                  <span className="perk-icon">👑</span>
                  <span>黄金特权：可使用否决权（30% 反对票可暂停提案）</span>
                </div>
              )}

              <div className="proposals-preview">
                <h4>活跃提案</h4>
                <p className="no-proposals">暂无活跃提案</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'health' && (
          <div className="health-tab">
            <h3>运维贡献</h3>
            <div className="health-actions">
              <button className="action-card">
                <span className="action-icon">🐛</span>
                <span className="action-name">报告 Bug</span>
                <span className="action-reward">+50 ASK</span>
              </button>
              <button className="action-card">
                <span className="action-icon">📊</span>
                <span className="action-name">状态报告</span>
                <span className="action-reward">+10 ASK</span>
              </button>
              <button className="action-card">
                <span className="action-icon">⚡</span>
                <span className="action-name">压力测试</span>
                <span className="action-reward">+100 ASK</span>
              </button>
            </div>

            <div className="health-stats">
              <p>本月剩余报告次数: 10</p>
              <p>累计贡献: 0 次</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

**Step 2: 创建样式**

Create: `src/pages/SelfOpsPanel.css`

```css
.self-ops-panel {
  max-width: 900px;
  margin: 0 auto;
  padding: var(--space-6);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-6);
}

.panel-header h2 {
  margin: 0;
  font-size: 1.5rem;
}

.deployer-badge {
  padding: var(--space-2) var(--space-4);
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(234, 179, 8, 0.2));
  border: 1px solid #fbbf24;
  border-radius: var(--radius-lg);
  font-size: 0.875rem;
}

.tabs {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
  overflow-x: auto;
}

.tab {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  background: var(--color-bg-secondary);
  border: 2px solid transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.tab:hover {
  background: var(--color-bg-hover);
}

.tab.active {
  background: rgba(var(--tab-color), 0.1);
}

.tab-icon {
  font-size: 1.25rem;
}

.tab-content {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.stat-card {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  text-align: center;
}

.stat-card.highlight {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.1);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-2);
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
}

.tier-benefits ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.tier-benefits li {
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  opacity: 0.5;
}

.tier-benefits li.active {
  opacity: 1;
  background: rgba(16, 185, 129, 0.1);
}

.health-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4);
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-6);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
}

.action-card:hover {
  border-color: #3b82f6;
  transform: translateY(-2px);
}

.action-icon {
  font-size: 2rem;
}

.action-name {
  font-weight: 500;
}

.action-reward {
  color: #10b981;
  font-size: 0.875rem;
}

@media (max-width: 768px) {
  .tabs {
    flex-wrap: wrap;
  }

  .stats-row,
  .health-actions {
    grid-template-columns: 1fr;
  }
}
```

**Step 3: 更新导航**

Modify: `src/main.jsx`

```jsx
// 添加导入
import SelfOpsPanel from './pages/SelfOpsPanel'

// 添加导航和页面
{user && <button onClick={() => setPage('selfops')}>四自系统</button>}

// 添加路由
{page === 'selfops' && <SelfOpsPanel user={user} deployerStats={deployerStats} />}
```

**Step 4: 提交**

```bash
git add src/pages/SelfOpsPanel.jsx src/pages/SelfOpsPanel.css src/main.jsx
git commit -m "feat(19): add SelfOpsPanel with four-self integration"
```

---

## Task 6: 端到端测试

**Files:**
- Create: `test/e2e/selfops-flow.test.js`

**Step 1: 编写 E2E 测试**

```javascript
import { test, expect } from '@playwright/test'

test.describe('四自运营系统流程', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
  })

  test('应该显示四自面板', async ({ page }) => {
    // 连接钱包后
    await page.click('text=连接钱包')
    await page.click('text=四自系统')

    await expect(page.locator('.self-ops-panel')).toBeVisible()
    await expect(page.locator('.tabs')).toBeVisible()
  })

  test('应该切换标签页', async ({ page }) => {
    await page.click('text=四自系统')
    await page.click('.tab >> text=自推广追踪')

    await expect(page.locator('.promotion-tab')).toBeVisible()
  })

  test('应该显示收益数据', async ({ page }) => {
    await page.click('text=四自系统')

    await expect(page.locator('.stat-card')).toHaveCount(2)
    await expect(page.locator('.tier-benefits')).toBeVisible()
  })
})
```

**Step 2: 运行测试**

Run: `npx playwright test test/e2e/selfops-flow.test.js`
Expected: PASS (如果前端运行中)

**Step 3: 提交**

```bash
git add test/e2e/selfops-flow.test.js
git commit -m "test(19): add self-ops system e2e tests"
```

---

## 执行总结

完成上述任务后，你将拥有：

| 组件 | 文件 | 状态 |
|------|------|------|
| DeployerRewards 扩展 | `DeployerRewards.sol` | ✅ |
| RevenueDistributor | `RevenueDistributor.sol` | ✅ |
| Governance 扩展 | `Governance.sol` | ✅ |
| HealthReporter | `HealthReporter.sol` | ✅ |
| SelfOpsPanel | `SelfOpsPanel.jsx` | ✅ |
| 端到端测试 | `test/e2e/selfops-flow.test.js` | ✅ |

**四自系统架构图：**

```
┌─────────────────────────────────────────────────────────────┐
│                      协议收入来源                            │
│    (staking fees, gas rebates, premium features)            │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              RevenueDistributor (自动分红)                  │
├─────────────┬─────────────────┬─────────────────────────────┤
│  部署者 50%  │   财政库 30%    │     质押池 20%              │
└──────┬──────┴─────────────────┴─────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│           DeployerRewards (按等级分配)                       │
├─────────────┬─────────────────┬─────────────────────────────┤
│ 🥉 青铜 40%  │  🥈 白银 60%    │      🥇 黄金 80%           │
└─────────────┴─────────────────┴─────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 自运维: HealthReporter                       │
├─────────────┬─────────────────┬─────────────────────────────┤
│  Bug报告    │  状态报告       │     压力测试                │
│  +50 ASK    │  +10 ASK        │     +100 ASK               │
└─────────────┴─────────────────┴─────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 自进化: Governance (扩展)                    │
├─────────────┬─────────────────┬─────────────────────────────┤
│  声誉投票   │  代币投票       │     部署者权重              │
│  L4+ 权重   │  ASK 持有量     │     用户数 × 等级加成       │
│             │                 │     🥇 黄金否决权           │
└─────────────┴─────────────────┴─────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 自推广: ReferralManager                     │
├─────────────────────────────────────────────────────────────┤
│  部署者生成推广链接 → 用户注册 → 奖励分发                    │
│  自动追踪推广效果 → 等级升级 → 更多奖励                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 执行选项

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**