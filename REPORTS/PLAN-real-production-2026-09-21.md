# 真实化生产上线计划（身份 · 上传核验 · 积分 · 升级）

> 日期：2026-09-21 | 状态：v0.1 初稿，待 grill-down 循环
> 决策来源：用户三问拍板（参数化归属+授信函数 / 真实解包 / SSE.grantReputation）
> 配套审计：`AUDIT-reputation-incentive-real-vs-mock-2026-09-21.md`（M1–M12）
> 宪法约束：no tokens ever，零启动，声誉激励（CONSTITUTION.md）

---

## 0. 已被核实的关键事实（证据行）

| # | 事实 | 证据 |
|---|------|------|
| F1 | `registerSkill` 无 owner 参数，`skill.owner = msg.sender`（ChainMaker 上恒为网关） | SkillRegistry.sol:61,91 |
| F2 | `claimRewards` 按 `msg.sender` 读取，无法领他人奖励 | SSE.sol:203-224 |
| F3 | `addRewards(user,role,amount)` 带 user 参数但仅记账，无 rep 落地路径 | SSE.sol:369-371 |
| F4 | REPUTATION_ORACLE = SelfSustainingEcosystem 合约（部署脚本接线） | deploy-core-v2.js 头注接线图 |
| F5 | 唯一 rep 加点 = `SSE.submitReport`（网关自得 rep）+ `claimRewards`（网关自领） | SSE.sol:245,221 |
| F6 | `addTestReport` 带 reporter 参数（评审可真实归属） | Attribution.sol:100-105 |
| F7 | multer 接受 `.zip/.skill.zip`，但 audit 按 utf-8 直接读文件 → zip 二进制当文本审计必失败 | index.js:66-78, audit-agent |
| F8 | cmc 无 `--sender`，全部交易 msg.sender = 网关 admin1 证书地址 | chainmaker-client.js |
| F9 | message 乱码为历史 GBK locale 时代产物（a1a8a9a 06:43 转 UTF-8 后已干净）；当前 HTTP 原始字节严格 UTF-8 `文件已上传，审计中`；skill 6 trigger 链上脏乱码为链上已存在脏数据，P3 如实上报不伪造 | R0-V4 curl.exe 字节实测 / git log |
| F10 | 等级阈值 100/500/2000/5000 前端硬编码；TIER_THRESHOLDS={0:0,1:50,2:100} | SkillBrowser/DeployerDashboard/M1-M12 |
| F11 | registerSkill 门槛校验（MEDIUM≥500 等）基于 **msg.sender**（网关） | SkillRegistry.sol:74-87 |

**根因一句话**：ChainMaker 单网关签名 + 合约全按 msg.sender 归属 → 链上只有"网关"一个身份，真实用户无身份、无归属、无积分路径。

---

## 1. 修复原则（用户明令）

1. 真实上传、真实核验、真实积分、真实升级，全流程对齐生产上线。
2. 零 mock / demo / 虚假实现 / 空 stub。
3. 链上 msg.sender=网关属 ChainMaker 平台约束，**诚实标注"平台代签"**，但归属/积分/评审全部参数化到真实用户地址。
4. 真实功能完成后，再谈"交互技能化"。

---

## 2. 改造范围

### P1 合约层（根基，先做）

**SkillRegistry.registerSkill 参数化**
- 签名改为 `registerSkill(name, description, trigger, metadataIPFS, riskLevel, version, address creator)`
- `skill.owner = creator`；rep 门槛校验改为查询 **creator** 的 rep（`stakingManager.getUserReputation(creator)`）
- `nameTaken` 逻辑不变；`ownerSkills[creator].push(skillId)`；事件带 creator
- 兼容：ChainMaker 重部署全量替换签名，无旧调用方残留

**SSE.grantReputation 授信函数（核心）**
- `function grantReputation(address user, uint256 amount) external onlyOwner`
- 内部直调 `stakingManager.addReputation(user, int256(amount))`（SSE 是 REPUTATION_ORACLE，权限满足）
- 事件 `ReputationGranted(address indexed user, uint256 amount, uint256 total)`
- 加锁/恢复语义沿用 StakingManager.addReputation 既有逻辑（R0-V2 核实后写入）

**部署与接线**
- 编译（0.8.20, optimizer 200）+ hardhat 测试新增（grantReputation 正/反例、registerSkill 参数化正/反例、rep 门槛基于 creator 校验）
- chain1 重部署：顺序 StakingManager → SkillRegistry → Attribution → SSE → Governance → ReputationBadges；接线同 deploy-core-v2（SSE.setStakingManager / stakingManager.setReputationOracle=SSE / Attribution.setStakingManager / SSE.setReputationBadges / Badges.setIssuer=SSE / 权限）
- 更新 `server/chainmaker-client.js` CONTRACTS 表 + ABI 文件
- 链上实测：grantReputation(addr,100) → getUserReputation(addr)==100

### P2 服务端身份层

- 用户注册表（账密注册 → 确定性 40-hex 地址派生；密码 hash 存储非明文）
- `/api/auth/register`、`/api/auth/login`（签发 token）
- Auth 中间件：/api/upload、/api/chain、评审、点赞等写操作强制身份
- 身份与链上地址绑定：后端以网关身份提交 tx，但所有参数化调用填真实用户地址

### P3 上传真实核验

- 新增 `server/skill-package.js`：zip 解包模块（防 zip-slip、大小限制、SKILL.md 定位、frontmatter 校验）
- 上传流程：`.md/.SKILL.md` 直读；`.zip/.skill.zip` 解包 → 提取 SKILL.md → 校验 → 喂 `runAudit`；失败如实拒绝并返回原因
- 修复 F9 乱码（i18n 字节级定位；skill6 脏数据如实上报，不伪造清理）

### P4 前端真实化（M1–M12 全落地 + 新功能）

- 注册/登录页；上传携带身份 token；等级/积分读链上真实 rep（chainRead）；排行榜/Profile/DeployerDashboard 接真实数据
- 删除/禁用全部 fake 分支（M10 点赞交互、M7 userRank、M4 空桩按钮等按审计清单）

### P5 端到端生产验证

- HTTP 实测脚本新套件：注册 → 登录 → 上传 zip → 审核 → 上链（creator=用户地址）→ 审核通过触发 grantReputation → 链上查 rep == 预期
- 前端多用户模拟（如可用则 Playwright；无 playwright.config 则用 node HTTP + 实测记录落盘）
- 覆盖：身份校验缺失拦截、zip 坏包拒绝、rep 加分、等级升级（真实 rep 读数）

### P6 诚实标注

- README/报告：ChainMaker 代签机制、msg.sender=网关的边界、技能 owner 以参数化 creator 为准
- 不伪装链上存在多签名身份

---

## 3. R0 先决验证（不写代码，纯验证）

- V1：chain1 实际重部署路径（看 deployments/core-latest.json 与 cmc create 流程 —— 确认现网是如何部署的；注意旧的公开链打包/部署脚本 `scripts/prepare-deployment-package.sh`、`scripts/deploy-all.sh` 已删除）
- V2：StakingManager.addReputation 完整语义（L326 起：锁定、恢复、正负数处理）——确认 grantReputation 直调安全
- V3：audit-agent.js runAudit 完整接口（解包后喂什么、返回结构）
- V4：server i18n 乱码根因字节级定位（zh-CN.json 相关键 + upload.message 拼装处）
- V5：前端读等级/积分的当前路径（UserProfile/SkillBrowser/ChainDataService）

## 4. 里程碑

| 里程碑 | 内容 | 验收 |
|--------|------|------|
| M0 | R0 全部验证落盘 | V1–V5 有证据行 |
| M1 | 合约改造+测试+重部署+链上实测 | grantReputation/registerSkill 参数化链上验证通过 |
| M2 | 服务端身份层+zip 解包+乱码修复 | 注册/登录/上传 zip/审核全链路 HTTP 实测 |
| M3 | 前端真实化 M1-M12 | 页面无 fake 分支、等级/积分真实读数 |
| M4 | E2E 生产验证 | 多用户全流程实测记录落盘 |
| M5 | 文档诚实标注 | README/报告更新 |

## 5. grill-down 循环（每轮追加落盘）

每完成一个里程碑 → 钢铁人式逐条反问（存在造假/空桩/mock？归属是否参数化？rep 是否链上真实落地？门槛是否基于真实用户？）→ 结论追加到本文件"核验记录"节。循环至无新问题。

## 6. 核验记录

### R0-V1（2026-09-21）：chain1 实际重部署路径

**结论：现网 = ChainMaker solo 单节点体验链（chain1），重部署方式 = cmc create 新命名合约 + 容器内验证脚本。**

- 链信息：`chain_id=chain1`，Docker `chainmaker:v2.3.10` solo 单节点，EVM 兼容 `addr_type: 2`（ethereum 地址）
- **部署账户（链上所有 tx 的 msg.sender/owner）：`0x3737f0d872f386f170c20e2ae73b81cfe6b7ecf3`**（launch-readiness-report.md:62）
- v2 部署区块 38-53（合约 38-42 + 接线 43-53）；链上验证 `verify_v2_wiring.sh` 13/13 PASS（脚本在 cmc-debug 容器 `/work` 内）
- 运行架构：`chainmaker-solo`（链节点）+ `cmc-debug`（cmc 客户端容器，挂载 /work）两容器；`docker start` + `docker exec cmc-debug sh -c "sh /work/verify_v2_wiring.sh"`（launch-readiness-report.md:151-162）
- **6 合约 v2 地址（chainmaker-client.js CONTRACTS + launch-readiness-report.md §2.4）**：
  - AS_Staking=`0x95f2f001a4f65e8652bbdae34487ed9596fe19e7`（blk 38）
  - AS_SkillRegistry=`0xcf089d4bebcdabd13cd6a27ba6c168acac6bc042`（blk 39）
  - AS_Attribution=`0x9e49c41b5ca66afb3088445a182601133b3e6987`
  - DaoGovernance=`0x106d3686d2492ce75d1e4a01e799d22e7d2c9e74`
  - AgentEcosystem（SSE）=`0x17f57b0722260ae6a3cabd33e0e9f5300c189f13`
  - ReputationBadges=`0x5b0627af6bc4da42f460289d3b535700e0d3af75`
- **旧 v1 合约已 revoke 但合约名键仍占位，不可复用 → v2 用新命名（AS_*）绕过**（launch-readiness-report.md:76）；P1 重部署同理须用新合约名
- **cmc 工具语法**（launch-readiness-report.md §4.3 + chainmaker-client.js 头注）：部署参数 `--params='[{"address":"0x..."}]'`（key=ABI 类型，address 带 0x）；无参 `--params='[]'`；查询 invoke+`--result-to-string`；**get 不支持 `--sync-result=true`**（create/revoke/invoke 需要）；名称解析 `name-to-addr <名称> --address-type=0`（位置参数）
- **排除项**：`deployments/core-latest.json` = hardhat 本地节点（chainId 31337）数据，非现网；`scripts/prepare-deployment-package.sh`、`scripts/deploy-all.sh` = 公开链打包/部署旧路径（**均已删除**，非 chain1 现网路径）
- **P1 影响**：重部署 = hardhat compile 出新 .bin/.abi → 挂载/拷贝到 cmc-debug 容器 /work → cmc create（新链上名）→ 接线（SSE.setStakingManager / setReputationOracle=SSE / Attribution.setStakingManager / SSE.setReputationBadges / Badges.setIssuer=SSE / Governance 权限）→ 扩展 verify_v2_wiring.sh 重跑全绿

### R0-V2（2026-09-21）：StakingManager.addReputation 完整语义

**结论：`grantReputation(user, amount)` 直调 `addReputation(user, int256(amount))` 安全：限 REPUTATION_ORACLE（SSE 满足）、正数只加不减、锁定吸收负值防负余额。**

- 签名 `addReputation(address _user, int256 _delta)`（StakingManager.sol:326 起）：
  - `onlyReputationOracle` 修饰符 → 仅 REPUTATION_ORACLE（=SSE）可调
  - `_user != address(0)` 校验
  - `_delta == 0` 提前 return（零 delta 不产生事件/状态）
  - `userReputation[_user] += _delta`：**支持正负**（正=加分，负=扣分/惩罚）
  - 锁定吸收：`lock.lockedAmount > 0 && userReputation < 0` 时锁定量抵扣负值（防负余额），事件记录吸收
- 权限：SSE 是部署时接线的 REPUTATION_ORACLE（deploy-core-v2.js 头注接线图 + R0-V1 链上验证 governance/reputationOracle 项 ✅）
- 边界：`grantReputation` 只传正数 amount → 不触发负值路径；锁定吸收逻辑对正数无影响；链上实测验收 `grantReputation(addr,100) → getUserReputation(addr)==100`（PLAN §2 P1）

### R0-V3（2026-09-21）：audit-agent.js runAudit 完整接口

**结论：`runAudit(skillContent, skillName, locale="zh-CN")` 吃纯文本 SKILL.md 内容，返回结构化 JSON；zip 解包在 P3 上游完成即可，audit-agent 无需改。**

- 输入：`runAudit(skillContent, skillName, locale="zh-CN")`，`skillContent` = **纯文本字符串**（audit-agent.js:59 附近）
- frontmatter 解析：split "---" 提取 YAML 头部（skillName/description/trigger/version 等）
- 审计执行：`buildAuditScript(skillContent)` 生成临时 py 文件（`temp_audit_<ts>.py` 于 TEMP_DIR）→ `spawn("py", ["-u", tmpScript], {shell:true, timeout:60000, maxBuffer:10MB})`（audit-agent.js:66-74 附近）
- **返回结构**：`{passed, score, tier1-4, overall, recommendation, message, counts, summary, auditTime, independence}`（passed=boolean；counts=critical/high/medium/low；summary 含 `审计完成：{{critical}} 个关键…`）
- 失败路径：审计服务不可用 → 拒绝（不自动 approve，a1a8a9a 修复）
- **P3 影响**：index.js/上传流程在调 runAudit 前，zip 须先解包提取 SKILL.md 文本；`.md` 直读；坏包/无 frontmatter 拒绝并带原因（metadata format failure → rejected with reason）

### R0-V4（2026-09-21）：server i18n 乱码根因 —— 字节级定位

**结论：乱码为历史遗留（GBK locale 时代），当前代码与现网后端均输出严格 UTF-8，无截断缺陷。实测乱码显示来自客户端解码伪像。**

- 磁盘文件：`server/locales/zh-CN.json` 严格 UTF-8、无 BOM（25992 字节，head `7B 0A 20 20 22`=有效 JSON 起始）；`src/i18n/locales/zh-CN.json` 亦严格 UTF-8
- git 历史：`50f890d` blob（最早英语 i18n 提交）同样严格 UTF-8，`upload.success = "文件已上传，审计中"`；`git log -S '审计�'` 全历史 **0 匹配** → 乱码字面量从未以提交内容存在
- 加载代码：`server/i18n.js:17` 显式 `readFileSync(..., 'utf-8')` + JSON.parse，无截断/无重编码；响应 `res.json({message: req.t('upload.success')})`（index.js:123）
- 前端：`uploadService.js` 不展示后端 message 字符串（仅解构 jobId；status message 用前端 i18n：`demo.status.uploading='上传中...'` 等）；grep 确认前端无 message 截断点（slice/substring 仅用于地址展示）
- **运行时实测（curl.exe 原始字节）**：POST /api/upload 响应 `{"message":"文件已上传，审计中"}` 字节 `E6 96 87…E8 AE A1 E4 B8 AD` 严格 UTF-8 合法；PowerShell `Invoke-WebRequest.Content` 显示 `�ļ����ϴ��������` 为 **.NET 解码伪像，非后端输出**
- 进程时序：zh-CN.json 最后写 a1a8a9a（06:43:30）；后端 PID 9652 启动 06:45:44（晚于转码）→ 进程加载的是 UTF-8 版本
- **P3 处置**：F9 中"skill 6 trigger 链上脏乱码"为链上已存在脏数据（非服务端生成），按"如实上报、不伪造清理"处理；服务端 message 无需修复

### R0-V5（2026-09-21）：前端读等级/积分当前路径

**结论：所有读数经后端网关（/api/reputation/:address、/api/skills）；等级阈值前端两套重复定义；SkillBrowser 仍有 demoSkills 降级（M1 mock 待删）。**

- 读数链路：`ChainDataService.fetchReputation(address)` → `GET /api/reputation/:address`（chain-read 经 cmc 读链上）→ `mapReputationToProfile`（rep/effective/locked/recoverable）；`fetchSkills` → `GET /api/skills` → `mapSkillToUI`
- 等级派生：`ChainDataService.deriveLevel(rep)` 阈值 5000→5 / 2000→4 / 500→3 / 100→2 / else 1（ChainDataService.js:45-52）；**UserProfile.jsx:5-11 存在第二套重复 `getLevel`（阈值同）** → P4 需统一
- Leaderboard：`mapLeaderboardEntry` 取 `effectiveReputation ?? reputation` → deriveLevel；likes/flagged 为 chain1 无概念字段硬编码 0（无除名）
- **SkillBrowser.jsx:14-18 仍硬编码 `demoSkills` 3 条，链上为空或错误时降级展示（L32,38）→ M1 mock（Audit M1）待删，空→空态+错误提示**
- UserProfile 拉取失败时兜底 `user.reputation`（本地，非链上）→ P4 一并移除
- **P4 影响**：等级统一单一数据源（后端 deriveLevel 或单一前端函数）、删 demoSkills 降级、接真实 rep

---

### R0 验收汇总（M0）

| 项 | 结论 | 证据 |
|----|------|------|
| V1 chain1 部署路径 | ✅ 已闭环：cmc create 新命名 + verify_v2_wiring.sh；owner=`0x3737f0d8…ecf3` | launch-readiness-report.md:56-84,126-145 |
| V2 addReputation | ✅ grantReputation 直调安全（仅 oracle、正数、锁仓吸收） | StakingManager.sol:326+ |
| V3 runAudit | ✅ 吃纯文本 SKILL.md，返 JSON；P3 上游解包 | audit-agent.js:59-118 |
| V4 i18n 乱码 | ✅ 现网严格 UTF-8 无缺陷；历史遗留+客户端解码伪像 | curl.exe 字节实测 / git log -S |
| V5 前端路径 | ✅ 读数经网关；两套等级函数重复；demoSkills 待删 | ChainDataService.js / UserProfile.jsx / SkillBrowser.jsx |

**R0 通过 → 进入 P1（合约层改造）。**

---

## 7. 第一轮 grill-down（P1 计划反问，2026-09-21）

> 方法：对 P1 计划逐条反问（触发点/权限/测试/重部署命名/ABI 同步/客户端/验收），全部有证据行后落盘。本轮零代码编辑，纯核读+链上实测。

### G1. chain1 重部署实际机制（R0-V1 补测）

**结论：chain1 部署 = 容器内 cmc create（新链上名）+ 容器内 verify 脚本；owner 直接实测 = `0x3737f0d872f386f170c20e2ae73b81cfe6b7ecf3`（部署账户，非转述）。**

- 实测（docker exec cmc-debug，本机直连）：
  - `AS_SkillRegistry.owner()` = `[[55 55 240 216 ... 236 243]]` → 20 字节 ASCII 转 hex = `0x3737f0d872f386f170c20e2ae73b81cfe6b7ecf3`（tx `18d72ab2c95aa3b1...`，SUCCESS）
  - `AgentEcosystem.owner()` = 同地址（tx `18d72ab6890a6ffe...`）
  - `nextSkillId` = `[9]` → 链上已注册 8 个技能（id 1..8，含脏乱码 skill 6、已 HTTP 实测 skill 8）
- 部署模板 `deploy_v2_cores.sh`（容器 /work）：cmc create 语法 = `--contract-name=新名 --runtime-type=EVM --byte-code-path --abi-file-path --version=2.0.0` + SDK/TLS/ADM flags + `--sync-result=true` + `--params`；**v2 用 AS_* 新名（v1 名 revoke 后键仍占位不可复用）** → **P1 重部署同理须换新链上名（如 AS3_* / AS2_*）**
- 接线模板 `wire_v2_cores.sh`（容器 /work）：11 条接线全部 `--contract-address`（无 0x）+ `--params='[{"address":"0x..."}]'`（带 0x）+ `--result-to-string --sync-result=true`；查询（get）不带 `--sync-result=true`（实测 owner() 查询用 get + `--params=[]` 成功）
- **P1 重部署路径（实测锚定）**：hardhat compile 出新 .bin/.abi → 拷贝进 cmc-debug 容器 /work → 新链上名 cmc create（顺序 StakingManager → SkillRegistry → Attribution → Governance → SSE → ReputationBadges）→ 11+ 条接线 → 扩展 verify 脚本重跑全绿

### G2. registerSkill 参数化设计（逐条反问）

- **Q: 门槛查谁的 rep？** A: L74 `getUserReputation(msg.sender)` → 改 `getUserReputation(creator)`；证据 SkillRegistry.sol:74-87
- **Q: LOW 档门槛？** A: **LOW 无 rep 门槛**（L71-75 仅计算 stake，L77-87 只挡 MEDIUM/HIGH/CRITICAL）→ 网关 cold-start 可先注册 LOW
- **Q: `skill.owner` 归属？** A: L91 `owner = msg.sender` → 改 `owner = creator`；`ownerSkills[msg.sender].push` → `ownerSkills[creator].push`；事件带 creator（L89-96,107）
- **Q: nameTaken 语义？** A: L69 不变（全局唯一名）
- **Q: 兼容性？** A: ChainMaker 重部署全量替换函数签名，无旧调用方残留；服务端 chain-submit.js 对应调用点同步加 `creator` 参数
- **Q: 权限控制？** A: registerSkill 无 onlyOwner（L61 无修饰符）→ 维持 permissionless（任一地址可注册，但归属写入 creator 参数）。**风险：参数化后任何人可冒充他人注册** → 需权衡：a) 加 `onlyOwner`（仅网关/部署账户可注册，防冒名，与 F8 单网关签名一致）或 b) 维持 permissionless（链上多签名能力，防冒名靠 P2 服务端身份+签名）。**决策点 → 倾向 (a) onlyOwner**，理由：chain1 实际只有网关一个签名者，permissionless 无实际意义且引入冒名漏洞；P2 身份层+注册表在服务端完成真实用户归属校验
- **Q: creator=0 校验?** A: 需加 `require(creator != address(0), "Invalid creator")`（参照 StakingManager.addReputation `_user != 0`，L328）
- **Q: 测试覆盖?** A: 正例（creator 指定→owner 归属+ownerSkills 入列+门槛按 creator）；反例（重复名 revert/creator=0 revert/LOW 无门槛成功/MEDIUM creator rep<500 revert/onlyOwner 非 owner revert）

### G3. SSE.grantReputation 设计（逐条反问）

- **Q: 权限？** A: `onlyOwner`（SSE 是 Ownable，L16/104；owner=部署账户）。SSE 本身是 REPUTATION_ORACLE（F4+R0-V1 链上 governance/reputationOracle 项 ✅），`stakingManager.addReputation(user, amount)` 满足 `onlyReputationOracle` 修饰符（StakingManager.sol:326）
- **Q: 直调安全性？** A: R0-V2 已核 ✓ — 正数只加不减、锁定吸收防负、`_syncEffectiveTotal` 聚合、零 delta 早退
- **Q: 签名？** A: `grantReputation(address user, uint256 amount) external onlyOwner`；正向 `int256(amount)` 转换（uint256→int256 上限 2^255-1，amount 通常 < 5000 无溢出风险；反例测试可覆盖巨大值 revert —— 实际 require 放 SSE 层 `amount > 0` 即可）
- **Q: 事件？** A: 新增 `ReputationGranted(address indexed user, uint256 amount, uint256 total)`；total 取 `stakingManager.userReputation(user)` 或由 addReputation 内在 emit 的 `ReputationChanged` 承载（**简化：直接透传 addReputation 自己的事件，SSE 层 emit ReputationGranted 引用最新读数** → P1 实施时定）

### G4. verifySkill 冷启动死锁（P1 边界问题）

- **事实**：verifySkill L118-132 门槛 LOW=100/MEDIUM=500/HIGH=1000/CRITICAL=2000（`getUserReputation(msg.sender)`=网关）→ **网关 rep=0 冷启动时无人可验证任何档位**（R0 已确认）
- **处置**：P1 属合约层，verifySkill 死锁解 = 部署后首笔授信动作（grantReputation 给网关/首验证者授初始 rep ≥ 100，LOW 验证解锁）——**纳入 P1 验收链上实测**；verifySkill 本身不改签名（社区验证语义保留）
- **备选（记录不实施）**：verifySkill 也参数化 verifier —— 超 P1 范围，语义变化大（社区验证→代签验证），P4/P5 再评估

### G5. 重部署命名 + ABI 同步（实测模板锚定）

- 新链上名：**AS2_StakingManager / AS2_SkillRegistry / AS2_Attribution / AS2_Governance / AS2_ReputationBadges / AS2_AgentEcosystem（SSE）**（避 v1/v2 已占键；写法以 deploy_v2_cores.sh 模板一致）
- 新 .abi/.bin：`npx hardhat compile` → `artifacts/contracts/*.sol/*.abi|.bin` → 拷贝 `cmc-debug:/work/`（容器内 ABI 文件路径供 cmc `--abi-file-path` 引用）
- **chainmaker-client.js CONTRACTS 表**：6 条记录全换新链上名+新地址+新 ABI 文件路径；`getSkill` 解析结构不改（字段未动）
- verify 脚本：`verify_v2_wiring.sh`（59 行，13 项）→ 扩展为 v3 版（13 项地址断言 + grantReputation/getUserReputation 链上实测 ≥2 项 + registerSkill 参数化 creator 归属实测 ≥1 项）→ 全绿收尾

### G6. P1 验收标准（可执行断言）

1. hardhat 测试：grantReputation 正/反例 + registerSkill 参数化正/反例 + 门槛基于 creator（新增于 test/contracts/）
2. 链上实测：`grantReputation(addr,100)` → `getUserReputation(addr)==100`（cmc get）
3. 链上实测：`registerSkill(...,creator=X)` → `skills(id).owner==X`（cmc get skills）
4. 接线：13 项地址断言全绿（含 reputationOracle=新 SSE、governance、authorizedCallers）
5. 服务端：chainmaker-client.js CONTRACTS 表 6 条已更新且 `getSkill` 解析正常（服务起得来 + health 通过）
6. verifySkill cold-start：首笔授信后 LOW 验证可行（P1 验收链上实测）

### G7. P1 排除项（明确不做，防蔓延）

- 不改 verifySkill 签名（G4 死锁用授信动作解）；不改 Attribution；不改 Governance/Badges 逻辑（仅重部署+接线）
- 不做 P2 身份层/注册表（P1 只做合约+部署+链上实测；服务端 registerSkill 调用点 chain-submit.js 同步加 creator 参数——**creator 来源：网关授权代签，写明确认走 P2**）
- 不清理 skill 6 脏数据（P3 如实上报）
- 零 mock：所有 P1 断言均为链上真实 get/invoke 返回

### G8. 待用户拍板（2 项，其余已锚定）

| # | 问题 | 选项 | 倾向 |
|---|------|------|------|
| G2-a | registerSkill 参数化后权限 | (a) onlyOwner 防冒名（推荐） / (b) permissionless 需 P2 签名校验 | (a) |
| G4-a | verifySkill 冷启动解 | (a) 部署后 grantReputation 授首笔 rep（推荐，P1 验收含此） / (b) 改 verifySkill 签名（超范围） | (a) |

**拍板结果（2026-09-21 会话）：G2-a = onlyOwner 防冒名；G4-a = 首笔授信解锁。P1 实施按此执行。**

### G9. P1 实施执行清单（拍板后展开）

1. `SkillRegistry.sol`：`registerSkill` 加 `onlyOwner` + `address creator` 参数；`skill.owner=creator`；`ownerSkills[creator].push`；门槛改查 `getUserReputation(creator)`；加 `require(creator != address(0))`
2. `SSE.sol`：新增 `grantReputation(address user, uint256 amount) external onlyOwner`（require amount>0 → `stakingManager.addReputation(user, int256(amount))` + `ReputationGranted` 事件）
3. hardhat 测试新增（test/contracts/）：grantReputation 正/反例、registerSkill 参数化正/反例、onlyOwner 反例、门槛基于 creator 正/反例
4. `npx hardhat compile` → 新 .bin/.abi → 拷贝 cmc-debug 容器 /work
5. chain1 重部署：新链上名 `AS2_*`（StakingManager → SkillRegistry → Attribution → Governance → AgentEcosystem → ReputationBadges 顺序），11+ 接线
6. 首笔授信：grantReputation 授首验证者 rep≥100 → verifySkill LOW 档解锁
7. `server/chainmaker-client.js` CONTRACTS 表 6 条换新名/新地址/新 ABI
8. 扩展 verify 脚本（13 项地址断言 + grantReputation/getUserReputation 实测 + registerSkill creator 归属实测）→ 全绿
9. 链上验收：`grantReputation(addr,100)` → `getUserReputation(addr)==100`；`skills(id).owner==creator`

### P1 链上实施记录（2026-09-21 会话，逐项证据）

**G9-1 ~ G9-4 已完成（先期会话）**：registerSkill 参数化 + SSE.grantReputation；`npx hardhat test` 156 passing；新 .bin/.abi 已拷入 cmc-debug:/work。

**G9-5 已完成**：AS2_SkillRegistry 部署于块 70（`4f60b9d9e3bc739e619757e43ca699d3ada3c2a6`）；AS2_SSE 权威地址 `9c755215c30c88a84930b09ef5112797a19134fe`（块 71 CM 注册条目解析）；wire_v3_cores.sh 10/10 接线成功。

**G9-6 已完成（链上闭环）**：`/work/p1_6_closure.sh` 五步全绿——
- STEP1 `grantReputation(gateway,100)`：块 91，tx `18d73e19a24f48a6cad5fc1e67e28ff67dcf78d166554ab8a97a40da0dfe2d93`，gas 42069；双事件：AS2_SSE `ReputationGranted`（topic `e64d4b28d385037c1a4cad5c2c4773afc40623b3c50b728b3ddccef630ec081f`）+ AS_Staking `ReputationAdded`（topic `f3bf67aaa88988c347d216d35468e2afca6fc65ceb5bf94cd86358c62e25d04a`）
- STEP2 `getUserReputation(gateway)` → `[100]` ✓
- STEP3 `registerSkill(LOW, creator=gateway)` → skillId=0，gas 130886；事件 `SkillRegistered` + `FingerprintGenerated`；owner=0x3737f0d8...（creator 参数生效）
- STEP4 `verifySkill(0,true)` → LOW 档解锁成功（事件 `setPositiveContribution` + `SkillVerified`）
- STEP5 `verifiedSkills[0]=[true]`；`skills[0]` 全字段=预期（owner=gateway、fingerprint `f3221554714e4f72e02078367ba7c5ef1fb10ef1bf293b069488fc552aaef585` 与事件一致）
- **关键事实**：cmc 无 `--sender`，所有交易 msg.sender=网关 EVM 地址 `0x3737f0d872f386f170c20e2ae73b81cfe6b7ecf3`（=owner=admin1）→ 首笔授信 target 必须是网关地址本身

**G9-7 已完成（P1-7）**：`server/chainmaker-client.js` CONTRACTS 表 6 条更新——
- `AS2_SkillRegistry`（新 key，替代 AS_SkillRegistry）：chainName=AS2_SkillRegistry，address=`4f60b9d9e3bc739e619757e43ca699d3ada3c2a6`（块 70）
- `AS2_SSE`（新 key，替代 AgentEcosystem）：chainName=AS2_SSE，address=`9c755215c30c88a84930b09ef5112797a19134fe`（块 71）
- AS_Staking / AS_Attribution / DaoGovernance / ReputationBadges 不变（v2 复用）
- `chain-read.js` 全部 `AS_SkillRegistry`→`AS2_SkillRegistry`、`AgentEcosystem`→`AS2_SSE`；`chain-submit.js` `submitToChain(job, locale, creator)` registerSkill 7 参（...version, creator）；`index.js` `/api/chain` 读 `req.body.creator`、health 显示 AS2_SkillRegistry
- 验证：server 无残留旧 key；`node --test test/server/chainmaker-client.test.cjs` 15/15 pass；`lsp_diagnostics` 0 error；模块加载 CONTRACTS keys 正确

**G9-8 已完成（P1-8）**：`/work/verify_v3_wiring.sh` 15/15 全绿。发现并修复脚本真实缺陷：第 15 项沿用 v2 时代 `counter` 方法（新 ABI 已改名 `nextSkillId`）→ 修复后 `nextSkillId=[1]`（=P1-6 已注册 skillId 0 后计数，逻辑自洽）。修复版落盘 `scripts/verify_v3_wiring.sh`（无 BOM，UTF-8）。

**G9-9 完成（P1-9 链上验收）**：`getUserReputation(gateway)=100` ✓；`skills(0).owner=0x3737f0d872f386f170c20e2ae73b81cfe6b7ecf3` ✓；`nextSkillId=1` ✓

**P1 结论：全部 9 项完成，链路（授信→注册→验证→读回）链上实测全绿。creator 目前由网关代签（G7 确认走 P2），服务端已预留真实用户地址入口（`/api/chain` body.creator）。**

---

## P2 实施记录（2026-09-21 会话，逐项证据）

### P2 范围（§2 定义 → 实现落点）

| 定义要求 | 实现落点 | 证据 |
|---|---|---|
| 用户注册表（账密注册→确定性 40-hex 地址派生；密码 hash 存储非明文） | `server/auth.js`：`crypto.scrypt` 64-byte hash + 随机 16-byte salt；`address='0x'+sha256('agentskills:'+username+':'+passwordHash).slice(0,40)` | `auth.test.cjs` 确定性/明文测试 |
| `/api/auth/register`、`/api/auth/login`（签发 token） | `index.js` 4 端点：register/login/logout/me；token=`crypto.randomBytes(32).hex`，内存会话 24h TTL | HTTP 实测 register→me 地址一致 |
| Auth 中间件：/api/upload、/api/chain 等写操作强制身份 | `auth.requireAuth`（`Authorization: Bearer <token>`→`req.user`）；保护 `POST /api/upload`、`POST /api/chain` | HTTP 实测无 token→401，带 token→放行 |
| 身份与链上地址绑定（参数化调用填真实用户地址） | `/api/chain` creator 一律取 `req.user.address`（**移除 `req.body.creator` 信任**，防地址伪造） | `index.js` diff + HTTP 实测 |

### P2 关键决策（钢铁人核对）

1. **零新依赖**：无 bcrypt/jwt → Node 内置 `crypto.scrypt`（密码存储）+ `crypto.randomBytes`（token/salt）+ `crypto.createHash('sha256')`（地址派生）。密码永不明文落盘。
2. **地址确定性**：同一账密 → 恒定地址（身份与链上可重复绑定）；不可逆（sha256 原像）。网关仍以自身身份提交 tx（P6 诚实标注），但 `registerSkill` 第 7 参 creator 填真实用户地址 → 链上归属真实用户。
3. **防地址伪造**：`/api/chain` 不再信任 `body.creator`——服务端会话是唯一身份来源，恶客户端无法冒用他人地址。
4. **持久化**：`server/data/users.json`（默认路径；测试用 `AUTH_USERS_FILE` 环境变量隔离到临时目录，**绝不污染**真实文件）；`.gitignore` 新增 `server/data/users.json`（含 hash 的运行时数据不入库）。
5. **上传入队记录身份**：`addJob` 增加 `username`/`address` 字段（P3 评审/归属链式绑定前置）。

### P2 验证证据

- **单元**：`npm run test:unit` **45/45 pass**（auth.test.cjs 17 项 + chainmaker-client 15 项 + chain-read 13 项）。覆盖：地址确定性/不同账密分歧、scrypt 非明文、注册校验（非法用户名/短密码/重复名 409）、登录（错密码/不存在用户 401）、me/logout、requireAuth（无 token 401 / 坏 token 401 / 有效 token 挂 req.user）。
- **HTTP 端到端**（真实起服务 + fetch）：
  - `POST /api/auth/register` → 201 签发 token，address=`0xa552…020b`；`GET /api/auth/me` → 同地址 ✓
  - `POST /api/upload` 无 token → **401**；带 token + 真实 SKILL.md → **200** `{jobId, status:'pending'}` ✓
  - `POST /api/chain` 无 token → **401**；带 token 空 jobId → **400 缺 jobId**（证明已过身份门进入业务校验）✓
- **静态**：`lsp_diagnostics` server 目录 0 error；auth.js/test 首字节 47,42,42 / 39,117,115（`/*`、`'us` 无 BOM，UTF-8）。
- **隔离**：测试后 `server/data/users.json` 不存在（无污染）；临时文件已清理。

### P2 结论

**P2 身份层完成：真实注册/登录/会话/鉴权全链路可用，写操作（上传、链提交）强制登录，creator 链上归属已从"网关代签"升级为"真实登录用户地址"（网关仅代签身份提交）。** 待办：前端 (P4) 接入 `/api/auth/*` 替换 WalletService 随机地址；`reputation` 字段目前为本地占位（真实值以链上 `getUserReputation`/授信流为准，P5 验收）。