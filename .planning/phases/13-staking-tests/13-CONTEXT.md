# Phase 13: StakingManager 单元测试 - Context

**Gathered:** 2026-05-17
**Status:** Ready for planning

<domain>
## Phase Boundary

StakingManager 质押合约功能完整测试覆盖。包括 stake/unstake、slash、reputation lock、recovery 机制验证。

</domain>

<decisions>
## Implementation Decisions

### Test Organization
- **D-01:** 模块化结构 — 每个功能区域一个独立 describe 块
- **D-02:** 文件位置：`test/contracts/StakingManager.test.cjs`
- **D-03:** 使用 `deployContracts` fixture from `test/fixtures.cjs`

### Assertion Style (from Phase 12)
- **D-04:** Chai expect 断言风格
- **D-05:** BDD `describe/it` 描述结构
- **D-06:** 与 Phase 12 ASKToken 测试保持风格一致

### Test Structure (per STAK requirements)
- **D-07:** STAK-01: Stake/Unstake 测试 + lock period revert + no stake revert
- **D-08:** STAK-02: Slash 测试 + insufficient stake revert
- **D-09:** STAK-03: Reputation lock 测试 + getUserReputation 验证
- **D-10:** STAK-04: Recovery 测试 + getRecoverableReputation/claimRecoverableReputation
- **D-11:** STAK-05: 时间测试 — evm_increaseTime + evm_mine 验证 90 天 unlock

### Coverage Strategy
- **D-12:** 标准覆盖 — 所有功能测试，边界值验证
- **D-13:** Access control 测试 — onlyOwner modifier 验证
- **D-14:** Event 测试 — Staked, Unstaked, Slash, RecoveryClaimed 事件

### Time Manipulation (STAK-05 specific)
- **D-15:** 使用 `evm_increaseTime` 和 `evm_mine` 模拟时间流逝
- **D-16:** 验证 `lockedUntil` 时间戳后的 unstake 行为

### Reputation Lock Tests
- **D-17:** 测试 `userReputation` 和 `lockedAmount` 的交互
- **D-18:** 测试 `getUserReputation()` 返回 `total - locked` 的逻辑
- **D-19:** 测试 `getRecoverableReputation()` 返回正确结构

### Recovery Mechanism Tests
- **D-20:** 测试 5% 每月恢复速率
- **D-21:** 测试 `hasPositiveContribution` 要求
- **D-22:** 测试 `setPositiveContribution()` 调用
- **D-23:** 测试 recovery 不能超过 locked amount

### Event Testing
- **D-24:** 使用 chai-matchers `emit` + `withArgs` 验证事件参数

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements
- `.planning/ROADMAP.md` — Phase 13 success criteria (stake, unstake, slash, lock, unlock)
- `.planning/REQUIREMENTS.md` — STAK-01 ~ STAK-05 requirements

### Testing Infrastructure
- `test/fixtures.cjs` — existing fixture system with `deployContracts()`
- `test/contracts/ASKToken.test.cjs` — Phase 12 test patterns (reference for style consistency)
- `.planning/codebase/TESTING.md` — testing patterns and chai usage

### Contract Under Test
- `contracts/StakingManager.sol` — StakingManager contract with stake, slash, lock, recover

### Hardhat Config
- `hardhat.config.js` — network config, solidity settings
- `package.json` — hardhat-chai-matchers, hardhat-network-helpers installed

</canonical_refs>

<codebase_context>
## Existing Code Insights

### Reusable Assets
- `test/fixtures.cjs` — `deployContracts()` fixture 可直接复用
- `deployContracts` 返回 `{ token, staking, registry, attribution, owner, user1, user2, accounts }`
- ASKToken.test.cjs 中的测试模式可直接应用到 StakingManager

### Established Patterns
- fixtures.cjs 使用 `loadFixture` + async function pattern
- ASKToken.test.cjs 使用 `describe/it` + `expect` + `loadFixture`
- ethers.getSigners() 提供 [owner, user1, user2, ...accounts]

### Integration Points
- StakingManager 构造函数需要 ASKToken address
- Test file 在 `test/contracts/` 目录

</codebase_context>

<specifics>
## Specific Ideas

- 90 天 lock period: `lockedUntil: block.timestamp + 90 days`
- Time 测试需要 hardhat-network-helpers 的 evm_increaseTime
- Reputation recovery: 5% 每月，基于 originalSlashAmount
- Positive contribution 要求在 recovery 之前满足

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 13-staking-tests*
*Context gathered: 2026-05-17*