# AgentSkills 无代币架构设计

## 核心定位

**AgentSkills = 区块链 + 声誉系统 + 服务平台（无代币）**

| 概念 | 实现方式 |
|------|----------|
| 区块链 | Polygon Amoy 智能合约 (不可篡改) |
| 信用凭证 | ERC-721 声誉徽章 (可验证、不可转让) |
| 激励 | 服务费分账 + 声望系统 |

---

## 合规性

| 地区 | 合规性 | 原因 |
|------|--------|------|
| 中国 | ✅ | 无代币/虚拟货币，纯服务费模式 |
| 美国 | ✅ | 服务费模式，无证券属性 |
| 欧盟 | ✅ | MiCA 对服务费模式要求较低 |

---

## 核心合约

### 1. RevenueSplit - 服务费分账

```solidity
contract RevenueSplit {
    // 分账比例
    CREATOR_FEE = 7000  // 70% 技能创建者
    REFERRER_FEE = 1000 // 10% 推荐者
    AUDITOR_FEE = 500   // 5% 审核者
    DISPUTE_FEE = 500   // 5% 仲裁基金
    PLATFORM_FEE = 1000 // 10% 平台运营
}
```

### 2. ReputationBadges - 声誉徽章

```solidity
contract ReputationBadges {
    // 徽章类型
    SKILLSHARP_100,     // 100+ 次成功交付
    VERIFIED_DEVELOPER, // 认证开发者
    TOP_RATED,         // 4.5+ 评分
    EARLY_ADOPTER,     // 早期用户
    SECURITY_AUDITOR,   // 安全审计员
    CODE_REVIEWER      // 代码审查员

    // 关键: 不可转让
    function transferFrom() { revert("Non-transferable"); }
}
```

### 3. SelfSustainingEcosystem - 自维持生态

```solidity
contract SelfSustainingEcosystem {
    // 角色
    CREATOR,   // 技能创建者
    AUDITOR,   // 审核者
    REFERRER,  // 推荐者
    DISPUTER,  // 仲裁者
    NODE,      // 节点运营
    CURATOR    // 策展人

    // 激励
    // - 角色收益分成
    // - 声望增长
    // - 自运营健康报告
    // - 自进化改进提案
    // - 自推广推荐链接
}
```

### 4. SkillRegistry - 技能注册

```solidity
contract SkillRegistry {
    // 技能注册需押金
    // 押金可退 (无利息)
    // 争议时仲裁决定押金归属
}
```

### 5. PaymentEscrow - 支付托管

```solidity
contract PaymentEscrow {
    // 用户付款 → 托管
    // 技能完成 → 释放给创建者
    // 争议 → 仲裁决定
}
```

---

## 移除的合约

| 合约 | 原因 |
|------|------|
| ASKToken.sol | ❌ 代币，不需要 |
| DeployerRewards.sol | ❌ 代币奖励，改服务费分成 |
| RevenueDistributor.sol | ❌ 代币分红，改直接分账 |
| StakingManager.sol | ❌ 代币质押，改押金模式 |

---

## 激励飞轮

```
用户增长 → 服务使用 → 收入产生 → 分账激励
    ↑                                    ↓
    ← 声望增长 ← 角色升级 ← 更多贡献 ←
```

---

## 部署计划

| Phase | 内容 | 合约 |
|-------|------|------|
| Phase 22 | 核心基础设施 | SkillRegistry, PaymentEscrow, RevenueSplit |
| Phase 23 | 声誉系统 | ReputationBadges, SkillRatings |
| Phase 24 | 自维持生态 | SelfSustainingEcosystem |
| Phase 25 | 治理升级 | 提案系统、投票机制 |

---

*Created: 2026-05-20*
*Status: 规划中*
