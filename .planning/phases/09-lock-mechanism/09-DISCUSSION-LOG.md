# Phase 9: 锁定机制实现 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-16
**Phase:** 09-lock-mechanism
**Areas discussed:** 正面贡献追踪机制, 功能解锁排除锁定金额, 跨合约声望一致性, 恢复触发检查时机

---

## 正面贡献追踪机制

| Option | Description | Selected |
|--------|-------------|----------|
| StakingManager 直接监听事件 | 内部直接检测贡献事件并设置标记。需要跨合约回调或事件监听。 | |
| 贡献合约调用 StakingManager | 每个贡献发生时，贡献合约主动调用 StakingManager.setPositiveContribution(user)。更解耦。 | ✓ |
| Admin 手动设置 | 管理员手动审核贡献后设置。适合复杂的质量判断场景。 | |

**User's choice:** 贡献合约调用 StakingManager
**Notes:** 解耦设计，贡献合约负责检测贡献并主动通知 StakingManager

---

### 贡献触发是否需要幂等性检查？

| Option | Description | Selected |
|--------|-------------|----------|
| 每次贡献都触发 | 任何贡献都触发标记，即使已设置。下次 claim 后重置。简单但可能多余调用。 | |
| 仅未设置时触发 | 检查 hasPositiveContribution，如果为 false 才设置。减少无效调用。 | ✓ |

**User's choice:** 仅未设置时触发
**Notes:** 幂等性检查减少无效的 SLOAD 操作

---

## 功能解锁排除锁定金额

| Option | Description | Selected |
|--------|-------------|----------|
| 新增 getEffectiveReputation() | 新增 getEffectiveReputation() 返回有效声望 = 总声望 - 锁定。现有代码逐步迁移使用新函数。 | |
| 修改调用点直接计算 | 在 SkillRegistry.registerSkill() 和 verifySkill() 中直接使用 getUserReputation() - lockedAmount。改动分散但无新函数。 | |
| 内联计算 | 检查声望是否达到阈值时，直接从总声望减去锁定金额。最小改动。 | ✓ |

**User's choice:** 内联计算
**Notes:** 最小化代码改动，在需要的地方直接计算

---

## 跨合约声望一致性

| Option | Description | Selected |
|--------|-------------|----------|
| Attribution 保持独立 | Attribution.sol 中的声望作为积分，不与锁定机制关联。锁定仅在 StakingManager 生效。 | ✓ |
| 同步到 StakingManager | Attribution.sol 引入 ReputationLock 并同步锁定逻辑。需要定期调用同步函数或事件监听。 | |
| 统一到 StakingManager | 统一声望存储在 StakingManager，Attribution 仅读取。不破坏现有架构但改动较大。 | |

**User's choice:** Attribution 保持独立
**Notes:** 两个声望系统完全解耦，简化设计

---

## 恢复触发检查时机

| Option | Description | Selected |
|--------|-------------|----------|
| 每次查询时动态计算 | 每次调用 getUserReputation() 时自动排除锁定金额。简单但 gas 开销较高。 | |
| 独立 canClaim() 函数 | 调用 canClaim() 单独检查资格。职责清晰但需额外函数调用。 | |
| 正面贡献时自动触发 | 首次设置正面贡献时自动检查并允许立即领取恢复。结合两种方式。 | ✓ |

**User's choice:** 正面贡献时自动触发
**Notes:** 用户体验最佳：贡献发生后立即可领取恢复

---

## Claude's Discretion

- 具体的事件监听实现细节
- 内联计算的代码位置选择
- 错误消息的具体措辞

## Deferred Ideas

None