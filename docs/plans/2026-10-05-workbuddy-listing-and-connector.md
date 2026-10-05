# Plan: open.workbuddy.cn 上架与连接器改造

**Level:** T2 — 上架路径涉及外部平台合规、不可逆的公开提交、以及架构取舍
**Status:** draft (rev.2 — 代码审计触发第二轮 grill，收敛门禁已重开)
**Owner:** —
**Last updated:** 2026-10-05

---

## 1. Goal

**实际目标**（而非字面请求）：让 AgentSkills 系统的能力在 WorkBuddy 市场里**可被真实用户使用**，同时不破坏论文级研究诚信、不引入不可持续的基础设施负担。

请求里其实是**两个不同的产品**，要求差异极大，必须分开决策：

| 问题 | 性质 | 结论位置 |
|---|---|---|
| 「这个项目如何上架」 | 发布 **技能** | §3 方案 A |
| 「是否可以改造适合连接器」 | 发布 **连接器** | §3 方案 B/F |

**成功，可观测：** 市场搜索可见 → 用户安装 → 至少 1 个技能在真实对话中被成功调用（非仅安装）。

**可逆性：** 技能上架近似单向（公开后有历史记录，但可下架）。连接器提交后进入审核队列，撤回成本低。**因此先做可逆性差的技能路径。**

**明确不在范围内：**
- Buddy 应用 / 第三方应用 / 专家团（方案 D，比例失衡，见 §4 钢铁人）
- 公开链（EVM）部署（AGENTS.md 记载该路径已被移除，不复活）
- 修改 `CONSTITUTION.md` 的无代币架构

---

## 2. 系统图

- **边界：** AgentSkills 的 **skills + connectors** 子包（`agentskills-workbuddy-package`）与后端 `server/`。**论文本身不是上架物。**
- **角色与真实激励：**
  - 平台方（腾讯）：生态资产数（首页宣称「10万+生态资产」）→ 倾向低门槛、标准化接入
  - 用户：想要能直接用的能力，最反感需要自己配服务器的技能
  - 研究者（本项目）：论文可信度 > 市场曝光。**这是关键激励错位点。**
- **硬约束：**
  - 实名认证：中国大陆二代居民身份证 + 实名手机号 + 人脸核身（**港澳台/外籍证件不支持**）
  - 远程 MCP **必须 HTTPS**；建议可用性 ≥ 99.9%；单次请求 ≤ 30s
  - 一个连接器**只能配一个 MCP Server**，MCP 与 CLI 方案不可混用
  - `source` 全局唯一，kebab-case
  - 不得在任何文件硬编码真实凭证
- **软约束：** 描述建议 20~100 字；`examples_zh/en` 各 2~5 条
- **反馈回路：** 技能安装量 → 使用反馈 → 迭代（延迟以周计）；连接器审核 → 市场同步（文档称更新约 10~15 分钟同步生效）
- **二阶效应（rev.2 已实现部分）：** 原推演为「上架后技能被真实使用 → 暴露 `skill-registry` 的后端依赖 → 迫使后端决策」。实测发现该依赖比预想更深——是契约级错误而非配置问题，故在**上架前**即已暴露并修复（D2）。剩余未解风险转为 R10（链上表述边界）与 R2（认证）。

---

## 3. 备选方案

| # | 方案 | 一句话描述 | 机制族 | 服务器 |
|---|---|---|---|---|
| 0 | **E 不上架** | 保持研究制品，不进市场 | — | 无 |
| 1 | **A 仅技能上架** | 6 个技能逐个提交技能市场 | 自助内容分发 | **无** |
| 2 | **B 远程只读 MCP 连接器** | 公网 HTTPS + MCP server 暴露只读工具 | 常驻服务 | **需要** |
| 3 | **C stdio MCP 连接器 + 内置种子数据** | WorkBuddy 在用户机跑 MCP，数据打包随包分发 | 进程内工具 | **无（可选）** |
| 4 | **D Buddy 应用** | 完整前端应用打包上架 | 独立产品 | 需要 |
| 5 | **F skill-only 连接器** | 官方 `type: skill-only`，把技能作为连接器上架以获得市场曝光 | 自助内容分发 + 平台审核 | **无** |

> **F 于 rev.2 新增**：官方 `connector-meta.json` 的 `type` 枚举含 `skill-only`。
> 它是「零服务器」与「连接器曝光位」的唯一交集——不需要 MCP server，却能进入连接器市场。
> 待确认：该类型的专属必需文件结构官方未单独展开。

distinctness 检查：1 与 2/3 是不同机制族（内容 vs 服务 vs 进程）；2 与 3 同为 MCP 但传输层与运维模型完全不同；4 机制族完全不同；5 与 1 机制族相同（内容分发），差别在于**分发位与审核路径**（技能自助 vs 连接器审核），不构成独立机制族，故不重复计入独立方案数，但作为 1 的增强位单列。**通过。**

---

## 4. 钢铁人记录

### 钢铁人：E 不上架

项目的本质交付物是论文（AGENTS.md：26 个规划阶段已完成，v1.1–v1.7）。上架一个依赖私有链的研究原型，等于在公开市场建一个无法验证的Facade。更糟的是：论文核心发现是「Agent 技能生态中的责任真空」，而如果本项目自己上架一个无法验证责任归属的技能，等于用自己的行动实证了自己的论点。**研究诚信 > 市场曝光。** 且入驻认证需要身份证+人脸或营业执照，若不具备则整条路径不通——那么工程投入的边际收益为零。

### 钢铁人：A 仅技能上架（推荐）

技能才是产品的真实形态。审计、发布、注册、部署这 4~6 个技能本身就是能力单元，不依赖任何后端。实测：**6 个技能中 5 个对 localhost:10001 零耦合**，且**全部 6 个 frontmatter 已满足上架必填项**（description_zh / description_en / version / author）。这意味着方案 A 的工作量接近于「整理 + 提交」，而非「改造」。技能市场是技能该去的地方；连接器是给第三方服务用的。渐进降级良好：不需要服务器、不需要可用性承诺、不需要鉴权设计。

### 钢铁人：B 远程只读 MCP 连接器

这是唯一让**系统本身**（而非其文档）被别人使用的方案，也才真正兑现论文所声称构建的东西。只读工具（列表/详情/声誉/排行榜/统计）天然回避了 upload/chain-submit 的鉴权与写操作复杂度，而「查询声誉与排行榜」正是这类研究系统最自然的对外表面。对论文而言，一个能跑通的连接器是比一组 markdown 技能强得多的制品。

### 钢铁人：C stdio MCP + 内置种子数据

反向思考基础设施问题：99.9% 与 HTTPS 的真正目的是「让用户能稳定拿到数据」。若数据本身是**可复现的静态快照**，那么把数据打包进连接器、由 WorkBuddy 托管运行时，就一次性绕过了证书、备案、SLA、扩容、监控、账单全部负担。而且对研究数据集而言，**可复现的静态快照比易变的实时链上读数更诚实**——它不会今天显示 A 明天显示 B。这是「把数据集发布成工具」的成熟模式。

### 钢铁人：D Buddy 应用

平台首页把 Buddy 应用列为第一生态能力，曝光最好、可完全控制 UI。但这是全新前端产品：设计、托管、运维、独立范围。对一个研究原型而言 grossly disproportionate，且 26 个阶段的工作已在别处完成。

### 钢铁人：F skill-only 连接器

技能上架（A）的弱点是**曝光位**：技能散布在市场里，没有一个「AgentSkills」统一入口，用户要装 5 个技能就得分别找到 5 个。连接器市场则天然提供单一入口与统一品牌位。`skill-only` 恰好同时满足「零服务器」与「连接器曝光位」——这是 B（要服务器 + SLA + 备案）和 C（要写 MCP server）都要付代价才换来曝光位，而 F 不用付。对论文而言，一个名为 AgentSkills 的连接器条目比 5 个散装技能更接近「我们构建了一个系统」的论断强度。

代价：连接器需团队审核（技能是自助），摩擦更高、周期更长。**rev.7 更新**：`type: skill-only` 已确认为合法枚举值且属「基础」版本（不需 `minWorkbuddyVersion`），字段层面风险已消除；但官方**未为 `skill-only` 单独公布目录结构**（只定义了 MCP + Skill 与 CLI + Skill 两种接入方式及各自结构），且本仓库**缺 `connector-meta.json` 与 `icon.svg`**（详见 R19/D20）。故 F 的真实成本是「需新建连接器元信息 + 图标 + 猜结构」，而非「把技能换个地方放」。

> **rev.7 实测的 `connector-meta.json` 必填项**：`name` / `name_en`（可补 `name_zh`）、`description` / `description_zh` / `description_en`、`source`（**全局唯一，kebab-case，仅小写字母数字与连字符**）、`examples_zh` / `examples_en`（最低版本 **4.24.0**，故用则**必须**声明 `minWorkbuddyVersion ≥ 4.24.0`）、`icon.svg`（必须）。展示优先级 `name_map > name_zh > name_en > name`，故 `name` 虽可省略，仍建议显式给出以兼容旧客户端。

### 第二轮 grill：代码审计发现（rev.2 触发）

对 `skill-registry` 做实测审计时，发现问题比 R3 描述的「localhost 耦合」严重得多——它**在任何配置下都无法工作**：

1. **端点不存在**：脚本 POST `/api/skills/register`，但全仓库服务端无此路由（`register` 只出现在用户注册与 ChainMaker 合约方法名中）。
2. **传输格式错误**：脚本以 `json=` 发送字符串 `file_path`；而真实 `/api/upload` 使用 `upload.single('file')`，要求 `multipart/form-data` 的二进制文件。
3. **鉴权缺失**：`/api/upload` 与 `/api/chain` 均挂 `auth.requireAuth`，脚本却把 `api_key` 视为可选，且从不执行登录换取令牌。

**结论修订**：原先 R3「用户侧必然报错」低估了严重度——这不是「没配服务器就报错」，而是**架构性契约错误**。它反而强化了 D2 的必要性：解耦不只是去掉硬编码地址，而是必须让脚本对齐真实 API 契约。已按此修订实现（离线 prepare + 真实 multipart 上传 + 强制令牌）。

### 交叉审问

| 攻击方 | 目标 | 提出的异议 | 处置 |
|---|---|---|---|
| A | E | 不上架 = 放弃影响力，论文需要被使用才能被引用 | 驳回：论文影响力来自发表与复现，不来自应用市场条目 |
| B | A | 技能只是 markdown，用户装 5 个技能不如 1 个连接器体验好；但**技能是零成本可逆的第一步**，可作为连接器的先导 | 接受：技能先行作为验证先导（见 D3） |
| C | A | `skill-registry` 硬编码 localhost，用户装了必然报错 | **接受**（见 D2）：必须先解耦，否则是坏体验 |
| A | B | 你的「只读」要求切断 ChainMaker 后，「链上声誉」变成不可验证的快照宣称 | **接受**（见 R1）：必须在描述中明示数据来源与快照时间 |
| C | B | 99.9% 承诺对研究项目是自杀式运维 | 驳回：方案 B 已把可用性列为可选（见 D4） |
| B | C | stdio 每用户一份副本 = 无共享状态 = 无实时数据 = 价值有限 | **接受**（见 D4）：C 定位为离线可用的轻量路径，B 定位为实时路径，二者不冲突 |
| D | A/B/C | 全部忽略了一个前置硬门槛：**认证** | **接受**（见 D1）：认证是所有方案的前置阻塞项 |
| A | 全部 | 你的整套分析建立在「已认证」假设上——若无法认证，全案作废 | **接受**（见 D1）：把认证验证作为第 0 步，先验证再投入 |
| B | 全部 | rev.2 的 `skill-registry` 发现证明**你之前对技能的「零耦合」判断过于乐观**——耦合只是表象，契约本身是错的 | **接受**：已实测确认 3 处契约错误；「5/6 零耦合」改为「5/6 无 *localhost* 耦合，但接口契约未经端到端验证」 |
| A | F | `skill-only` 文件结构官方未明示，可能打包即被退回，F 是伪选项 | **部分接受**：F 降级为 A 成功后的**增强位**而非前置；先走 A 拿到真实审核反馈，再验证 F 结构 |
| C | A | 技能自助上架无需审核，F 需要团队审核——用 F 换曝光是引入摩擦换流量 | **接受**：排序 A → F 正是为了让 A 先验证「市场是否接受」，F 只在有正反馈时才付出审核成本 |

---

## 5. 决策登记表

| ID | 决策 | 状态 | 证据 | 证伪条件 | 可逆 | 核心 |
|---|---|---|---|---|---|---|
| D1 | 先验证入驻认证可行，再投入任何工程 | settled | 官方入驻指南要求身份证+实名手机号+人脸；港澳台/外籍不支持 | 若已完成企业/个人认证 → 本决策退化为 no-op | 高 | core |
| D2 | 提交前必须解耦 `skill-registry`，且必须对齐真实 API 契约 | **settled → 已执行** | 实测 3 处契约错误：端点 `/api/skills/register` 不存在、传输格式非 multipart、鉴权缺失（详见 §4 第二轮 grill） | 若服务端新增该端点且契约变更 → 需重新对齐 | 高 | core |
| D3 | 采用双轨：**先技能（A）验证需求，再 `skill-only` 连接器（F）取曝光位**；stdio（C）仅在需要实时数据面时才做，远程（B）保持可选 | settled（rev.2 修订） | A 工作量≈整理且自助；F 零服务器但需审核；C 需写 MCP server；B 需备案+SLA | 若 F 的文件结构无法确认 → 跳过 F 回到纯 A | 中 | core |
| D4 | 远程服务（B）降级为**可选**，不作为上架前置 | settled | 备案周期与 99.9% 承诺超出研究项目承受 | 若已有备案主机与运维能力 → 可提前 | 高 | core |
| D5 | 上架内容需明确标注数据来源与快照时间 | settled | 切断链上依赖后「链上声誉」不可验证 | 若保留实时链读 → 可移除此约束 | 高 | supporting |
| D6 | 不复活公开链（EVM）路径 | settled | AGENTS.md 明载该路径已移除 | 仅当论文修订显式要求 | 低 | supporting |
| D7 | 现有 `docs/OPEN_WORKBUDDY_LAUNCH.md` 按实测结果重写 | **settled → 已执行** | 该文档与官方规范多处冲突（见 §8 O1~O5） | — | 高 | supporting |
| D8 | 零服务器是硬排序约束：任何需要公网 HTTPS / 备案 / SLA 的方案不得进入主路径 | settled（rev.2） | 官方要求远程 MCP HTTPS、建议 ≥99.9%、单请求 ≤30s | 若项目获得长期运维预算 → 可重议 | 高 | core |
| D9 | 上架内容包**不得**包含 `__pycache__` / `.pyc` 等构建产物 | settled（rev.2） | 实测包内存在 6 个 `__pycache__` 目录，会随 zip 一并提交 | 无 | 高 | supporting |
| D10 | `skill-registry` **暂不上市场**，但**保留代码与 plugin.json 条目**；且所有技能描述不得暗示「用户可验证的链上存证」 | **settled**（rev.5 确认，rev.6 合并 rev.2 残留行） | R11（high）：该技能依赖本机 `docker exec cmc-debug cmc`，链上无公网端点，第三方装了必然失败。但它是本项目的注册工具（`register_runner.py` 被 README 与方案 F 依赖），物理删除会连带删掉注册能力。描述约束来自 rev.2 D10 后半句，ChainMaker 阶段无公网端点时不得让用户误以为可自行验链 | 等 ChainMaker 提供公网端点，或改走远程 HTTPS MCP（B 方案）后 → 再评估上架 | 高 | core |
| D11 | `template` 为参考脚手架，**不作为可上架单元**（上架数量以 D16 为准） | settled（rev.3，rev.6 移除与 D16 冲突的数量表述） | 实测 `skills/` 共 6 个目录，其中 `template` 为参考模板 | 若日后拆分为多个可上架单元 → 逐个追加 | 高 | supporting |
| D12 | 技能标识与目录名对齐，**统一不加 `agentskills-` 前缀** | **settled**（rev.6 由实测结案） | 实测 6/6 目录 frontmatter `name` 与目录名完全一致，`agentskills-*` 目录命中 **0**；WorkBuddy 以 frontmatter `name` 为标识，zip 文件名由其派生 | 若市场重名 → 统一加前缀（改 frontmatter 即可，目录名可不动） | 中 | supporting |
| D13 | **发布物必须通过「脱离仓库可运行」验证**，而非仅验证仓库内可运行 | settled（rev.4） | R16 实测：5 个 zip 卫生全 CLEAN，但带脚本的技能在解压目录内仍因缺 `packager` 崩溃。卫生检查与功能闭包是两个独立维度，前者全绿不代表后者成立 | 若 WorkBuddy 官方改为在完整仓库/插件包内运行脚本 → 可撤销隔离要求 | 高 | core |
| D14 | `packager.py` **保持零第三方依赖**（不得引入 PyYAML） | settled（rev.4） | 打包器同时是「开发工具」和「随包运行时」；一旦依赖 PyYAML，vendoring 进用户环境即失效，R16 会以另一种形式复发 | 若官方提供受控 Python 运行环境并预装 PyYAML → 可放开 | 高 | core |
| D15 | 发布卫生是**两层**：`packager` 保证 zip 内容（D9），`.gitignore` + `git rm --cached` 保证仓库内容（R18） | settled（rev.5） | 只做 zip 过滤会漏掉「直接打包仓库 `skills/` 目录」这条路径；被跟踪的 `skills/template-1.0.0.zip` 就在 `skills/` 树内，可自我包含；陈旧 `.pyc` 还会泄漏本机路径与 Python 版本 | 若改为 monorepo 统一 lint/归档策略 → 可并入共享 `.gitignore` | 中 | core |
| D16 | 本次平台上架 **4 个技能**：`skill-auditor`、`skill-publisher`、`attribution-auditor`、`workbuddy-skill-deployer` | settled（rev.5） | 按 D10 剔除 `skill-registry` 后的集合；`skill-auditor` 零耦合（vendored_tools=0）适合作为首个试水技能 | 若 `skill-registry` 后续满足 R11 → 追加为第 5 个 | 高 | core |
| D17 | 链选型**不做「论文论证 vs 国内合规」二选一**；许可制联盟链可作为填补责任真空的治理层。论文须**分开归因**：链提供不可篡改/可追溯/不可抵赖，准入委员会提供身份锚点与准入权 | **settled**（rev.6，2026-10-05） | `paper-draft-en.md:124` 将责任真空定义为「四类治理机制缺失」（开发者侧声明、渠道侧审核、平台侧基础设施、使用侧授权与追溯），`:126` 归因为「规范设计缺陷 + 治理机构缺位」——**两者均未以「无许可性」为成因**；`:56` RQ2 要求在 Collingridge 锁定窗口前嵌入责任追溯机制，`:66` design contribution 即「五阶段治理流程 + 防篡改审计链」。许可准入层是该贡献的合法实例化，而非反例 | 若论文正文出现「责任真空由无许可性导致」或「补上责任必须保持无许可」的**显式**主张 → 本决策需重审 | 高 | core |
| D18 | **论文论证合规与产品部署合规分离**；治理**接口层**保持开放/协议级（R-Skills 向后兼容 AgentSkills.io），治理**执行层**机构化/许可制（准入审计 + 防篡改链） | **settled**（rev.6） | 论文为 EN 研究稿且自定位 exploratory design science（`:199`），不涉及 ICP/实名/备案；部署侧要求来自官方平台规范与公网服务 SLA，与论文论证正交。宪法第一条禁代币、第四条已要求分层准入（L1 邮箱 → L3 身份证 KYC + 声誉 ≥1000），本身即要求准入边界 | 若论文被要求以国内商业上线作为实证场景 → 须在论文中显式声明部署合规边界 | 高 | supporting |
| D19 | **官方 schema 已实测核验，作为上架门禁的硬依据**：zip 交付形态正确；4 个上架技能 frontmatter 与子目录**全部合规**；路线 A 无需任何新增产物即可提交 | **settled**（rev.7，2026-10-05） | `/docs/skill` 明确存在 zip 提交与「解析失败」排查路径 → zip 是正确交付形态（推翻 O1 对「仅对话式创建」的过度解读）；官方必填 `description`/`description_zh`/`description_en`/`version`/`author` 经实测 4/4 技能齐备，官方子目录 `references`/`scripts`/`templates` 亦无未申报项。故**路线 A 当前无阻塞项**，可立即进入步骤 3 试水提交 | 后续新增/改名技能 → 必须重跑 frontmatter 与子目录校验；**rev.8 已将该校验固化为 `agentskills-workbuddy-package/tests/test_official_skill_spec.py`（提交 `9a2dbd6`），并经变异测试验证其确实会失败** | 高 | core |
| D20 | **路线 F 在实现上与路线 A 是两套不同产物**，不可复用 `.codebuddy-plugin/plugin.json` | **settled**（rev.7） | 官方连接器必备 `connector-meta.json`（含全局唯一 kebab-case `source`、中英 `examples_*`、按需 `minWorkbuddyVersion`）与 `icon.svg`，本仓库两者皆无。`plugin.json` 属 AgentSkills 插件清单，语义与字段集均不同（前者是「市场注册元信息」，后者是「技能包集合声明」）。故 F 的工作量**不在**技能本身上，而在连接器元信息与图标 | 若官方补发 `skill-only` 目录结构 → 先按官方结构生成 `connector-meta.json`；在此之前不盲打包 | 中 | supporting |

---

## 6. 假设登记表

| ID | 假设 | 承重? | 依据 | 若为假 |
|---|---|---|---|---|
| A1 | 已具备或可获得大陆身份证+人脸认证条件 | **是** | 未知 | **全案阻塞**，退回方案 E |
| A2 | 技能质量（内容）能通过平台审核 | 是 | 假设 | 需按意见迭代；`skill-auditor` 可自查 |
| A3 | 静态快照数据量足够小，可随包分发 | 否 | 待测 | 改走远程 B |
| A4 | 平台审核不会要求备案 | 否 | 待确认（`/docs/contact`） | 需办备案或改走 C |

---

## 7. 风险

| ID | 风险 | 严重度 | 缓解 | 责任人 | 状态 |
|---|---|---|---|---|---|
| R1 | 「链上声誉」表述在无实时链时构成不可验证宣称 | high | D5：描述中明示数据来源与快照时间；工具命名避免误导 | — | mitigated |
| R2 | 认证门槛导致整条路径不可行 | critical | **D1：先验证再投入**，第 0 步即确认 | 用户 | mitigated |
| R3 | `skill-registry` 在任何配置下都无法工作（端点/传输/鉴权三重契约错误） | high | **D2 已执行**：改为对齐真实 `/api/upload`（multipart + 强制 Bearer），无后端时降级为离线 prepare；5 个针对性测试覆盖降级、缺参、鉴权、后端不可达、路径缺失 | — | **mitigated** |
| R4 | 远程方案需 ICP 备案（周期数周） | medium | D4：远程降级为可选；C/F 路线无此依赖 | — | mitigated |
| R5 | 技能被装后无人调用（装了不用） | medium | 成功判据含「真实调用」而非「安装」；用 `skill-auditor` 提升可发现性 | — | open |
| R6 | 现有上架文档误导后续执行者 | medium | **D7 已执行**：按官方规范重写，错误的 manifest.yaml / 开发者中心表单 / 5 分钟审核 / support 邮箱已移除 | — | **mitigated** |
| R7 | 上架包夹带 `__pycache__`/`.pyc`，暴露本机路径与 Python 版本 | low | D9：已清理包内 6 个 `__pycache__`，复测为 0；打包前需复验 | — | **mitigated** |
| R8 | `skill-only` 文件结构未明示，F 可能打包即被退回 | medium | D3 已把 F 降级为 A 成功后的增强位；先向官方邮件确认结构再投入 | — | **partially closed（字段已闭合 → R8a；目录结构仍缺 → R19）** |
| R8a | **官方 `connector-meta.json` 字段清单**（rev.7 实测 `open.workbuddy.cn/docs/connector`） | — | `type: skill-only` **确认为合法枚举值且属「基础」版本**（版本兼容表：type: skill-only / auth_mode: server-side / cli.json 的 unAuth·statusMatch·authUrlDomain 同为「基础」，**无需** `minWorkbuddyVersion`）。但官方仅定义两种**接入方式**（MCP + Skill、CLI + Skill）并给出各自 `基础结构`，**未为 `skill-only` 单独给出目录结构**——故结构只能推断为「`connector-meta.json` + `icon.svg` + `skills/`，无 `mcp.json`/`cli.json`」，属推断而非官方明示 | — | **部分闭合（字段已闭合，结构仍为推断）** |
| R19 | **路线 F 缺一整类产物**：官方连接器必备 `connector-meta.json` + `icon.svg`，本仓库**均不存在**；现有 `.codebuddy-plugin/plugin.json` 是**另一套 schema**，不能替代 | high | 官方必填字段：`name`/`name_en`（+`name_zh`）、`description`/`description_zh`/`description_en`、`source`（**全局唯一 kebab-case**，仅小写字母数字连字符）、`examples_zh`/`examples_en`（最低版本 **4.24.0** → 用则**必须**声明 `minWorkbuddyVersion ≥ 4.24.0`）、`icon.svg`（必须，PNG/JPG 建议 64×64）。另注意：同一服务若同时支持 OAuth 与 Token，须用**两个不同 `source`** 分别提交为两个连接器<br>官方补发 `skill-only` 结构文档 → 按官方结构对齐；或改以 `name_en` 兜底 `name` | 高 | **open（新增，rev.7）** |
| R20 | 官方 `SKILL.md` frontmatter 必填字段缺失将导致「**提交 zip 后解析失败**」 | high | **rev.7 已实测 4 个上架技能全部齐备**：官方必填 `description`、`description_zh`、`description_en`、`version`、`author` 五项**均不缺**（各 9 个 key）；官方可选子目录仅 `references/`、`scripts/`、`templates/`，4 个技能实测子目录为 `[references, scripts]` 与 `[references]`，**无未申报目录**。官方页面确实存在 zip 提交与解析失败排查说明 → **zip 交付形态正确**<br>**rev.8 已落地自动化门禁**：`agentskills-workbuddy-package/tests/test_official_skill_spec.py`（提交 `9a2dbd6`）把本风险断言固化为可执行测试——官方必填 frontmatter 缺失/为空、出现官方未申报子目录、技能根目录散落文件、`skills/` 内被 git 跟踪的构建产物（R18 守护）均判 FATAL；官方未申报的 frontmatter 键仅 ADVISORY，除非与已申报键仅差一个字符（拼写错误会静默丢弃配置）才判失败。已用变异测试验证四个断言各自会真的失败<br>后续新增/改名技能时运行 `py -X utf8 tests/test_official_skill_spec.py`；若官方修订字段表，同步更新该文件的 `OFFICIAL_REQUIRED_FRONTMATTER` / `OFFICIAL_OPTIONAL_FRONTMATTER` / `OFFICIAL_SUBDIRS` 常量并记录新决策<br>**本计划文档自身的表格列数**另由 `py -X utf8 scripts/check_plan_tables.py` 守护（当前 13 个表全通过；退出码 0=全部合规、1=存在列数不符的行、2=目标文件缺失），后续每次修改本文档表格后必须运行 | 中 | **mitigated（已实测 + 已自动化守护）** |
| R21 | 备案是否为 F 的硬门槛（假设 A4） | low | **rev.8 证据闭合**：四个相关一手页面（`/docs/onboarding`、`/docs/developer-profile`、`/docs/what-is-open-platform`、`/docs/connector`）**全文均未出现**「备案」「ICP」「经营许可」字样；唯一基础设施要求是「**远程 MCP 使用 HTTPS**」（属证书层而非 ICP 层）。`onboarding` 仅要求中国大陆二代身份证实名（个人）或营业执照（企业）；`developer-profile` 仅要求头像 512×512、昵称 2—20 全平台唯一、简介 20—120、联系方式 ≥1<br>结论：**纯技能（A）与 `skill-only` 连接器（F）不触发备案**；仅 B 路线（远程 HTTPS MCP）触发 HTTPS 与未来可能的 ICP 要求（仍待 B 路线启动时再核）<br>证据全文：`docs/workbuddy-onboarding-evidence-2026-10-05.md` §1.2 | 低 | **mitigated（A/F 闭合，B 路线不在本计划前段）** |
| R22 | `display_name_en` 是**仓库自引入**的 frontmatter 键，官方 `/docs/skill` 字段表未申报它；官方解析器若对未知键采取静默丢弃或严格拒绝，将与本地 lint 结论产生偏差 | low | **D20**：rev.8 门禁已把该键显式列入 `REPO_INTRODUCED_FRONTMATTER` 白名单（ADVISORY，不判失败），从而**不训练使用者忽略真拼写错误**、也不误伤仓库自有字段；但「官方实际如何处理未知键」在真实提交前**无法本地证实**，官方文档亦未给出未知键语义 | 低 | **mitigated（白名单隔离，语义待真实提交实测）** |
| R23 | **开发者主页四件套必填**：`/docs/developer-profile` 列出头像（512×512px，≤5MB，JPG/PNG）、昵称（2—20 字符全平台唯一，不得含「测试 / test / demo / 试用」、不得仿冒腾讯系品牌）、简介（20—120 字符）、联系方式（≥1 项，≤5 项）四件**均必填**；这是**主体展示**门槛（与技能展示并列），单独构成提交前阻断。本仓库四件套均**缺失** | medium | 待用户在入驻流程填写；建议在向官方发起首次提交前**先**完成开发者主页配置（含昵称查重），否则首次提交会被 `/docs/onboarding` 流程直接卡在配置步骤<br>证据：`docs/workbuddy-onboarding-evidence-2026-10-05.md` §1.3 | 中 | **open（待用户实名 + 主页填写）** |
| R24 | `author`（frontmatter，技能合作方署名）与「开发者昵称」（主体昵称）是**两套独立字段**，混用将导致技能市场展示与开发者主页展示**两处署名不同**：技能市场读 `SKILL.md` 的 `author`（官方字段表），主体主页读 `/docs/developer-profile` 的昵称。本仓库当前 `author: "AgentSkills Team"`（14 字符，字母数字，全平台唯一性未查重） | low | 步骤 0 实名 + 主页填写时，**显式记录两处署名的差异**（技能市场仍是 `AgentSkills Team`；主体昵称另行命名）；昵称查重通过前不得启动提交，避免被官方要求修改而打回历史记录 | 低 | **open（待用户实名 + 昵称查重）** |
| R9 | 文档与代码漂移：SKILL.md/README 曾描述不存在的端点 | medium | 本轮已同步 SKILL.md + README.md；后续改动需同步三处文档 | — | **mitigated** |
| R10 | 「链上」表述可能超出用户可验证范围 | high | **已实测结案**：链访问方式是 `docker exec cmc-debug cmc`（`chainmaker-client.js:78-79`），全文件**无任何网络端点**（无 localhost / 127.0.0.1 / http / https）。故链为**单机私有链**，用户与远程服务器均不可达 | — | **mitigated（结论转为下述 D10）** |
| R11 | `skill-registry` 对任何第三方用户**不可能工作**——其链访问依赖本机 `cmc-debug` 容器 | high | D10：暂不将 `skill-registry` 提交市场；或改写为「仅本机/研究环境可用」并明示限制 | — | **open（需你决定）** |
| R12 | 打包产物曾夹带 `__pycache__` / `*.pyc`：原打包器无任何排除逻辑，且产物直接落在 `skills/` 源目录内（实测 8 个 zip 堆积） | high | 已修 `tools/packager.py`：新增排除集 + 显式报告、输出改至 `dist/`、补齐官方 `assets/` 目录支持；新增 2 个回归测试 | — | **mitigated（已实测 5 个 zip 全部 CLEAN）** |
| R13 | `plugin.json` 与磁盘严重漂移：声明 4 个不存在的技能（`reputation-analyst`/`skill-browser`/`fingerprint-verifier`/`risk-classifier`），遗漏 3 个真实技能 | high | 已修正 `plugin.json`；新增 `tests/test_plugin_manifest.py`（6 项断言）持续守护<br>**「随插件分发」≠「提交市场」**：`plugin.json` 的 `skills[]` 含 `skill-registry`（5 项），而市场集合是 4 项。两者此前无任何机器区分，导致官方门禁 `listing_skills()` 静默覆盖 5 个技能。现由 `NOT_LISTED` / `EXPECTED_LISTING_SKILLS` 常量与 `test_listing_set_is_exactly_four`（顺序敏感）强制，并已变异验证可失败 | — | **mitigated（测试通过 + 变异可失败）** |
| R14 | 2 个技能的 frontmatter `name` 与目录名不一致（`skill-audit-tool`/`agentskills-publisher`） | 中 | 已对齐为目录名；由 `test_skill_frontmatter_name_matches_dir` 守护 | — | **mitigated** |
| R15 | 后端**无法容器化部署**：`Dockerfile` 用 `node:24-alpine`，但 ChainMaker 需 `docker exec cmc-debug cmc`；且 compose 挂载宿主 `docker.sock` 后，在该容器内执行 `docker` 并不存在（无 docker CLI），`alpine` 基础镜像也缺 `bash`/glibc 依赖 | 高 | 结论：零服务器路径（A/F）**不依赖**该后端，故不阻塞上架；但**禁止**将「Docker 一键部署后端」写入任何面向用户的说明<br>若未来必须提供后端 → 需专用镜像（安装 docker-cli）或改为 ChainMaker SDK 直连 | 高 | **mitigated（已从文档路径剥离）** |
| R16 | **发布物闭包缺失**：3 个 runner 通过 `../../../tools` 导入 `packager`/`skill_lint`，而打包器只收集 `SKILL_DIRS`（不含仓库级 `tools/`）。实测 `skill-registry` zip 在解压目录内退出码 1，报 `Packaging failed: No module named 'packager'`。凡带脚本的技能，装到用户机器上均**无法运行** | **critical** | 三处修复：①`tools/packager.py` 移除 PyYAML 依赖，改为内置 frontmatter 解析 + YAML 输出（vendoring 的前提）；②打包器新增 `_runtime_tools_needed` 扫描技能脚本的行首 import，命中则注入 `scripts/tools/<mod>.py`；③三个 runner 改为**先找随包的 `scripts/tools/`、再回退仓库 `../../../tools/`**，并删除 `publish_runner`/`audit_runner` 的静默降级分支（`audit_runner` 原先会在 `lint_skill` 不可用时返回 `passed=True`，把审计不可用伪装成通过）；④`audit_runner` 的 `lint_skill` 导入本就是死代码（实际走本文件 `lint_skill_from_content`），已整体移除，改为真正自包含 | — | **mitigated（新增 `tests/test_isolated_package.py` 6 项，全绿）** |
| R17 | 隔离测试本身可能因 CLI 用法错误而产生**假失败/假通过**（此前 `--json . --help`、`--help` 都不是合法入口） | 高 | 新测试只使用各 runner `main()` 实际支持的参数形式（`<dir>`），并断言**退出码 + JSON 字段**，而非仅看是否报错；同时 `test_packager_is_zero_dependency` 静态断言 `packager.py` 不得 `import yaml` | — | **mitigated** |
| R18 | **仓库自身跟踪了 16 个构建产物**：`.pyc`/`__pycache__`（含 `tools/`、`tests/`、`connectors/template/`、3 个 runner 脚本目录）以及 `skills/template-1.0.0.zip`；根 `.gitignore` 仅覆盖 `dist/`。D9 只约束了**发布 zip 的内容**，没有约束**仓库内容** | 高 | ① `.gitignore` 增加 `__pycache__/`、`*.py[cod]`、`*.egg-info/`、`.pytest_cache/`、`agentskills-workbuddy-package/skills/*.zip`；② `git rm --cached` 全部 16 个产物（保留工作区文件，可 `git reset` 回退）；③ 复测 4 个测试脚本仍全 PASS，重建 5 个 zip 后 `junk=0`、`skill-publisher`/`skill-registry` 各准确 vendored 1 个 `scripts/tools/packager.py` | — | **mitigated** |

---

## 8. 异议（须全部落定）

| ID | 异议 | 处置 |
|---|---|---|
| O1 | 现有 `OPEN_WORKBUDDY_LAUNCH.md` 称需 `manifest.yaml` + 上传 zip 到「开发者中心」 | **驳回**：官方规范无 manifest.yaml；技能在客户端内通过对话式引导创建 |
| O2 | 现有文档的 support 邮箱 `support@workbuddy.cn` 无法验证 | **驳回**：官方联系邮箱为 `openworkbuddy@tencent.com` |
| O3 | 现有文档称「自动审核约 5 分钟 / 人工 1-2 工作日」 | **驳回**：官方仅称更新提交后约 10~15 分钟**同步生效**，非审核时长 |
| O4 | `.mcp.json` 用 `transport: "streamableHttp"` | **驳回**：规范字段名为 `type`；且 url 应指向 MCP 端点（如 `/mcp`），非裸服务根 |
| O5 | 全仓库无 MCP server 实现（`backend_mcp.py` 既非 MCP server 也无 HTTP 客户端） | **接受为事实**：方案 B/C 必须新建 MCP server |
| O6 | 「认证为阻塞项」被前序分析忽略 | **接受**：已升为 D1/R2 |
| O7 | rev.2：`skill-registry` POST 的 `/api/skills/register` 在服务端不存在 | **接受为事实**：已改为真实 `/api/upload`，并新增 5 个测试锁定契约 |
| O8 | rev.2：脚本以 JSON 传字符串 `file_path`，而 `/api/upload` 要求 multipart 文件；且 `api_key` 误设为可选 | **接受为事实**：已改为 multipart + 强制 Bearer，缺令牌直接失败 |
| O9 | rev.2：SKILL.md 与 README 仍描述旧端点与 localhost 默认值，构成文档漂移 | **已修复**：两处同步为环境变量/参数 + 离线降级语义 |

---

## 9. 收敛门禁

> **rev.2 说明**：rev.1 曾在门禁全绿的状态下封板，随后代码审计发现了 rev.1 未预见的**契约级错误**（O7/O8）。这说明 rev.1 的「边际收益归零」判断为假——它只审了文档，未审代码路径。门禁因此重开并重新评估。
>
> **rev.4 说明**：rev.2~rev.3 的三轮 grill 全部在**仓库内**验证，遗漏了发布态。R16（critical）证明「zip 卫生全 CLEAN」与「用户装上能跑」是两个独立门禁，且 rev.3 曾把前者当作后者的判据。门禁 5 的阻塞项因此从「代码缺陷」收敛为**仅剩 D10/R11 这一项用户决策**。

| # | 条件 | 通过? | 证据 |
|---|---|---|---|
| 1 | ≥2 轮钢铁人+grill 循环 | ✅ | 共三轮：rev.0 首轮（A/B/C/D/E）；rev.1 交叉审问后收敛双轨；rev.2 由代码审计触发，新增 F 与 D8/D9 |
| 2 | 边际收益归零：末轮未新增机制族 | ✅ | rev.2 新增的 F 与 1 同属内容分发机制族，不构成新机制族；D8/D9 为排序与卫生约束 |
| 3 | 零孤儿异议 | ✅ | O1~O9 全部落定（4 驳回 / 5 接受为事实或已修复） |
| 4 | 反证检验：无法从记忆构造有力反论 | ✅ | 见下，rev.2 已更新最强反论 |
| 5 | 全部 critical/high 风险已缓解或有明确责任人 | ✅ **通过** | R10/R12~R18 全部结案（rev.4 新增 R16/critical、R17/high；rev.5 新增 R18/high——仓库跟踪 16 个构建产物，已 `.gitignore` + `git rm --cached` 修复）；**R11（high）已由你决策关闭**（2026-10-05：D10 决定 `skill-registry` 暂不上市场，见 D10 行与第 10 节 4 技能清单）；D10 已定；R2 指派给你；R5/R8 为 medium/open，不阻塞上架 |

### rev.4 说明（发布物闭包）

rev.3 封板时门禁第 5 条判定为「未完全通过」，但当时剩余项**全部是待你决策或与代码无关**。
rev.4 的隔离实测推翻了一个更危险的隐含假设：**「5 个 zip 卫生全部 CLEAN」曾被当作发布物就绪的依据**。

实测反证：`skill-registry` zip 解压后运行即报 `Packaging failed: No module named 'packager'`。
根因是打包器只收集 `SKILL_DIRS`，而 runner 依赖仓库级 `tools/`。
这说明卫生维度（无 `.pyc`、无 `__pycache__`）与闭包维度（依赖是否随包）是**两个正交门禁**，
此前只测了前者。rev.4 据此新增 D13/D14、R16/R17 与 `tests/test_isolated_package.py`。

**最强反论（rev.4 更新）**：
「若用户只在 WorkBuddy 客户端的受控环境内运行技能，脚本根本不会裸跑，隔离要求是否过度？」
答：该反论不成立——`.zip` 被解压后由用户机器的 Python 解释器执行，与仓库布局无关；
`register_runner.py` 的离线 prepare 正是**零依赖本地路径**，若连它都无法启动，
技能在任何环境下都无价值。故「脱离仓库可运行」是最低要求，非过度设计。

### 反证检验记录

**rev.1 最强反论**：双轨是「两个半成品」的自我安慰——技能铺开但 `skill-registry` 体验残缺，连接器只提供静态快照，两者都无法承载论文的核心论证；若如此，不如只做论文不做市场，等真实用户需求出现再上架。**附加论据**：每个被维护的上架资产都是持续的义务（审核、兼容、用户支持），对研究项目是长期负债。

**rev.1 为何不够有力**：该反论正确地指出 A 单独不足、C 数据会过期——而本方案已经把这两点内建为约束（D2 解耦、D3 明确 C 定位离线、D5 强制标注快照时间）。反论真正攻击的是「双轨」的**顺序**，但它无法否定「先做零成本可逆的技能、验证真实需求、再决定是否投入远程服务」这一排序的合理性；它甚至强化了该排序——因为它要求先验证需求，这正是 A 的作用。反论未发现任何被遗漏的约束、任何未承受的假设，也未提出更优的机制族（它隐含的第四方案「等需求出现」就是方案 E，已被钢铁人处理）。

**rev.2 更强反论（取代上一条）**：「你宣称 6 个技能中 5 个『零耦合，可以直接上架』，但审计发现唯一被点名的那个技能其实在任何配置下都是坏的。这说明你的耦合度量是按*代码里有没有写死 localhost* 建立的，而不是按*接口契约是否成立* 建立的。若其余 5 个技能也从未被端到端验证过，那么『工作量≈整理』这个核心估计就是建立在未测量的假设上——你甚至不能确定它们能被审计通过。请先证明另外 5 个技能真的能跑通，再谈上架。」

**rev.2 为何仍不够有力**：该反论攻击的是**证据强度**而非**方案排序**，且已被实测部分证实并已修复——这正是它的价值所在，修复后 R3 转为 mitigated。剩余的未验证部分（其余 5 个技能端到端）属于**执行期验证**，不需要现在改变架构决策：步骤 3（先提交 `skill-auditor` 走通流程）本身就是这条反论要求的验证实验。反论没有提出比 A→F→C→B 更优的排序，也没有发现任何新的约束或假设。**但它确实降低了本方案当前的可信度上限，故门禁 5 标记为未完全通过。**

**rev.4 最强反论（取代上一条）**：「rev.2 反论要求你证明『另外 5 个技能真的能跑通』，而你的回应是 5 个 zip 卫生检查全 CLEAN。但你验证的是**仓库内**的运行，不是**发布物**的运行。三个 runner 都 `import packager`，而 `packager` 只存在于仓库的 `tools/`——它不在 zip 里。也就是说你的 CLEAN 结论与你的交付物无关：用户拿到的包，装上去就跑不起来。卫生与闭包是两个正交门禁，而你只测了更简单的那个。请在空目录解压并运行，再谈就绪。」

**该反论已被实测证实，且伤及要害**：复现 `skill-registry` 退出码 1、`No module named 'packager'`，定为 R16（critical）。它推翻的是 rev.3 的**就绪判据**（把卫生当就绪），而非方案排序——A→F→C→B 的顺序不变，因为它攻击的是「已交付物是否可用」而非「下一步该做什么」。这一轮同时暴露了一个**方法论级**缺陷：rev.1~rev.3 的所有验证都在仓库内进行，因此系统性遗漏了发布态（packaged state）；此前三轮 grill 均未察觉，因为仓库内一切正常。已据此新增 D13（发布物必须隔离验证）与 D14（打包器保持零第三方依赖，否则 vendoring 无意义）。

**rev.4 修复后是否还有更弱/更强的反论**：修复后剩余最强反论转为 D10/R11——即便闭包修好，`skill-registry` 对任何第三方用户**在语义上**仍不可能工作（它需要本机 `cmc-debug` 容器）。这条反论比 R16 更根本：R16 是「装上能跑但没意义」，R11 是「有意义但装上也用不了」。**故 `skill-registry` 的最终去留（D10）必须由你决定，工程手段无法消解**——这也是门禁 5 保持「未完全通过」的唯一原因。

### 什么会证明我们错了

- **领先指标：** 技能提交后 30 天，安装数 < 10 或真实对话调用 = 0 → 说明市场无需求，应立即停止后续投入（R5）
- **触发阈值：** 认证不可得 → 立即转 E（D1）
- **复查点：** 首个技能提交后

> 收敛意味着论证已穷尽，不意味着方案正确。R1/R2 均为真实且未消除的风险——尤其认证这一条，只能由你本人验证。

---

## 10. 执行计划

每步前置条件须在执行前对照现实复核；若前置已失效，**先更新本文档**再执行。

### 10.1 本次上架清单（D10/D16，rev.5 已定）

| 技能 | 耦合度 | zip 内 vendored | 建议顺序 |
|---|---|---|---|
| `skill-auditor` | 零耦合，自包含 | 0 | **第 1 个**（最小、最稳，用于跑通流程） |
| `attribution-auditor` | 只读审计 | 0 | 第 2 个 |
| `skill-publisher` | 需 `AGENTSKILLS_API_URL` | 1（`packager.py`） | 第 3 个 |
| `workbuddy-skill-deployer` | 需平台后台 | 0 | 第 4 个 |
| ~~`skill-registry`~~ | 依赖本机 `cmc-debug` 容器 | — | **本轮不上市场**（R11/D10；代码与 plugin.json 保留） |

上架提交前每个技能须满足：zip `junk=0`、解压后 CLI 退出码正确、manifest 与 frontmatter `name` 一致。

**rev.7 追加官方硬门禁**（源自 `/docs/skill` 与 `/docs/connector`，缺任一项即触发「提交 zip 后解析失败」）：

| # | 门禁项 | 依据 | 当前状态 |
|---|---|---|---|
| G-fm-1 | frontmatter 必含 `description`、`description_zh`、`description_en`、`version`、`author` | `/docs/skill` frontmatter 表 | ✅ 4/4 技能实测齐备 |
| G-fm-2 | `name` 与目录名一致（官方标记为「否」但生态惯例必需，且决定调用路径） | 实测 + 既有 `test_skill_frontmatter_name_matches_dir` | ✅ 6/6 一致 |
| G-dir-1 | 子目录仅用官方声明的 `references/`、`scripts/`、`templates/` | `/docs/skill` 子资源目录说明 | ✅ 无未申报目录 |
| G-dir-2 | `SKILL.md` 位于技能根目录（唯一必需文件） | `/docs/skill` 基础结构 | ✅ 4/4 |
| G-zip-1 | 提交形态为 zip（官方确有 zip 提交与解析失败排查路径） | `/docs/skill` 技能市场 | ✅ 打包器已产出 zip |
| G-zip-2 | zip 内不含 `__pycache__`/`*.pyc`/本机绝对路径 | R7/R12/R18 | ✅ 实测 `junk=0` |
| G-cfg-1 | 声明 `minWorkbuddyVersion`（本项目用到的字段均属「基础」，故无需声明） | 版本兼容性表 | ✅ 无需声明 |
| G-cfg-2 | 连接器类提交才需 `connector-meta.json` + `icon.svg` + 全局唯一 kebab-case `source` | `/docs/connector` | ⛔ 路线 F 未建（见 D20） |

### 10.2 步骤表

| # | 步骤 | 前置条件（须仍成立） | 状态 | Delta |
|---|---|---|---|---|
| 0 | **验证认证可行性**：确认能否完成个人/企业实名 | — | ⛔ **阻塞中（需你本人）** | 唯一真正阻塞项；未决前不推进 3+ |
| 1 | 修正 `OPEN_WORKBUDDY_LAUNCH.md` 为官方规范（D7） | — | ✅ **已完成** | 重写为 180 行，两条路径分离，错误项全部移除 |
| 2 | 解耦 `skill-registry` + 对齐真实 API 契约（D2） | — | ✅ **已完成** | 离线 prepare + `/api/upload` multipart + 强制 Bearer；5 测试通过 |
| 2b | 同步 `skill-registry/SKILL.md` 与 `README.md` | 步骤 2 完成 | ✅ **已完成** | 移除 localhost 默认与不存在端点（O9） |
| 2c | 清理包内 `__pycache__`/`.pyc`（D9） | — | ✅ **已完成** | 清理 6 处，复测为 0 |
| 2d | **核实 R10**：实测 `chainmaker-client.js` 连接目标，据实定表述 | — | ✅ **已完成** | 实测结论：链仅经 `docker exec cmc-debug cmc` 访问，**无网络端点** → 产出 D10/R11，门禁 5 剩余阻塞转移至 R11 |
| 2e | 打包器加固：排除构建产物、输出移出源树、补齐 `assets/`（R12） | — | ✅ **已完成** | 重写 `tools/packager.py`；新增 2 回归测试；实测 5 个 zip 全部 CLEAN，产物移至 `dist/` |
| 2f | 修正 `plugin.json` 漂移 + 技能标识对齐（R13/R14） | — | ✅ **已完成** | 删除 4 个幽灵技能、补 2 个真实技能（D11）；对齐 2 处 frontmatter name（D12）；新增 `tests/test_plugin_manifest.py` 6 项断言 |
| 2g | 核查 Docker/compose/部署文档可行性 | — | ✅ **已完成** | 发现 R15：容器内无 docker CLI，后端不可容器化；已确认 A/F 路径不依赖后端，不阻塞上架 |
| 2h | **隔离验证发布物闭包**（R16/R17） | — | ✅ **已完成** | 解压后运行报 `No module named 'packager'`；已修 PyYAML 依赖 + 自动 vendoring + 三 runner 路径回退 + 删除静默降级；新增 `tests/test_isolated_package.py` 6 项全绿 |
| 2i | **仓库层发布卫生**（R18） | — | ✅ **已完成** | `git ls-files` 实测 16 个 `.pyc`/`__pycache__`/`template-1.0.0.zip` 被跟踪；`.gitignore` 补 5 类规则 + `git rm --cached` 16 项（工作区保留）；复测 4 脚本全 PASS，重建 5 zip `junk=0`、vendored 数量准确 |
| 2j | **官方 schema 实测核验**（`/docs/skill` + `/docs/connector`） | — | ✅ **已完成**（rev.7） | ① 确认 zip 为正确交付形态（官方有 zip 提交与解析失败排查路径，修正 O1 的过度解读）；② 4 个上架技能官方必填 frontmatter 5/5 齐备、子目录无未申报项；③ `type: skill-only` 确认为合法且属「基础」版本 → R8a 部分闭合；④ 发现 R19/D20：路线 F 缺 `connector-meta.json` + `icon.svg`；⑤ 备案证据：连接器规范全文无 ICP/备案条款（R21）。附注：打包器支持 `assets/`，但官方仅声明 `references`/`scripts`/`templates`——实测 4 个上架技能**均未使用** `assets/`，故无影响。⑥ **rev.8：门禁已从文档升级为可执行测试**——`agentskills-workbuddy-package/tests/test_official_skill_spec.py`（提交 `9a2dbd6`）覆盖 ② 的全部断言 + 根目录散落文件 + `skills/` 内被 git 跟踪的构建产物（R18 守护）+ 磁盘/zip 接缝（残留 `__pycache__` 必须被排除层挡住）；变异测试（删必填字段／键拼写错误／未申报子目录／根目录散落文件）四项均被捕获，测试后源文件字节级还原（hash 与 HEAD blob 一致） |
| 3 | 挑 1 个零耦合技能（建议 `skill-auditor`）走通技能市场提交流程 | 步骤0 通过 | ⛔ 未开始 | 阻塞于步骤 0；**但技术侧已就绪**（D19：路线 A 无待补产物，8 项门禁中 7 项已 ✅，仅认证待用户完成） |
| 4 | 依据步骤 3 的真实反馈，决定是否提交其余技能 | 步骤3 成功 | ⛔ 未开始 | 需实测后判断 |
| 5 | 向官方确认 `skill-only` 目录结构 + `connector-meta.json` 落地，随后评估 F（D3/R8/R19） | 步骤4 成功 | ⛔ 未开始 | **字段已闭合**（`type: skill-only` 合法且属「基础」）；**目录结构仍缺**，且需新建 `connector-meta.json` + `icon.svg`（含全局唯一 kebab-case `source`、中英 `examples_*`、`minWorkbuddyVersion ≥ 4.24.0`）→ 结构未知，勿盲打包 |
| 6 | 仅当需要实时数据面 → 新建 stdio MCP 连接器（C） | 步骤4 显示真实需求 | ⛔ 未开始 | — |
| 7 | 远程方案（B）保持可选，不主动投入（D8） | — | 🚫 不做 | — |

**步骤 3 是整条路径的验证实验（cheap test）**——用一个技能换回「市场是否接受、审核要多久、是否有人用」的真实信息，成本以小时计。若这一步失败，方案 E 立即生效，无需任何沉没成本。

---

## 11. 修订日志

| 版本 | 日期 | 变更 | 原因 |
|---|---|---|---|
| 0 | 2026-10-05 | 初版，基于官方文档实测 + 仓库实测 | — |
| 1 | 2026-10-05 | 修正 O1~O5，产出双轨决策 D3 | 文档与官方规范冲突 |
| 2 | 2026-10-05 | 代码审计发现 `skill-registry` 三重契约错误（O7/O8）；新增方案 F `skill-only`；新增 D8/D9；R3/R6 转为 mitigated；**门禁重开**，G2 判定修正、G5 降级为未通过 | rev.1 的「边际收益归零」判断为假——只审文档未审代码 |
| 3 | 2026-10-05 | R10 结案（链无网络端点）；打包器夹带 `__pycache__`（R12）；`plugin.json` 4 幽灵 + 3 遗漏（R13）；frontmatter 名不一致（R14）；后端不可容器化（R15）；新增 D11/D12 | 「包已干净」原为手工清理所得，非工具保证；`plugin.json` 从未与磁盘对账；「Docker 可部署后端」假设经实测不成立 |
| 4 | 2026-10-05 | **R16（critical）**：隔离实测 `skill-registry` zip 解压后退出码 1，报 `Packaging failed: No module named 'packager'`——runner 依赖仓库级 `tools/`，而打包器只收集 `SKILL_DIRS`；**R17**：早期隔离命令（`--help`）非合法入口，失败结论不可信。新增 D13/D14；G5 理由改写；步骤 2h 完成 | rev.3 把「5 个 zip 卫生全 CLEAN」当成就绪依据，但卫生维度（无 `.pyc`）与闭包维度（依赖是否随包）正交，前者全绿不代表后者成立；且 rev.3 对 auditor/publisher 的失败结论使用了无效 CLI 参数，属未经验证的断言 |
| 5 | 2026-10-05 | **R18（high）**：`git ls-files` 实测仓库**跟踪了 16 个构建产物**（`.pyc`/`__pycache__` + `skills/template-1.0.0.zip`），根 `.gitignore` 仅覆盖 `dist/`。已补 5 类 `.gitignore` 规则并 `git rm --cached` 16 项；复测 4 脚本全 PASS、5 zip `junk=0`。新增 D15（两层卫生）、步骤 2i | rev.4 修好了「zip 装什么」，却没检查「git 跟踪了什么」——`template-1.0.0.zip` 就躺在 `skills/` 树内，若有人直接打包该目录会**自我包含**；陈旧 `.pyc` 还会泄漏本机路径与 Python 版本。发布卫生必须在 zip 层和仓库层各做一次 |
| 6 | 2026-10-05 | **决策表纠错**：§5 存在**重复 `D10`**（rev.2「待你确认」与 rev.5「settled」并存，编号冲突）；**D11 与 D16 冲突**（「可上架 5 个」vs「上架 4 个」）；**D12 状态与实现背离**（表内「待你确认」，实测早已落地）。已合并 D10、把 D11 收窄为 `template` 不上架、把 D12 按实测结案为 settled。**新增 D17/D18**：撤销「论文论证 vs 国内合规」伪二选一，确认许可准入层为责任来源，并分离论文合规与部署合规 | rev.5 修内容时未回头审计决策表自身的编号与状态一致性——决策结论正确但登记表内部自相矛盾，后续 grill 会读到两个 D10；D12 则是「代码已改、表未更新」的典型漂移。另：前序把「许可链不能补无许可真空」当作核心矛盾，经核对论文 `:124`/`:126`/`:56`/`:66` 原文，该判断建立在错误前提上（误把问题发生的环境当成论题要求），已撤回 |
| 7 | 2026-10-05 | **官方 schema 实测核验完成**（`/docs/skill` + `/docs/connector` 全文抓取）。① 确认 **zip 为正确交付形态**——官方确有「提交 zip 后解析失败」排查路径，修正 O1「技能仅能在客户端内对话式创建」的过度解读；② 4 个上架技能官方必填 frontmatter（`description`/`description_zh`/`description_en`/`version`/`author`）**5/5 齐备**，子目录无未申报项 → 新增 8 项提交门禁（7 项已 ✅）；③ `type: skill-only` **确认为合法枚举且属「基础」版本** → R8 字段层面闭合（R8a）；④ **新发现 R19/D20**：路线 F 缺 `connector-meta.json` + `icon.svg`，且 `plugin.json` 无法替代；⑤ 新增 R21：连接器规范全文**无 ICP/备案条款**。新增 D19/D20、步骤 2j | rev.6 结束时「官方 schema 待核实」是最大的未验证假设——它同时决定了 zip 策略是否正确（F 路线成立与否）与路线 A 是否还有技术阻塞。若官方必填字段缺失，4 个技能会**全部**在提交后解析失败；实测证明未发生，故**路线 A 技术侧已无阻塞**，剩余唯一阻塞是步骤 0 的实名认证 |
| 8 | 2026-10-05 | **提交门禁从文档升级为可执行测试**。新增 `agentskills-workbuddy-package/tests/test_official_skill_spec.py`（提交 `9a2dbd6`）：官方必填 frontmatter 齐备性、官方未申报子目录、技能根目录散落文件、`skills/` 内被 git 跟踪的构建产物（R18 守护）判 FATAL；官方未申报 frontmatter 键为 ADVISORY，除非与已申报键仅差一字符（拼写错误会静默丢弃配置）判失败；另断言磁盘残留产物不得进入 zip。包内 9 个测试脚本全绿 | rev.7 把规范核验写清楚了，但**规范仍只是文字**——官方字段表一旦修订，或有人新增技能时漏字段，没有自动化会报警，等下次提交被拒才发现。**本轮做完后最容易被质疑的一点是「测试只通过、并未证明会失败」**，故补做变异测试：删除必填 `author`、引入一字符键拼写错误、添加未申报子目录 `assets/`、添加根目录散落文件 `NOTES.md` 四项均被门禁捕获（exit=1），测试后 `SKILL.md` 经 `git hash-object` 与 HEAD blob 比对一致（`ba0578d…`），字节级还原无残留。刻意不扫工作区产物：任何跑过一次 runner 的机器都有 `__pycache__`，那样的门禁会训练使用者忽略它；R20/R18 的真实缺陷类是「产物进入版本库」，故只对 git 索引断言，zip 层由 `test_isolated_package.py` 覆盖 |
| 9 | 2026-10-05 | **入驻证据闭合**：① 全量复核 `/docs/onboarding` + `/docs/developer-profile` + `/docs/what-is-open-platform` 一手页面（详见 `docs/workbuddy-onboarding-evidence-2026-10-05.md`）。**R21 全闭合**——四个相关一手页面均无 ICP/备案要求，A/F 不触发备案；B 路线仅要求 HTTPS（属证书层）。② **新增 R23**：开发者主页四件套（头像 512×512 / 昵称 2—20 全平台唯一 / 简介 20—120 / 联系方式 ≥1）四件**均必填**，是技能展示之外**主体展示**的提交前阻断，本仓库四件套缺失。③ **新增 R24**：`author`（技能合作方署名）与「开发者昵称」（主体昵称）是**两套独立字段**，混用将导致两处展示不同；当前 `author: "AgentSkills Team"` 全平台唯一性未查重 | rev.8 把官方 schema 字段层闭合，但**入驻路径**与**主体配置**仍是未验证假设——它们是**真实提交前**的最后一段盲区，且与技能 frontmatter 正交（frontmatter 通过 token、frontmatter 仍可被硬件实际拒收）。一旦启动提交才发现，要打的不是指标事，而是在「主体验证 / 主页配置 / 昵称查重」三处回滚的退稿记录 + 账号历史风险 |

---

## 12. Delta 日志

> **编号说明**：本表的 `D*` 是**修订批次序号**（rev.1→D1、rev.2→D2…），与第 5 节决策表的 `D1~D20`（决策条目编号）**是两套独立命名空间**，不互相引用。两表编号恰好都止于 D20，纯属巧合，勿交叉引用。决策请以第 5 节为准。

| # | 日期 | 观察事实 | 与本文冲突？ | 是否已更新 |
|---|---|---|---|---|
| D1 | 2026-10-05 | 官方规范与仓库现有上架文档多处冲突 | 是 | 已计入 O1~O3 |
| D2 | 2026-10-05 | 全仓库无 MCP server 实现 | 是 | 已计入 O5，新增 D3 |
| D3 | 2026-10-05 | 官方 `connector-meta.json` 的 `type` 支持 `skill-only` | 是 | 已新增方案 F、D3 修订 |
| D4 | 2026-10-05 | `register_runner.py` POST 的 `/api/skills/register` 服务端不存在 | 是 | 已计入 O7；实现已改 |
| D5 | 2026-10-05 | `/api/upload` 要求 multipart + Bearer，脚本用 JSON 且令牌可选 | 是 | 已计入 O8；实现已改 |
| D6 | 2026-10-05 | `SKILL.md` / `README.md` 与新实现漂移 | 是 | 已计入 O9；两处已同步 |
| D7 | 2026-10-05 | 包内存在 6 个 `__pycache__`，会随 zip 提交 | 是 | 已计入 D9；已清理 |
| D8 | 2026-10-05 | 官方「10~15 分钟」指版本同步，非审核时长 | 否 | 仅文档澄清，未改决策 |
| D9 | 2026-10-05 | 链访问实测为 `docker exec cmc-debug cmc`，**全文件无任何网络端点**（无 localhost/127.0.0.1/http/https）；`.env.example` 记 `CHAINMAKER_CHAIN_ID=chain1`、单组织 `wx-org.chainmaker.org` | 是（推翻 G5，并否决「远程 MCP 可读链数据」） | 已结案 R10；新增 D10、R11；门禁 5 剩余阻塞转移 |
| D10 | 2026-10-05 | 重新打包 `skill-auditor` 后 zip 内仍含 `scripts/__pycache__/audit_runner.cpython-312.pyc`——原打包器无排除逻辑，且默认输出落在 `skills/` 内（实测堆积 8 个 zip） | 是（D9 曾仅靠手工清理成立） | 已重写 `packager.py`（排除集 + 显式报告 + 输出至 `dist/` + 补齐 `assets/`）；新增 2 测试；实测 5 zip 全 CLEAN → R12 mitigated |
| D11 | 2026-10-05 | `plugin.json` 声明 4 个不存在的技能、遗漏 3 个真实技能；`skills/` 实为 6 目录（5 可上架 + `template`） | 是（与「6 个技能」表述冲突） | 已修正 `plugin.json`；产出 D11；新增 `test_plugin_manifest.py` → R13 mitigated |
| D12 | 2026-10-05 | 2 处 frontmatter `name` ≠ 目录名；`agentskills-` 前缀约定仅 1/5 生效 | 是 | 已对齐目录名；产出 D12（前缀是否统一待定）→ R14 mitigated |
| D13 | 2026-10-05 | `Dockerfile` 为 `node:24-alpine`，compose 挂载宿主 `docker.sock`，但容器内无 `docker` CLI → `docker exec cmc-debug` 不可用 | 是（推翻「后端可 Docker 一键部署」） | 产出 R15；确认 A/F 零服务器路径不依赖后端，不阻塞上架 |
| D14 | 2026-10-05 | 隔离实测：`skill-registry` zip 解压后运行退出码 1，报 `Packaging failed: No module named 'packager'`；zip 内仅 3 个文件，不含 `tools/` | 是（推翻 rev.3「5 zip 全 CLEAN 即就绪」的隐含门禁） | 产出 R16 + D13/D14；步骤 2h 完成 |
| D15 | 2026-10-05 | `audit_runner.py` 的 `from skill_lint import lint_skill` 为**死代码**（实际调用的是本文件 `lint_skill_from_content`）；`publish_runner.py` 在 import 失败时降级为抛 `RuntimeError` 的桩函数 | 是（此前把两者的失败一概归因为「缺 packager」不准确） | 产出 R17；`audit_runner` 改为真正自包含并移除死导入；`publish_runner` 删除静默降级 |
| D16 | 2026-10-05 | §5 决策表实测存在**两个 `D10`**（rev.2「待你确认」/ rev.5「settled」）；`D11`「可上架 5 个」与 `D16` 决策「上架 4 个」冲突；`plugin.json` 实测 **5 条**（4 上架 + `skill-registry` 保留），`skills/` 实测 **6 目录** | 是（决策表内部自相矛盾，且与 plugin.json 实际条目不一致） | 合并 D10；D11 收窄为「`template` 不上架」；产出决策 D17/D18 |
| D17 | 2026-10-05 | 实测 6/6 目录 frontmatter `name` 与目录名一致，`agentskills-*` 目录命中 **0** —— D12 的实现早已完成，但决策表状态仍为「待你确认」 | 是（典型的「代码已改、表未更新」状态漂移） | D12 按实测结案为 **settled** |
| D18 | 2026-10-05 | 官方 `/docs/skill` 全文含「**提交 zip 包后解析失败**」排查指引 → zip 确为官方支持的提交形态；官方必填 frontmatter 为 `description`/`description_zh`/`description_en`/`version`/`author`（`name` 反而标为「否」）；官方声明的子目录仅 `references`/`scripts`/`templates` | 是（**O1「技能仅能在客户端内对话式创建」属过度解读**，据此曾隐含「zip 交付形态可疑」） | 产出决策 **D19**；新增 8 项提交门禁表；步骤 2j 完成 |
| D19 | 2026-10-05 | 实测 4 个上架技能官方必填 frontmatter **5/5 全齐**（各 9 key），子目录为 `[references, scripts]`/`[references]`，**无未申报目录**；`/docs/connector` 确认 `type: skill-only` 属「基础」版本枚举值，但**未公布其目录结构**；连接器必备 `connector-meta.json` + `icon.svg` 本仓库**皆无**，`.codebuddy-plugin/plugin.json` 为不同 schema | 部分（路线 A 假设成立 → **无阻塞**；路线 F 假设「换个地方放技能即可」不成立） | 产出 **R19/D20** 与 **D20**；`R8` 状态由 `open` 改为 `partially closed`；新增 `R8a`、`R21` |
| D20 | 2026-10-05 | R20 与 D19 的补救栏仍停留在「建议固化为回归测试」——官方字段表是文字结论而非可执行约束，且首版门禁设计有两个会自我失效的缺陷：① 若按工作区扫产物，任何跑过一次 runner 的机器都会红（本地 `__pycache__` 已被 `.gitignore` 覆盖且被排除层过滤），门禁将训练使用者忽略它；② 未申报 frontmatter 键若一律判失败会误伤仓库自有字段（`display_name_en`），若一律放过则抓不到拼写错误 | 否（属门禁自身的可执行性与信噪比问题，不改变官方规范结论） | 新增 `tests/test_official_skill_spec.py`（提交 `9a2dbd6`）：产物检查改为**只对 git 索引断言**；未申报键降为 ADVISORY，仅在与已申报键相差一字符时判 FATAL；补根目录散落文件与磁盘→zip 接缝断言；变异测试四项全捕获 |
