# Phase 33：专家智能体编排层开发
> Milestone: v3.0 | Phase: 33 | Status: planning

## 需求映射
REQ-33：专家智能体编排

## 目标
实现 AgentSkills Team 专家智能体，支持通过自然语言触发端到端技能发布流程。

---

## Task 33-01：定义 Team Lead（主理人）

### 职责
理解用户意图，调度子技能，整合结果，向用户报告

### 文件
`agents/agentskills-team-lead.md`

### 设计
```markdown
# AgentSkills Team Lead

## 角色
你是 AgentSkills Team 的主理人，负责协调团队成员完成技能全生命周期管理。

## 团队成员
1. skill-auditor（审计师）：审计技能合规性
2. skill-publisher（发布者）：打包技能
3. skill-registry（注册官）：上链注册
4. reputation-analyst（声誉分析师）：查询声誉数据
5. skill-browser（浏览器）：浏览技能列表
6. fingerprint-verifier（指纹验证器）：计算文件指纹
7. risk-classifier（风险分类器）：评估风险等级

## 工作流

### 发布技能
当用户说「我要发布一个技能」「发布 skill」「上架技能」时：
1. 调用 skill-auditor 审计技能文件
2. 调用 risk-classifier 评估风险
3. 调用 fingerprint-verifier 计算指纹
4. 调用 skill-publisher 打包
5. 调用 skill-registry 注册上链
6. 调用 reputation-analyst 查询发布者声誉
7. 整合结果，向用户报告

### 查询技能
当用户说「搜索技能」「浏览 skill」「查看排行榜」时：
1. 调用 skill-browser 浏览/搜索技能
2. 或调用 reputation-analyst 查询排行榜
3. 整理结果，向用户报告

## 约束
- 不执行任何有副作用的操作（如删除、修改）未经用户确认
- 所有链上操作必须经过用户同意
- 优先使用本地 demo 模式，除非用户明确要求使用真实后端
```

### 验收标准
1. Team Lead 能正确识别「发布技能」意图
2. Team Lead 能按顺序调用 6 个子技能
3. Team Lead 能整合子技能结果，生成完整报告

---

## Task 33-02：定义 Member Agent 配置

### 文件
```
agents/
├── agentskills-team-lead.md
├── skill-auditor.md
├── skill-publisher.md
├── skill-registry.md
├── reputation-analyst.md
├── skill-browser.md
├── fingerprint-verifier.md
└── risk-classifier.md
```

### 每个 Member 的职责
- **skill-auditor.md**：声明使用 skill-auditor SKILL，触发词「审计技能」
- **skill-publisher.md**：声明使用 skill-publisher SKILL，触发词「打包技能」
- **skill-registry.md**：声明使用 skill-registry SKILL，触发词「注册技能」
- **reputation-analyst.md**：声明使用 reputation-analyst SKILL，触发词「查询声誉」
- **skill-browser.md**：声明使用 skill-browser SKILL，触发词「搜索技能」
- **fingerprint-verifier.md**：声明使用 fingerprint-verifier SKILL，触发词「计算指纹」
- **risk-classifier.md**：声明使用 risk-classifier SKILL，触发词「风险评估」

### 验收标准
1. 每个 Member 的 description 清晰，不与其他 Member 冲突
2. 每个 Member 能独立响应触发词

---

## Task 33-03：配置 .codebuddy-plugin/plugin.json

### 文件
`.codebuddy-plugin/plugin.json`

### 内容
```json
{
  "name": "AgentSkills Team",
  "version": "1.0.0",
  "description": "AgentSkills 专家团队，提供技能审计、发布、注册、查询等端到端能力",
  "teamLead": "agentskills-team-lead.md",
  "members": [
    "skill-auditor.md",
    "skill-publisher.md",
    "skill-registry.md",
    "reputation-analyst.md",
    "skill-browser.md",
    "fingerprint-verifier.md",
    "risk-classifier.md"
  ],
  "skills": [
    "skill-auditor",
    "skill-publisher",
    "skill-registry",
    "reputation-analyst",
    "skill-browser",
    "fingerprint-verifier",
    "risk-classifier"
  ]
}
```

### 验收标准
1. plugin.json 语法正确
2. WorkBuddy 能识别 Team Lead 和 Members

---

## Task 33-04：配置 settings.json

### 文件
`settings.json`

### 内容
```json
{
  "teamLead": "agentskills-team-lead.md",
  "defaultAgent": "agentskills-team-lead.md"
}
```

### 验收标准
1. settings.json 语法正确
2. WorkBuddy 能正确加载 Team Lead 作为默认 Agent

---

## 依赖
- Phase 31：技能包模板已建立
- Phase 32：7 个 SKILL 已实现

## 风险
| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| WorkBuddy Agent 调度不准确 | 中 | 高 | 在 SKILL.md 中明确触发词，减少歧义 |
| Team Lead 编排逻辑复杂 | 中 | 中 | 先实现最小工作流（发布技能），再扩展 |

## 工时估算
- Task 33-01：4 小时
- Task 33-02：3 小时
- Task 33-03：2 小时
- Task 33-04：1 小时
- **总计：10 小时**
