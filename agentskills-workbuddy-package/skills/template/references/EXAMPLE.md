# 技能开发示例文档

## 示例：审计一个简单的技能

### 输入
一个简单的技能文件 `example-skill/SKILL.md`：

```yaml
---
name: example-skill
description: 一个示例技能
version: 1.0.0
author: Test Author
---
# 示例技能
这是一个简单的示例技能。
```

### 审计结果

| 检查项 | 结果 | 说明 |
|--------|------|------|
| frontmatter 完整性 | ✅ PASS | 包含所有必填字段 |
| YAML 语法 | ✅ PASS | 格式正确 |
| 描述清晰度 | ⚠️ WARNING | description 过于简单，建议补充触发词 |
| 脚本安全性 | ✅ PASS | 无脚本，无风险 |

### 结论
建议通过，但建议优化 description。
