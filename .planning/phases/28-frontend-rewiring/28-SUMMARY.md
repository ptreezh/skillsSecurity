# Phase 28 Summary: 前端接线重构

**完成日期：** 2026-09-18
**状态：** ✅ Complete（3/3 plans，3/3 成功标准满足）

## 目标

前端从「ethers.js 直连已废弃 v1 合约 + Polygon Amoy RPC」整体切换为「一切链上读写经后端网关访问 ChainMaker chain1」，清除代币经济 UI 残留（无代币宪法）。

## 交付物

| 文件 | 变更 | Commit |
|------|------|--------|
| `src/services/ChainDataService.js` | 新建：后端 API 数据层（读 5 端点 + UI 映射纯函数 + 网络标识统一 chain1） | 见 git log |
| `src/services/WalletService.js` | 重写：纯身份层内嵌钱包（去 ethers/去合约初始化/去 ASK 空投） | 同上 |
| `src/services/ContractService.jsx` | **删除**（1043 行 ethers 直连层，v1 ABI 含 ASKToken 代币合约） | 同上 |
| `src/components/SkillBrowser.jsx` | 接 `fetchSkills`；点赞改本地乐观（chain1 无点赞概念） | 同上 |
| `src/pages/UserProfile.jsx` | 四合一 `fetchReputation`；ASK 余额卡 → 可恢复声誉卡（宪法 §4） | 同上 |
| `src/pages/Leaderboard.jsx` | 接 `fetchLeaderboard`（等级/技能数映射） | 同上 |
| `src/pages/ProtocolDemo.jsx` | 技能/声誉/合约地址表改经 API；去代币余额卡 | 同上 |
| `src/pages/DeployerDashboard.jsx` | 改接 v2 AgentEcosystem 真链统计（`/api/stats`） | 同上 |
| `src/pages/SelfOpsPanel.jsx` | v1 代币经济 tab 降级标注；晋升榜接真链排行 | 同上 |
| `src/components/DividendCalculator.jsx` / `DistributionHistory.jsx` | v1 分红降级（无代币宪法，恒空态） | 同上 |
| `src/i18n/locales/{zh-CN,en-US}.json` | 新增 selfOps.v1Retired / profile.recoverable(+Hint) | 同上 |
| `vite.config.cjs` | 去 ethers 分包；`strictPort: true`（端口被占启动即失败，杜绝静默漂移） | 同上 |
| `server/index.js` | CORS 根治：默认白名单加入生产前端 origin `https://ptreezh.github.io` | 同上 |
| `scripts/dev-supervisor.ps1` / `dev-stop.ps1` | 新建：双层开发环境守护（执行层自愈 + 监控层状态 JSON） | 同上 |

## 验收证据（2026-09-18 实测）

1. **标准 1** ✅ `src/` 全目录 grep `80002|rpc-amoy` → 零匹配
2. **标准 2** ✅ 三页面浏览器实测（Playwright，5173 → 10002 → chain1）：
   - 技能浏览器：4 条真链技能（`skill-1` 兜底名 / `e2e-chain-submit-test` 镜像描述 / owner `0x3737f0d8...`）；`GET /api/skills → 200`
   - 排行榜：G 第 1 · deployer 全地址 · L1 · 声誉 0 · 技能数 **4**（去重正确值）；`GET /api/leaderboard → 200`
   - 我的声誉：`已连接到合约` badge + 可恢复声誉卡；`GET /api/reputation/0x3a19... → 200`
   - 截图：`evidence/p28-evidence-{skillbrowser,leaderboard,userprofile}.png`
3. **标准 3** ✅ `npm run build` 通过（18.8s，ethers 分包消失）

## 过程中发现并修复的问题（经验沉淀）

| 问题 | 根因 | 根治 |
|------|------|------|
| vite 静默漂移到 5174 → CORS 拒绝 | 5173 被五天前泄漏的 dev 进程占用 + vite 默认 non-strict | `strictPort: true` + 端口守卫自动清理本仓库僵尸 |
| 临时进程反复泄漏（多轮会话遗留 node/vite/hardhat） | 起进程无生命周期登记 | `dev-supervisor.ps1` 双层守护：PID 登记 + 守卫 + 自愈 + 一键回收 |
| 生产前端 origin 不在 CORS 白名单 | 白名单硬编码仅本地 | 默认白名单加入 GitHub Pages origin（同时根治 P29 公网链路） |
| 启动 vite 时未注入 `VITE_API_URL` | 默认值指向 10001（被 360tray 占用） | supervisor 显式注入执行层环境 |
| 守卫正则 `[/\]` Invalid pattern | .NET 字符类转义错误（应 `[/\\]`）→ 守卫从未匹配后端 | 修复 + 实测匹配 14452 ✅ |

## 双层 agent 架构（应用户要求落地）

- **执行层**（后台 detached）：`scripts/dev-supervisor.ps1` — 端口守卫（双证据：端口占用者+命令行特征 ∨ 仓库绝对路径）→ 拉起后端+vite → 10s 周期健康检查 → 挂了自愈重启
- **监控层**（前台可查）：状态 JSON（心跳/健康/PID）+ supervisor 日志；`dev-stop.ps1` 干净回收
- 本次实测期间全程由守护维持环境（round-7 心跳双绿）

## 遗留与移交

- 360tray 占用 10001：开发/实测用 10002；生产端口最终归属 → **P29 GATE 输入**
- **P29 ⚠️GATE：托管方案需用户拍板**（A 本机持久+内网穿透 / B 云服务器 docker-compose / C 局域网演示+公网方案文档化）

## 附录：系统级冒烟补测（2026-09-18，用户 grill-down 触发）

针对"P28 按 roadmap 完成但系统级未必完备"的质疑，补测写路径与二级页面，**发现并修复 3 个真缺陷**：

| # | 缺陷 | 根因 | 修复 | 验证 |
|---|------|------|------|------|
| 1 | 格式错误的技能文件收到"太棒！全部通过"文案却被 rejected（自相矛盾） | tier1 元数据解析失败不影响 overall 判定分支，而 `passed=false + rec=approve` 落入 rejected | tier1 失败 → `needs_review` + 如实列出缺失字段与 frontmatter 格式提示（安全 critical/high 优先级不变） | curl 上传冒烟：approved/approve/tier1=true；错误格式 → review |
| 2 | SelfOpsPanel 晋升榜 DEPLOYER/USERS 列空白 | 子组件 Leaderboard 期望 `domain/totalUsers/tier/trend`，未做形状适配 | 轮询处映射（domain=地址，totalUsers=技能数） | 浏览器实测：`1 / 0x3737...f3 / 5 / 🥉` |
| 3 | ASK 代币单位残留在 7 处 UI（违宪展示） | v1 文案未清干净 | 统一改 RP（Reputation Points）/ 声誉分；ASKToken 展示名加 [已下线] | 浏览器实测 ask=false |

**写路径全链浏览器 E2E 首次闭环**（此前仅 P28 前的 curl 证据）：
浏览器上传 `browser-e2e-smoke.SKILL.md` → 审计 approved → `POST /api/chain 200` → 链上 skillId=5（txId 18d63a09...）→ SkillBrowser 渲染第 5 条 → 排行榜技能数=5。
证据：`evidence/p29-evidence-writepath-leaderboard5.png`

**回归全绿**：Hardhat 144 passing / test:chain 13/13 / test:unit 28/28 / build 27.8s / locales JSON 校验 / prettier。

**守护自愈实战验证**：手工杀后端 → 第 32 轮检测 → 7s 内重启新代码（含 audit 修复后 prettier 最终字节的二次冒烟）。
