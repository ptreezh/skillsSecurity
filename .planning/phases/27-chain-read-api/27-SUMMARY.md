# Phase 27 Summary: 后端链上读路径 API

**完成日期：** 2026-09-17
**状态：** ✅ Complete（2/2 plans，3/3 成功标准满足）

## 目标

把 ChainMaker chain1 链上数据（经 cmc 网关）聚合为 REST 读端点，供 P28 前端接线；零 mock，全部真链数据。

## 交付物

| 文件 | 变更 | Commit |
|------|------|--------|
| `server/chain-read.js` | 新建：读聚合服务（列表/详情/声誉/排行/统计，30s TTL 缓存，DI 可测） | `84853de` |
| `test/server/chain-read.test.cjs` | 新建：13 项单测（纯函数 + DI 分页/缓存/404/排行榜去重） | `84853de` |
| `server/index.js` + `server/locales/{zh-CN,en-US}.json` | 5 个 GET 端点 + i18n 错误文案（skill.notFound / reputation.invalidAddress） | `a21c6d9` |
| `server/chainmaker-client.js` + `test/server/chainmaker-client.test.cjs` | decodeResult 支持负 int256（反噬负声誉）与多值数值返回；导出 decodeResult；+6 测试 | `55c7a00` |
| `package.json` | test:unit 补挂 chain-read 套件（修假绿：原只跑 chainmaker-client） | `4a25def` |

## 端点清单

- `GET /api/skills?page=1&pageSize=20` — 分页技能列表
- `GET /api/skills/:id` — 技能详情（404 = 技能不存在）
- `GET /api/reputation/:address` — 用户声誉全景（6 项并行；400 = 无效地址）
- `GET /api/leaderboard?limit=10` — 声誉排行（owner ∪ 镜像提交者，按 skillId 去重）
- `GET /api/stats` — 协议统计（6 合约地址表 + chainId）

## 验收证据（2026-09-17 实测，PORT=10002）

1. **成功标准 1** ✅ `curl /api/skills` → `{"total":4,...}` 4 条 chain1 真实技能（owner=deployer，指纹/版本/时间戳齐全）
2. **成功标准 2** ✅ `curl /api/reputation/0x3737f0d872f386f170c20e2ae73b81cfe6b7ecf3` → 9 字段全返回（全 0/false = 链上真实状态，staking 尚无活动）
3. **成功标准 3** ✅ `npm run test:unit` → 28 tests / 28 pass / 0 fail
4. 附加：`/api/stats` 返回 6 合约地址（0x 前缀）；`/api/skills/999`→404；`/api/reputation/xyz`→400；`/api/skills/abc`→404；大写 `0X` 地址前缀正常归一化

## 过程中发现并修复的问题

| 问题 | 根因 | 修复 |
|------|------|------|
| 排行榜 `skillsOwned=6 > skillCount=4` | owner 与镜像提交者同地址同技能重复计数 | participation Map 按 skillId 去重（补 2 个去重测试） |
| test:unit 假绿（15/15 实为只跑 1 个文件） | package.json 只挂 chainmaker-client.test.cjs | 显式双文件，28 项真跑 |
| `0X` 大写前缀地址被 validateAddress 拒绝 | regex 只允许小写 `0x` | `/^(?:0[xX])?/`（测试暴露） |
| decodeResult 无法解负声誉 | 仅匹配无符号 `[\d+]` | 有符号 + 多值数值分支 |

## 决策与遗留

- **端口冲突**：宿主 10001 被 360tray（安全软件）监听，不可杀 → 本阶段实测用 `PORT=10002`；生产端口最终归属（10001 vs 10002）列为 **P29 GATE 输入项**。
- **技能 1-2 字符串字段为 null**：早期无镜像冒烟行，符合"提交侧镜像补齐"设计，非缺陷；P28 前端需处理空态展示。
- **链上 staking 全 0**：真实状态（无质押活动），P30 端到端验收时可用 e2e 写路径产生数据后复测非零路径。
