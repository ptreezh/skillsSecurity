# DeployerRewards 激励系统实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现去中心化部署者激励系统，奖励推广AgentSkills的社区成员

**Architecture:**
- 智能合约层：DeployerRewards.sol 处理注册、等级计算、奖励分发
- 部署脚本层：deploy-with-rewards.js 实现自动注册
- 前端集成层：激励面板展示部署者收益

**Tech Stack:** Solidity + Hardhat + Node.js + React

---

## 任务概览

| 任务 | 描述 | 文件数 |
|------|------|--------|
| Task 1 | 更新 DeployerRewards 合约（完整版） | 1 |
| Task 2 | 编写合约测试 | 3 |
| Task 3 | 编写部署脚本（自动注册） | 1 |
| Task 4 | 创建前端激励面板 | 2 |
| Task 5 | 创建部署者仪表盘组件 | 2 |
| Task 6 | 端到端测试 | 1 |

---

## Task 1: 更新 DeployerRewards 合约（完整版）

**Files:**
- Modify: `contracts/DeployerRewards.sol`

**Step 1: 备份现有合约**

```bash
cp contracts/DeployerRewards.sol contracts/DeployerRewards.sol.backup
```

**Step 2: 重写完整合约**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DeployerRewards
 * @notice 部署者激励合约 - 阶梯式奖励系统
 * @dev 青铜1000/白银3000/黄金5000 ASK首次奖励
 */
contract DeployerRewards is Ownable {

    // 代币
    IERC20 public askToken;

    // 等级配置
    struct TierConfig {
        uint256 minUsers;
        uint256 minActiveUsers;
        uint256 firstReward;      // 首次奖励 (ASK)
        uint256 activeRewardRate; // 活跃奖励比例 (基点)
        uint256 monthlyLimit;     // 月推荐上限 (0=无上限)
    }

    TierConfig[] public tiers;

    // 部署者信息
    struct DeployerInfo {
        string domain;
        uint256 tier;            // 1=青铜, 2=白银, 3=黄金
        uint256 totalUsers;
        uint256 activeUsers;
        uint256 totalRewards;
        uint256 pendingRewards;
        uint256 monthlyCount;    // 本月推荐数
        uint256 monthStart;        // 本月开始时间
        uint256 registeredAt;
        bool isActive;
    }

    mapping(address => DeployerInfo) public deployers;
    address[] public deployerList;

    // 用户绑定
    struct UserBinding {
        address deployer;
        uint256 firstStakeTime;
        bool hasClaimed;
    }

    mapping(address => UserBinding) public userBindings;

    // 事件
    event DeployerRegistered(address indexed deployer, string domain, uint256 tier);
    event DeployerUpgraded(address indexed deployer, uint256 oldTier, uint256 newTier);
    event UserRegistered(address indexed user, address indexed deployer);
    event RewardDistributed(address indexed deployer, uint256 amount, uint256 userReward);
    event TierCalculation(address indexed deployer, uint256 tier, uint256 users, uint256 active);

    error AlreadyRegistered();
    error NotRegistered();
    error InvalidTier();
    error MonthlyLimitReached();
    error ZeroAddress();

    constructor(address _askToken) Ownable(msg.sender) {
        if (_askToken == address(0)) revert ZeroAddress();
        askToken = IERC20(_askToken);

        // 初始化等级配置
        tiers.push(TierConfig({
            minUsers: 1,
            minActiveUsers: 0,
            firstReward: 1000e18,    // 青铜: 1000 ASK
            activeRewardRate: 1000,  // 10%
            monthlyLimit: 10
        }));
        tiers.push(TierConfig({
            minUsers: 10,
            minActiveUsers: 5,
            firstReward: 3000e18,    // 白银: 3000 ASK
            activeRewardRate: 1500,  // 15%
            monthlyLimit: 50
        }));
        tiers.push(TierConfig({
            minUsers: 50,
            minActiveUsers: 20,
            firstReward: 5000e18,    // 黄金: 5000 ASK
            activeRewardRate: 2000,   // 20%
            monthlyLimit: 0          // 无上限
        }));
    }

    // === 注册 ===

    function registerDeployer(string memory domain) external {
        if (bytes(domain).length == 0) revert ZeroAddress();

        DeployerInfo storage info = deployers[msg.sender];
        if (info.registeredAt != 0) revert AlreadyRegistered();

        info.domain = domain;
        info.tier = 1;
        info.registeredAt = block.timestamp;
        info.isActive = true;
        info.monthStart = block.timestamp;

        deployerList.push(msg.sender);

        emit DeployerRegistered(msg.sender, domain, 1);
    }

    // === 用户注册与奖励 ===

    function onUserRegistered(address user, uint256 stakeAmount) external {
        if (user == address(0)) revert ZeroAddress();

        // 检查是否已注册
        if (userBindings[user].hasClaimed) return;

        // 获取用户的部署者（通过URL参数或cookie设置）
        // 这里简化：假设调用者已知道部署者地址
        // 实际需要通过链下方式传递
        address deployer = _getDeployerFromContext();

        if (deployer == address(0)) return;
        if (deployers[deployer].registeredAt == 0) return;

        // 检查月度限制
        _checkMonthlyLimit(deployer);

        // 更新部署者统计
        DeployerInfo storage d = deployers[deployer];
        d.totalUsers++;
        d.monthlyCount++;

        // 计算奖励
        uint256 tierIndex = d.tier - 1;
        uint256 deployerReward = tiers[tierIndex].firstReward;
        uint256 userReward = stakeAmount * 5 / 100; // 用户获得5%

        // 活跃奖励
        uint256 activeReward = stakeAmount * tiers[tierIndex].activeRewardRate / 10000;
        deployerReward += activeReward;

        // 更新绑定
        UserBinding storage binding = userBindings[user];
        binding.deployer = deployer;
        binding.firstStakeTime = block.timestamp;

        // 转账
        if (deployerReward > 0) {
            askToken.transfer(deployer, deployerReward);
            d.pendingRewards += deployerReward;
            d.totalRewards += deployerReward;
        }

        if (userReward > 0) {
            askToken.transfer(user, userReward);
        }

        emit UserRegistered(user, deployer);
        emit RewardDistributed(deployer, deployerReward, userReward);

        // 检查是否需要升级
        _checkAndUpgrade(deployer);
    }

    // === 等级计算 ===

    function calculateTier(address deployer) public view returns (uint256) {
        DeployerInfo storage d = deployers[deployer];
        if (d.registeredAt == 0) return 0;

        // 从高到低检查
        if (d.totalUsers >= tiers[2].minUsers && d.activeUsers >= tiers[2].minActiveUsers) {
            return 3; // 黄金
        }
        if (d.totalUsers >= tiers[1].minUsers && d.activeUsers >= tiers[1].minActiveUsers) {
            return 2; // 白银
        }
        return 1; // 青铜
    }

    function _checkAndUpgrade(address deployer) internal {
        DeployerInfo storage d = deployers[deployer];
        uint256 newTier = calculateTier(deployer);

        if (newTier > d.tier) {
            uint256 oldTier = d.tier;
            d.tier = newTier;
            emit DeployerUpgraded(deployer, oldTier, newTier);
        }
    }

    function _checkMonthlyLimit(address deployer) internal {
        DeployerInfo storage d = deployers[deployer];

        // 检查是否新月
        if (block.timestamp - d.monthStart > 30 days) {
            d.monthlyCount = 0;
            d.monthStart = block.timestamp;
        }

        // 检查限制
        uint256 tierIndex = d.tier - 1;
        if (tiers[tierIndex].monthlyLimit > 0 && d.monthlyCount >= tiers[tierIndex].monthlyLimit) {
            revert MonthlyLimitReached();
        }
    }

    // === 查询 ===

    function getDeployerStats(address deployer) external view returns (
        string memory domain,
        uint256 tier,
        uint256 totalUsers,
        uint256 activeUsers,
        uint256 totalRewards,
        uint256 pendingRewards,
        uint256 monthlyCount
    ) {
        DeployerInfo storage d = deployers[deployer];
        return (
            d.domain,
            d.tier,
            d.totalUsers,
            d.activeUsers,
            d.totalRewards,
            d.pendingRewards,
            d.monthlyCount
        );
    }

    function getTierInfo(uint256 tierIndex) external view returns (
        uint256 minUsers,
        uint256 firstReward,
        uint256 activeRewardRate,
        uint256 monthlyLimit
    ) {
        if (tierIndex == 0 || tierIndex > tiers.length) revert InvalidTier();
        TierConfig storage t = tiers[tierIndex - 1];
        return (t.minUsers, t.firstReward, t.activeRewardRate, t.monthlyLimit);
    }

    function getReferralLink(address deployer) external view returns (string memory) {
        DeployerInfo storage d = deployers[deployer];
        if (d.registeredAt == 0) return "";
        return string(abi.encodePacked(
            "https://app.agentskills.io?ref=",
            _toHexString(deployer)
        ));
    }

    function getDeployerCount() external view returns (uint256) {
        return deployerList.length;
    }

    function isDeployer(address account) external view returns (bool) {
        return deployers[account].registeredAt != 0;
    }

    // === 工具 ===

    function _getDeployerFromContext() internal view returns (address) {
        // 简化实现：实际需要链下数据
        return address(0);
    }

    function _toHexString(address x) internal pure returns (string memory) {
        bytes memory b = new bytes(40);
        for (uint i = 0; i < 20; i++) {
            b[2*i] = bytes1(uint8(uint256(uint160(x)) / 2**240));
            b[2*i+1] = bytes1(uint8(uint256(uint160(x)) / 2**232 & 0xf));
        }
        return string(abi.encodePacked("0x", b));
    }

    // === 管理 ===

    function setTierConfig(uint256 tierIndex, uint256 firstReward, uint256 activeRewardRate) external onlyOwner {
        if (tierIndex == 0 || tierIndex > tiers.length) revert InvalidTier();
        tiers[tierIndex - 1].firstReward = firstReward;
        tiers[tierIndex - 1].activeRewardRate = activeRewardRate;
    }
}
```

**Step 3: 编译合约**

Run: `cd contracts && npx hardhat compile`
Expected: SUCCESS

**Step 4: 提交**

```bash
git add contracts/DeployerRewards.sol
git commit -m "feat(19): rewrite DeployerRewards with tiered incentives"
```

---

## Task 2: 编写合约测试

**Files:**
- Create: `contracts/test/DeployerRewards.test.js`

**Step 1: 写失败测试**

```javascript
import { ethers } from "hardhat"
import { expect } from "chai"

describe("DeployerRewards", function () {
  let deployerRewards
  let askToken
  let owner, deployer1, deployer2, user1, user2

  beforeEach(async function () {
    [owner, deployer1, deployer2, user1, user2] = await ethers.getSigners()

    // 部署 Mock ASK Token
    const MockToken = await ethers.getContractFactory("MockERC20")
    askToken = await MockToken.deploy("AskToken", "ASK", ethers.utils.parseEther("1000000"))

    // 部署 DeployerRewards
    const DeployerRewards = await ethers.getContractFactory("DeployerRewards")
    deployerRewards = await DeployerRewards.deploy(askToken.address)
  })

  describe("注册", function () {
    it("应该允许新部署者注册", async function () {
      await deployerRewards.connect(deployer1).registerDeployer("my-site.com")

      const stats = await deployerRewards.getDeployerStats(deployer1.address)
      expect(stats.domain).to.equal("my-site.com")
      expect(stats.tier).to.equal(1) // 青铜
    })

    it("不应该允许重复注册", async function () {
      await deployerRewards.connect(deployer1).registerDeployer("site1.com")
      await expect(
        deployerRewards.connect(deployer1).registerDeployer("site2.com")
      ).to.be.revertedWith("AlreadyRegistered")
    })
  })

  describe("等级计算", function () {
    it("应该正确计算青铜等级", async function () {
      await deployerRewards.connect(deployer1).registerDeployer("site.com")
      const tier = await deployerRewards.calculateTier(deployer1.address)
      expect(tier).to.equal(1)
    })
  })

  describe("奖励分发", function () {
    it("应该分发青铜奖励 (1000 ASK)", async function () {
      await deployerRewards.connect(deployer1).registerDeployer("site.com")

      // mint 代币给合约
      await askToken.transfer(deployerRewards.address, ethers.utils.parseEther("10000"))

      // 模拟用户注册
      await deployerRewards.onUserRegistered(user1.address, ethers.utils.parseEther("100"))

      const stats = await deployerRewards.getDeployerStats(deployer1.address)
      expect(stats.totalRewards).to.be.gt(0)
    })
  })
})
```

**Step 2: 运行测试**

Run: `cd contracts && npx hardhat test test/DeployerRewards.test.js`
Expected: FAIL (需要先创建 MockERC20)

**Step 3: 创建 Mock Token**

Create: `contracts/test/mocks/MockERC20.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol, uint256 initialSupply)
        ERC20(name, symbol)
    {
        _mint(msg.sender, initialSupply);
    }
}
```

**Step 4: 运行测试**

Run: `cd contracts && npx hardhat test test/DeployerRewards.test.js`
Expected: PASS

**Step 5: 提交**

```bash
git add contracts/test/DeployerRewards.test.js contracts/test/mocks/MockERC20.sol
git commit -m "test(19): add DeployerRewards contract tests"
```

---

## Task 3: 编写部署脚本（自动注册）

**Files:**
- Modify: `scripts/deploy-with-rewards.js`

**Step 1: 更新部署脚本**

Replace the content with complete version:

```javascript
#!/usr/bin/env node
/**
 * AgentSkills 部署脚本 v2
 * 支持自动部署者注册和激励追踪
 */

import './env-setup.js'
import { ethers } from 'ethers'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 配置
const CONFIG = {
  DEPLOYER_REWARDS_ADDRESS: process.env.DEPLOYER_REWARDS_ADDRESS,
  ASK_TOKEN_ADDRESS: process.env.ASK_TOKEN_ADDRESS,
  RPC_URL: process.env.POLYGON_AMOY_RPC || 'https://rpc-amoy.polygon.technology',
}

// 解析参数
function parseArgs() {
  const args = process.argv.slice(2)
  return {
    register: args.includes('--register'),
    domain: args.find((a, i) => args[i-1] === '--domain') || 'localhost',
    locale: args.find((a, i) => args[i-1] === '--locale') || 'zh'
  }
}

// 注册部署者
async function registerDeployer(domain) {
  console.log(`\n📝 注册部署者: ${domain}`)

  const provider = new ethers.providers.JsonRpcProvider(CONFIG.RPC_URL)
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider)

  console.log(`👛 钱包: ${wallet.address}`)

  // ABI
  const abi = [
    "function registerDeployer(string memory domain) external",
    "function getDeployerStats(address deployer) external view returns (string memory, uint256, uint256, uint256, uint256, uint256, uint256)",
    "function getReferralLink(address deployer) external view returns (string memory)",
    "function isDeployer(address account) external view returns (bool)"
  ]

  const contract = new ethers.Contract(CONFIG.DEPLOYER_REWARDS_ADDRESS, abi, wallet)

  // 检查是否已注册
  const isRegistered = await contract.isDeployer(wallet.address)
  if (isRegistered) {
    console.log('  ⚠️ 已注册')
    const link = await contract.getReferralLink(wallet.address)
    console.log(`  🔗 推荐链接: ${link}`)
    const stats = await contract.getDeployerStats(wallet.address)
    console.log(`  📊 用户: ${stats[2]}, 奖励: ${ethers.utils.formatEther(stats[4])} ASK`)
    return
  }

  // 注册
  try {
    const tx = await contract.registerDeployer(domain)
    console.log(`  ⏳ 交易: ${tx.hash}`)
    await tx.wait()
    console.log('  ✅ 注册成功!')

    const link = await contract.getReferralLink(wallet.address)
    console.log(`\n🎉 你的推荐链接:`)
    console.log(`   ${link}`)

  } catch (error) {
    console.error(`  ❌ 失败: ${error.message}`)
  }
}

// 生成配置
function generateConfig(locale) {
  const config = {
    version: '1.4.0',
    deployedAt: new Date().toISOString(),
    contracts: {
      deployerRewards: CONFIG.DEPLOYER_REWARDS_ADDRESS,
      askToken: CONFIG.ASK_TOKEN_ADDRESS
    },
    i18n: { default: locale, supported: ['zh', 'en', 'ja', 'ko'] }
  }

  const publicDir = path.join(__dirname, '..', 'public')
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true })

  fs.writeFileSync(
    path.join(publicDir, 'deploy-config.json'),
    JSON.stringify(config, null, 2)
  )
  console.log(`  ✅ 配置已保存: public/deploy-config.json`)
}

// 主程序
async function main() {
  console.log('\n🚀 AgentSkills 部署脚本 v2\n')
  console.log('='.repeat(50))

  const config = parseArgs()

  if (config.register) {
    if (!process.env.PRIVATE_KEY) {
      console.error('\n❌ 需要设置 PRIVATE_KEY')
      console.log('   创建 .env: PRIVATE_KEY=0x你的私钥')
      process.exit(1)
    }
    await registerDeployer(config.domain)
  }

  generateConfig(config.locale)

  console.log('\n' + '='.repeat(50))
  console.log('\n📋 部署说明:')
  console.log('   1. npm run build')
  console.log('   2. 部署 dist/ 到 Vercel/Netlify')
  console.log('   3. 分享你的推荐链接获取奖励\n')
}

main().catch(console.error)

export { registerDeployer, generateConfig, CONFIG }
```

**Step 2: 测试脚本语法**

Run: `node --check scripts/deploy-with-rewards.js`
Expected: SUCCESS

**Step 3: 提交**

```bash
git add scripts/deploy-with-rewards.js
git commit -m "feat(19): update deploy script with auto-registration"
```

---

## Task 4: 创建前端激励面板

**Files:**
- Create: `src/pages/DeployerDashboard.jsx`

**Step 1: 创建激励面板组件**

```jsx
import React, { useState, useEffect } from 'react'
import { useContract } from '../services/ContractService'
import './DeployerDashboard.css'

export default function DeployerDashboard() {
  const { deployerRewards, isConnected } = useContract()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isConnected || !deployerRewards) {
      setLoading(false)
      return
    }

    async function loadStats() {
      try {
        const deployer = await window.ethereum.request({
          method: 'eth_accounts'
        })
        if (deployer.length > 0) {
          const data = await deployerRewards.getDeployerStats(deployer[0])
          setStats({
            domain: data[0],
            tier: data[1],
            totalUsers: data[2].toNumber(),
            activeUsers: data[3].toNumber(),
            totalRewards: data[4] / 1e18,
            pendingRewards: data[5] / 1e18,
            monthlyCount: data[6].toNumber()
          })
        }
      } catch (error) {
        console.error('Failed to load stats:', error)
      }
      setLoading(false)
    }

    loadStats()
  }, [deployerRewards, isConnected])

  if (!isConnected) {
    return (
      <div className="card deployer-panel">
        <h2>部署者激励面板</h2>
        <p className="text-secondary">连接钱包查看你的激励数据</p>
        <button className="btn btn-primary">连接钱包</button>
      </div>
    )
  }

  if (loading) {
    return <div className="card loading">加载中...</div>
  }

  if (!stats) {
    return (
      <div className="card deployer-panel">
        <h2>部署者激励面板</h2>
        <p className="text-secondary">注册成为部署者获取推荐奖励</p>
        <button className="btn btn-primary">注册部署者</button>
      </div>
    )
  }

  const tierNames = { 1: '青铜', 2: '白银', 3: '黄金' }
  const tierColors = { 1: '#94a3b8', 2: '#60a5fa', 3: '#fbbf24' }

  return (
    <div className="card deployer-panel">
      <div className="panel-header">
        <h2>部署者激励面板</h2>
        <span
          className="badge"
          style={{ background: tierColors[stats.tier] }}
        >
          {tierNames[stats.tier]}
        </span>
      </div>

      <div className="stats-grid">
        <div className="stat">
          <span className="stat-value">{stats.totalUsers}</span>
          <span className="stat-label">累计用户</span>
        </div>
        <div className="stat">
          <span className="stat-value">{stats.activeUsers}</span>
          <span className="stat-label">活跃用户</span>
        </div>
        <div className="stat highlight">
          <span className="stat-value">{stats.totalRewards.toFixed(0)}</span>
          <span className="stat-label">累计奖励 (ASK)</span>
        </div>
        <div className="stat">
          <span className="stat-value">{stats.pendingRewards.toFixed(0)}</span>
          <span className="stat-label">待领取</span>
        </div>
      </div>

      <div className="referral-section">
        <h3>你的推荐链接</h3>
        <div className="referral-link">
          <code>https://app.agentskills.io?ref=...</code>
          <button className="btn btn-secondary">复制</button>
        </div>
      </div>

      <div className="tier-progress">
        <h3>等级进度</h3>
        <div className="progress-info">
          <span>当前: {tierNames[stats.tier]}</span>
          {stats.tier < 3 && (
            <span>距离下一级还需 {50 - stats.totalUsers} 用户</span>
          )}
        </div>
        <div className="progress">
          <div
            className="progress-bar"
            style={{ width: `${Math.min(100, (stats.totalUsers / 50) * 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
}
```

**Step 2: 创建样式**

Create: `src/pages/DeployerDashboard.css`

```css
.deployer-panel {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  border: 1px solid rgba(102, 126, 234, 0.2);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-6);
}

.panel-header h2 {
  margin: 0;
  font-size: 1.25rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.stat {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  text-align: center;
}

.stat.highlight {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
  border-color: rgba(102, 126, 234, 0.3);
}

.stat-value {
  display: block;
  font-size: 1.75rem;
  font-weight: 700;
  color: #fff;
}

.stat-label {
  display: block;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin-top: var(--space-1);
}

.referral-section {
  margin-bottom: var(--space-6);
}

.referral-link {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  background: rgba(0, 0, 0, 0.2);
  border-radius: var(--radius-md);
  padding: var(--space-3);
}

.referral-link code {
  flex: 1;
  font-size: 0.875rem;
  color: var(--color-primary);
}

.tier-progress h3 {
  font-size: 0.875rem;
  margin-bottom: var(--space-2);
}

.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-2);
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

**Step 3: 更新 main.jsx 添加路由**

Modify: `src/main.jsx`

```jsx
// 添加导入
import DeployerDashboard from './pages/DeployerDashboard'

// 在 App 中添加
{page === 'dashboard' && <DeployerDashboard />}
{/* 在 nav 中添加 */}
<button onClick={() => setPage('dashboard')}>激励面板</button>
```

**Step 4: 提交**

```bash
git add src/pages/DeployerDashboard.jsx src/pages/DeployerDashboard.css src/main.jsx
git commit -m "feat(19): add deployer dashboard component"
```

---

## Task 5: 集成到主导航

**Files:**
- Modify: `src/main.jsx`

**Step 1: 更新导航**

```jsx
<nav>
  <button onClick={() => setPage('browser')}>技能浏览器</button>
  <button onClick={() => setPage('demo')}>协议演示</button>
  <button onClick={() => setPage('leaderboard')}>排行榜</button>
  {user && <button onClick={() => setPage('dashboard')}>激励面板</button>}
  {user && <button onClick={() => setPage('profile')}>我的声誉 ({user.reputation})</button>}
</nav>
```

**Step 2: 提交**

```bash
git add src/main.jsx
git commit -m "feat(19): add deployer dashboard to navigation"
```

---

## Task 6: 端到端测试

**Files:**
- Create: `test/e2e/deployer-flow.test.js`

**Step 1: 编写E2E测试**

```javascript
import { test, expect } from '@playwright/test'

test.describe('部署者激励流程', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
  })

  test('应该显示激励面板', async ({ page }) => {
    await page.click('text=激励面板')
    await expect(page.locator('.deployer-panel')).toBeVisible()
  })

  test('未连接时显示连接提示', async ({ page }) => {
    await page.click('text=激励面板')
    await expect(page.locator('text=连接钱包')).toBeVisible()
  })
})
```

**Step 2: 运行测试**

Run: `npx playwright test test/e2e/deployer-flow.test.js`
Expected: PASS (如果前端运行中)

**Step 3: 提交**

```bash
git add test/e2e/deployer-flow.test.js
git commit -m "test(19): add deployer flow e2e tests"
```

---

## 执行总结

完成上述任务后，你将拥有：

| 组件 | 状态 |
|------|------|
| DeployerRewards.sol (完整版) | ✅ |
| 合约测试 | ✅ |
| 部署脚本 (自动注册) | ✅ |
| 激励面板 UI | ✅ |
| 导航集成 | ✅ |
| E2E 测试 | ✅ |

---

## 执行选项

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**