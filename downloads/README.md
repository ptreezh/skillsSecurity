# FreeSkill 元技能包

## 概述

这是 FreeAgentSkills 平台的元技能集，用于创建、升级和审核符合 FreeSkill 规范的技能。

---

## 文件说明

### freeskill-create.FREESKILL.md
创建符合 FreeSkill 规范的新技能。

**触发：** `create freeskill {name} with description {desc} and trigger {trigger}`

**功能：**
- 输入技能信息，自动生成 FreeSkill 治理字段
- 计算指纹：keccak256(ipfsHash + creator + timestamp)
- 输出完整 .FREESKILL.md 文件

---

### freeskill-upgrade.FREESKILL.md
将现有 AgentSkills 技能升级为 FreeSkill 规范。

**触发：** `upgrade skill {name} to freeskill with author {address}`

**功能：**
- 解析现有 .SKILL.md 文件
- 保留所有原始字段不变
- 自动添加 FreeSkill 治理字段

---

### freeskill-audit.FREESKILL.md
审计技能是否符合 FreeSkill 规范。

**触发：** `audit skill {name} for freeskill compliance`

**功能：**
- **Tier 1:** 检查是否符合 AgentSkills 基础规范
- **Tier 2:** 安全扫描（检测危险代码模式）
- **Tier 3:** 检查 FreeSkill 治理字段完整性

---

## 治理字段

每个 FreeSkill 包含：

| 字段 | 说明 |
|------|------|
| `freeskill.fingerprint` | 指纹 (keccak256) |
| `freeskill.stakeRequired` | 质押要求 (10/50/100/200 ether) |
| `responsibility.liabilityDeclaration` | 责任声明 |
| `responsibility.scopeDeclaration` | 权限边界 |
| `antiSlash.enabled` | 启用反噬 |
| `humanAuth.required` | 人类授权检查点 |

---

## 使用流程

```
1. freeskill-create    → 创建新技能
2. freeskill-upgrade  → 升级现有技能
3. freeskill-audit    → 审核合规性
```

---

**版本：** 1.0.0
**依据：** FreeSkill Standard v1.0