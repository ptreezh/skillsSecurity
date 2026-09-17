# Roadmap: AgentSkills

## v1 Milestones（已归档）

- [x] v1.1 标准文档完善 — Phases 1-7（2026-05-15）
- [x] v1.2 技术债补齐 — Phases 8-10（2026-05-16）
- [x] v1.3 测试与部署 — Phases 11-19（2026-05-18）
- [x] v1.4 自主运营 — Phases 20-23（2026-05-21）
- [x] v1.5 安全加固 — Phase 24（2026-05-23）
- [x] v1.6 产品完善 — Phase 25（2026-05-23）
- [x] v1.7 测试对齐 — Phase 26（2026-05-25）

> v1 完整需求与阶段细节归档于 `milestones/v1.1-*` 至 `v1.7-*`。

---

## Current Milestone: v2.0 端到端上线收官

**Goal:** 公网前端 → 后端读/写 API → ChainMaker chain1 全链路打通，生产可用、可演示、有验收证据。

**背景:** 合约层已真实上链（v2 六合约，区块 28-53，13/13 验证全绿，见 `REPORTS/launch-readiness-report.md`）；断点在前端仍指向已废弃的 v1 合约 + Polygon Amoy RPC，后端无读端点，服务未持久化。

---

### Phase 27: 后端链上读路径 API ✅ Complete (2026-09-17)

**Requirements:** API-01, API-02, API-03, API-04, API-05
**Depends on:** 无（cmc 容器已恢复运行）

**Plans:**
- 27-01 chainmaker-client 读封装 — cmc 查询 AS_SkillRegistry / AS_Staking / AgentEcosystem（技能列表、声誉、排行、统计），含缓存与容错
- 27-02 REST 读端点 — /api/skills, /api/skills/:id, /api/reputation/:address, /api/leaderboard, /api/stats + 单元测试

**Success criteria:**
1. curl GET /api/skills 返回 chain1 真实技能数据（非空或明确的空态）
2. curl GET /api/reputation/0x3737f0d872f386f170c20e2ae73b81cfe6b7ecf3 返回部署者真实声誉
3. 读端点单元测试通过

---

### Phase 28: 前端接线重构

**Requirements:** FE-01, FE-02, FE-03, E2E-02, E2E-03, E2E-04
**Depends on:** Phase 27

**Plans:**
- 28-01 ChainDataService — 新 API 数据层替换 ContractService 直连（读写均经后端；写路径复用 /api/upload → /api/chain 管线）
- 28-02 页面改造 — SkillBrowser / UserProfile / Leaderboard / ProtocolDemo 接新数据层；DeployerDashboard / DividendCalculator / DistributionHistory 改接 v2（AgentEcosystem / ReputationBadges）或降级标注
- 28-03 去 Amoy 化清零 — 全 src/ 无 80002 / rpc-amoy 引用；网络标识统一 ChainMaker chain1

**Success criteria:**
1. `grep -r "80002\|rpc-amoy" src/` 零匹配
2. 技能浏览 / 排行榜 / 用户档案页展示链上真实数据（浏览器实测）
3. npm run build 通过，零构建错误

---

### Phase 29: 生产部署固化 ⚠️ GATE

**Requirements:** OPS-01, OPS-02, OPS-03
**Depends on:** Phase 28
**⚠️ 决策门:** 公网后端托管方案需用户拍板（选项：A 本机持久运行+内网穿透；B 云服务器部署 docker-compose；C 仅局域网演示+文档化公网方案）

**Plans:**
- 29-01 服务持久化 — chainmaker-solo / cmc-debug 容器 restart 策略；后端 compose 生产化（restart: unless-stopped）
- 29-02 前端生产接线 — VITE_API_URL 指向生产后端；GitHub Pages 重新部署（deploy-frontend.yml）

**Success criteria:**
1. docker ps 三服务 Up 且 restart 策略生效
2. 公网前端可请求到 /api/health（HTTP 200）
3. 重启宿主机后服务自动恢复（或记录等效持久化证明）

---

### Phase 30: 安全扫描与端到端验收

**Requirements:** SEC-14, SEC-15, QA-01, QA-02, QA-03, QA-04, E2E-01
**Depends on:** Phase 29

**Plans:**
- 30-01 安全扫描实跑 — Slither + Mythril 本地运行，报告归档 REPORTS/，高危清零或豁免记录
- 30-02 端到端验收 — npm test / test:chain 全绿；E2E 全流程实测（上传→审计→上链→浏览→声誉）留证；上线就绪报告 v2

**Success criteria:**
1. REPORTS/ 含 Slither 与 Mythril 报告，无未豁免高危发现
2. npm test 与 npm run test:chain 全部通过（实测输出留证）
3. E2E 证据链归档，上线就绪报告总体 100%

---

## Coverage 验证

| 分类 | 需求数 | 映射 Phase |
|------|--------|-----------|
| E2E | 4 | 28 (02-04), 30 (01) |
| API | 5 | 27 |
| FE | 3 | 28 |
| OPS | 3 | 29 |
| SEC | 2 | 30 |
| QA | 4 | 30 |
| **合计** | **21** | **100% 覆盖** |
