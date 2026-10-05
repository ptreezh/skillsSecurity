---
name: skill-registry
display_name: 技能注册器
display_name_en: Skill Registry
description: 将技能注册到 AgentSkills 后端，获取技能 ID 和链上指纹
description_zh: 将技能注册到后端系统，获取唯一标识和链上存证
description_en: Register skills to the AgentSkills backend and obtain skill ID and on-chain fingerprint
category: 区块链
version: 1.1.0
author: AgentSkills Team
---

# 技能注册器

将技能提交至 AgentSkills 后端的审计队列。脚本分两个阶段：**离线准备**（无需后端）与**上传审计**（需后端地址 + 令牌）。

## 后端依赖（无硬编码）

脚本不再内置任何服务器地址。调用方必须显式提供：

| 项目 | 命令行参数 | 环境变量 | 必需场景 |
|------|-----------|---------|---------|
| 后端地址 | `--url` | `AGENTSKILLS_API_URL` | 上传审计阶段 |
| 访问令牌 | `--token` | `AGENTSKILLS_API_TOKEN` | 上传审计阶段 |

若未提供后端地址，脚本**自动降级为离线 prepare**：仅打包并计算 SHA256 指纹，不触网，并在结果中说明后续步骤。

## 工作流程

1. 确认技能已通过 `skill-auditor` 审计
2. 调用脚本；无后端时得到离线指纹（`status: prepared`）
3. 配置后端后重跑，脚本以 `multipart/form-data` 上传至 `POST /api/upload`
4. 从返回中取 `jobId`，轮询 `GET /api/status/:jobId` 获取审计结果
5. 审计通过后，**另行**调用 `POST /api/chain` 完成链上存证（本脚本不代为执行）

## 输入

- 技能目录路径或 `.zip` 文件路径
- 后端地址（可选；缺省则离线降级）
- 访问令牌（上传阶段必需）

## 输出

离线准备阶段：

```json
{
  "status": "prepared",
  "skill_name": "skill-registry",
  "sha256": "64 位十六进制字符串",
  "size_bytes": 12345,
  "registered": false,
  "next_step": "设置 $AGENTSKILLS_API_URL 与 $AGENTSKILLS_API_TOKEN 后重跑"
}
```

上传审计阶段：

```json
{
  "status": "uploaded",
  "skill_name": "skill-registry",
  "sha256": "64 位十六进制字符串",
  "job_id": "审计任务 ID",
  "status_endpoint": "https://your-backend/api/status/<jobId>",
  "note": "链上存证需单独调用 POST /api/chain"
}
```

失败时 `status` 为 `error`，并附带 `error` 字段说明原因。

## 调用示例

```bash
# 离线准备（无需后端）
python scripts/register_runner.py skills/skill-registry/

# 通过环境变量上传
export AGENTSKILLS_API_URL="https://your-backend"
export AGENTSKILLS_API_TOKEN="<bearer-token>"
python scripts/register_runner.py skills/skill-registry/

# 通过参数上传
python scripts/register_runner.py skills/skill-registry/ \
  --url "https://your-backend" \
  --token "<bearer-token>"
```

## 触发词

注册技能、skill register、上链、链上注册、register skill

## 注意事项

- `POST /api/upload` 与 `POST /api/chain` 均要求 Bearer 令牌，缺少令牌会直接失败而非静默降级
- 上传成功仅代表进入审计队列，**不等于**已上链
- 注册前必须通过 `skill-auditor` 审计
- 链上交易不可篡改，请确认后再提交存证
