# Phase 02: 分类与验证标准 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-07
**Phase:** 02-classification-standards
**Areas discussed:** Risk examples, AI code boundary, Staking alignment, Verifier slash, Timeouts, Conflict resolution, Decision tree format

---

## Risk Examples (CLASS-01)

| Option | Description | Selected |
|--------|-------------|----------|
| 每个等级5个 | LOW/MEDIUM/HIGH/CRITICAL各5个示例，符合CLASS-01要求 | ✓ |
| 仅关键等级扩展 | 只为HIGH和CRITICAL增加示例 | |
| 保持现状 | 3个示例足够 | |

**User's choice:** 每个等级5个
**Notes:** Expand to minimum 5 examples per risk level

---

## AI Code Boundary (CLASS-02)

| Option | Description | Selected |
|--------|-------------|----------|
| 是，添加明确条款 | 添加AI生成代码的风险评估标准，处理边界情况 | ✓ |
| 否，依赖人工判断 | 保持灵活性，由人工判断处理特殊情况 | |

**User's choice:** 是，添加明确条款
**Notes:** Add explicit classification rules for AI-generated code; define boundary for AI-assisted vs AI-autonomous

---

## Staking Amount Alignment (CLASS-04)

| Option | Description | Selected |
|--------|-------------|----------|
| 更新文档对齐合约 | 文档改为10/50/100/200，与合约MIN_STAKE_*常量一致 | ✓ |
| 更新合约对齐文档 | 合约改为50/100/200/500 | |
| 重新定义对应关系 | 积分和ether是不同概念 | |

**User's choice:** 更新文档对齐合约
**Notes:** Document currently shows 50/100/200/500 but contract has 10/50/100/200. Update document to match contract.

---

## Verifier Slash Conditions (SEC-04)

| Option | Description | Selected |
|--------|-------------|----------|
| 是，完整定义 | 定义验证者被惩罚的条件、证据标准、申诉流程 | ✓ |
| 否，仅警告机制 | 验证者失职只记录声望下降，不实际扣除积分 | |

**User's choice:** 是，完整定义
**Notes:** Full definition of slash conditions including triggers, evidence requirements, appeal process

---

## Verification Timeouts (SEC-02)

| Option | Description | Selected |
|--------|-------------|----------|
| 沿用现有时间表 | LOW 7天, MEDIUM 5天, HIGH 3天, CRITICAL 1天 | ✓ |
| 需要调整时间 | 需要修改时间表 | |
| 你来决定 | 信任判断 | |

**User's choice:** 沿用现有时间表
**Notes:** Keep existing schedule from document section 3.2

---

## Conflict Resolution (SEC-03)

| Option | Description | Selected |
|--------|-------------|----------|
| 多数裁决 | 2/3以上同意视为通过，否则进入申诉或重新验证 | ✓ |
| 全部同意 | 所有验证者必须一致同意 | |
| 你来决定 | 信任判断 | |

**User's choice:** 多数裁决
**Notes:** 2/3 majority voting; re-review process with 3 options

---

## Decision Tree Format (CLASS-03)

| Option | Description | Selected |
|--------|-------------|----------|
| ASCII流程图 | 使用ASCII字符绘制，符合文档现有风格 | ✓ |
| Mermaid图表 | 使用Mermaid语法 | |
| 表格形式 | 使用表格列出判断条件 | |

**User's choice:** ASCII流程图
**Notes:** Follow existing document style (sections 3.1, 5.1 already use ASCII)

---

## Claude's Discretion

The following items are delegated to Claude/planner for implementation:
- Specific wording of AI-generated code classification clause
- Exact examples for each risk level (5 per level)
- Detailed checklist item wording for verification
- Specific evidence template format for verifier attestation

---

## Deferred Ideas

None — discussion stayed within phase scope

