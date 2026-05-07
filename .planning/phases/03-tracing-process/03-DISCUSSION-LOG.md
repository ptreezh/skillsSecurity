# Phase 03: 追溯与流程标准 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-07
**Phase:** 03-tracing-process
**Areas discussed:** Audit Trail Events, IPFS Storage Format, State Machine, Error Codes

---

## Audit Trail Events

| Option | Description | Selected |
|--------|-------------|----------|
| 完整事件链 | 记录所有关键操作：创建、提交、验证、批准、拒绝、上链、调用 | ✓ |
| 精简事件链 | 只记录生命周期事件：创建、验证结果、上链、反噬 | |
| 风险级别差异化 | 可配置的审计级别，LOW技能最小记录，CRITICAL全部记录 | |

**User's choice:** 完整事件链

---

## IPFS Storage Format

| Option | Description | Selected |
|--------|-------------|----------|
| JSON Schema | 标准化 JSON 结构，完整字段定义，便于验证者解析 | |
| 动态 Schema | 结构灵活，允许不同 skill 类型自定义字段，但验证更复杂 | |
| 混合存储 | 分离：基础信息在链上，可验证信息在 IPFS，便于快速验证 | ✓ |

**User's choice:** 混合存储
**Rationale:** Fast on-chain queries + complete off-chain verification data

---

## State Machine

| Option | Description | Selected |
|--------|-------------|----------|
| 基本状态机 | 当前：Draft→Pending→Verifying→Approved/Rejected→Active | |
| 详细状态机 | 添加 DRAFT_SAVED, VERIFICATION_EXPIRED, UNDER_APPEAL 等中间状态 | |
| 核心+子状态 | 保持核心状态不变，但为每个状态添加子状态 | ✓ |

**User's choice:** 核心+子状态

---

## Error Codes

| Option | Description | Selected |
|--------|-------------|----------|
| 模块化错误码 | 错误码格式：模块前缀+序号，如 REG_001, VAL_001, CHN_001 | ✓ |
| 风险分级错误码 | 按风险等级分组错误：LOW_xxx, MED_xxx, HIGH_xxx, CRIT_xxx | |
| 语义化错误码 | 简要描述性错误码：INVALID_STAKE, TIMEOUT_EXCEEDED, VERIFIER_CONFLICT | |

**User's choice:** 模块化错误码

---

## Claude's Discretion

- Gas cost measurement approach (use Hardhat gas reporter)
- Exact sub-state names and transition conditions
- Appeal committee selection mechanism (beyond 3 elders requirement)

## Deferred Ideas

None

---

*Generated: 2026-05-07*