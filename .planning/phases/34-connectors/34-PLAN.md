# Phase 34：MCP/CLI 连接器实现
> Milestone: v3.0 | Phase: 34 | Status: planning

## 需求映射
REQ-34：连接器实现

## 目标
实现 2 个 MCP 连接器，封装 AgentSkills 后端 API 和链上交互，供 SKILL 调用。

---

## Task 34-01：AgentSkills Backend MCP Connector

### 职责
封装所有后端 API 调用（/api/upload, /api/chain, /api/skills, /api/reputation, /api/leaderboard, /api/stats）

### 文件结构
```
connectors/agentskills-backend-mcp/
├── connector-meta.json
├── mcp.json
├── icon.svg
└── skills/
    └── backend-client/
        └── SKILL.md
```

### connector-meta.json
```json
{
  "name": "agentskills-backend",
  "version": "1.0.0",
  "type": "mcp",
  "description": "AgentSkills 后端 API 连接器，提供技能审计、注册、查询能力",
  "author": "AgentSkills Team",
  "homepage": "https://github.com/agentskills"
}
```

### mcp.json
```json
{
  "mcpServers": {
    "agentskills-backend": {
      "url": "http://localhost:10001",
      "transport": "streamableHttp",
      "headers": {
        "Accept-Language": "zh-CN"
      }
    }
  }
}
```

### SKILL.md（backend-client）
```yaml
---
name: backend-client
display_name: 后端客户端
description: 调用 AgentSkills 后端 API
category: 开发工具
version: 1.0.0
author: AgentSkills Team
---
# 后端客户端
提供以下 API 调用能力：
1. GET /api/skills - 获取技能列表
2. GET /api/skills/:id - 获取技能详情
3. GET /api/reputation/:address - 获取用户声誉
4. GET /api/leaderboard - 获取排行榜
5. GET /api/stats - 获取协议统计
6. POST /api/upload - 上传技能
7. POST /api/chain - 提交上链
```

### 验收标准
1. WorkBuddy 能识别 agentskills-backend MCP 连接器
2. 连接器能正确调用本地后端 API（localhost:10001）
3. 支持 Bearer Token 认证（通过环境变量注入）

---

## Task 34-02：AgentSkills Chain MCP Connector（可选，Phase 1 可简化）

### 职责
封装链上交互（通过后端网关 /api/chain 间接调用，不直接暴露私钥/证书）

### 文件结构
```
connectors/agentskills-chain-mcp/
├── connector-meta.json
├── mcp.json
├── icon.svg
└── skills/
    └── chain-client/
        └── SKILL.md
```

### 设计说明
- 根据宪法约束，前端/ Skill 不直连链，所有链操作走后端网关
- 此连接器只暴露 /api/chain, /api/reputation, /api/stats
- 与 Backend Connector 可合并，Phase 1 建议先只实现 Backend Connector

### 验收标准
1. （可选）与 Backend Connector 功能不重叠
2. 支持只读链上数据查询

---

## Task 34-03：连接器本地测试

### 文件
`connectors/agentskills-backend-mcp/tests/test_connector.py`

### 内容
- 测试连接器能正确调用本地后端
- 测试错误处理（后端不可用、网络超时）
- 测试认证失败场景

### 验收标准
1. 本地后端运行在 localhost:10001 时，连接器测试通过
2. 后端停止时，连接器返回清晰的错误信息

---

## 依赖
- Phase 31：技能包模板已建立
- 后端 API 已实现（Phase 27-30）

## 风险
| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| WorkBuddy MCP 连接器规范变更 | 低 | 中 | 参考最新官方文档 |
| 认证机制复杂 | 中 | 中 | Phase 1 使用本地模式，不强制认证 |

## 工时估算
- Task 34-01：6 小时
- Task 34-02：3 小时（可选）
- Task 34-03：3 小时
- **总计：12 小时（不含 Task 34-02 为 9 小时）**
