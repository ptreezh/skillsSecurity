# Phase 12: ASKToken 单元测试 - Context

**Gathered:** 2026-05-17
**Status:** Ready for planning

<domain>
## Phase Boundary

ASKToken ERC20 代币合约功能完整测试覆盖。包括铸造、销毁、委托和事件发射的验证。

</domain>

<decisions>
## Implementation Decisions

### Test Organization
- **D-01:** 模块化结构 — 每个合约一个独立测试文件
- **D-02:** 文件位置：`test/contracts/ASKToken.test.js`
- **D-03:** 使用 `deployContracts` fixture from `test/fixtures.cjs`

### Assertion Style
- **D-04:** Chai expect 断言风格
- **D-05:** BDD `describe/it` 描述结构
- **D-06:** 与 fixtures.cjs 保持风格一致

### Test Structure (per ASKT requirements)
- **D-07:** ASKT-01: Mint 测试 + access control revert (`onlyOwner` 验证)
- **D-08:** ASKT-02: Burn 测试 + insufficient balance revert
- **D-09:** ASKT-03: Delegate 测试 + vote weight tracking 验证
- **D-10:** ASKT-04: 事件测试 — 所有事件参数完整验证

### Coverage Strategy
- **D-11:** 均衡覆盖 — mint/burn/delegate/events 无依赖，可并行测试
- **D-12:** 核心 revert 必测 — access control, insufficient balance

### Event Testing
- **D-13:** 使用 chai-matchers `emit` + `withArgs` 完整验证参数
- **D-14:** 覆盖 Mint、Burn、Delegate 事件

### Error Cases
- **D-15:** OnlyOwner revert — 非 owner 调用 mint 必须失败
- **D-16:** Insufficient balance revert — burn 超额余额必须失败
- **D-17:** Max supply revert — mint 超出 MAX_SUPPLY 必须失败

### Claude's Discretion
- 具体的 it() 描述文本措辞
- 边界值选择（amount = 0, 1, max supply 等）
- describe/it 嵌套层级深度

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements
- `.planning/ROADMAP.md` — Phase 12 success criteria (mint access, burn, delegation, events)
- `.planning/REQUIREMENTS.md` — ASKT-01 ~ ASKT-04 requirements

### Testing Infrastructure
- `test/fixtures.cjs` — existing fixture system with `deployContracts()`
- `.planning/codebase/TESTING.md` — testing patterns and chai usage

### Contract Under Test
- `contracts/ASKToken.sol` — ASKToken contract with ERC20, ERC20Burnable, Ownable

### Hardhat Config
- `hardhat.config.js` — network config, solidity settings
- `test/smoke.fixture.test.cjs` — existing test style reference

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `test/fixtures.cjs` — `deployContracts()` fixture 可直接复用
- OpenZeppelin `chai-matchers` — `to.be.revertedWith()`, `emit`, `withArgs` 等链式断言

### Established Patterns
- fixtures.cjs 使用 `loadFixture` + async function pattern
- smoke.fixture.test.cjs 使用 `describe/it` + `expect` + `loadFixture`
- ethers.getSigners() 提供 [owner, user1, user2, ...accounts]

### Integration Points
- Test file放在 `test/contracts/ASKToken.test.js`
- Fixture 导出 `{ token, staking, registry, attribution, owner, user1, user2, accounts }`

</code_context>

<specifics>
## Specific Ideas

- 测试文件命名遵循 `ContractName.test.js` 约定
- 每个 describe 块对应一个功能区域（Mint/Burn/Delegate/Events）
- access control 测试：验证 owner 可 mint，非 owner 不可 mint

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 12-asktoken*
*Context gathered: 2026-05-17*