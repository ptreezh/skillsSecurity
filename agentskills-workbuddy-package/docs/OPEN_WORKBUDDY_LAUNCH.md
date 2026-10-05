# open.workbuddy.cn 上架指南

> 依据官方文档 `https://open.workbuddy.cn/docs/skill` 与 `https://open.workbuddy.cn/docs/connector` 整理。
> 标注「待确认」的条目表示官方页面未明确说明，需向 WorkBuddy 团队求证。

## 0. 两条路径必须区分

| | Skill 市场 | 连接器 |
|---|---|---|
| 提交方式 | 客户端内引导式对话，自服务提交 | open.workbuddy.cn 提交，需团队审核 |
| 是否需要服务器 | 纯静态 Skill 不需要 | 远程 MCP 需要公网 HTTPS 服务 |
| 官方文档 | `/docs/skill` | `/docs/connector` |

**不要把两者混为一谈**：Skill 上架不需要「开发者中心 → 创建技能」表单，也不需要 `manifest.yaml`。

---

## 1. 前置条件：入驻与实名认证

Skill 市场自服务上架、连接器审核，都以完成入驻认证为前提。

- **个人认证**：通常需要中国大陆二代居民身份证、实名手机号、邮箱与人脸核身
- **企业认证**：通常需要营业执照、法定代表人或授权经办人身份与人脸核身

> 具体材料、费用与审核时长以官方页面为准。若无法完成认证，Skill 与连接器两条路径都会被阻塞。

---

## 2. 路径 A：Skill 市场

### 2.1 提交流程

1. 在 WorkBuddy 客户端内发起对话式引导
2. 按提示提供技能包与说明
3. 提交审核

官方文档描述的是客户端内引导流程，而非在网站上手工填表。

### 2.2 SKILL.md 必需 frontmatter

```yaml
---
name: skill-auditor              # 技能标识
description: ...                 # 供 Agent 判断何时调用（关键）
version: 1.0.0
author: ...
description_zh: ...
description_en: ...
---
```

`description` 决定 Agent 能否正确触发该技能，务必写清「做什么」与「何时用」。

### 2.3 目录结构

```
skill-name/
├── SKILL.md          # 必需
├── scripts/          # 可选：可执行脚本
├── references/       # 可选：参考资料
└── assets/           # 可选：静态资源
```

### 2.4 本仓库的提交准备

```bash
cd agentskills-workbuddy-package

# 规范检查
python tools/skill_lint.py skills/skill-auditor/

# 打包为 .zip
python tools/packager.py skills/skill-auditor/
```

> 注意：`skills/template/` 是模板，不应作为正式技能提交。

---

## 3. 路径 B：连接器

### 3.1 两种组合，不可混用

- **MCP + Skill**（官方推荐）：连接器提供 MCP Server，并附带一个 Skill
- **CLI + Skill**：连接器封装命令行程序，并附带一个 Skill

一个连接器只能对应**一个** MCP Server。

### 3.2 `type` 字段

官方元信息支持以下取值：

- `mcp`：MCP 型连接器
- `cli`：CLI 型连接器
- `skill-only`：仅 Skill 的连接器

> 待确认：`skill-only` 的专属必需文件结构，官方文档未单独展开。
> 本仓库的零基础设施方案以此为主要候选。

### 3.3 MCP 型必需文件

| 文件 | 说明 |
|------|------|
| `connector-meta.json` | 连接器元信息，**必需** |
| `mcp.json` | MCP Server 配置，**必需** |
| `icon.svg` | 连接器图标，**必需** |
| `skills/` | 可选 |

### 3.4 远程 vs 本地 MCP

| | 远程 MCP | 本地 MCP |
|---|---|---|
| 传输 | HTTPS + SSE / streamableHttp | stdio 子进程 |
| 服务器 | **必须**公网可达 + TLS 证书 | 无需服务器 |
| 可用性要求 | 建议 ≥ 99.9% | 不适用 |
| 单次请求 | 需在 30 秒内响应 | 不适用 |

若公开远程 MCP 部署在中国大陆境内，可能涉及 ICP 备案 —— 待确认。

### 3.5 认证：`auth_mode`

| 取值 | 含义 |
|------|------|
| 省略 | 无需认证 |
| `server-side` | 由服务端托管凭据 |
| `gateway` | 经网关代理 |
| `token` | 需用户提供令牌 |

使用 `token` 模式时，额外要求：

- 提供 `token-schema.json`
- `minWorkbuddyVersion` ≥ `4.23.0`

如涉及第三方授权，需遵循 OAuth 2.1（含 PKCE）。

### 3.6 其他元信息要求

- `source`：全局唯一，kebab-case 格式
- `examples_zh` / `examples_en`：建议 2–5 条示例
- 示例类元信息要求 `minWorkbuddyVersion` ≥ `4.24.0`

---

## 4. 关于「需要什么服务器」

| 上架形态 | 是否需要服务器 |
|----------|--------------|
| Skill 市场（纯静态） | **不需要** |
| `skill-only` 连接器 | **不需要** |
| 本地 stdio MCP | **不需要** |
| 远程 MCP | **需要**：公网 HTTPS、域名、TLS、可用性 ≥ 99.9%、请求 < 30s |

结论：本仓库优先走**零服务器**路径；仅当需要远程 MCP 时才部署服务器。

---

## 5. 审核与更新

- Skill 与连接器均需审核（Skill 为自服务提交，连接器为团队审核）
- 官方说明的 **10–15 分钟**是**审核通过后的版本同步时间**，不是审核时长
- 官方文档未公布审核 SLA —— 待确认

---

## 6. 发布后

- 监控使用量与用户反馈
- 定期更新 `version` 并重新提交
- 远程 MCP 需持续监控可用性

---

## 7. 联系与求助

- 官方邮箱：`openworkbuddy@tencent.com`
- Skill 文档：https://open.workbuddy.cn/docs/skill
- 连接器文档：https://open.workbuddy.cn/docs/connector
- MCP 规范：https://modelcontextprotocol.io/

> `skill-only` 文件结构、审核 SLA、ICP 备案要求三项，建议直接邮件确认。
