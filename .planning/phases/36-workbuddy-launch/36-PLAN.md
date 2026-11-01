# Phase 36：open.workbuddy.cn 上架与审核
> Milestone: v3.0 | Phase: 36 | Status: planning

## 需求映射
REQ-36：open.workbuddy.cn 上架

## 目标
完成实名认证，打包提交至少 1 个 SKILL + AgentSkills Team 专家智能体，通过审核并成功上架。

已完成：
- agentskills-auditor-1.0.0.zip 提交审核（审核中）
- agentskills-publisher-1.0.0.zip 提交审核（审核中）
- 新增 workbuddy-skill-deployer 技能（上架流程沉淀）
- 新增 attribution-auditor 技能（链上责任审计）
- 更新 skill-auditor 加入 Tier 5 链上责任检查

---

## Task 36-01：准备上架材料

### 材料清单
1. **Skill 包**：skill-auditor + skill-publisher + attribution-auditor + workbuddy-skill-deployer
2. **AgentSkills Team 专家智能体**
3. **icon.svg**：技能图标（512x512）
4. **README.md**：使用说明、触发词、示例
5. **分类选择**：IT 科技 / 开发工具
6. **服务类目**：工具 > 计算器/查件

### 验收标准
1. 所有材料准备齐全
2. README.md 包含完整的触发词示例
3. icon.svg 符合规范（SVG 格式，清晰可辨识）

---

## Task 36-02：完成实名认证

### 步骤
1. 访问 open.workbuddy.cn
2. 注册账号
3. 提交实名认证（个人认证即可，个人认证可发布 Skill 和专家）
4. 等待认证通过

### 验收标准
1. 账号认证状态为「已认证」
2. 获得发布权限

---

## Task 36-03：更新已提交技能（如需要）

### 背景
已提交的 skill-auditor 和 skill-publisher 缺少详细介绍，需更新后重新提交。

### 步骤
1. 更新 skill-auditor SKILL.md（加入 Tier 5 链上责任检查）
2. 更新 skill-publisher SKILL.md（加入 manifest.yaml 详解）
3. 重新打包
4. 通过 bsk 重新上传

### 验收标准
1. SKILL.md 包含完整的技能介绍和使用示例
2. 链上责任检查维度已加入
3. 包可正常上传和解析

---

## Task 36-04：提交审核

### 步骤
1. 进入「发布团队 Skill」
2. 选择发布类型（免费版）
3. 上传 Skill 包（.zip）
4. 填写基本信息（名称、描述、分类、触发词）
5. 提交审核

### 验收标准
1. 提交成功，获得审核 ID
2. 审核状态可追踪

---

## Task 36-04：审核跟进与问题修复

### 流程
1. 关注审核结果（安全扫描 → AI 审核 → 人工抽检）
2. 如被拒绝，根据反馈修改
3. 重新提交

### 常见被拒原因及修复
| 被拒原因 | 修复方案 |
|----------|----------|
| YAML 格式错误 | 使用 skill-lint.py 检查 |
| 缺少触发词 | 在 description 中明确触发词 |
| 脚本有安全风险 | 移除危险操作，添加说明 |
| 描述不准确 | 根据实际能力修改 description |

### 验收标准
1. 审核通过（或明确知道修改方向）
2. 所有问题已修复

---

## Task 36-05：上架后验证

### 验证清单
1. 在 WorkBuddy 技能市场搜索「AgentSkills」或「技能审计」
2. 安装 skill-auditor
3. 触发「审计技能」，验证能正常调用
4. 安装 AgentSkills Team 专家智能体
5. 触发「我要发布一个技能」，验证完整流程

### 验收标准
1. 技能可被搜索到
2. 技能可正常安装和调用
3. 专家智能体可正常编排

---

## 依赖
- Phase 35：本地端到端验证通过
- 后端 API 已部署并可达（如需要）

## 风险
| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| 审核周期长（7 个工作日） | 高 | 中 | 提前准备材料，尽早提交 |
| 审核不通过 | 中 | 高 | 先提交 skill-auditor（纯分析，无写操作），降低门槛 |
| 实名认证失败 | 低 | 高 | 确保个人信息真实有效 |
| 服务类目选择困难 | 中 | 中 | 使用键盘操作 ArrowDown/Right/Enter |
| name 冲突 | 中 | 低 | 加前缀如 agentskills-xxx |

## 工时估算
- Task 36-01：2 小时
- Task 36-02：1 小时
- Task 36-03：1 小时
- Task 36-04：4 小时（含可能的修改重提）
- Task 36-05：2 小时
- **总计：10 小时（不含审核等待时间）**

## 后续迭代
- 审计师增加 Tier 5 链上责任检查
- 新增 attribution-auditor 技能
- 新增 workbuddy-skill-deployer 技能（沉淀上架流程）
- 更新 skill-publisher 增加 manifest.yaml 生成
