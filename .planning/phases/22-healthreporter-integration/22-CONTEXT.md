# Phase 22: 无代币核心基础设施 - Context

**Gathered:** 2026-05-20
**Status:** Ready for planning
**Source:** Architecture redesign decision

<domain>

## Phase Boundary

本阶段将 AgentSkills 从代币架构重构为**无代币 + 区块链 + 声誉系统**架构。

### 核心转变

| 旧架构 | 新架构 |
|--------|--------|
| ASKToken 代币 | ❌ 移除 |
| DeployerRewards 代币奖励 | ✅ 服务费分账 |
| RevenueDistributor 代币分红 | ✅ 直接法币分账 |
| StakingManager 代币质押 | ✅ 押金托管 (可退) |
| Governance 代币投票 | ✅ 声望加权投票 |

### 合规性

- **中国**: ✅ 无代币 = 无虚拟货币风险
- **美国**: ✅ 服务费模式，无证券属性
- **欧盟**: ✅ MiCA 对服务费模式要求较低

</domain>

<decisions>

## Implementation Decisions

### 1. 核心合约设计

#### RevenueSplit - 服务费分账合约
```
分账比例:
- 技能创建者: 70%
- 推荐者: 10%
- 审核者: 5%
- 仲裁基金: 5%
- 平台运营: 10%
```

#### ReputationBadges - 链上声誉徽章
```
徽章类型:
- SKILLSHARP_100: 100+ 次成功交付
- VERIFIED_DEVELOPER: 认证开发者
- TOP_RATED: 4.5+ 评分
- EARLY_ADOPTER: 早期用户
- SECURITY_AUDITOR: 安全审计员
- CODE_REVIEWER: 代码审查员

关键特性: 不可转让 (transferFrom 回滚)
```

#### SelfSustainingEcosystem - 自维持生态
```
角色:
- CREATOR: 技能创建者
- AUDITOR: 审核者
- REFERRER: 推荐者
- DISPUTER: 仲裁者
- NODE: 节点运营
- CURATOR: 策展人

激励:
- 角色收益分成
- 声望增长
- 自运营健康报告
- 自进化改进提案
- 自推广推荐链接
```

### 2. 移除的合约

| 合约 | 处理方式 |
|------|----------|
| ASKToken.sol | 禁用/删除 |
| DeployerRewards.sol | 禁用/删除 |
| RevenueDistributor.sol | 禁用/删除 |
| StakingManager.sol | 改为押金管理 |

### 3. 支付模式

```
用户付款 → PaymentEscrow 托管
         ↓
技能完成 → 释放给创建者 (70%)
         ↓
推荐奖励 → 推荐者 (10%)
         ↓
审核费用 → 审核者 (5%)
         ↓
仲裁基金 → 争议备用 (5%)
         ↓
平台运营 → 运营基金 (10%)
```

### 4. 激励飞轮

```
用户增长 → 服务使用 → 收入产生 → 分账激励
    ↑                                    ↓
    ← 声望增长 ← 角色升级 ← 更多贡献 ←
```

</decisions>

<canonical_refs>

## Canonical References

**必须阅读以下文件:**

- `docs/plans/NO-TOKEN-ARCHITECTURE.md` — 无代币架构设计文档
- `contracts/HealthReporter.sol` — 现有健康报告合约 (保留)
- `contracts/SkillRegistry.sol` — 现有技能注册合约 (需适配)
- `contracts/DAO/Governance.sol` — 现有治理合约 (需改为声望投票)

</canonical_refs>

<specifics>

## Specific Ideas

### RevenueSplit 合约核心接口

```solidity
contract RevenueSplit {
    // 分账比例 (basis points)
    uint256 public constant CREATOR_FEE = 7000;  // 70%
    uint256 public constant REFERRER_FEE = 1000; // 10%
    uint256 public constant AUDITOR_FEE = 500;   // 5%
    uint256 public constant DISPUTE_FEE = 500;   // 5%
    uint256 public constant PLATFORM_FEE = 1000; // 10%

    // 收取并分账
    function deposit(
        address creator,
        address auditor,
        address referrer
    ) external payable;

    // 提取收益
    function withdraw() external;
}
```

### ReputationBadges 合约核心接口

```solidity
contract ReputationBadges is ERC721 {
    enum BadgeType {
        SKILLSHARP_100,
        VERIFIED_DEVELOPER,
        TOP_RATED,
        EARLY_ADOPTER,
        SECURITY_AUDITOR,
        CODE_REVIEWER
    }

    // 签发徽章 (仅授权签发者)
    function issueBadge(
        address recipient,
        BadgeType badgeType,
        string memory evidence
    ) external onlyIssuer;

    // ⚠️ 关键: 禁止转让
    function transferFrom(
        address,
        address,
        uint256
    ) public pure override {
        revert("Badges are non-transferable");
    }
}
```

</specifics>

<deferred>

## Deferred Ideas

以下功能在后续 Phase 处理:

- 前端 UI 重构 (适配无代币)
- 法币支付网关集成 (Stripe/支付宝)
- KYC 验证系统
- 完整的 DisputeResolver 合约

</deferred>

---

*Phase: 22-no-token-core*
*Context gathered: 2026-05-20*
