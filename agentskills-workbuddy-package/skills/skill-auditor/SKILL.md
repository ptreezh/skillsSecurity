---
name: skill-auditor
display_name: 技能审计师
display_name_en: Skill Auditor
description: 审计 .SKILL.md 文件合规性，输出结构化审计报告
description_zh: 审计技能文件的合规性，检查字段完整性、安全风险、治理要求
description_en: Audit .SKILL.md compliance and output structured audit reports
category: 开发工具
version: 1.0.0
author: AgentSkills Team
---

# 技能审计师

## 技能简介

技能审计师是一个专门用于审计 AI 技能文件（SKILL.md）合规性的工具。它帮助开发者确保技能文件符合 WorkBuddy 平台标准，在发布前发现潜在问题，提升技能质量和安全性。

## 核心功能

### 1. 结构完整性检查
- 验证 SKILL.md 文件存在且格式正确
- 检查 frontmatter 必填字段是否齐全
- 确认目录结构符合规范（references/、scripts/、templates/）

### 2. 语法正确性检查
- YAML frontmatter 语法验证
- 冒号后空格规范检查
- 无中文全角字符混入
- Markdown 格式规范性

### 3. 内容质量检查
- description 长度合适（10-100 字符）
- version 符合 semver 格式
- category 在标准分类列表中
- 触发词完整性和有效性

### 4. 安全与治理检查
- 脚本无危险操作（rm -rf、删除文件、网络请求等）
- 无敏感信息泄露（API key、密码等）
- 治理字段完整性（如适用）
- 权限范围合理性

### 5. 链上责任检查（Tier 5）
- 责任归属字段完整性
- Attribution 合约调用检查
- 责任追溯字段检查
- 信用上链配置检查

## 审计流程

### 输入
- 技能文件路径或内容
- 可选：指定审计模式（strict/standard/lenient）
- 可选：区块链网络配置

### 执行步骤

1. **读取技能文件**
   - 定位 SKILL.md 文件
   - 解析 frontmatter 和正文内容

2. **结构完整性检查**
   - 验证 frontmatter 包裹格式
   - 检查必填字段：name, display_name, description, category, version, author
   - 验证目录结构完整性

3. **语法正确性检查**
   - YAML 语法解析验证
   - 冒号后空格检查
   - 中文字符混用检查
   - Markdown 格式规范性

4. **内容质量检查**
   - description 长度评估
   - version 格式验证
   - category 有效性验证
   - 触发词完整性检查

5. **安全与治理检查**
   - 脚本安全性扫描
   - 敏感信息检测
   - 权限范围评估
   - 治理字段检查

6. **链上责任检查（Tier 5）**
   - 检查 frontmatter 中是否包含 `attribution` 字段
   - 验证 `attribution.contract_address` 是否存在
   - 检查 `attribution.chain_id` 是否有效
   - 验证 `attribution.skill_id` 是否已注册
   - 检查正文中是否提及责任追溯机制
   - 验证信用上链配置完整性

7. **输出审计报告**
   - 生成结构化 JSON 报告
   - 提供修复建议
   - 给出通过/拒绝结论

## 输出格式

```json
{
  "passed": true/false,
  "skill_name": "string",
  "skill_version": "string",
  "audit_time": "ISO8601",
  "counts": {
    "critical": 0,
    "high": 0,
    "medium": 0,
    "low": 0
  },
  "tier1": {
    "name": "结构完整性",
    "errors": [],
    "warnings": []
  },
  "tier2": {
    "name": "语法正确性",
    "errors": [],
    "warnings": []
  },
  "tier3": {
    "name": "内容质量",
    "errors": [],
    "warnings": []
  },
  "tier4": {
    "name": "安全与治理",
    "errors": [],
    "warnings": []
  },
  "tier5": {
    "name": "链上责任",
    "errors": [],
    "warnings": []
  },
  "recommendation": "approved|needs_review|rejected",
  "message": "string",
  "fix_suggestions": []
}
```

## 审计标准详解

### Tier 1: 结构完整性
| 检查项 | 严重程度 | 说明 |
|--------|----------|------|
| SKILL.md 存在 | critical | 根目录必须包含 SKILL.md |
| frontmatter 完整 | critical | 必须被 --- 包裹 |
| name 字段存在 | critical | 全局唯一标识符 |
| display_name 存在 | high | 中文展示名 |
| description 存在 | high | 功能描述 |
| category 存在 | high | 分类标识 |
| version 存在 | medium | 版本号 |
| author 存在 | medium | 作者信息 |

### Tier 2: 语法正确性
| 检查项 | 严重程度 | 说明 |
|--------|----------|------|
| YAML 语法正确 | critical | 冒号后必须有空格 |
| 无中文全角字符 | medium | 避免全角冒号、引号 |
| Markdown 格式规范 | low | 标题层级、列表格式 |

### Tier 3: 内容质量
| 检查项 | 严重程度 | 说明 |
|--------|----------|------|
| description 长度 | medium | 建议 10-100 字符 |
| version 格式 | low | 符合 semver 规范 |
| category 有效性 | high | 必须在标准列表中 |
| 触发词完整性 | low | 至少包含 2-3 个触发词 |

### Tier 4: 安全与治理
| 检查项 | 严重程度 | 说明 |
|--------|----------|------|
| 脚本无危险操作 | critical | 禁止 rm -rf、删除文件 |
| 无敏感信息泄露 | critical | API key、密码等 |
| 权限范围合理 | high | 避免过度授权 |
| 治理字段完整 | medium | 如适用则必须填写 |

### Tier 5: 链上责任
| 检查项 | 严重程度 | 说明 |
|--------|----------|------|
| attribution 字段存在 | high | frontmatter 必须包含 attribution |
| contract_address 有效 | high | Attribution 合约地址 |
| chain_id 有效 | medium | 目标链 ID |
| skill_id 已注册 | high | SkillRegistry 中已注册 |
| 责任追溯字段完整 | medium | 包含责任方、reputation 接收地址 |
| 信用上链配置完整 | medium | 包含 reputation 计算规则 |

## 链上责任检查详解

### attribution frontmatter 字段
```yaml
---
name: my-skill
attribution:
  contract_address: "0x..."
  chain_id: "chain1"
  skill_id: "skill_xxx"
  responsible_party: "0x..."
  reputation_recipient: "0x..."
---
```

### 检查项说明

1. **attribution 字段存在**
   - 必须包含 attribution 对象
   - 包含至少 contract_address 和 chain_id

2. **contract_address 有效性**
   - 格式为 0x 开头的 40 位十六进制
   - 对应链上 Attribution 合约地址

3. **chain_id 有效性**
   - 必须是支持的网络 ID
   - 常见值：chain1（长安链 ChainMaker 私有链）

4. **skill_id 已注册**
   - 查询 SkillRegistry 合约
   - 确认 skill_id 存在且激活

5. **责任追溯字段**
   - responsible_party: 责任方地址
   - reputation_recipient: reputation 接收地址
   - 两者可为同一地址

6. **信用上链配置**
   - 是否包含 reputation 计算规则
   - 是否定义评分维度

## 审计结论

- **approved**: 通过，可直接发布
- **needs_review**: 需要修改后重新审计
- **rejected**: 严重问题，必须修复

## 使用示例

### 示例 1: 审计单个技能文件

用户说："审计这个技能文件 test.SKILL.md"

1. 读取 test.SKILL.md
2. 执行 5 层检查
3. 输出 JSON 报告
4. 向用户报告结果

### 示例 2: 批量审计技能目录

用户说："审计 skills/ 目录下所有技能"

1. 遍历 skills/ 目录
2. 对每个子目录执行审计
3. 生成汇总报告
4. 标记问题技能

### 示例 3: 审计模式选择

用户说："用严格模式审计 my-skill/"

1. 识别审计模式参数
2. 调整检查阈值
3. 执行增强检查
4. 输出详细报告

### 示例 4: 链上责任审计

用户说："审计 my-skill 的链上责任配置"

1. 检查 attribution 字段
2. 验证 contract_address
3. 查询 SkillRegistry 确认 skill_id
4. 输出链上责任报告

## 触发词

审计技能、技能合规检查、skill audit、安全扫描、audit skill、SKILL.md 检查、技能验证、skill verification、链上责任审计、attribution 审计

## 注意事项

1. **前置条件**：技能文件必须存在且可读
2. **权限要求**：读取技能目录和文件权限
3. **输出格式**：JSON 格式，便于程序处理
4. **建议流程**：审计 → 修复 → 重新审计 → 发布
5. **平台适配**：针对 WorkBuddy 平台标准设计
6. **链上配置**：需要配置 RPC 端点以验证链上状态
