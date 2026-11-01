# 声誉/激励/排行榜 生产上线审计（真实实现 vs Mock/空桩）

- 日期：2026-09-21
- 方式：源码逐行核查 + 后端真链端点直接实测（localhost:10002, chain1）
- 结论先行：链上合约与读管线为**真实实现**（非 mock），但**激励数据全部为 0、点赞无任何持久化、多处演示兜底与空桩未清理**——不满足生产上线"零 mock、自明自解释"标准。

---

## 1. 用户问题逐条回答（基于实测证据）

### 1.1 "我的声誉菜单后面的数字是什么意思？"

**来源：`src/main.jsx:34`**

```jsx
{ id: 'profile', label: `${t('nav.profile')} (${user.reputation || 0})` }
```

- 该数字 = **本地内存对象 `user.reputation`**，非链上、非持久化。
- `WalletService.init()` 新身份时 `reputation: 0`（`WalletService.js:44`）。
- 点赞时 `SkillBrowser.handleLike` 里 `user.reputation += 2`（`SkillBrowser.jsx:62`）——**只改 React state，不写 localStorage、不调后端、不上链**。刷新页面即回 0。
- 实测 `/api/reputation/<任意地址>`：`reputation:0, effectiveReputation:0, locked:0, ...` 全 0。
- **判定：数字含义 = 本地会话内赞点数的 2 倍（刷新即失）。误导性极大——导航显示"声誉"却与链上真实声誉（0）无关。**

### 1.2 "激励面板里面的内容是什么意思？"

**`src/pages/DeployerDashboard.jsx`（导航"激励面板"→ DeployerDashboard）**

| 区块 | 含义 | 真实？ |
|---|---|---|
| `stats.domain` | 数据域标识 "AgentEcosystem (chain1)" | 真实（L66） |
| `totalUsers` / `activeUsers` / `totalRewardsDistributed` | 来自 `/api/stats` → AgentEcosystem 合约 `totalUsers/activeRoles/totalRewardsDistributed` | **真实查询**，但实测全为 0（合约有方法、链上无记录） |
| `tier` | **硬编码 `tier: 1`（Silver）**（L67）——不按数据计算 | ❌ 假逻辑 |
| `pendingRewards: 0` | 注释"v1 分红概念已下线，恒为 0" | 明确下线残留 |
| 推荐链接 `https://agent-skills.xyz/ref/...` | 注释自己承认"推荐链接为产品机制演示（链上无对应合约存储）"（L75-76） | ❌ **演示假数据** |
| `handleRegister` 调用 | 注释"// Handle register (placeholder)"，只 `alert(registerUnavailable)` | ❌ **空桩** |
| 后端不可达兜底 | `totalUsers:23, activeUsers:18, totalRewards:4500, pendingRewards:1200`（L83-91） | ❌ **mock 演示数据** |
| 三级 tier（青铜/白银/黄金） | 阈值 0/50/100 用户（L14-18），仅作展示 | UI 真实渲染，但 tier 值永远 1 |

### 1.3 "排行榜里的积分和声誉，白银黄金积分这些，都真实实现了吗？"

**`src/pages/Leaderboard.jsx` + 后端 `/api/leaderboard`（真链）**

| 项 | 真相 |
|---|---|
| 排行榜数据源 | **真实**：`chain-read.js getLeaderboard()`（chain-read.js:215）聚合技能 owner ∪ 镜像提交者 → 并行查 AS_Staking 声誉 → 确定性排序。实测返回 1 条：`0x3737...ecf3 声誉0 skillsOwned:7 rank1` |
| 声誉列 | **真实链上**（getUserReputation），但实测全为 0 |
| `totalLikes` 列 | `mapLeaderboardEntry` 恒 0："chain1 无点赞数据"（ChainDataService.js:83）——**显示无数据来源的列** |
| `flagged` 列 | 恒 0："链上无违规计数字段"（ChainDataService.js:84）——同上 |
| G/S/B 徽章 | `getRankClass`（Leaderboard.jsx:62-67）按 index 0/1/2 标金/银/铜——纯 UI 装饰，非链上等级 |
| 失败/空兜底 | `demoUsers` 硬编码 5 条假地址（Leaderboard.jsx:5-11）`0x1234...abcd 声誉5000` 等——❌ **mock**，仅当链上数据为空/出错时展示且**无任何"演示数据"标识** |
| 界面自明性 | 空兜底时从 `fromChain` 徽章消失，普通用户根本看不出是假数据 | ❌ 严重 |

**"白银黄金积分"**：DeployerDashboard 的 tiers（青铜/白银/黄金，按用户数 0/50/100）与排行榜 G/S/B 徽章是两套不同概念，均无真实积分（RP 概念仅 UI 后缀 `stat-unit RP`，链上无 token、无积分余额）。

### 1.4 应用场景是什么？

- 论文《Responsibility Vacuum in Agent Skill Ecosystems》原型。宪法：**无代币**（`CONSTITUTION.md`），声誉即唯一激励资产。
- 声誉本应作为治理/信任信号：等级（观察者1→贡献者2→信用者3→守护者4→长老5，阈值 100/500/2000/5000）、排行、激励面板（部署者拉新）。
- **期望链路**：点赞 → `AS_Staking.likeSkill()` 链上 +2 → 声誉增长 → 升级/排行。**实际链路：点赞只改前端内存，链上 `likeSkill`（StakingManager.sol:208）从未被调用。**

### 1.5 界面是否完全自明？

**否。** 不满足"自明/自我解释/一目了然"：

1. 导航"我的声誉 (N)" = 会话内本地值，与链上真实声誉（0）矛盾，无任何标识。
2. 排行榜/技能浏览器在链上为空时静默降级到硬编码 demo 数据，无"演示数据"水印。
3. 激励面板 tier 恒 Silver、pendingRewards 恒 0、推荐链接是演示链接，无说明。
4. UserProfile 的 `userRank = Math.floor(10000/(rep+1))`（UserProfile.jsx:92）——**"全球排名"是数学公式伪装，不是排行榜真实 rank**；`globalRank` 从未调用 `/api/leaderboard`。
5. UserProfile vesting 区块（L93-102）：`vestingProgress=(rep/1000)*30` 是模拟进度条，`handleVest` 只 `alert`——**v1 token vesting 已下线但 UI 未删**。
6. `profile.connectedToContract` 徽章仅在 `fromChain` 时显示——兜底路径无警示。

---

## 2. 真实现（非 mock，可保留）

| 模块 | 证据 |
|---|---|
| 6 合约在 chain1 部署（AS_Staking/SkillRegistry/Attribution/AgentEcosystem/DaoGovernance/ReputationBadges） | `CONTRACTS` 表（chainmaker-client.js:37-66）+ `/api/stats` 实测返回全部地址 |
| 技能上链 `registerSkill` | `chain-submit.js:111-123` 真实 cmc invoke，实测 skillCount=7 |
| 技能列表/详情读管线 | `chain-read.js listSkills/getSkillById` TTL 缓存 + 真实查询 |
| 声誉/排行榜/stats 后端聚合 | `chain-read.js:173-318` 全部真 cmc 查询，实测返回结构正确 |
| 前端映射层诚实处理 | `ChainDataService.js` 注释明确"链上无点赞/违规字段→0、无全局注册表→coverageNote" |
| Worker 上传→审计→链管线 | 前次已验收（audit-agent 真实跑 Python，修复后无 review 死锁） |

**关键**：读管线零 mock，数据 0 是**真实的 0**（合约部署后无激励动作发生）。问题不在管线，在**激励动作从未被驱动**+**UI 兜底用假数据**。

---

## 3. 必须修复清单（mock/空桩/误导）

| # | 文件:行 | 问题 | 类型 | 建议 |
|---|---|---|---|---|
| M1 | SkillBrowser.jsx:14-18,32-39 | `demoSkills` 硬编码 + 空兜底 | mock 数据 | 删 demoSkills；空/错→显示空态+错误提示 |
| M2 | Leaderboard.jsx:5-11,34-41 | `demoUsers` 硬编码 + 空兜底 | mock 数据 | 同 M1；空→"暂无数据"+coverageNote 展示 |
| M3 | DeployerDashboard.jsx:83-91 | 后端不可达→假 stats(23/18/4500/1200) | mock 数据 | 删兜底；错误态重试 |
| M4 | DeployerDashboard.jsx:111-114 | `handleRegister` 空桩 | 空桩 | 实现注册或移除按钮+说明 |
| M5 | DeployerDashboard.jsx:67 | `tier:1` 硬编码 | 假逻辑 | 按 totalUsers 阈值真实计算 |
| M6 | DeployerDashboard.jsx:76-78 | 推荐链接演示（链上无存储） | 空功能 | 标注"演示"或移除 |
| M7 | UserProfile.jsx:92 | `userRank` 公式伪装排名 | 假实现 | 接入 `/api/leaderboard` 查真实 rank 或删除该卡片 |
| M8 | UserProfile.jsx:93-102 | vesting 模拟进度+alert 空桩 | 空桩+假 UI | 删除 vesting 区块（v1 已下线） |
| M9 | WalletService.js:90-93 | `signTransaction` 返回假 hash | demo 残留 | 删除或改为拒绝并提示走网关 |
| M10 | SkillBrowser.jsx:48-70 | 点赞只改内存，无持久化 | **核心假实现** | 接后端 `/api/like`→链上 `AS_Staking.likeSkill()`，前端只读状态；或明确降级为"本地演示"并隐藏声誉数字 |
| M11 | main.jsx:34 | 导航声誉数字=本地值误导 | 误导 UI | 改显示链上声誉（轮询 `/api/reputation`）或移除数字 |
| M12 | 所有兜底路径 | 无"演示数据"警示 | 自明性 | 兜底必须带显式警告条（如 `badge badge-warning`"演示数据"） |

---

## 4. 测试覆盖缺口

- `test/contracts/*.test.cjs` 覆盖合约单测（likeSkill/stake/slash 等），但**无"前端点赞→链上 +2→排行榜变化"端到端测试**。
- 无 `/api/like` 端点（后端仅 9 个路由，index.js:81-240），即点赞链路从未被设计为端到端。
- 无"空链数据 → 空态 UI"测试；现状是空链 → demo 兜底 → 掩盖问题。

---

## 5. 生产上线判定

- **数据读取侧**：✅ 真实（零 mock 管线）。
- **激励机制侧**：❌ 未上线（链上方法存在、无人调用；UI 显示的是会话内存假象 + mock 兜底）。
- **自明性**：❌ 多处数字无来源解释、无演示数据标识。
- **结论**：当前状态为"可浏览真链数据的演示原型"，**不满足"生产上线、完全可信"**。需按 §3 清单清理，并按 §4 补端到端测试。