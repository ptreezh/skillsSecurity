# Roadmap: AgentSkills

## Milestones

- [x] **v1.1 标准文档完善** - Phases 1-7 (shipped 2026-05-15)
- [x] **v1.2 技术债补齐** - Phases 8-10 (shipped 2026-05-16)
- [x] **v1.3 测试与部署** - Phases 11-19 (shipped 2026-05-18)
- [ ] **v1.4 自主运营** - Phases 20-23 (planning)

---

## Milestones Summary

### v1.1 标准文档完善 (Phases 1-7)

**Shipped:** 2026-05-15
**Requirements:** 32/32 complete

---

### v1.2 技术债补齐 (Phases 8-10)

**Shipped:** 2026-05-16
**Requirements:** 11/11 complete

**Resolved:**
- Recovery functions implemented
- Reputation lock mechanism complete

---

### v1.3 测试与部署 (Phases 11-19)

**Shipped:** 2026-05-18
**Requirements:** 28/28 complete

---

### v1.4 自主运营 (Phases 20-23)

**In progress**
**Goal:** 完善已部署的四自系统组件，移除代币依赖，完成无 token 架构

---

## Phases

- [x] **Phase 11: 测试基础设施** - Hardhat 环境配置、测试框架、fixtures (completed 2026-05-17)
- [x] **Phase 12: ASKToken 单元测试** - 代币功能完整测试 (completed 2026-05-17)
- [x] **Phase 13: StakingManager 单元测试** - 质押/惩罚/恢复测试 (completed 2026-05-17)
- [x] **Phase 14: SkillRegistry + Attribution 单元测试** - 声望/归因功能测试 (completed 2026-05-18)
- [x] **Phase 15: 集成测试** - 跨合约流程端到端验证 (completed 2026-05-17)
- [ ] **Phase 16: Polygon Amoy 部署** - 配置、部署、验证
- [x] **Phase 17: 前端 UI 设计** - 设计系统、组件库 (completed 2026-05-18)
- [x] **Phase 18: 合约连接** - 接入真实合约 (completed 2026-05-18)
- [x] **Phase 19: 四自系统集成** - DeployerRewards x 自运营/自推广/自进化/自运维 (completed 2026-05-18)
- [x] **Phase 20: DeployerRewards 完善** - 前端面板 + 测试覆盖 (completed 2026-05-18)
- [x] **Phase 21: 四自系统 UI 完善** - 数据可视化 + 交互优化 (completed 2026-05-20)
- [x] **Phase 22: 无代币核心基础设施** - RevenueSplit, ReputationBadges, 合约禁用 (completed 2026-05-20)
- [x] **Phase 23: 无 Token 核心重构** - 移除核心合约对 ASKToken 的依赖，完成无 token 架构 (completed 2026-05-21)

---

## Phase Details

### Phase 11: 测试基础设施

**Goal**: 测试环境就绪，测试框架和 fixtures 可用

**Depends on**: Nothing

**Requirements**: TEST-01, TEST-02, TEST-03

**Success Criteria** (what must be TRUE):
  1. Hardhat chai-matchers, network-helpers, verify 插件安装并正常工作
  2. Test fixtures 按正确顺序部署: StakingManager -> SkillRegistry -> Attribution
  3. Mocha 测试运行器配置覆盖报告功能
  4. 覆盖率报告可以为所有合约生成

**Plans**: 3 plans in 1 wave

Plan list:
- [x] 11-01-PLAN.md - Install plugins and update network config
- [x] 11-02-PLAN.md - Create test fixtures with deployment order

---

### Phase 12: ASKToken 单元测试

**Goal**: ASKToken 代币合约功能完整覆盖

**Depends on**: Phase 11

**Requirements**: ASKT-01, ASKT-02, ASKT-03, ASKT-04

**Success Criteria** (what must be TRUE):
  1. Only owner/minter can mint tokens (access control verified)
  2. Burning tokens correctly reduces user balance
  3. Delegation updates vote weight tracking
  4. Mint, Burn, Delegate events emit with correct parameters

**Plans**: 1 plan in 1 wave

Plan list:
- [x] 12-01-PLAN.md - ASKToken unit tests (Mint, Burn, Delegate, Events)

---

### Phase 13: StakingManager 单元测试

**Goal**: StakingManager 质押合约功能完整覆盖

**Depends on**: Phase 12

**Requirements**: STAK-01, STAK-02, STAK-03, STAK-04, STAK-05

**Success Criteria** (what must be TRUE):
  1. Stake locks tokens for configured period
  2. Unstake releases tokens after lock expires
  3. Slash mechanism validates evidence before penalizing
  4. Reputation lock excludes locked amount from voting power
  5. Time-based unlock (90-day period) works with evm_increaseTime + evm_mine

**Plans**: 3 plans in 1 wave

Plan list:
- [x] 13-01-PLAN.md - StakingManager stake/unstake tests (STAK-01, STAK-05)
- [x] 13-02-PLAN.md - Slash/reputation lock/recovery tests (STAK-02, STAK-03, STAK-04)

---

### Phase 14: SkillRegistry + Attribution 单元测试

**Goal**: SkillRegistry 和 Attribution 合约功能完整覆盖

**Depends on**: Phase 13

**Requirements**: SKIL-01, SKIL-02, SKIL-03, SKIL-04, ATTR-01, ATTR-02, ATTR-03, ATTR-04

**Success Criteria** (what must be TRUE):
  1. Reputation tier gates (L1-L5) enforce correctly based on thresholds
  2. Fingerprint generation produces consistent hashes for verification
  3. Skill verification request -> approval flow completes end-to-end
  4. Attribution creation tracks contributor and contribution value
  5. Like mechanism prevents double-liking same contribution
  6. Cross-contract notification triggers StakingManager correctly
  7. setPositiveContribution() marks contribution and triggers recovery

**Plans**: 3 plans in 1 wave

Plan list:
- [x] 14-01-PLAN.md - SkillRegistry unit tests (SKIL-01 to SKIL-04)
- [x] 14-02-PLAN.md - Attribution unit tests (ATTR-01 to ATTR-04)

---

### Phase 15: 集成测试

**Goal**: 跨合约流程端到端验证完成

**Depends on**: Phase 14

**Requirements**: INTG-01, INTG-02, INTG-03, INTG-04

**Success Criteria** (what must be TRUE):
  1. Full deployment with correct dependency wiring verifies all contracts
  2. Reputation flow: register -> verify -> positive contribution -> recovery works end-to-end
  3. Anti-slash flow: like -> slash -> lock -> recover completes successfully
  4. Cross-contract state synchronization maintains consistency

**Plans**: 3 plans in 1 wave

Plan list:
- [x] 15-01-PLAN.md - Integration test fixtures
- [x] 15-02-PLAN.md - End-to-end integration tests

---

### Phase 16: Polygon Amoy 部署

**Goal**: 合约部署到 Polygon Amoy 测试网并验证

**Depends on**: Phase 15

**Requirements**: DEPL-01, DEPL-02, DEPL-03, DEPL-04

**Success Criteria** (what must be TRUE):
  1. hardhat.config.js configured for Polygon Amoy (chainId 80002, Mumbai removed)
  2. deploy-all.js script deploys all contracts with correct order and wiring
  3. Contracts deployed and accessible on Polygon Amoy testnet
  4. Contracts verified on Polygonscan using hardhat-verify

**Plans**: 3 plans in 1 wave

Plan list:
- [ ] 16-01-PLAN.md - Configure Polygon Amoy network
- [ ] 16-02-PLAN.md - Deploy and verify contracts

---

### Phase 17: 前端 UI 设计

**Goal**: 设计系统、组件库

**Depends on**: Phase 16

**Success Criteria**: Design system complete, components built

**Plans**: Complete (6/6)

---

### Phase 18: 合约连接

**Goal**: 接入真实合约

**Depends on**: Phase 17

**Success Criteria**: Frontend connects to real contracts on Polygon Amoy

**Plans**: Complete (1/1)

---

### Phase 19: 四自系统集成

**Goal**: DeployerRewards x 自运营/自推广/自进化/自运维

**Depends on**: Phase 18

**Success Criteria**: Four-self system components implemented

**Plans**: Complete (5/5)

---

### Phase 20: DeployerRewards + RevenueDistributor 完善

**Goal**: 完善已部署的激励合约，添加前端面板和测试

**Depends on**: Phase 19

**Requirements**: OPS-01, OPS-02, OPS-03

**Success Criteria** (what must be TRUE):
  1. RevenueDistributor 前端面板（显示分红历史、待领取金额）
  2. DeployerRewards 完整测试（覆盖率 > 80%）
  3. 分红计算器（预估月收入）

**Plans**: 3 plans in 1 wave
- [x] 20-01-PLAN.md - DeployerRewards governance tests + ContractService extension
- [x] 20-02-PLAN.md - SelfOpsPanel integration + dividend calculator

---

### Phase 21: 四自系统 UI 完善

**Goal**: 完善 SelfOpsPanel 前端组件，添加数据可视化

**Depends on**: Phase 20

**Requirements**: OPS-04, OPS-05, OPS-06

**Success Criteria** (what must be TRUE):
  1. 自运营面板（收益图表、分红历史）
  2. 自推广面板（推广效果追踪、排名）
  3. 自进化面板（提案列表、投票历史）
  4. 自运维面板（报告记录、奖励统计）

**Plans**: 3 plans in 1 wave
- [x] 21-01-PLAN.md - Create foundation (ABIs, hooks, common components)
- [x] 21-02-PLAN.md - Implement chart components for all four tabs
- [x] 21-03-PLAN.md - Gap closure (governance list, health buttons, tab switching)

---

### Phase 22: 无代币核心基础设施

**Goal**: 重构为无代币架构 - 区块链 + 声誉系统 + 服务分账

**Depends on**: Phase 21

**Requirements**: OPS-07, OPS-08, OPS-09

**Success Criteria** (what must be TRUE):
  1. RevenueSplit 合约完成（服务费分账，无代币）
  2. ReputationBadges 合约完成（链上声誉徽章，不可转让）
  3. 移除/禁用代币相关合约（ASKToken, DeployerRewards, RevenueDistributor）
  4. 合规性确认（无代币 = 全球可服务）

**Plans**: 2 plans in 2 waves

**Plan list:**
- [x] 22-01-PLAN.md - Core contracts (RevenueSplit, ReputationBadges, SelfSustainingEcosystem)
- [x] 22-02-PLAN.md - Deprecate token contracts and update existing contracts

---

### Phase 23: 无 Token 核心重构

**Goal**: 移除核心合约对 ASKToken 的依赖，完成无 token 架构

**Depends on**: Phase 22

**Requirements**: NO-TOKEN-01, NO-TOKEN-02, NO-TOKEN-03, NO-TOKEN-04, NO-TOKEN-05, NO-TOKEN-06, NO-TOKEN-07

**Success Criteria** (what must be TRUE):
  1. StakingManager 不再依赖 ASKToken（移除 token 字段和所有 token 调用）
  2. SkillRegistry 不再依赖 ASKToken（移除 token 字段）
  3. 核心合约使用纯声誉系统替代代币质押
  4. 所有测试通过

**Plans**: 3 plans in 2 waves

**Plan list:**
- [x] 23-01-PLAN.md - Refactor StakingManager to remove ASKToken dependency
- [x] 23-02-PLAN.md - Refactor SkillRegistry to remove ASKToken dependency
- [x] 23-03-PLAN.md - Update tests and verify contracts work without token

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-7 | v1.1 | 100% | Complete | 2026-05-15 |
| 8-10 | v1.2 | 100% | Complete | 2026-05-16 |
| 11 | v1.3 | 2/2 | Complete | 2026-05-17 |
| 12 | v1.3 | 1/1 | Complete | 2026-05-17 |
| 13 | v1.3 | 2/2 | Complete | 2026-05-17 |
| 14 | v1.3 | 2/2 | Complete | 2026-05-18 |
| 15 | v1.3 | 2/2 | Complete | 2026-05-17 |
| 16 | v1.3 | 0/2 | Not started | - |
| 17-19 | v1.3 | 6/6 | Complete | 2026-05-18 |
| 20 | v1.4 | 2/2 | Complete | 2026-05-18 |
| 21 | v1.4 | 3/3 | Complete | 2026-05-20 |
| 22 | v1.4 | 2/2 | Complete | 2026-05-20 |
| 23 | v1.4 | 3/3 | Complete    | 2026-05-21 |

---

*Roadmap created: 2026-05-16*
*Last updated: 2026-05-21 after Phase 23 planning*