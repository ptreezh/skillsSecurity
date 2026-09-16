# 彻底消除占位/原型/mock/stub 设计（ChainMaker 落地版）v0.3

日期：2026-09-15
状态：**v0.3 定稿（grill-down 两轮 18 项攻击全部闭环）**
目标链：长安链 ChainMaker solo（chain1，`enable_gas: false`，`addr_type: 2`）
宪法硬约束：零代币（no tokens ever）、零启动成本、声誉激励（reputation-based incentives only）

### 核心决策速查（v0.3 最终版）

| 决策 | 选 A/B | 原因 |
|---|---|---|
| 治理执行权限 | **去掉 onlyTimelock，期满可公开执行** | GovernanceTimelock 用 delegatecall → enable_gas=false 下永久锁死（grill-down #8） |
| 治理动作 | **3 个真实动作**：UPDATE_REWARD_CONFIG / PAUSE / UNPAUSE | DELETE 占位三枚举 + TRANSFER_TOKENS + veto；UPDATE 真实调 ReputationIncentives（grill-down #4, #15） |
| 投票权重来源 | **纯声誉**（去掉 token + deployer 黑盒） | 代币合约弃用；DeployerRewards 不可靠（grill-down #9） |
| 声誉权威源 | **只存 StakingManager.userReputation** | 禁止平行系统；ReputationIncentives 是写入者（grill-down #1） |
| 安全修复 | **setPositiveContribution + onlyGovernance** | 原来无权限 → 任何人开绿灯（grill-down #10） |
| 前端身份模式 | **后端代签 /api/identity** | 联盟链管理员代签符合零启动宪法（grill-down #12） |
| 链交互 | **后端 docker exec cmc（mvp）** | ChainMaker 无标准 JSON-RPC → ethers.js 直连死亡；Go SDK 为 Phase 2（grill-down #13） |
| zip 提取 | **新增 adm-zip** | 纯 JS、零原生依赖、最轻量（grill-down #14） |
| 测试收敛 | **只删 contracts/test/ 与 tests/；test/contracts/ 为正式** | CI 显式路径不受影响（grill-down #16） |

---

## 1. 问题定义

"占位/原型/mock/stub" 指：代码存在但并不产生真实效果，或依赖不可运行假设的实现。全仓扫描后分三层：

### 1.1 合约层（23 个 .sol）

| 合约 | 状态 | 问题 |
|---|---|---|
| SkillRegistry / StakingManager / Attribution | 已部署（6 中 3） | ✅ 真实可用。但 StakingManager 缺 `addReputation`/oracle 接口，无法支撑声誉激励闭环 → 需扩展 |
| ASKToken / DeployerRewards / RevenueDistributor | 已部署 | deprecated=true，全部操作函数 revert（仅 view 可读）。与零代币宪法一致，但属于"假活"部署，必须从源码/部署/前端引用中移除 |
| SelfSustainingEcosystem | 未部署 | generateHealthReport() 硬编码全 0（stub）；claimRewards() 用 `.call{value:}`（enable_gas:false 下不可运行）；roleBaseReward 用 `100 ether`（代币残留） |
| RevenueSplit | 未部署 | `require(msg.value > 0)`（enable_gas:false 下不可运行；收费模式违背宪法） |
| HealthReporter | 未部署 | `_transferReward` 用 `askToken.transfer`；rewardConfig 50/10/100 ASK 代币奖励；前端引用但它未部署（幽灵引用） |
| DAO/Governance | 未部署 | TRANSFER_TOKENS 动作依赖 IERC20 转账；UPDATE_TIER/REWARD/DISTRIBUTION 三动作为占位注释；getTotalVotingPower() 硬编码 `1000000e18` |
| DAO/Treasury | 未部署 | `.call{value:}`（enable_gas:false 下不可运行） |
| GovernanceTimelock | 未部署 | delegatecall（enable_gas:false 下不可运行） |
| AgentGovernor / AgentVotes / AgentTimelock / AgentPausable / ReputationVotes | 未部署 | OZ 代币治理栈（IVotes token 依赖），与宪法冲突，仅 deployCore.js 引用 |
| ReputationBadges | 未部署 | ERC721 徽章（不可转移）。功能完整，但引入 token 标准 → 改为纯声誉事件记账 |
| MockERC20 / MockDeployerRewards | 测试 | 测试 mock（合理，随被测合约存活期保留） |

### 1.2 前端层

| 文件 | 问题 |
|---|---|
| WalletService.js | init() demo 模式：随机地址 `'0x'+Math.random()...`、`balance: 100`（Airdrop 100 ASK——代币思维、假连接） |
| ContractService.jsx | 硬编码 Polygon Amoy（chainId 80002、rpc-amoy.polygon.technology）；引用 8 个 ABI 含未部署的 HealthReporter/Governance；ethers 直连假设（ChainMaker 无标准 JSON-RPC → 永远连不上） |
| DeployerDashboard.jsx | 硬编码假 stats（demo.agent-skills.xyz、totalUsers:23、totalRewards:4500）；handleRegister 是 placeholder alert |
| ProtocolDemo.jsx | demo mode 默认 true，依赖 WalletService demo |

### 1.3 后端层

| 文件 | 问题 |
|---|---|
| chain-submit.js | mock 降级路径（未配置 → 假 txHash）；真实路径用 ethers.js JsonRpcProvider 指向 Polygon Amoy（**ChainMaker 无标准 JSON-RPC，永远连不上**） |
| audit-trigger.js | zip 提取 TODO → `skillContent = 'ZIP file - needs extraction'` |
| index.js | health 端点 `network: 'Polygon Amoy'` 硬编码 |

---

## 2. 核心架构事实（方案地基，已实测验证）

1. **ChainMaker EVM 不提供标准 Ethereum JSON-RPC** → ethers.js 直连死亡。链交互只能 cmc CLI / Go SDK。已验证工作流：`docker exec cmc-debug` + cmc 脚本法。→ 前端无法直连链，必须走后端桥接。
2. **enable_gas: false** → 无原生币 → 所有 `msg.value`/`.call{value:}`/`transfer` 语义不可运行 → RevenueSplit / Treasury / SelfSustainingEcosystem.claimRewards / HealthReporter._transferReward 全部死刑。
3. **零代币宪法** → ASKToken 全 revert 是正确行为；但所有"ASK 转账/余额/空投"思维必须清除。
4. **零启动成本宪法** → ChainMaker 联盟链交易由后端管理员账户（admin1 等）代签 → 前端无需钱包。WalletService 随机地址伪造必须删。
5. **声誉权威源 = StakingManager.userReputation（int256 映射）**：已含 stake/slash/like/recover/lock 机制 —— **绝不另建平行声誉系统**。激励层只负责"给该加声誉的行为增加声誉"，通过扩展 `addReputation` 接口写入唯一权威源。
6. **链上合约物理不可删除**（长安链 EVM 无销毁语义）→ "删除" = 源码移除 + 停用 + 前端/部署引用清除 + 文档标注弃用。旧 6 合约中 3 个 deprecated 合约链上残留但不再被任何代码引用（诚实标注）。

---

## 3. 设计方案 v0.2（收敛集：少而真）

### 3.1 单一事实源原则（grill-down 修正 #1）

声誉只存在于 **StakingManager.userReputation**。所有激励（健康报告、治理投票、徽章）都是它的读取者或写入者，不复制状态。

### 3.2 合约层：v2 收敛部署集（全新统一部署，一次性对齐）

**改造粒度新认知（grill-down 第二轮）：** 目标合约不是"全假"，而是"机制真 + 依赖假"。改造原则 = **保留真实机制，剪除假依赖**，而非推倒重写。

**保留并扩展（v2 重部署）：**

1. **SkillRegistry** ✅ 逻辑不动（技能指纹注册/归属）
2. **StakingManager** ✅ 扩展新增：`addReputation(address,int256) external onlyReputationOracle` + `setReputationOracle(address)`（onlyOwner）+ **`setPositiveContribution` 加 `onlyGovernance` 修饰**（grill-down #11：现有无权限 → 任何人可为任何人开绿灯 → 严重漏洞）；其余逻辑不动（stake/slash/recover/like 闭环已真实）。**改造粒度：最小增量，不动已验证逻辑**
3. **Attribution** ✅ 逻辑不动（贡献归属追踪）

**改造后部署（机制保留 + 假依赖剪除）：**

4. **ReputationIncentives（改造 SelfSustainingEcosystem，不新建）**：
   - **保留**：Role/Tier 枚举、registerRole、upgradeTier、recordContribution、calculateRewards、tierConfigs（机制真实）
   - **剪除**：claimRewards() 中 `.call{value:}` → **删除**（无 ETH 可发）；receive() payable → 删除；`100 ether` 等单位 → 改为纯声誉分数标量（100/50/75/60/200/40）；addRewards 语义 = 调 `stakingManager.addReputation` 写入权威源
   - **补全**：generateHealthReport() 硬编码全 0 → **真实聚合** SkillRegistry 技能数 / StakingManager 质押与用户数 / Attribution 贡献数 / 自身 totalContributions；submitReport() + 防刷校验（grill-down #13：报告唯一性 skillId+reportHash 去重 + 时间窗口限频；女巫检测边界在后端身份层，合约层诚实标注此边界）→ 声誉奖励 via `stakingManager.addReputation(reporter, reward)`
   - **新增**：`setRoleBaseReward(Role,uint256) external onlyGovernance`（grill-down #15：Governance 治理动作目标，使提案-投票-执行周期真实可执行）
   - 声誉写入者角色：本合约被 `stakingManager.setReputationOracle` 授权（grill-down 修正 #1）
5. **Governance（机制保留 + 假依赖剪除）**：
   - **保留**：Proposal 结构、createProposal、vote、execute（含内部 TIMELOCK_DELAY 检查）、cancelProposal、pause/unpause、QUORUM/MAJORITY 参数（机制真实）
   - **剪除**：askToken 依赖（getVotingPower tokenVotes 项、TRANSFER_TOKENS 动作）、deployerRewards 黑盒（castGoldVeto 依赖已弃用合约 → 删除 veto 权限）→ 声誉是唯一投票权重；timelock 地址依赖（grill-down #8）
   - **关键修正（grill-down #8）**：`execute()` 原 `onlyTimelock` 修饰 → **移除**。原因：GovernanceTimelock 用 delegatecall，ChainMaker enable_gas=false 下永久不可执行 → execute 会被锁死。延迟已由内部 `proposalTimelockEndTime[proposalId]` 检查实现（line 198），外部 timelock 合约在零 gas 环境下无意义。改为 timelockEndTime 期满后公开可执行（同 OZ Governor 标准模式：`callable by anyone` after delay）。
   - **关键修正（grill-down #9）**：`castGoldVeto` → **删除**。依赖 DeployerRewards.isGoldTier（已弃用合约），引入新不可靠假设。精简治理 = 提案 + 投票 + 执行，无否决权。
   - getVotingPower(account) = 纯声誉权重 `userReputation / 1000`（无 token/deployer 项）+ `MIN_VOTING_POWER = 100` 门槛保留（需真实声誉才能提案）
   - getTotalVotingPower() = **增量维护 state 变量**（addReputation/slash 时 StakingManager 同步调 `governance.addTotalVotingPower()`；或 Governance 暴露 `updateTotalVotingPower(address,int256)` 由 ReputationIncentives / StakingManager 调用）
   - **白名单动作**：DELETE 三个 UPDATE_* 占位枚举 → 改为真实 `UPDATE_REWARD_CONFIG`（调 ReputationIncentives.setRoleBaseReward）；保留 `PAUSE_CONTRACT` / `UNPAUSE_CONTRACT`（已真实）；总枚举从 6 个精简到 3 个真实动作
   - `_executeWhitelistAction` 中 `case UPDATE_REWARD_CONFIG`：通过接口调 `IReputationIncentives(target).setRoleBaseReward(role, amount)` —— 要求 ReputationIncentives 暴露 `setRoleBaseReward(Role,uint256) external onlyGovernance`（grill-down #15）
6. **ReputationBadges**：ERC721 → **纯声誉事件记账**（mapping 记录徽章 + 事件，零 token 标准），保留"不可转移声誉凭证"概念，前端读取路径同步

**删除/归档（源码移到 `contracts/legacy/`，不部署，引用全清）：**

- ASKToken、DeployerRewards、RevenueDistributor（deprecated 假活）
- RevenueSplit、DAO/Treasury（ETH 依赖）
- GovernanceTimelock（delegatecall）、AgentGovernor、AgentVotes、AgentTimelock、AgentPausable、ReputationVotes（OZ 代币治理栈）
- HealthReporter（并入 ReputationIncentives）
- 关联 interfaces（IDeployerRewards、IRevenueSplit、IReputationBadges 按存活情况处理）

**保留：** MockERC20、MockDeployerRewards 仅测试用

### 3.3 后端层

1. **新增 `server/chainmaker-client.js`**：封装 cmc 调用（`docker exec cmc-debug` 脚本法，复用已验证流程），提供 `submitSkillRegister()` / `querySkill()` / `callView()`；签名用管理员账户配置（admin1 私钥/共识者配置）
2. **chain-submit.js**：
   - 删除 `submitToChainMock`（未配置 → 明确抛错，绝不假成功）
   - `submitToChainReal` 改用 chainmaker-client（不再 ethers.js + Amoy）
   - `getSkillFromChain` 改 cmc 真实查询
3. **audit-trigger.js**：实现 zip 真实提取（adm-zip/unzipper 读 `.SKILL.md` 全文）
4. **index.js**：health 端点 network → "ChainMaker (chain1)"；地址读 env 真实 ChainMaker 地址；新增 `/api/identity`（返回当前代签身份）与 `/api/chain/*` 读接口

### 3.4 前端层

1. **WalletService.js**：删 demo 随机地址/假 balance/Airdrop → "身份模式"：调后端 `/api/identity` 获取代签身份；未配置 → 明确未连接禁用态
2. **ContractService.jsx**：删 Polygon Amoy 硬编码；所有链操作改后端 REST（`/api/chain/*` 桥接 cmc）；ABI 收敛到 v2 部署集（移除 HealthReporter/Governance 旧 ABI、ASKToken/DeployerRewards/RevenueDistributor 引用）
3. **DeployerDashboard.jsx**：删假 stats → 后端真实接口（技能数/质押/声誉）；handleRegister 占位 alert → 真实注册 API（失败显示真实错误）
4. **ProtocolDemo.jsx**：删 demo mode；未连接明确提示

### 3.5 部署与文档产出

- 新 `scripts/deploy-core-v2.js`：按 StakingManager → SkillRegistry → Attribution → ReputationIncentives → Governance → ReputationBadges 顺序部署 + 接线（setStakingManager / setReputationOracle / setGovernance）
- 链上验证：6 合约全量 cmc 实测（非 mock）
- 更新 deployments 三件套 + launch-readiness-report.md（95% → 100% 无占位）
- 更新 contracts/AGENTS.md
- 测试：新增三合约的 Hardhat 测试；删除指向旧合约的测试；**收敛测试目录**（test/contracts/ 保留为正式；contracts/test/ 旧测试与 tests/ 中指向旧合约的删除或归位）

---

## 4. 分层交付顺序（尊重"先合约层"偏好）

1. **W1 合约层**：改造/新增 6 合约 → 单测通过 → 部署 v2 到 chain1 → cmc 全量链上验证
2. **W2 后端层**：chainmaker-client + chain-submit 真实化 + audit zip 提取 + 新 REST 端点
3. **W3 前端层**：WalletService / ContractService / Dashboard / ProtocolDemo 去 mock
4. **W4 收尾**：三件套 + 报告 + AGENTS.md + 测试目录收敛

每层验收：`npx hardhat test <file>` + cmc 链上实测（非 mock）+ `npm run build` 通过。

---

## 5. Grill-down 记录（钢铁人思辨，持续追加）

### 首轮攻击（v0.1 → v0.2）

| # | 攻击 | 结论 | 修正 |
|---|---|---|---|
| 1 | ReputationLedger 独立记账 vs StakingManager.userReputation 权威源 → 双声誉系统分裂 | 成立，严重 | 单一事实源原则：声誉只存 StakingManager，激励层只做写入者/读取者（3.1） |
| 2 | getTotalVotingPower 实时遍历所有用户 → gas 爆炸/链上不可行 | 成立 | 增量维护 state 变量（3.2.5） |
| 3 | HealthReporter 与 SelfSustainingEcosystem 合并后"健康报告"语义是否保留 | 保留 | ReputationIncentives.submitReport + generateHealthReport 真实聚合 |
| 4 | Governance UPDATE_* 占位动作 → 实现 vs 删除 | 无真实存储则删除，绝不假装实现 | 删除三占位动作，保留最小真实治理 |
| 5 | ReputationBadges 去 ERC721 后前端读取路径变化 | 成立 | 前端读取同步改（3.4.2） |
| 6 | 需确认 SkillRegistry/StakingManager/Attribution 是否引用 ASKToken（若引用则删 ASK 破坏核心） | **实测：三者完全不引用** ✅ | 删除 ASK 安全 |
| 7 | 三件套已部署，若要加接口（addReputation）必须重部署 | 成立 | v2 收敛集统一重部署，旧 deprecated 合约链上残留诚实标注 |

### 第二轮攻击（v0.2 → v0.3）

| # | 攻击 | 结论 | 修正 |
|---|---|---|---|
| 8 | Governance.execute() 是 `onlyTimelock` 修饰，但 GovernanceTimelock 用 delegatecall → ChainMaker enable_gas=false 下永久不可执行 | **成立，致命**（execute 被锁死） | 移除 onlyTimelock 修饰；延迟由内部 proposalTimelockEndTime 检查覆盖；timelock 状态变量与构造参数删除（3.2.5） |
| 9 | castGoldVeto 依赖 DeployerRewards.isGoldTier → 已弃用合约引入新假设 | 成立，不引入新依赖 | 删除 castGoldVeto；治理 = 提案 + 投票 + 执行，无否决权（3.2.5） |
| 10 | setPositiveContribution() 无任何访问控制 → 任何人可为任何人开绿灯 → 打通声誉恢复免费通道 | **成立，严重漏洞** | 加 `onlyGovernance` 修饰（3.2.2） |
| 11 | StakingManager.slash 是 onlyGovernance → v2 新 Governance 必须接线 | 成立，部署必须对齐 | deploy-core-v2.js 顺序：StakingManager → Governance → setGovernance()（3.5） |
| 12 | 前端"身份模式"是否违背零启动宪法（是否需要用户注册流程） | **不违背**。ChainMaker 联盟链 = 管理员账户代签交易。后端 /api/identity 返回代签身份；前端无钱包、无私钥、无 gas → 符合零启动 | 维持方案，文档化代签架构理由（3.4.1） |
| 13 | cmc docker exec 每次容器进程创建 → 延迟/并发问题；vs Go SDK 生产化 | mvp 阶段可接受。docker exec 串行 + 队列确保顺序；后续 Go SDK 路径文档化为"生产化升级路径"，不阻塞 v2 | mvp 用 docker exec（已验证工作流）；文档中标注 Go SDK 作为 Phase 2 优化（3.3） |
| 14 | package.json 无 zip 依赖 → audit-trigger 无法提取 .SKILL.md | 需新增依赖。adm-zip（纯 JS，零原生依赖，最轻量）vs unzipper（流式，更重）| 选 `adm-zip`（同步提取，代码简单）；npm install adm-zip（3.3 + W2） |
| 15 | Governance UPDATE_* 占位动作 → 删掉后"治理能做什么"？纯 pause/unpause 是否配得上"治理"之名 | 不够。纯 pause/unpause 是紧急开关，不是治理。保留 `UPDATE_REWARD_CONFIG` 作为真实动作 → 调用 ReputationIncentives.setRoleBaseReward() | 治理动作枚举精简为 3：UPDATE_REWARD_CONFIG / PAUSE_CONTRACT / UNPAUSE_CONTRACT，全部真实可执行（3.2.5） |
| 16 | 测试目录收敛（删 contracts/test/ 与 tests/）对 CI 的影响 | **无影响**。security.yml 显式列出 `test/contracts/{StakingManager,SkillRegistry,Attribution}.test.cjs`；contracts/test/ 与 tests/ 不在 CI 路径内 → 安全移除 | 只删除/归档旧目录；test/contracts/ 为正式目录；新增测试写入此目录（3.5） |
| 17 | ReputationIncentives 防刷边界：女巫账户（批量注册地址）| 合约层能做的是：报告唯一性去重（skillId + reportHash）+ 时间窗口限频。**女巫检测在后端身份层**（ChainMaker 代签身份由管理员分配，非开放注册） | 合约层诚实标注边界；后端身份映射承担女巫检测（3.2.4） |
| 18 | getVotingPower `repVotes = reputation / 1000` → 声誉 <1000 的用户零治理权重 → 沉默大多数 | 可接受。MIN_VOTING_POWER = 100（提案门槛）+ 投票权重 = 声誉/1000 → 声誉 1000+ 才有实际投票力；新用户通过贡献积累声誉自然进入治理，符合渐进式去中心化 | 保留机制，文档化渐进式设计意图 |

---