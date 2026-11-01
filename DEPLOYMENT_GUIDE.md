# AgentSkills 部署指南

> **当前运行架构（2026-09-16 更新）**: 后端链提交使用 **ChainMaker 私有链（chain1）**（cmc 网关）。
> 运行后端**不需要** `PRIVATE_KEY` / RPC 钱包。公开链部署路径已从仓库移除。

## 运行架构

- 合约运行在 **ChainMaker 私有链 `chain1`**，通过 cmc 网关部署与提交。
- 后端 `server/index.js` 是唯一的链访问入口，使用 `CHAINMAKER_*` + `SKILL_REGISTRY_ADDRESS`。
- 前端不直连链，仅经后端 API 读取链上数据（`ChainDataService`）。

## 前置条件

### 1. 安装依赖
```bash
npm install
```

### 2. 环境配置（后端）

创建 `.env` 文件，至少包含：
```bash
CHAINMAKER_CONTAINER_CMD=docker exec cmc-debug
CHAINMAKER_SDK_CONF=/work/sdk_config.yml
CHAINMAKER_CERT_DIR=/work
CHAINMAKER_ABI_DIR=/work
CHAINMAKER_CHAIN_ID=chain1
CHAINMAKER_ORG_ID=wx-org.chainmaker.org
SKILL_REGISTRY_ADDRESS=cf089d4bebcdabd13cd6a27ba6c168acac6bc042
CORS_ORIGIN=https://你的域名
```

## 本地开发与构建

```bash
# 编译合约
npx hardhat compile

# 运行合约测试
npm run test

# 启动前端开发服务器
npm run dev

# 构建前端
npm run build
```

## 合约部署（ChainMaker chain1）

合约部署与接线在 **cmc-debug 容器**内完成：

1. `hardhat compile` 生成 `.bin` / `.abi`，挂载或拷贝到 cmc-debug 容器 `/work`。
2. 使用 `cmc create` 部署合约（EVM 地址类型 `addr_type: 2`）。
3. 执行跨合约接线（`setStakingManager` / `setReputationOracle` / `setReputationBadges` 等）。
4. 运行容器内验证脚本确认接线与状态读回。

> 公开链合约部署流程已废弃，相关脚本与工作流已从仓库移除。

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

## 前端配置

链上地址经后端 API 提供，前端不直连链。部署完成后按需更新：
- `deployments.json`：根目录部署信息
- `public/deployments.json`：前端读取的链上地址

## 验证清单

- [ ] 合约部署成功
- [ ] 所有合约地址记录
- [ ] 跨合约接线完成
- [ ] 前端配置更新
- [ ] 钱包连接测试
- [ ] 技能上传测试
- [ ] 链上数据验证

## 故障排除

### 后端无法提交
```bash
# 确认 cmc-debug 容器可访问，且 CHAINMAKER_* 配置正确
curl http://localhost:10001/api/health
```

### 合约接线缺失
```bash
# 在 cmc-debug 容器内重跑接线验证脚本
docker exec cmc-debug sh -c "sh /work/verify_v3_wiring.sh"
```

## 支持

- Discord: https://discord.gg/agentskills
- GitHub Issues: https://github.com/agentskills/contracts/issues