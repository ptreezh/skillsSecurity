---
name: attribution-auditor
display_name: "链上责任审计师"
display_name_en: "Attribution Auditor"
description: "审计技能链上责任配置，检查 Attribution 合约调用、责任归属、信用上链完整性"
description_zh: "审计技能链上责任配置，检查 Attribution 合约调用、责任归属、信用上链完整性"
description_en: "Audit skill on-chain attribution config: contract calls, responsibility assignment, credit anchoring"
category: "开发工具"
version: "1.0.0"
author: "AgentSkills Team"
---

# 链上责任审计师

## 技能简介

链上责任审计师是专门用于审计 AI 技能链上责任配置的工具。它检查技能是否正确配置了 Attribution 合约调用、责任归属字段和信用上链机制，确保技能在区块链上有完整的责任追溯和信用记录。

## 核心功能

### 1. 责任归属检查
- 检查 `attribution` frontmatter 字段
- 验证 `responsible_party` 地址有效性
- 验证 `reputation_recipient` 地址有效性

### 2. 链上合约检查
- 验证 `contract_address` 格式和有效性
- 检查 `chain_id` 是否支持
- 查询 SkillRegistry 确认 skill_id 已注册
- 验证 Attribution 合约状态

### 3. 信用上链检查
- 检查 reputation 计算规则是否定义
- 验证信用记录机制完整性
- 检查链上事件监听配置

### 4. 审计报告生成
- 输出结构化 JSON 报告
- 标记缺失/错误的责任字段
- 提供修复建议

## 审计流程

### 输入
- 技能文件路径或内容
- 可选：RPC 端点配置
- 可选：SkillRegistry 合约地址

### 执行步骤

1. **读取技能文件**
   - 定位 SKILL.md 文件
   - 解析 frontmatter 中的 attribution 字段

2. **责任归属字段检查**
   - 检查 `attribution.responsible_party` 是否存在
   - 验证地址格式（0x 开头的 40 位十六进制）
   - 检查 `attribution.reputation_recipient` 是否存在
   - 验证地址格式

3. **链上合约检查**
   - 验证 `attribution.contract_address` 格式
   - 检查 `attribution.chain_id` 是否有效
   - 查询 SkillRegistry 合约确认 `skill_id` 存在
   - 验证 Attribution 合约状态

4. **信用上链检查**
   - 检查是否包含 reputation 计算规则
   - 验证信用记录机制
   - 检查链上事件监听配置

5. **输出审计报告**
   - 生成结构化 JSON 报告
   - 标记缺失/错误字段
   - 提供修复建议

## 输出格式

```json
{
  "passed": true/false,
  "skill_name": "string",
  "skill_version": "string",
  "audit_time": "ISO8601",
  "attribution": {
    "configured": true/false,
    "contract_address": "string",
    "chain_id": "chain1",
    "skill_id": "string",
    "responsible_party": "string",
    "reputation_recipient": "string",
    "skill_registered": true/false,
    "contract_valid": true/false
  },
  "counts": {
    "critical": 0,
    "high": 0,
    "medium": 0,
    "low": 0
  },
  "errors": [],
  "warnings": [],
  "fix_suggestions": [],
  "recommendation": "approved|needs_review|rejected"
}
```

## 审计标准

### 责任归属字段
| 检查项 | 严重程度 | 说明 |
|--------|----------|------|
| attribution 字段存在 | high | frontmatter 必须包含 attribution |
| responsible_party 存在 | high | 责任方地址 |
| responsible_party 格式 | critical | 0x 开头的 40 位十六进制 |
| reputation_recipient 存在 | high | reputation 接收地址 |
| reputation_recipient 格式 | critical | 0x 开头的 40 位十六进制 |

### 链上合约检查
| 检查项 | 严重程度 | 说明 |
|--------|----------|------|
| contract_address 存在 | high | Attribution 合约地址 |
| contract_address 格式 | critical | 0x 开头的 40 位十六进制 |
| chain_id 存在 | medium | 目标链 ID |
| chain_id 有效 | high | 必须是支持的网络 |
| skill_id 存在 | high | SkillRegistry 中已注册 |
| skill_id 有效 | critical | skill_id 格式正确 |
| 合约状态正常 | high | Attribution 合约可调用 |

### 信用上链检查
| 检查项 | 严重程度 | 说明 |
|--------|----------|------|
| reputation 规则定义 | medium | 包含 reputation 计算规则 |
| 信用记录机制 | medium | 链上事件监听配置 |
| 评分维度完整 | low | 包含多维度评分 |

## 使用示例

### 示例 1: 审计单个技能的链上配置

用户说："审计 my-skill 的链上责任配置"

1. 读取 my-skill/SKILL.md
2. 解析 attribution 字段
3. 验证地址格式
4. 查询 SkillRegistry 确认 skill_id
5. 输出审计报告

### 示例 2: 批量审计技能目录

用户说："审计 skills/ 目录下所有技能的链上配置"

1. 遍历 skills/ 目录
2. 对每个技能执行链上责任审计
3. 生成汇总报告
4. 标记未配置链上责任的技能

### 示例 3: 验证链上状态

用户说："验证 my-skill 在链上的实际状态"

1. 读取 skill_id
2. 查询 SkillRegistry 合约
3. 检查 Attribution 记录
4. 对比 frontmatter 配置
5. 输出差异报告

## 触发词

链上责任审计、attribution 审计、责任归属检查、信用上链、skill registry 查询、chain attribution

## 前置要求

1. **RPC 访问**：需要能访问目标链的 RPC 端点
2. **合约地址**：需要 SkillRegistry 和 Attribution 合约地址
3. **技能注册**：技能必须在 SkillRegistry 中已注册

## 常见问题

### Q: 没有 attribution 字段会怎样？
A: 审计会标记为 `needs_review`，建议添加 attribution 配置。

### Q: skill_id 未注册会怎样？
A: 审计会标记为 `rejected`，必须先在 SkillRegistry 注册。

### Q: contract_address 格式错误？
A: 审计会标记为 `critical` 错误，必须修复为 0x 开头的 40 位十六进制。

### Q: 如何修复审计问题？
A: 根据 fix_suggestions 修复后，重新运行审计。
