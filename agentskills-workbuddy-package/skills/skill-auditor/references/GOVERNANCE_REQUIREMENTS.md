# 治理字段要求（Governance Requirements）

## 背景

AgentSkills.io 规范定义了 6 个功能字段，但治理字段为 0。本参考文档定义补充治理字段的要求。

## 推荐治理字段

### 1. responsibility_declaration（责任声明）

**描述**：技能创建者对技能行为承担责任声明

**格式**：
```yaml
responsibility_declaration: "本技能仅用于教育目的，不用于生产环境。使用者需自行承担风险。"
```

**要求**：建议填写，明确责任边界

---

### 2. audit_trail（审计追踪）

**描述**：技能变更历史记录

**格式**：
```yaml
audit_trail:
  - version: "1.0.0"
    date: "2026-09-24"
    author: "AgentSkills Team"
    changes: "初始版本"
```

**要求**：可选，建议维护

---

### 3. permission_scope（权限范围）

**描述**：技能需要的最小权限

**格式**：
```yaml
permission_scope:
  - file_system: read
  - network: none
  - system: none
```

**要求**：建议填写，帮助用户评估风险

---

### 4. impact_assessment（影响评估）

**描述**：技能执行可能产生的影响

**格式**：
```yaml
impact_assessment:
  data_modification: false
  external_communication: false
  system_change: false
```

**要求**：建议填写，帮助用户理解风险

---

## 治理字段检查清单

- [ ] responsibility_declaration 已填写
- [ ] audit_trail 已维护（至少包含当前版本）
- [ ] permission_scope 已定义
- [ ] impact_assessment 已评估

## 与 AgentSkills.io 的关系

- AgentSkills.io 基础字段：name, description, trigger, metadata, scripts, resources
- 治理字段：以上 4 个字段为补充建议
- 兼容性：治理字段不影响 AgentSkills.io 兼容性，可选择性添加
