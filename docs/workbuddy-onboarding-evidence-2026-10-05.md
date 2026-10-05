# WorkBuddy 上架证据摘要（2026-10-05 实测）

> 用途：为 `docs/plans/2026-10-05-workbuddy-listing-and-connector.md` 风险表提供一手证据。
> 来源：`open.workbuddy.cn/docs/{onboarding,developer-profile,what-is-open-platform,skill,connector}`（2026-10-05 抓取）。
> 规则：仅记录一手原文，不复述、不引申。

---

## 1. 入驻门槛（`/docs/onboarding` + `/docs/developer-profile`）

### 1.1 实名认证（硬门槛）

- **企业**或**个人**二选一（个人路径门槛较低）
- 个人认证必填：
  - **中国大陆二代居民身份证**（港澳台及外籍证件**当前不支持**
  - **本人已实名手机号**（与身份证匹配）
  - **可收验证码的邮箱**
  - **可做人脸识别的手机**
- 个人证件："姓名须与证件中文姓名一致；一个身份证在全平台只能认证一个个人主体；每个账号最多创建一个个人主体"
- 同一家企业最多可被 50 个账号分别认证；一个账号最多认证 10 个企业主体

### 1.2 备案/ICP（**未出现**）

- 三个入驻路径页面（`onboarding` / `developer-profile` / `what-is-open-platform`）全文**未出现**「备案」「ICP」「经营许可」「增值电信」等字样
- 仅在 `/docs/connector` 的安全要求出现「**远程 MCP 使用 HTTPS**」「最小权限」「不硬编码凭证」
- 结论：对**纯技能（A）**与 **`skill-only` 连接器（F）** 路径，备案**非**硬门槛；只有**远程 HTTPS MCP（B）** 才触发「必须 HTTPS」这一基础设施要求，与 ICP 不同

### 1.3 开发者主页资料（`/docs/developer-profile`）

四件套**全部必填**：

| 字段 | 要求 |
|---|---|
| 头像 | 512×512px，≤5MB，JPG/PNG；可被系统默认头像兜底但属「违规处置」行为 |
| 昵称 | 2—20 字符；**全平台唯一**；不可使用「测试 / test / demo / 试用」；不得冒充腾讯系品牌；不含误导性背书（不得使用「认证 / VIP / 第一 / 独家 / 保证」） |
| 简介 | 20—120 字符；不得夸大、虚假、无法验证 |
| 联系方式 | 至少 1 项、至多 5 项（官网 / 联系邮箱 / 微信公众号 / 自定义平台）；不得填写违法 / 欺诈 / 侵权 / 与开发者无关的信息 |

违规处置：可替换默认头像、用兜底文案替代简介、隐藏联系方式、限制主页展示、要求重提交，严重违规主体或能力**下架**。

### 1.4 `author`（frontmatter）≠ 开发者昵称

- `/docs/skill` frontmatter 字段表中 `author` 标注为「**合作方名称**」，即**资源**展示位的署名
- `/docs/developer-profile` 中「开发者昵称」是**主体**展示位的昵称
- 二者**两套字段**：技能市场展示的是 `author`，开发者主页展示的是「昵称」

---

## 2. 技能上架（`/docs/skill`）

### 2.1 必填 frontmatter（官方字段表）

- `description`（写清用途与触发词）
- `description_zh`（中文简介）
- `description_en`（英文简介）
- `version`（语义化版本号）
- `author`（合作方名称）

### 2.2 可选 frontmatter（官方字段表）

- `name`（技能标识）
- `allowed-tools`（工具白名单，逗号分隔）
- `disable-model-invocation`（true 则 AI 不自动触发，仅手动调用）
- `user-invocable`（false 则隐藏菜单，仅 AI 内部使用）

### 2.3 示例中出现但官方字段表**未**申报的键

- `display_name`、`display_name_en`、`category`
- 示例里写，但未在「字段」表列出的字段，可能在官方解析器中被**静默丢弃**或**严格拒绝**；本仓库 R22 已记录该风险

### 2.4 目录结构（官方「基础结构」）

```
{skill-name}/
├── SKILL.md              # ★ 必填
├── references/           # 可选
├── scripts/              # 可选
└── templates/            # 可选
```

官方文档**未**声明 `assets/` 目录；官方「解析失败原因」邮箱 `openworkbuddy@tencent.com`

---

## 3. 连接器上架（`/docs/connector`）

### 3.1 接入方式（必选其一，不可混用）

- **MCP + Skill（推荐）**：远程优先 `streamableHttp` / `sse`（HTTPS），本地进程可 stdio
- **CLI + Skill**：依赖 Node / Python 工具，由 WorkBuddy 调度

### 3.2 MCP + Skill 基础结构

```
your-connector/
├── connector-meta.json    # 必填
├── mcp.json               # 必填（远程 HTTPS / stdio 二选一）
├── icon.svg               # 必填（PNG/JPG 建议 64×64）
└── skills/                # 可选
    └── {skill-name}/
        └── SKILL.md
```

### 3.3 `connector-meta.json` 必填字段

- `name` / `name_en`（默认名与英文名；可补 `name_zh`）
- `description` / `description_zh` / `description_en`（20—100 字）
- `source`（**全局唯一，kebab-case，仅小写字母数字与连字符**
- `type`（可选，**`mcp`（默认）** / **`cli`** / **`skill-only`**，三者均为「基础」版本兼容，**无需** `minWorkbuddyVersion`）
- `examples_zh` / `examples_en`（自 4.24.0 起**必填**；用则**必须**声明 `minWorkbuddyVersion ≥ 4.24.0`）
- `auth_mode`（MCP 按需，省略 / `server-side` / `gateway` / `token`；`token` 自 4.23.0 起生效）

### 3.4 `skill-only` 路径的目录结构**官方未给出**（R8a）

官方仅定义了 MCP + Skill 与 CLI + Skill 两种**接入方式**的目录结构；**未**为 `skill-only` 单独定义目录结构。
**推断**：仅需 `connector-meta.json` + `icon.svg` + `skills/`，**不需要** `mcp.json` / `cli.json`（无 Server 可连接）——属推断而非官方明示，提交前需向官方邮件确认。

### 3.5 提交前自检（官方 12 项）

1. 已选定 MCP 或 CLI；目录结构符合规范
2. `source` 为 kebab-case 且全局唯一
3. 名称、说明、中英示例填写完整
4. MCP 仅配一个 Server；远程用 HTTPS
5. CLI：安装 / 认证 / 状态 / 登出 / 跨平台均验证
6. CLI 登录态跨重启有效；`unAuth` 正确清理
7. OAuth：元数据发现 + 动态注册 + PKCE；接受约定回调
8. 自填 Token 模式：`${VAR}` 占位符与表单字段 key 一一对应；敏感字段为 `password`
9. Skill 能指导 AI 正确调用全部核心能力
10. 未在任何文件写入真实凭证
11. 图标清晰可辨；版本与最低 WorkBuddy 版本声明正确
12. 已覆盖超时、授权失效、参数错误等常见异常

### 3.6 审核与同步

- 提交后由 WorkBuddy 团队审核；审核通过 → 进入连接器市场
- 后续更新重新提交审核，**通常 10—15 分钟内生效**

---

## 4. 与本仓库现状的对照

### 4.1 路线 A（Skill 市场）

| 项 | 状态 |
|---|---|
| 4 个上架技能官方必填 frontmatter（description / description_zh / description_en / version / author） | **5/5 齐**（实测，见 `agentskills-workbuddy-package/tests/test_official_skill_spec.py`） |
| `category` 字段 | 4 个技能均填「开发工具」（示例中有但官方字段表未申报，R22 已追踪） |
| `display_name` / `display_name_en` | 4 个技能均填（仓库自引入字段，R22 风险闭合靠 `REPO_INTRODUCED_FRONTMATTER` 白名单） |
| 子目录 `references/` / `scripts/` / `templates/` | 4 个技能均无未申报目录 |
| 打包器支持 `assets/` | 官方未声明，但本仓库 4 个上架技能**均未使用** `assets/` → 无影响 |
| 提交阻塞 | 仅剩**步骤 0 的实名认证**（需用户本人 + 中国大陆二代身份证） |

### 4.2 路线 F（`skill-only` 连接器）

| 项 | 状态 |
|---|---|
| `connector-meta.json` | **缺失**（R19 open） |
| `icon.svg` | **缺失**（R19 open） |
| `type: skill-only` 合法性 | **合法且属「基础」版本**（R8a 已闭合字段层） |
| `skill-only` 目录结构 | **官方未公布**（R8 / R19 仍 open） |

### 4.3 路线 B（远程 HTTPS MCP）

| 项 | 状态 |
|---|---|
| 公网 HTTPS + 备案 | 未触及（计划列为可选） |
| `mcp.json`（`type: streamableHttp` + `https://` + `${SERVICE_TOKEN}` 占位） | 模板仅在 `/connectors/template/`，未针对 B 路线落地 |

---

## 5. 关键 URL 一手源

| 主题 | URL |
|---|---|
| 入驻开放平台 | https://open.workbuddy.cn/docs/onboarding |
| 开发者 profile | https://open.workbuddy.cn/docs/developer-profile |
| 平台总览 | https://open.workbuddy.cn/docs/what-is-open-platform |
| 技能上架 | https://open.workbuddy.cn/docs/skill |
| 连接器上架 | https://open.workbuddy.cn/docs/connector |
| 解析失败排查邮箱 | `openworkbuddy@tencent.com` |

---

## 6. 与本仓库风险表的更新点（建议进 R 表）

- **R21** 由「部分闭合」→ **完全闭合**（ICP/备案在 4 个相关一手页面均**未**出现）
- **R23**（新增）：**开发者主页**的四件套（头像 512×512 / 昵称 2—20 全局唯一 / 简介 20—120 / 联系方式 ≥1）是**技能展示位之外**的提交前阻断项；本仓库四件套均**缺失**
- **R24**（新增）：`author`（技能合作方署名）与「开发者昵称」（主体昵称）是**两套字段**；前者由 `SKILL.md` frontmatter 提供，后者由 `/docs/developer-profile` 提供；混用会导致技能展示与主页展示**两处署名不一致**
- **R22** 维持（`display_name_en` 等仓库自引入键在官方解析器中行为未实测）