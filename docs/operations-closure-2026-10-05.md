# 运维责任闭环（2026-10-05 盘点）

> 用途：明确各上架路径所需的运维责任面，区分「现状」与「B 路线落地时的硬要求」。
> 规则：仅记录事实，不假设 B 路线一定会启动。

---

## 1. 项目当前运维面（实态盘点）

| 维度 | 现状 | 证据 |
|---|---|---|
| TLS 终结 | 无（**项目不自营 HTTPS 服务**） | 无 `nginx` / Caddy 配置；`docker-compose.yml` 仅暴露 `10001` 端口（plaintext） |
| 公网 RPC | 无（链访问仅经 `docker exec cmc-debug cmc`） | `server/chainmaker-client.js:78-79`，全文件无 `localhost` / `127.0.0.1` / `http` / `https` |
| 进程优雅退出 | 无 `process.on('SIGTERM', …)`；无 `connection: close` 排空 | `server/index.js` / `server/auth.js` / `server/http-middleware.js` 全文 grep 无匹配 |
| 请求日志 | 无 morgan / winston / pino；只审计认证事件 | `server/auth.js:audit()` 仅覆盖 register / login / logout / locked；`server/index.js` 无 HTTP 访问日志 |
| 健康检查 | `/api/health` 返回静态 JSON（链连接状态**不**探活） | `server/index.js:142` |
| Docker 编排 | `docker-compose.yml` 存在但**不可执行** | `Dockerfile` 用 `node:24-alpine` 无 docker CLI；R15 已 mitigates |
| 备份 | `server/data/` 4 类运行时产物（`users.json`、`sessions.json`、`auth.log.jsonl`、`skills-mirror.json`）无任何定时/异地备份；实测磁盘现存 2 个（`users.json`、`skills-mirror.json`），另 2 个为按需生成 | `.gitignore:36,40,41` 排除 `users.json`/`sessions.json`/`auth.log.jsonl`，**不可仅靠 git 反推恢复**；仅 `skills-mirror.json` 被跟踪 |
| 监控 | 无 Prometheus exporter / OpenTelemetry / 业务计数器 | 全仓库 grep 无 `prom-client` / `@opentelemetry/*` |
| 运维主体 | 无指定 owner（研究项目原型） | AGENTS.md |
| TLS cert 续期 | 无自动化 | — |

## 2. 上架路径的运维责任分担

| 路径 | 是否需要我们提供 TLS | 是否需要公网 RPC | 责任主体 |
|---|---|---|---|
| **A** 纯技能（zip 提交市场） | 否（平台分发，无我们服务的） | 否 | 用户在 WorkBuddy 平台使用；我们仅打包 |
| **F** `skill-only` 连接器（提交审核） | 否（审核通过后平台托管 UI） | 否 | 同上 |
| **C** stdio MCP 连接器（用户机本地进程） | 否（本地进程，无中间人） | 否 | 由 WorkBuddy 在用户机调度；无远程面 |
| **B** 远程 HTTPS MCP 连接器（可选） | **是**（`/docs/connector` 强制 HTTPS） | **是**（面向公网开放 MCP 面，任何第三方可访问） | **我们自营**一个面向公网的 MCP server |

**结论**：**A / F / C 三条路径的运维面是 0。** 项目自称「上线」从工程意义上看不是「上线服务」，而是「把包交出去」。

## 3. B 路线启动时的硬要求（未做，且暂不立项）

如未来启动 B 路线，必须**先**有以下运维面再谈功能；缺任一项则该路径不进入生产红线：

### 3.1 TLS / HTTPS
- 公网域名 + 受信证书（Cloudflare 代理或 Let's Encrypt）
- **强制 HTTPS 终止**：Nginx / Caddy 反向代理 → Node 服务只接 HTTP（内网）
- **cert 监控**：到期前 30 天告警（cert-exporter / uptime-kuma / 自写 cron）
- **HSTS**（Strict-Transport-Security header）

### 3.2 链访问（私有容器 → 公网可达 RPC）

> 术语区分：当前后端到链的通信是**内网 shell RPC**（`docker exec cmc-debug cmc`，`server/chainmaker-client.js:78-79`），它既不是公网 RPC，也不是 HTTP/gRPC 端点。B 路线需要的是**第三方可访问的公网链访问路径**，与当前形态是两种不同东西，不能混称。

- **私有 cmc-debug 容器**不可公网：必须切换到 ChainMaker 节点 RPC + SDK
- 链数据需要可信副本：节点公证 / 浏览器镜像
- 跨组织治理：当前 `wx-org.chainmaker.org` 单组织不足以承接公网访问（多组织签名、权限模型待评估）

### 3.3 监控
- 进程存活：uptime-kuma / Prometheus blackbox
- 业务计数：`/api/skills` QPS、注册成功率、链上查询延迟（p50 / p95 / p99）
- 错误率：5xx / 4xx 比例 + 链上调用失败率
- 认证事件：现有 `auth.log.jsonl` → 接 Loki / ELK
- 告警通道：邮件 / 微信（注意：官方文档仅记录 `openworkbuddy@tencent.com` 作为**技能包解析失败的官方受理邮箱**，见 `docs/workbuddy-onboarding-evidence-2026-10-05.md`；它**不是**运维告警接收方，不可当作自有告警通道使用）

### 3.4 备份
- `server/data/` 4 类运行时产物每天异地快照（最低 30 天保留）：`users.json`、`sessions.json`、`auth.log.jsonl`、`skills-mirror.json`（实测磁盘现存前两类中的 `users.json` 与 `skills-mirror.json`，其余按需生成——备份脚本须按 glob 兜底而非硬编码现存文件）
- 链上数据：**链本身是仅追加（append-only）账本**，历史交易不可篡改，但这**不等于防篡改存储**——节点级数据损坏、索引丢失、共识层故障仍需恢复手段；只有本地镜像（`skills-mirror.json`）需额外快照
- 备份验证：每月一次的恢复演练

### 3.5 运维主体
- B 路线必须有**具名 owner**（人 / 团队 / 法人主体）
- 当前项目无此 owner（研究原型），属 B 路线**立项前提**而非「之后自然补」

### 3.6 优雅退出 / 重启
- `process.on('SIGTERM', …)` 排空 in-flight 请求后 `server.close()`
- Docker `restart: unless-stopped`（compose 已声明）+ 启动健康检查（compose 已声明）
- 反向代理侧的零停机滚动（待选型）

### 3.7 访问日志 / 审计
- 反向代理侧 HTTP 访问日志（IP、method、path、status、duration）
- 业务关键事件：`/api/upload`、`/api/chain`、所有 `/api/auth/*` **均未写入认证审计日志**——实测审计写入点只有 6 处，且全在 `server/auth.js`（`register`、`login_success`、`login_failure`、`login_locked`、`logout`），`server/index.js` 的 `/api/upload`（`:156`）与 `/api/chain`（`:220`）只有 `auth.requireAuth` 前置校验，无审计落盘。B 路线必须为这两个端点补审计事件
- 失败/错误统一收集

### 3.8 合规 / 隐私
- 收集的 IP / 邮箱 / 身份证号（中国大陆 KYC）按 PIPC 处理
- 数据主体请求（导出 / 删除）必须可执行
- 日志保留 90 天后自动脱敏

## 4. 当前 `docker-compose.yml` 实际状态（不应作为部署依据）

`docker-compose.yml` 声明了：
- `healthcheck`（每 30s 探活 `/api/health`）
- `restart: unless-stopped`
- 暴露 `10001`
- 挂载 `/var/run/docker.sock`（意图是让后端容器能 `docker exec cmc-debug cmc`）
- `${CHAINMAKER_ABI_HOST_DIR:-./.chainmaker-work}:/chainmaker-work:ro`

但根据 R15 已 mitigated 事实：
- `Dockerfile` 用 `node:24-alpine`，容器内**无 docker CLI**，`docker exec cmc-debug cmc` 实际不可用
- 即使改成含 docker-cli 的镜像，仍然依赖宿主机**已有**名为 `cmc-debug` 的容器
- compose 健康检查 `cron` 命令 `wget --spider http://localhost:10001/api/health` 在 alpine 中 wget 可装，但若 `/api/health` 因链断开而失败（实测会成功，因为 `/api/health` 不查链），健康检查永远通过——**误报健康**

## 5. 当前 `server/index.js` 实际可加上的少数洞（按工作量排序）

1. **优雅退出**：`process.on('SIGTERM', () => server.close(() => process.exit(0)))`，1 处，约 10 行；可直接做
2. **HTTP 访问日志**：`morgan('combined')`，1 行（与 `console.log` 重定向）；可直接做，但合约定向 `auth.log.jsonl` 才有审计价值
3. **`/api/health` 真探活**：调一次 `chainmaker-client` 的最轻查询（已有 `chainVerify()`）5—20 行
4. **`/api/upload` 与 `/api/chain` 补审计事件**：复用 `auth.js` 的 `audit()` 落盘格式，2 处，各 3—8 行
5. **`server/data/` 备份**：scripts/backup.sh + cron + S3 / aliyun OSS，零依赖路径可用 `vault` 本地目录 + 异机 rsync

## 6. 与计划的关系

- 本计划**不**启动 B 路线（R10/R11 已记录）
- 本文件**仅**用于：B 路线若启动时作为前置 checklist
- A / F / C 路线**当前无新增运维责任**，因为不自营任何可被公网访问的服务
- 当前 `docker-compose.yml` **继续作为误导文档存在**，是已 mitigated 的 R15 的现场证据；任何修改前先修 R15

## 7. 关键 URL 一手源

| 主题 | URL |
|---|---|
| 连接器 HTTPS 强制 | https://open.workbuddy.cn/docs/connector |
| 运营沟通 | `openworkbuddy@tencent.com` |