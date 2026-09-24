# Phase 32：核心技能开发（3 个）
> Milestone: v3.0 | Phase: 32 | Status: planning

## 需求映射
REQ-32：核心技能开发（skill-auditor, skill-publisher, skill-registry）

## 目标
实现 3 个核心 SKILL，覆盖「审计 → 打包 → 注册」端到端最小流程，可作为独立产品发布到 WorkBuddy。

---

## Task 32-01：skill-auditor（技能审计师）

### 职责
审计 .SKILL.md 文件，输出结构化审计报告

### 文件结构
```
skills/skill-auditor/
├── SKILL.md
├── references/
│   ├── AUDIT_CRITERIA.md
│   └── GOVERNANCE_REQUIREMENTS.md
└── scripts/
    └── audit_runner.py
```

### SKILL.md 设计
```yaml
---
name: skill-auditor
display_name: 技能审计师
display_name_en: Skill Auditor
description: 审计 .SKILL.md 文件合规性，输出结构化审计报告
description_zh: 审计技能文件的合规性，检查字段完整性、安全风险、治理要求
category: 开发工具
version: 1.0.0
author: AgentSkills Team
---
# 技能审计师
当用户需要审计技能文件时，执行以下步骤：
1. 读取用户提供的 .SKILL.md 文件
2. 检查 frontmatter 必填字段
3. 检查脚本安全性
4. 输出审计报告
```

### scripts/audit_runner.py
**输入：** .SKILL.md 文件路径
**输出：** JSON 审计报告
```json
{
  "passed": true/false,
  "counts": {"critical": 0, "high": 0, "medium": 0, "low": 0},
  "tier1": {"errors": [], "warnings": []},
  "tier2": {"errors": [], "warnings": []},
  "tier3": {"errors": [], "warnings": []},
  "tier4": {"errors": [], "warnings": []},
  "recommendation": "approved|needs_review|rejected"
}
```

### 验收标准
1. 审计一个合规的 .SKILL.md → `passed: true`
2. 审计一个缺字段的 .SKILL.md → `passed: false`，指出缺失字段
3. 审计一个含危险脚本的 .SKILL.md → `passed: false`，指出安全风险
4. 脚本可独立运行：`python scripts/audit_runner.py <file>`

---

## Task 32-02：skill-publisher（技能发布者）

### 职责
将技能打包为符合 WorkBuddy 标准的 .zip 包，并生成 manifest.yaml

### 文件结构
```
skills/skill-publisher/
├── SKILL.md
├── references/
│   └── PACKAGE_SPEC.md
└── scripts/
    └── packager.py
```

### SKILL.md 设计
```yaml
---
name: skill-publisher
display_name: 技能发布者
display_name_en: Skill Publisher
description: 将技能目录打包为 WorkBuddy 标准 .zip 包
description_zh: 将技能打包为符合 WorkBuddy 规范的安装包
category: 开发工具
version: 1.0.0
author: AgentSkills Team
---
# 技能发布者
当用户需要发布技能时，执行以下步骤：
1. 检查技能目录结构完整性
2. 校验 SKILL.md frontmatter
3. 生成 manifest.yaml
4. 打包为 .zip
```

### scripts/packager.py
**输入：** 技能目录路径
**输出：** .skill.zip 文件 + manifest.yaml
**逻辑：**
1. 校验目录结构（SKILL.md 存在）
2. 解析 SKILL.md frontmatter
3. 生成 manifest.yaml
4. 打包为 zip（排除敏感文件）

### 验收标准
1. 打包 `skills/template/` → 生成有效 .zip
2. .zip 内 SKILL.md 在根级或子目录
3. manifest.yaml 包含 name, version, description, category, author
4. 脚本可独立运行：`python scripts/packager.py <dir>`

---

## Task 32-03：skill-registry（技能注册官）

### 职责
调用后端 /api/upload → /api/chain 管线，完成技能上链注册

### 文件结构
```
skills/skill-registry/
├── SKILL.md
└── scripts/
    └── register.py
```

### SKILL.md 设计
```yaml
---
name: skill-registry
display_name: 技能注册官
display_name_en: Skill Registry
description: 调用后端 API 完成技能上链注册
description_zh: 将技能注册到 AgentSkills 链上
category: 区块链
version: 1.0.0
author: AgentSkills Team
---
# 技能注册官
当用户需要注册技能时，执行以下步骤：
1. 检查后端服务可用性
2. 上传技能文件到 /api/upload
3. 轮询审核状态
4. 审核通过后调用 /api/chain 上链
5. 返回 txHash 和 skillId
```

### scripts/register.py
**输入：** 技能文件路径，creator address（可选）
**输出：** JSON 结果
```json
{
  "success": true/false,
  "status": "on_chain|approved|review|rejected|failed",
  "skillId": "skill-xxx",
  "txHash": "0x...",
  "message": "..."
}
```

**逻辑：**
1. 调用 `POST /api/upload`（multipart/form-data）
2. 轮询 `GET /api/status/:jobId`（每 2 秒，最多 60 次）
3. 如果 approved → 调用 `POST /api/chain`
4. 返回最终结果

### 验收标准
1. 上传一个合规技能 → 返回 `on_chain` + skillId + txHash
2. 上传一个不合规技能 → 返回 `rejected` + 原因
3. 脚本可独立运行：`python scripts/register.py <file> [creator_address]`
4. 支持 demo 模式：`--demo` 返回模拟数据

---

## 依赖
- Phase 31：技能包模板已建立
- 后端 API 已实现（/api/upload, /api/chain, /api/status/:jobId）

## 风险
| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| 后端 API 不可用 | 中 | 高 | 提供 demo 模式，返回模拟数据 |
| 审核逻辑复杂 | 中 | 中 | 复用现有 audit-agent.js 逻辑，不重写 |
| WorkBuddy 脚本执行环境限制 | 低 | 中 | 只使用标准库，避免依赖复杂环境 |

## 工时估算
- Task 32-01：6 小时
- Task 32-02：4 小时
- Task 32-03：6 小时
- **总计：16 小时**
