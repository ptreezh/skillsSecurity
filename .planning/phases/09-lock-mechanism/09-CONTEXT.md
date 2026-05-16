# Phase 9: 锁定机制实现 - Context

**Gathered:** 2026-05-16
**Status:** Ready for planning

<domain>
## Phase Boundary

完成声望锁定和恢复逻辑，确保锁定金额不计入投票权和功能解锁。Phase 8 已实现 `getRecoverableReputation()` 和 `claimRecoverableReputation()` 函数的基础逻辑，本阶段补充正面贡献追踪和锁定机制集成。

</domain>

<decisions>
## Implementation Decisions

### 正面贡献追踪机制
- **D-01:** 贡献合约主动调用 `StakingManager.setPositiveContribution(user)` 设置标记
- **D-02:** `setPositiveContribution()` 执行幂等性检查：`require(!hasPositiveContribution[user], "Already set")`
- **D-03:** 贡献类型包括：创建通过验证的技能、成功验证他人技能、报告有效漏洞、修复已有技能问题

### 功能解锁排除锁定金额
- **D-04:** 功能解锁检查时采用内联计算：`effectiveReputation = userReputation - reputationLocks[user].lockedAmount`
- **D-05:** 现有调用点（SkillRegistry.registerSkill()、verifySkill() 等）需修改为使用内联计算
- **D-06:** 投票权计算同样使用内联排除方式

### 跨合约声望一致性
- **D-07:** Attribution.sol 保持独立的声望系统（积分），不与 StakingManager 锁定机制关联
- **D-08:** 锁定机制仅在 StakingManager 中生效，Attribution.sol 不受锁定影响

### 恢复触发检查时机
- **D-09:** `setPositiveContribution()` 内部自动检查恢复资格并允许立即领取
- **D-10:** `claimRecoverableReputation()` 的 `require(hasPositiveContribution[msg.sender])` 检查由正面贡献事件自动触发重置

### 具体函数实现
- **D-11:** 新增 `setPositiveContribution(address user)` 函数（external, onlyOwner）
- **D-12:** 修改 SkillRegistry 质押检查函数，使用内联计算排除锁定金额
- **D-13:** 修改 Attribution.addTestReport()，贡献成功后调用 StakingManager.setPositiveContribution()

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Main document
- `SKILLS_STANDARD.md` — 规范文档
  - Section 6.4: 惩罚恢复流程（含锁定机制说明）
  - Section 7.2-7.3: 声望系统计算规则

### Prior phase context
- `.planning/phases/08-recovery-functions/08-CONTEXT.md` — Phase 8 决策
  - ReputationLock struct 定义
  - 恢复函数签名
  - 5% 每月恢复公式

### Contract reference
- `contracts/StakingManager.sol` — 当前实现
  - `ReputationLock` struct 和 `reputationLocks` mapping
  - `getRecoverableReputation()` 和 `claimRecoverableReputation()` 函数
  - `originalSlashAmount` 和 `hasPositiveContribution` mappings
- `contracts/SkillRegistry.sol` — 需修改调用点
  - `registerSkill()` 中的质押检查
  - `MIN_STAKE_*` 常量
- `contracts/Attribution.sol` — 需添加贡献通知
  - `addTestReport()` 函数
  - `addContribution()` 函数

</canonical_refs>

<codebase_context>
## Existing Code Insights

### Reusable Assets
- `ReputationLock` struct — Phase 8 已实现
- `RECOVERY_RATE_PER_MONTH = 500` 常量 — 5% basis points
- `onlyOwner` modifier — 用于管理函数权限
- `uint256 public constant` 模式 — 用于阈值定义

### Established Patterns
- struct 定义风格（带注释的中文）
- NatSpec 文档注释
- 事件命名惯例（驼峰式）
- require-revert 错误处理

### Integration Points
- `setPositiveContribution()` 需从 Attribution.sol 调用
- `setPositiveContribution()` 需从 SkillRegistry.sol 调用（验证技能后）
- 功能解锁检查需使用内联计算替换现有 `getUserReputation()` 调用

</codebase_context>

<specifics>
## Specific Ideas

- "锁定金额不计入可投票声望" — 必须内联计算
- "Attribution 保持独立" — 两个合约的声望系统完全解耦
- "正面贡献时自动触发" — 贡献发生立即可领取恢复，无需额外操作

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-lock-mechanism*
*Context gathered: 2026-05-16*