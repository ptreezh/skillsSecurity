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

## 工作流程

1. 读取用户提供的 .SKILL.md 文件
2. 检查 frontmatter 必填字段（name, display_name, description, category, version, author）
3. 检查 YAML 语法（冒号后空格、引号使用）
4. 检查脚本安全性（scripts/ 目录下的代码）
5. 检查参考资料完整性（references/ 目录）
6. 输出结构化审计报告（JSON 格式）

## 输入
- 技能文件路径或内容

## 输出
```json
{
  "passed": true/false,
  "skill_name": "string",
  "counts": {
    "critical": 0,
    "high": 0,
    "medium": 0,
    "low": 0
  },
  "tier1": {"errors": [], "warnings": []},
  "tier2": {"errors": [], "warnings": []},
  "tier3": {"errors": [], "warnings": []},
  "tier4": {"errors": [], "warnings": []},
  "recommendation": "approved|needs_review|rejected",
  "message": "string"
}
```

## 审计标准

### Tier 1: 结构完整性
- SKILL.md 文件存在
- frontmatter 完整（--- 包裹）
- 必填字段齐全

### Tier 2: 语法正确性
- YAML 语法正确
- 冒号后空格
- 无中文全角字符

### Tier 3: 内容质量
- description 长度合适（10-100 字符）
- version 符合 semver 格式
- category 在标准列表中

### Tier 4: 安全与治理
- 脚本无危险操作（rm -rf、删除文件、网络请求等）
- 无敏感信息泄露（API key、密码等）
- 治理字段完整（如适用）

## 触发词
审计技能、技能合规检查、skill audit、安全扫描、audit skill

## 示例

用户说："审计这个技能文件 test.SKILL.md"
1. 读取 test.SKILL.md
2. 执行 4 层检查
3. 输出 JSON 报告
4. 向用户报告结果
