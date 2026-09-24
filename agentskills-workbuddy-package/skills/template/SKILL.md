---
name: template
display_name: 模板技能
display_name_en: Template Skill
description: 这是一个模板技能，展示 WorkBuddy 技能包的标准结构
description_zh: 模板技能，用于展示 WorkBuddy 技能包的标准结构和字段要求
description_en: Template skill demonstrating standard WorkBuddy skill package structure
category: 开发工具
version: 1.0.0
author: AgentSkills Team
---

# 模板技能

这是一个模板技能，用于展示 WorkBuddy 技能包的标准结构。

## 使用方法

当用户需要了解如何创建 WorkBuddy 技能时，执行以下步骤：

1. 查看本文件的 frontmatter，了解必填字段
2. 查看 `references/` 目录下的文档，了解详细规范
3. 查看 `scripts/` 目录下的脚本，了解可执行代码示例
4. 查看 `templates/` 目录下的模板，了解模板文件使用

## 技能结构

```
template/
├── SKILL.md              # 技能定义文件（本文件）
├── references/           # 参考资料
│   └── EXAMPLE.md        # 示例文档
├── scripts/              # 可执行脚本
│   └── example.py        # Python 示例脚本
└── templates/            # 模板文件
    └── example.json      # JSON 模板
```

## 注意事项

- frontmatter 中的必填字段：name, display_name, description, category, version, author
- YAML 格式要求：冒号后必须有空格，不要使用中文全角引号
- 脚本必须可独立运行，不依赖前端/浏览器环境
