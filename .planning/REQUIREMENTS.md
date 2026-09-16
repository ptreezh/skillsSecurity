# Requirements: AgentSkills v2.0 端到端上线收官

**Defined:** 2026-09-16
**Goal:** 打通公网前端 → 后端 API → ChainMaker chain1 的完整生产链路，端到端可演示、可持续运行、有验收证据

**前序需求:** v1.1–v1.7 已全部交付（26 phases，归档见 `milestones/`）

## v2.0 Requirements

### E2E 端到端链路

- [ ] **E2E-01**: 用户从公网前端上传技能 → 后端审计 → chain1 上链（返回 tx 哈希与区块号）→ 技能出现在浏览列表，全程无本地手工步骤
- [ ] **E2E-02**: 技能浏览页展示 AS_SkillRegistry 真实链上技能（零 mock、零 Amoy 数据）
- [ ] **E2E-03**: 用户声誉档案页展示 AS_Staking 真实声誉（含锁定与可恢复值）
- [ ] **E2E-04**: 排行榜展示真实链上声誉排名（删除 getMockLeaderboard 回退）

### API 后端读路径

- [ ] **API-01**: GET /api/skills 返回链上技能列表（含风险等级/验证状态，支持分页）
- [ ] **API-02**: GET /api/skills/:id 返回单个技能详情
- [ ] **API-03**: GET /api/reputation/:address 返回声誉、锁定、可恢复信息
- [ ] **API-04**: GET /api/leaderboard 返回按声誉排序的地址排名
- [ ] **API-05**: GET /api/stats 返回协议级统计（技能总数/声誉总量/参与地址数）

### FE 前端接线

- [ ] **FE-01**: ContractService 重构为经后端 API 的数据层；`src/` 中零 Polygon Amoy 引用（80002 / rpc-amoy）
- [ ] **FE-02**: 挂在已废除 v1 合约上的页面（DeployerDashboard / DividendCalculator / DistributionHistory）改接 v2 AgentEcosystem / ReputationBadges 数据或明确降级提示
- [ ] **FE-03**: 前端网络标识与 deployments.json 一致（ChainMaker chain1，v2 合约地址）

### OPS 生产运行

- [ ] **OPS-01**: 后端 API 持久运行（restart: unless-stopped），/api/health 健康检查通过
- [ ] **OPS-02**: chainmaker-solo 与 cmc-debug 容器持久运行（restart 策略生效）
- [ ] **OPS-03**: 公网前端（GitHub Pages）指向生产后端地址并完成重新部署

### SEC 安全

- [ ] **SEC-14**: Slither 本地实跑，报告归档至 REPORTS/，高危清零或记录豁免理由
- [ ] **SEC-15**: Mythril 本地实跑，报告归档至 REPORTS/，高危清零或记录豁免理由

### QA 验收

- [ ] **QA-01**: npm test 全量通过（Hardhat，144 用例基线）
- [ ] **QA-02**: npm run test:chain 13/13 通过（活链 chain1）
- [ ] **QA-03**: 端到端实测留证：上传→审计→上链→浏览→声誉可见，输出/截图归档 REPORTS/
- [ ] **QA-04**: 上线就绪报告更新至 v2（总体就绪度 100%，端到端全绿）

## Out of Scope（本里程碑不做）

- 代币发行（宪法铁律：no tokens ever）
- 第三方付费审计（另行安排，不在工程环内）
- 正式域名 / 公网 VPS 采购（依赖托管决策；先以 GitHub Pages + 本机持久服务交付，见 ROADMAP Phase 29 GATE）

## Traceability

| Requirement | Phase | Plan |
|-------------|-------|------|
| API-01~05 | 27 | 27-01, 27-02 |
| FE-01~03, E2E-02~04 | 28 | 28-01~03 |
| OPS-01~03 | 29 | 29-01, 29-02 |
| SEC-14~15, QA-01~04, E2E-01 | 30 | 30-01, 30-02 |
