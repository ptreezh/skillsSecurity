# AgentSkills 运行监控（已作废）

> **状态：作废（obsolete）**
>
> 本文档描述的监控方案基于已删除的组件，不再适用，仅作历史留存。

## 为什么作废

原方案依赖以下已移除的组件与脚本：

- `src/server.js`（独立监控服务，含 gas 告警/事件监听）——已在 ChainMaker 迁移中删除
- `scripts/test-rpc.js`、`scripts/deploy-when-ready.sh`、`scripts/deploy-all.sh`、`scripts/verify-deployment.js`、`scripts/prepare-deployment-package.sh`——已删除
- 公链（EVM）RPC 连接与 gas 代币余额检查——ChainMaker 无标准 JSON-RPC，且零代币架构下不存在 gas 代币

## 当前运行架构

| 项目 | 现状 |
|------|------|
| 运行时链 | 长安链 ChainMaker solo（`chain1`，`enable_gas: false`） |
| 后端 API | `server/index.js`（唯一 Express 服务，端口 `:10001`） |
| 健康检查 | `GET /api/health` |
| 链读写 | 后端网关（cmc gateway）桥接，前端不直连链 |
| 费用模型 | 零代币（no tokens ever），无 gas 费 |

## 健康检查方式

```bash
# 后端存活与链网关状态
curl http://localhost:10001/api/health
```

部署与接线检查请参见 `DEPLOYMENT_CHECKLIST.md`。