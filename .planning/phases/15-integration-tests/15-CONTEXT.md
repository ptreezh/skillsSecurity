# Phase 15: Integration Tests - Context

**Gathered:** 2026-05-17
**Status:** Ready for planning

<domain>
## Phase Boundary

跨合约流程端到端验证。测试所有合约的集成，确保：
1. 全量部署验证
2. 声望流程完整性 (register → verify → positive contribution → recovery)
3. 反惩罚流程完整性 (like → slash → lock → recover)
4. 跨合约状态同步

</domain>

<decisions>
## Implementation Decisions

### Test Organization
- **D-01:** 创建 `test/contracts/Integration.test.cjs` 集成测试文件
- **D-02:** 使用 `deployContracts` fixture from `test/fixtures.cjs`

### Integration Test Scope (INTG-01 ~ INTG-04)

#### INTG-01: Full Deployment Verification
- **D-03:** 部署顺序: ASKToken → StakingManager → SkillRegistry → Attribution
- **D-04:** 验证每个合约的 address 非空
- **D-05:** 验证 dependency wiring 正确 (SkillRegistry → StakingManager, Attribution → StakingManager)

#### INTG-02: Reputation Flow
- **D-06:** registerSkill (需满足声望门槛)
- **D-07:** verifySkill with pass=true → StakingManager.setPositiveContribution
- **D-08:** 正面贡献后，hasPositiveContribution = true
- **D-09:** 验证 getRecoverableReputation 增加

#### INTG-03: Anti-Slash Flow
- **D-10:** 用户质押 (满足最小质押额)
- **D-11:** otherUser 调用 likeSkill (触发 hasLiked)
- **D-12:** registerSkill 后 verifySkill with evidence
- **D-13:** slashLiker → lockedAmount 增加, effective reputation 下降
- **D-14:** 90天解锁期后 unstake → lockedAmount 清零

#### INTG-04: Cross-Contract State Sync
- **D-15:** SkillRegistry.getUserReputation 调用 StakingManager
- **D-16:** Attribution.addTestReport score>0 → StakingManager.setPositiveContribution
- **D-17:** 所有状态变更事务验证 event 发射

### Test Patterns (from Phase 12/13/14)
- **D-18:** Chai expect 断言风格
- **D-19:** BDD `describe/it` 描述结构
- **D-20:** 使用 setEffectiveReputation 测试助手注入声望
- **D-21:** accounts[N] 索引访问不同用户避免冲突

### Reputation Thresholds (from Phase 14)
- **D-22:** MEDIUM skill: 500+ effective reputation
- **D-23:** HIGH skill: 2000+ effective reputation
- **D-24:** CRITICAL skill: 5000+ effective reputation

### Time Manipulation (from Phase 13)
- **D-25:** 使用 evm_increaseTime + evm_mine 推进时间
- **D-26:** unlockDuration 设置为 90 天 (7776000 秒)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements
- `.planning/ROADMAP.md` — Phase 15 success criteria
- `.planning/REQUIREMENTS.md` — INTG-01 ~ INTG-04

### Testing Infrastructure
- `test/fixtures.cjs` — existing fixture system with `deployContracts()`
- `test/contracts/StakingManager.test.cjs` — Phase 13 patterns (slash, lock, recover)
- `test/contracts/SkillRegistry.test.cjs` — Phase 14 patterns (register, verify)
- `test/contracts/Attribution.test.cjs` — Phase 14 patterns (addContribution, likeSkill)

### Contracts Under Test
- `contracts/ASKToken.sol` — ERC20 token
- `contracts/StakingManager.sol` — staking, slash, lock, recover
- `contracts/SkillRegistry.sol` — skill registration, verification, reputation gates
- `contracts/Attribution.sol` — contribution tracking, cross-contract notifications

### Test Helpers
- `contracts/StakingManager.sol` — setEffectiveReputation (test-only)
- `contracts/StakingManager.sol` — setPositiveContribution (cross-contract call from Attribution)

</canonical_refs>

<codebase_context>
## Existing Code Insights

### Reusable Assets
- `test/fixtures.cjs` — `deployContracts()` fixture 可直接复用
- Phase 12/13/14 的测试模式可直接应用

### Contract Integration Points
- SkillRegistry constructor: (token, stakingManager)
- Attribution needs setStakingManager() call after deployment
- Attribution.setPositiveContribution calls StakingManager

### Key State Variables
- StakingManager: userReputation[user], lockedAmount[user], hasPositiveContribution[user]
- SkillRegistry: verifiedSkills[skillId], skills[skillId]
- Attribution: skillContributions[skillId], skillLikes[skillId]

</codebase_context>

<specifics>
## Specific Ideas

- Integration tests should be comprehensive but not redundant with unit tests
- Focus on cross-contract flows, not re-testing internal contract logic
- Time-based unlock needs evm_increaseTime(7776000) for 90 days

</specifics>

<deferred>
## Deferred Ideas

None — integration tests cover the complete cross-contract flows

</deferred>

---
*Phase: 15-integration-tests*
*Context gathered: 2026-05-17*