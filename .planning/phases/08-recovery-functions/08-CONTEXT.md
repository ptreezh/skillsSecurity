# Phase 8: 恢复函数实现 - Context

**Gathered:** 2026-05-15
**Status:** Ready for planning

<domain>
## Phase Boundary

实现 `getRecoverableReputation()` 和 `claimRecoverableReputation()` 函数，为惩罚后的声望恢复提供合约级支持。

</domain>

<decisions>
## Implementation Decisions

### ReputationLock Struct
- **D-01:** `ReputationLock` struct with two fields:
  - `lockedAmount`: 当前锁定的声望金额
  - `lastClaimTime`: 上次领取恢复的时间戳（uint256）

### Locked Reputation Handling
- **D-02:** `getUserReputation()` 返回有效声望 = `userReputation - lockedAmount`
  - 锁定金额存储在 `ReputationLock.lockedAmount`
  - 调用者使用返回值进行投票/功能判断

### Recovery Eligibility
- **D-03:** 用户必须有自上次领取后的正面贡献才能领取恢复
  - 需要在合约层面追踪正面贡献事件
  - 简单布尔检查（是否有贡献）

### Recovery Calculation
- **D-04:** 每月恢复公式：`originalSlash × 5% × months elapsed`
  - 基于原始惩罚金额计算
  - 恢复速度恒定，不随剩余金额递减

### Function Signatures
- **D-05:** `getRecoverableReputation(address _user)` 返回 `(lockedAmount, lastClaimTime)`
- **D-06:** `claimRecoverableReputation()` 执行领取逻辑

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Main document
- `SKILLS_STANDARD.md` — 规范文档
  - Section 6.4: 惩罚恢复流程（含公式和规则）
  - Section 6.2: 接口兼容性说明（指出缺失的函数）

### Prior phase context
- `.planning/phases/04-anti-slash-reputation/04-CONTEXT.md` — 声望系统决策
  - Recovery rate: 5% per month
  - No lockout period
  - Must have positive contributions

### Contract reference
- `contracts/StakingManager.sol` — 质押管理合约
  - 当前 userReputation mapping
  - slashLiker() 函数
  - 需要添加新结构和新函数

</canonical_refs>

<codebase_context>
## Existing Code Insights

### Reusable Assets
- `userReputation` mapping (int256) — 已存在的基础声望存储
- `onlyOwner` modifier — 用于管理函数权限

### Established Patterns
- struct 定义风格（带注释的中文）
- 事件命名惯例（驼峰式）
- mapping 存储模式

### Integration Points
- 新 ReputationLock mapping 需与 slashLiker() 配合
- 新函数需与现有声望系统集成

</codebase_context>

<specifics>
## Specific Ideas

- "锁定金额不计入可投票声望" — 影响 getUserReputation() 返回值
- "5% 每月恢复" — 明确公式为 originalSlash × 5% × months
- "无锁定期" — 惩罚后立即可开始累积恢复

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-recovery-functions*
*Context gathered: 2026-05-15*