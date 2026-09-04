# AgentSkills 部署指南

## Polygon Amoy 测试网部署

### 前置条件

1. **安装依赖**
```bash
npm install
```

2. **环境配置**

创建 `.env` 文件：
```bash
PRIVATE_KEY=0x...  # 部署者私钥
POLYGON_AMOY_RPC=https://rpc-amoy.polygon.technology
```

3. **获取测试币**

访问 [Polygon Amoy Faucet](https://faucet.polygon.technology/) 获取测试 MATIC

### 部署步骤

#### 1. 编译合约
```bash
npx hardhat compile
```

#### 2. 部署核心合约
```bash
npx hardhat run scripts/deployCore.js --network polygonAmoy
```

#### 3. 验证部署
```bash
npx hardhat run scripts/verify-deployment.js --network polygonAmoy
```

### 合约列表

| 合约 | 功能 | 验证 |
|------|------|------|
| GovernanceTimelock | 治理时间锁 | 必需 |
| AgentPausable | 暂停机制 | 必需 |
| StakingManager | 质押管理 | 必需 |
| SkillRegistry | 技能注册 | 必需 |
| Attribution | 贡献归因 | 必需 |
| AgentTimelock | 提案时间锁 | 可选 |
| AgentVotes | 投票代币 | 可选 |
| AgentGovernor | 治理 Governor | 可选 |

### 前端配置

部署完成后，更新 `public/deployments.json`:

```json
{
  "network": "polygonAmoy",
  "chainId": 80002,
  "contracts": {
    "ASKToken": "0x...",
    "SkillRegistry": "0x...",
    "StakingManager": "0x...",
    "Attribution": "0x..."
  }
}
```

### 验证清单

- [ ] 合约部署成功
- [ ] 所有合约地址记录
- [ ] 前端配置更新
- [ ] 钱包连接测试
- [ ] 技能上传测试
- [ ] 链上数据验证

### 故障排除

#### 余额不足
```bash
# 检查余额
node scripts/check-balance.js

# 获取测试币
https://faucet.polygon.technology/
```

#### RPC 连接失败
```bash
# 尝试备用 RPC
POLYGON_AMOY_RPC=https://polygon-amoy.blockpi.network/v1/rpc/public
```

#### Gas 价格过高
```bash
# 设置 maxFeePerGas 和 maxPriorityFeePerGas
# 在 hardhat.config.js 中配置
```

### 生产部署 (Polygon Mainnet)

⚠️ **生产部署前检查清单**:

- [ ] 所有测试通过
- [ ] 安全审核完成
- [ ] 代码审计完成
- [ ] 应急暂停机制测试
- [ ] 资金充足 (>1 MATIC)
- [ ] 多签钱包配置
- [ ] 监控系统部署
- [ ] 备份策略确认

生产部署命令：
```bash
npx hardhat run scripts/deployCore.js --network polygon
```

## 支持

- Discord: https://discord.gg/agentskills
- GitHub Issues: https://github.com/agentskills/contracts/issues
