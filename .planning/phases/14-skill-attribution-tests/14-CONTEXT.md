# Phase 14: SkillRegistry + Attribution 单元测试 - Context

**Gathered:** 2026-05-17
**Status:** Ready for planning

<domain>
## Phase Boundary

SkillRegistry 和 Attribution 合约功能完整测试覆盖。包括声望等级门槛、指纹生成、技能注册/验证、贡献追踪、跨合约通知验证。

</domain>

<decisions>
## Implementation Decisions

### Test Organization
- **D-01:** 两个独立测试文件
- **D-02:** `test/contracts/SkillRegistry.test.cjs` — SkillRegistry 测试
- **D-03:** `test/contracts/Attribution.test.cjs` — Attribution 测试
- **D-04:** 使用 `deployContracts` fixture from `test/fixtures.cjs`

### Assertion Style (from Phase 12/13)
- **D-05:** Chai expect 断言风格
- **D-06:** BDD `describe/it` 描述结构
- **D-07:** 与 Phase 12/13 测试保持风格一致

### SkillRegistry Test Structure (per SKIL requirements)
- **D-08:** SKIL-01: 注册时声望等级门槛验证 (L1-L5 thresholds)
- **D-09:** SKIL-02: 指纹生成测试 — computeFingerprint consistency
- **D-10:** SKIL-03: 验证流程 — registerSkill → verifySkill → events
- **D-11:** SKIL-04: getUserReputation 集成调用 StakingManager

### Attribution Test Structure (per ATTR requirements)
- **D-12:** ATTR-01: addContribution 创建追踪
- **D-13:** ATTR-02: likeSkill 防重复点赞 (hasLiked check)
- **D-14:** ATTR-03: 跨合约通知 setPositiveContribution
- **D-15:** ATTR-04: setPositiveContribution → StakingManager

### Cross-Contract Testing
- **D-16:** SkillRegistry 调用 StakingManager.getUserReputation()
- **D-17:** Attribution 调用 StakingManager.setPositiveContribution()
- **D-18:** 需要正确设置 StakingManager address in Attribution (via setStakingManager)

### Access Control
- **D-19:** onlyOwner functions need revert tests
- **D-20:** verifySkill requires effective reputation threshold

### Event Testing
- **D-21:** SkillRegistered, SkillVerified, FingerprintGenerated 事件
- **D-22:** SkillLiked 事件 (Attribution)

### Reputation Thresholds
- **D-23:** MEDIUM skill: 500+ effective reputation
- **D-24:** HIGH skill: 2000+ effective reputation
- **D-25:** CRITICAL skill: 5000+ effective reputation
- **D-26:** verifySkill L2-L5 thresholds per risk level

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements
- `.planning/ROADMAP.md` — Phase 14 success criteria
- `.planning/REQUIREMENTS.md` — SKIL-01 ~ SKIL-04, ATTR-01 ~ ATTR-04

### Testing Infrastructure
- `test/fixtures.cjs` — existing fixture system with `deployContracts()`
- `test/contracts/ASKToken.test.cjs` — Phase 12 test patterns
- `test/contracts/StakingManager.test.cjs` — Phase 13 test patterns

### Contracts Under Test
- `contracts/SkillRegistry.sol` — Skill registry with reputation gates
- `contracts/Attribution.sol` — Attribution with cross-contract notifications

### Hardhat Config
- `hardhat.config.js` — network config
- `package.json` — hardhat-chai-matchers, hardhat-network-helpers installed

</canonical_refs>

<codebase_context>
## Existing Code Insights

### Reusable Assets
- `test/fixtures.cjs` — `deployContracts()` fixture 可直接复用
- Phase 12/13 的测试模式可直接应用

### SkillRegistry Key Features
- MIN_STAKE constants per RiskLevel (10/50/100/200 ether)
- getUserReputation from StakingManager for effective reputation
- computeFingerprint uses keccak256(abi.encodePacked)

### Attribution Key Features
- setStakingManager() must be called after deployment
- setPositiveContribution called on positive scores
- hasLiked mapping prevents double-like

### Integration Points
- SkillRegistry constructor: (token, stakingManager)
- Attribution needs setStakingManager() call (see fixtures.cjs line 41)

</codebase_context>

<specifics>
## Specific Ideas

- Fingerprint: keccak256(ipfsHash + creator + timestamp)
- Reputation thresholds enforced in registerSkill (not verifySkill)
- Attribution.setStakingManager() is critical setup step

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 14-skill-attribution-tests*
*Context gathered: 2026-05-17*