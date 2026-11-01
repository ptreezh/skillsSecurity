# AgentSkills → WorkBuddy 技能化方案
> 目标：把现有系统拆成可发布到 open.workbuddy.cn 的多个 SKILL + 1 个专家智能体 + 必要连接器，且每个能力都可独立安装、独立调用。

## 一、需求再确认
1. 必须准确理解 WorkBuddy/OpenClaw 的技能标准
2. 必须准确理解 open.workbuddy.cn 的上架/审核要求
3. 必须把 AgentSkills 系统拆成多个 SKILL，而不是一个超大 SKILL
4. 必须形成“专家智能体” orchestration 能力
5. 必须有必要的连接器，让技能能调用现有后端/合约能力
6. 落盘后必须 grill-down 钢铁人思辨，直到完全确定

## 二、WorkBuddy 技能标准（已核验）
来源：https://www.workbuddy.cn/docs/cli/skills + https://juejin.cn/post/7673069645683146795

### 2.1 最小可发布单元
```
my-skill/
├── SKILL.md              # 必填
├── references/           # 可选
├── scripts/              # 可选
└── templates/            # 可选
```

### 2.2 SKILL.md 必须字段
```yaml
---
name: skill-name
display_name: 展示名称
display_name_en: English Name
description: 一句话描述能力
description_zh: 简短中文介绍
description_en: A brief English introduction
category: 分类名
version: 1.0.0
author: 合作方名称
---
# 技能说明
当用户需要完成某项任务时，按以下步骤执行。
```

### 2.3 上架流程
1. 访问 open.workbuddy.cn，注册 + 实名认证
2. 进入「发布团队 Skill」
3. 上传 Skill 包（.zip）
4. 填写基本信息
5. 等待审核（安全扫描 → AI 审核 → 人工抽检）
6. 审核通过后上架

### 2.4 专家智能体（Agent）定义
WorkBuddy 支持 `.codebuddy-plugin/plugin.json` + `agents/` 目录定义多 Agent 团队：
```
my-team/
├── .codebuddy-plugin/
│   └── plugin.json        # 配置文件（必须）
├── avatars/               # 头像目录（必须）
├── agents/                # Agent 定义（必须）
│   ├── team-lead.md      # 主理人
│   ├── member-a.md        # 成员 A
│   └── member-b.md        # 成员 B
├── skills/                # 共享技能（可选）
├── .mcp.json              # 内置 MCP / 连接器依赖声明（可选）
├── bin/                   # 可执行文件（可选）
└── settings.json          # 设置主理人（必须）
```

### 2.5 连接器（Connector）定义
WorkBuddy 支持两种连接器：
1. **MCP 连接器**：`connector-meta.json` + `mcp.json` + `icon.svg` + `skills/`
2. **CLI 连接器**：`connector-meta.json` + `cli.json` + `icon.svg` + `skills/`

## 三、AgentSkills 系统模块分析（已核验）
当前系统架构：
- **前端**：React + Vite（SkillBrowser, Leaderboard, UserProfile, ProtocolDemo, DeployerDashboard）
- **服务层**：WalletService, ChainDataService, uploadService, ContractService
- **后端 API**：Express（/api/upload, /api/chain, /api/skills, /api/reputation, /api/leaderboard, /api/stats）
- **合约层**：SkillRegistry, Attribution, StakingManager, ReputationBadges, SelfSustainingEcosystem
- **链交互**：chainmaker-client（cmc 网关），chain-read（读），chain-submit（写）
- **审核引擎**：audit-agent.js + skill-runner.js + independence-scorer.js

## 四、技能拆分方案（核心设计）

### 4.1 拆分原则
1. **单一职责**：每个 SKILL 只做一件事，做到可独立安装、独立调用
2. **可组合**：SKILL 之间通过 WorkBuddy Agent 协作，形成专家智能体
3. **连接器隔离**：与后端/链交互的能力全部封装在连接器中，SKILL 不直接依赖后端细节
4. **渐进式披露**：元数据常驻、指令按需加载、参考资料按需加载

### 4.2 技能清单（7 个 SKILL + 1 个专家智能体 + 2 个连接器）

#### SKILL 1：skill-auditor（技能审计师）
**职责**：审计 .SKILL.md 文件，输出结构化审计报告
**触发词**：审计技能、技能合规检查、skill audit、安全扫描
**输入**：.SKILL.md 文件内容
**输出**：JSON 审计报告（passed, counts, tier1-4, recommendation）
**依赖**：independence-scorer.js（本地评分逻辑）
**scripts/**：
- `audit_runner.py`：调用现有 audit-agent.js 逻辑
**references/**：
- `AUDIT_CRITERIA.md`：审计标准（4 层检查）
- `GOVERNANCE_REQUIREMENTS.md`：治理字段要求

#### SKILL 2：skill-publisher（技能发布者）
**职责**：将技能打包为符合 WorkBuddy 标准的 .zip 包，并生成 manifest.yaml
**触发词**：发布技能、打包 skill、skill package
**输入**：技能目录路径
**输出**：.skill.zip 包 + manifest.yaml
**scripts/**：
- `packager.py`：打包逻辑
**references/**：
- `PACKAGE_SPEC.md`：打包规范

#### SKILL 3：skill-registry（技能注册官）
**职责**：调用后端 /api/upload → /api/chain 管线，完成技能上链注册
**触发词**：注册技能、上链、skill registry
**输入**：skillId, creator address
**输出**：txHash, skillId
**依赖**：MCP 连接器（见下文）
**scripts/**：
- `register.py`：调用后端 API

#### SKILL 4：reputation-analyst（声誉分析师）
**职责**：查询用户声誉、排行榜、技能统计
**触发词**：查询声誉、排行榜、reputation、leaderboard
**输入**：address 或 limit
**输出**：reputation JSON, leaderboard JSON
**依赖**：MCP 连接器
**scripts/**：
- `query_reputation.py`：查询声誉
- `query_leaderboard.py`：查询排行榜

#### SKILL 5：skill-browser（技能浏览器）
**职责**：浏览技能列表、搜索、查看详情
**触发词**：搜索技能、浏览 skill、技能列表
**输入**：page, pageSize, query
**输出**：技能列表 JSON
**依赖**：MCP 连接器
**scripts/**：
- `browse_skills.py`：浏览技能

#### SKILL 6：fingerprint-verifier（指纹验证器）
**职责**：计算技能文件的指纹（SHA-256 / keccak256），验证完整性
**触发词**：计算指纹、验证技能、fingerprint
**输入**：技能文件路径或内容
**输出**：fingerprint hash
**scripts/**：
- `compute_fingerprint.py`：计算指纹

#### SKILL 7：risk-classifier（风险分类器）
**职责**：根据技能内容自动评估风险等级（LOW/MEDIUM/HIGH/CRITICAL）
**触发词**：风险评估、风险分类、risk level
**输入**：.SKILL.md 内容
**输出**：RiskLevel + 风险因素列表
**scripts/**：
- `classify_risk.py`：风险分类

### 4.3 专家智能体：AgentSkills Team
**角色**：主理人（Team Lead），协调 7 个 SKILL 完成端到端技能生命周期管理

```
AgentSkills Team（专家智能体）
├── Team Lead（主理人）
│   └── 职责：理解用户意图，调度子技能，整合结果
├── Member: skill-auditor（审计师）
├── Member: skill-publisher（发布者）
├── Member: skill-registry（注册官）
├── Member: reputation-analyst（声誉分析师）
├── Member: skill-browser（浏览器）
├── Member: fingerprint-verifier（指纹验证器）
└── Member: risk-classifier（风险分类器）
```

**Team Lead 工作流**：
1. 用户说「我要发布一个技能」
2. Team Lead 调用 skill-auditor 审计
3. 调用 risk-classifier 评估风险
4. 调用 fingerprint-verifier 计算指纹
5. 调用 skill-publisher 打包
6. 调用 skill-registry 注册上链
7. 调用 reputation-analyst 查询发布者声誉
8. 整合结果，向用户报告

### 4.4 连接器设计

#### 连接器 1：AgentSkills Backend MCP Connector
**类型**：MCP Server
**职责**：封装所有后端 API 调用（/api/upload, /api/chain, /api/skills, /api/reputation, /api/leaderboard, /api/stats）
**mcp.json**：
```json
{
  "mcpServers": {
    "agentskills-backend": {
      "url": "http://localhost:10001",
      "transport": "streamableHttp",
      "headers": {
        "Authorization": "Bearer ${AGENTSKILLS_API_KEY}"
      }
    }
  }
}
```
**connector-meta.json**：
```json
{
  "name": "agentskills-backend",
  "version": "1.0.0",
  "type": "mcp",
  "description": "AgentSkills 后端 API 连接器，提供技能审计、注册、查询能力"
}
```

#### 连接器 2：AgentSkills Chain Connector
**类型**：MCP Server
**职责**：封装链上交互（通过后端网关 /api/chain 间接调用，不直接暴露私钥/证书）
**说明**：根据宪法约束，前端/ Skill 不直连链，所有链操作走后端网关
**mcp.json**：同连接器 1，但只暴露 /api/chain, /api/reputation, /api/stats

## 五、落盘目录结构
```
agentskills-workbuddy-package/
├── README.md
├── .codebuddy-plugin/
│   └── plugin.json
├── avatars/
│   ├── team-lead.png
│   ├── auditor.png
│   ├── publisher.png
│   ├── registry.png
│   ├── analyst.png
│   ├── browser.png
│   ├── verifier.png
│   └── classifier.png
├── agents/
│   ├── agentskills-team-lead.md
│   ├── skill-auditor.md
│   ├── skill-publisher.md
│   ├── skill-registry.md
│   ├── reputation-analyst.md
│   ├── skill-browser.md
│   ├── fingerprint-verifier.md
│   └── risk-classifier.md
├── skills/
│   ├── skill-auditor/
│   │   ├── SKILL.md
│   │   ├── references/
│   │   │   ├── AUDIT_CRITERIA.md
│   │   │   └── GOVERNANCE_REQUIREMENTS.md
│   │   └── scripts/
│   │       └── audit_runner.py
│   ├── skill-publisher/
│   │   ├── SKILL.md
│   │   ├── references/
│   │   │   └── PACKAGE_SPEC.md
│   │   └── scripts/
│   │       └── packager.py
│   ├── skill-registry/
│   │   ├── SKILL.md
│   │   └── scripts/
│   │       └── register.py
│   ├── reputation-analyst/
│   │   ├── SKILL.md
│   │   └── scripts/
│   │       ├── query_reputation.py
│   │       └── query_leaderboard.py
│   ├── skill-browser/
│   │   ├── SKILL.md
│   │   └── scripts/
│   │       └── browse_skills.py
│   ├── fingerprint-verifier/
│   │   ├── SKILL.md
│   │   └── scripts/
│   │       └── compute_fingerprint.py
│   └── risk-classifier/
│       ├── SKILL.md
│       └── scripts/
│           └── classify_risk.py
├── connectors/
│   ├── agentskills-backend-mcp/
│   │   ├── connector-meta.json
│   │   ├── mcp.json
│   │   ├── icon.svg
│   │   └── skills/
│   │       └── backend-client/
│   │           └── SKILL.md
│   └── agentskills-chain-mcp/
│       ├── connector-meta.json
│       ├── mcp.json
│       ├── icon.svg
│       └── skills/
│           └── chain-client/
│               └── SKILL.md
├── .mcp.json
└── settings.json
```

## 六、Grill-Down 钢铁人思辨

### 质疑 1：为什么不用一个超大 SKILL？
**反驳**：
- WorkBuddy 市场按 SKILL 分发、按 SKILL 搜索、按 SKILL 评分
- 一个超大 SKILL 会让用户面临「全有或全无」：只想用审计能力的用户也得打包整个前端
- 拆分后可按需组合：审计团队只装 skill-auditor + skill-registry，分析团队只装 reputation-analyst + skill-browser

### 质疑 2：专家智能体是不是多余的？WorkBuddy 已经能自动调度 SKILL
**反驳**：
- WorkBuddy 的自动调度基于 `description` 关键词匹配，是「被动触发」
- 专家智能体是「主动编排」：Team Lead 理解用户意图后，按工作流顺序调用子技能，整合结果
- 没有 Team Lead，用户需要自己依次调用 7 个 SKILL，体验断裂
- 专家智能体是 WorkBuddy 官方支持的功能（`.codebuddy-plugin/plugin.json` + `agents/`）

### 质疑 3：连接器是不是过度设计？能不能让 SKILL 直接调 HTTP？
**反驳**：
- 直接调 HTTP 会让每个 SKILL 都耦合后端 URL、认证方式、错误处理
- 连接器把「如何与 AgentSkills 系统交互」封装为统一接口
- 未来后端迁移（如从 ChainMaker chain1 迁到其他链），只需改连接器，不动 SKILL
- WorkBuddy 官方推荐用 MCP/CLI 连接器封装外部系统

### 质疑 4：后端代码怎么复用？
**反驳**：
- `audit-agent.js` 的 `runAudit(skillContent, skillName, locale)` 已经吃纯文本，返回 JSON
- 直接封装成 `skill-auditor/scripts/audit_runner.py`，输入 .SKILL.md 路径，输出 JSON
- `chain-read.js` 的 5 个端点（skills, reputation, leaderboard, stats）封装成 MCP 工具
- `chain-submit.js` 的 `submitToChain(job, locale, creator)` 封装成 skill-registry 的脚本
- 不需要重写业务逻辑，只做「调用适配」

### 质疑 5：前端怎么办？WorkBuddy 不需要前端
**反驳**：
- WorkBuddy 的「前端」就是 WorkBuddy 客户端本身
- 我们的 SKILL 是「能力层」，WorkBuddy 负责 UI 呈现
- 用户通过 WorkBuddy 对话界面调用 SKILL，结果直接返回对话流
- 不需要重复造前端，这是 WorkBuddy 的核心价值

### 质疑 6：open.workbuddy.cn 审核能过吗？
**反驳**：
- 审核三关：安全扫描 → AI 审核 → 人工抽检
- 安全扫描：我们的脚本无恶意代码，不窃取隐私，不执行危险操作（只读分析 + 调用自身上传流程）
- AI 审核：SKILL.md 描述准确，触发词明确，执行约定清晰
- 人工抽检：提供完整文档，说明数据来源（本地分析 / 自身上传流程），不涉及第三方数据外发
- 注意：需要选择「IT 科技 / 开发工具」分类，不选「金融」「政务」等敏感类目

### 质疑 7：宪法约束「无代币」怎么在 WorkBuddy 上体现？
**反驳**：
- SKILL 中不涉及任何代币转移逻辑
- reputation 只是积分展示，不涉及价值交换
- 连接器只读链上数据或触发自身上传流程，不涉及资金操作
- 符合 WorkBuddy 审核要求：「不包含恶意代码/隐私窃取」

## 七、实施路径

### Phase 1：最小可行发布（1 周）
- 打包 skill-auditor + skill-publisher + AgentSkills Team 专家智能体
- 实现 AgentSkills Backend MCP Connector（只读部分：/api/skills, /api/reputation, /api/leaderboard）
- 本地测试通过后，提交 open.workbuddy.cn 审核

### Phase 2：扩展能力（2 周）
- 增加 skill-registry（写路径：/api/upload + /api/chain）
- 增加 fingerprint-verifier + risk-classifier
- 完善 Team Lead 工作流

### Phase 3：生态扩展（持续）
- 增加更多子技能
- 优化 Team Lead 的意图理解能力
- 收集用户反馈迭代

## 八、风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| open.workbuddy.cn 审核不通过 | 先提交 skill-auditor（纯分析，无写操作），降低审核门槛 |
| 连接器认证复杂 | 先用本地测试模式，不强制要求 API Key |
| 用户不理解专家智能体 | 在 SKILL.md 中写清楚「如何调用 Team Lead」 |
| 后端依赖 ChainMaker 不可用 | 提供 demo 模式，返回模拟数据 |

## 九、第一性原理验证

### 问题：用户为什么要用 WorkBuddy 装 AgentSkills 的 SKILL？
**答案**：
1. **信任 deficit**：当前技能市场缺乏治理标准，用户需要可信的技能审计能力
2. **效率需求**：开发者需要快速验证技能合规性，而不是自己写规则
3. **链上追溯**：需要技能 fingerprint、声誉、贡献归因等能力，这些在现有平台不存在

### 问题：WorkBuddy 为什么要上架这些 SKILL？
**答案**：
1. 填补 WorkBuddy 技能市场的「治理/审计」空白
2. 展示 WorkBuddy 支持「企业级/专业级」Skill 的能力
3. 吸引研究社区、企业安全团队使用 WorkBuddy

### 问题：这个方案是否可持续？
**答案**：
- 是的。7 个 SKILL 各自独立演化，可单独迭代
- 专家智能体是 orchestration 层，可替换子技能实现而不影响上层
- 连接器隔离后端变化，未来可接入更多链/平台
