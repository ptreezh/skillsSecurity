# AgentSkills Bug Bounty - Immunefi Submission

## 项目信息

**Project Name:** AgentSkills
**Website:** https://agentskills.xyz
**Twitter:** @AgentSkills
**Discord:** (待提供)
**Chain:** Polygon (Mainnet)

## 联系信息

**Security Email:** security@agentskills.xyz
**Response Time:** 48 hours

## 合约列表

### 核心合约 (High Severity)

| Contract | 地址 | 优先级 |
|----------|------|--------|
| StakingManager.sol | (待部署后填入) | Critical |
| SkillRegistry.sol | (待部署后填入) | High |
| Attribution.sol | (待部署后填入) | High |

### 治理合约 (Critical Severity)

| Contract | 地址 | 优先级 |
|----------|------|--------|
| GovernanceTimelock.sol | (待部署后填入) | Critical |
| AgentPausable.sol | (待部署后填入) | High |

### 已废弃合约 (Out of Scope)

- DeployerRewards.sol
- RevenueDistributor.sol
- ASKToken.sol

## Bug 严重等级定义

### Critical (P1)
**奖励:** $10,000 - $50,000

- 永久性资金损失 (> 1 ETH)
- 用户声望被盗
- 完全的合约接管
- 资金永久冻结

### High (P2)
**奖励:** $2,500 - $10,000

- 临时性资金损失
- 未授权访问治理功能
- 绕过 pause 机制
- 重入攻击

### Medium (P3)
**奖励:** $500 - $2,500

- 逻辑错误导致状态变更
- 临时拒绝服务
- 非关键函数的访问控制绕过

### Low (P4)
**奖励:** $100 - $500

- 信息性发现
- 轻微 gas 优化机会

## 奖励倍数

| 条件 | 倍数 |
|------|------|
| 有可工作的 PoC | 1.5x |
| StakingManager 合约 | 1.5x |
| GovernanceTimelock 合约 | 2.0x |
| 新型攻击向量 | 1.25x |
| 单报告多漏洞 | 1.2x |

## 需要提交的内容

1. 漏洞描述
2. 复现步骤
3. PoC (代码/交易记录)
4. 影响评估
5. 建议修复 (可选)

## 部署后需要更新的信息

```javascript
// 部署后填入合约地址
const CONTRACTS = {
  Polygon: {
    StakingManager: "0x...",
    SkillRegistry: "0x...",
    Attribution: "0x...",
    GovernanceTimelock: "0x...",
    AgentPausable: "0x..."
  }
};
```

## 代码仓库

**GitHub:** (待提供)
**Commit Hash for Audit:** (部署时的 commit)

## 文档链接

- Executive Summary: `docs/security/audit-package/executive-summary.md`
- Contract Descriptions: `docs/security/audit-package/contract-descriptions.md`
- Slither Report: `docs/security/slither-report.md`