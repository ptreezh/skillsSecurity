---
name: skill-publisher
display_name: 技能发布器
display_name_en: Skill Publisher
description: 将技能目录打包为符合 WorkBuddy 标准的 zip 包，并生成 manifest.yaml
description_zh: 将技能目录打包为符合 WorkBuddy 标准的 zip 包
category: 开发工具
version: 1.0.0
author: AgentSkills Team
---

# 技能发布器

当用户需要打包并发布技能时，执行以下步骤：

## 工作流程

1. 验证技能目录结构（SKILL.md、references/、scripts/、templates/）
2. 运行 skill-lint 检查合规性
3. 生成 manifest.yaml
4. 打包为 .zip 文件
5. 输出发布清单

## 输入
- 技能目录路径

## 输出
- .zip 文件路径
- manifest.yaml 内容
- 发布清单（文件列表、大小、校验和）

## 触发词
打包技能、发布技能、skill publish、打包为 zip、publish skill

## 注意事项
- 必须先通过 skill-auditor 审计
- zip 包内必须包含 manifest.yaml
- 不包含敏感信息（API key、密码等）
