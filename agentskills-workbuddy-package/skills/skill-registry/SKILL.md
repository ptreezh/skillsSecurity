---
name: skill-registry
display_name: 技能注册器
display_name_en: Skill Registry
description: 将技能注册到 AgentSkills 后端，获取技能 ID 和链上指纹
description_zh: 将技能注册到后端系统，获取唯一标识和链上存证
category: 区块链
version: 1.0.0
author: AgentSkills Team
---

# 技能注册器

当用户需要注册技能到后端时，执行以下步骤：

## 工作流程

1. 验证技能已通过 skill-auditor 审计
2. 调用后端 API /api/skills/register 注册技能
3. 获取技能 ID 和链上交易哈希
4. 保存注册信息到本地缓存

## 输入
- 技能目录路径或 .zip 文件路径
- 后端 API 地址（默认 http://localhost:10001）

## 输出
```json
{
  "skill_id": "string",
  "tx_hash": "string",
  "status": "registered",
  "message": "string"
}
```

## 触发词
注册技能、skill register、上链、链上注册、register skill

## 注意事项
- 需要后端服务运行在 localhost:10001
- 注册前必须通过 skill-auditor 审计
- 链上交易不可篡改，请确认后再注册
