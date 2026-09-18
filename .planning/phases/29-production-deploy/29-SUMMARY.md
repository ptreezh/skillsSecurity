# Phase 29 Summary: 生产部署固化（方案 A：本机持久 + 内网穿透）

**完成日期：** 2026-09-18
**状态：** ✅ Complete（2/2 plans，3/3 成功标准满足）

## GATE 决策记录（用户拍板）

📍 **GATE 输入**（P28 遗留）：生产托管方案 A（本机持久+内网穿透）/ B（云服务器 docker-compose）/ C（局域网演示+公网方案文档化）。
📍 **GATE 决策**：用户在会话中拍板 **方案 A** —— 本机持久 + cloudflared trycloudflare 隧道，生产端口 10002（10001 被 360tray 占用）。
📍 **理由**：零成本、无云依赖、符合宪法"零启动成本"；重启恢复由 Task Scheduler + 守护自愈承担。

## 目标

打通 `公网前端（GitHub Pages）→ 隧道（trycloudflare）→ 后端 API（:10002）→ ChainMaker chain1` 全链路，且**宿主机重启后自动恢复**（等效持久化证明）。

## 架构总览

```
┌──────────────────────┐   https   ┌────────────────────┐   https   ┌────────────────────┐
│ GitHub Pages         │ ────────▶ │ trycloudflare 隧道  │ ────────▶ │ 后端 :10002         │
│ /skillsSecurity/     │          │ (每次重启随机 URL)   │          │ server/index.js     │
└──────────────────────┘          └────────────────────┘          └─────────┬──────────┘
   api-config.json（守护自动维护）                                            │ cmc 网关
   └─ apiUrl = 当前隧道 URL ──────────────────────────────────────────────▶ chain1
```

**守护职责链**（10s 周期）：后端健康检查 → 故障自愈重启 → 隧道存活检查 → 重启/换 URL → **git 护栏**（只允许 api-config.json 自身改动时自动 commit+push）→ Pages 自动重部署。

## 交付物

| 文件 | 变更 | Commit |
|------|------|--------|
| `scripts/prod-supervisor.ps1` | 新建：生产守护（后端+隧道+自动发布+护栏+状态 JSON/日志/停止文件；`Get-TunnelUrl` 双日志读取） | ab969ac |
| `scripts/prod-stop.ps1` | 新建：一键回收（后修 node 过滤 bug） | ab969ac / 51f940a |
| `scripts/register-prod-task.ps1` | 新建：Task Scheduler AtLogOn 自启注册 | ab969ac |
| `src/services/apiConfig.js` + `ChainDataService.js`（可测性拆线） | 运行时 API 解析：`api-config.json` → `VITE_API_URL` → `localhost:10001` | ab969ac |
| `public/api-config.json` | 新建：守护自动维护的运行时配置（含当前隧道 URL） | ab969ac / 5de5733 |
| Task Scheduler `AgentSkills-Prod-Supervisor` | 注册：AtLogOn、交互式、限权（需 UAC 提权） | — |

## 验收证据（2026-09-18 实测）

1. **判据 ① 容器 + 持久化** ✅ `docker inspect` 实测 2 容器（cmc-debug + chainmaker-node）Up，`RestartPolicy=unless-stopped`；后端为 host daemon（prod-supervisor 托管，PID 登记 + 自愈）。
2. **判据 ② 公网可达** ✅
   - 隧道 `GET /api/health → 200`（直连 curl，非浏览器）
   - 公网站点 Playwright 实测：首页渲染完整中文 UI；激励面板（部署者面板，chain1 标识）；**我的声誉页**：`已连接到合约` 徽章 + 副标题 `经后端网关实时读取 ChainMaker chain1` + L1 观察员 + 全球排名（0 声誉空钱包的真实链上回值）；console 无 API/CORS 错误（仅 favicon 404 无害）。
   - 证据：`evidence/p29-public-reputation-via-tunnel.png`、`p29-public-reputation-after-recovery.png`
3. **判据 ③ 重启自恢复（等效验证）✅ 全链路闭环**
   - `prod-stop.ps1` 杀光 host 层（后端 DOWN、cloudflared 0、守护退出）→ 模拟宕机态
   - `Start-ScheduledTask`（等效登录触发）→ 新守护 33s 内全栈拉起：新后端 PID + **新随机隧道 URL** + `GET /api/health → 200`
   - **URL 自动发布实战**：守护自动 `git commit 5de5733`（更新 api-config.json 为新 URL）→ push → CI Pages 重部署 → 公网 `api-config.json` 已切新 URL → 浏览器复测声誉页 `已连接到合约` 依旧 ✅
   - 证据：git log `5de5733 chore(config): update public API tunnel URL ...`

## 过程中发现并修复的问题（经验沉淀）

| 问题 | 根因 | 根治 |
|------|------|------|
| cloudflared 隧道 URL 抓不到 | trycloudflare 全量日志走 **stderr**（stdout 空） | `Get-TunnelUrl` 双日志读取（out+err）→ 实测捕获 ✅ |
| prod-stop 杀不死后端 | 后端经 `Start-Process -WorkingDirectory` 启动，CommandLine 是相对路径 `"…node.exe" server/index.js`，**不含仓库路径** → 双条件匹配永不命中 | 删除 `'skillsSecurity'` 条件，仅匹配 `server[\/\\]index\.js`（commit 51f940a；实测 PID 10352 曾存活证实根因） |
| 自动发布 git 护栏两次拦截 | ① 6 项脏文件（未提交工作）② 1 项新证据 PNG | **护栏按设计工作**：保护未提交工作不被静默夹带；本次提交后自动放行（5de5733） |
| 生产域名解析 | 311 域名不可用（证书问题） | 运行时 `api-config.json` 方案（守护自维护，非构建期烘焙） |
| Task Scheduler 注册拒绝访问 | 非提权会话 Register-ScheduledTask / schtasks 均"拒绝访问" | `Start-Process -Verb RunAs` 提权注册 → 实测查询确认（AtLogOn、Ready） |

## 遗留与移交（→ P30 安全扫描与端到端验收）

- 浏览器 E2E 三页已过公网链路；P30 补：技能浏览器（列表真数据）、上传写路径公网验证（当前演示数据 5 条链上技能）、提升榜/晋升榜复测。
- 安全防线已具备（CI Slither + Mythril + Hardhat 144 passing）；P30 产出最终验收报告。
- 演示 URL 随 cloudflared 重启变化是**已知且已自动化**的行为（守护自动重发 Pages，无需人工介入）；正式域名可后续接 Cloudflare Named Tunnel（非阻断）。
- `favicon.ico` 404：无害，如需可补一枚图标。

## 生产运行状态（归档时点）

```json
{ "backend": {"healthy": true, "port": 10002},
  "tunnel": {"alive": true, "publicUrl": "https://replies-charles-indices-aaron.trycloudflare.com"},
  "publish": "published:https://replies-charles-indices-aaron.trycloudflare.com" }
```