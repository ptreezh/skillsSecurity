# Phase 20: DeployerRewards + RevenueDistributor 完善 - Research

**Researched:** 2026-05-18
**Domain:** Web3激励系统前端集成与测试
**Confidence:** HIGH

## Summary

Phase 20 需要完善已部署的两个激励合约：DeployerRewards（阶梯式推广激励）和 RevenueDistributor（协议收入分红）。当前状态：DeployerRewards 已有良好测试覆盖，但 RevenueDistributor 测试不足（仅4个测试），SelfOpsPanel 使用 mock 数据。

**Primary recommendation:** 优先完成 RevenueDistributor ABI 生成和完整测试，然后在 SelfOpsPanel 中集成真实合约数据，最后实现分红计算器。

## User Constraints (from CONTEXT.md)

### Phase Requirements
| ID | Description | Research Support |
|----|-------------|------------------|
| OPS-01 | RevenueDistributor 前端面板（显示分红历史、待领取金额） | 需要生成 ABI、扩展 ContractService、创建数据获取函数 |
| OPS-02 | DeployerRewards 完整测试（覆盖率 > 80%） | 当前覆盖率约 75%，需补充治理相关函数测试 |
| OPS-03 | 分红计算器（预估月收入） | 需要实现前端计算器组件 |

### Current State (from STATE.md)
- DeployerRewards.sol 已部署，完整测试在 `contracts/test/DeployerRewards.test.js`
- RevenueDistributor.sol 已部署，测试在 `tests/RevenueDistributor.test.js`（仅4个测试）
- SelfOpsPanel.jsx 已创建（基础面板，TODO 数据获取）

### Success Criteria (from ROADMAP.md)
1. RevenueDistributor 前端面板（显示分红历史、待领取金额）
2. DeployerRewards 完整测试（覆盖率 > 80%）
3. 分红计算器（预估月收入）

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ethers.js | 6.16 | 合约交互 | 项目指定，与 Hardhat 兼容 |
| React | 18.2 | 前端框架 | 项目指定 |
| Hardhat | 2.28 | 测试框架 | 项目指定 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @nomicfoundation/hardhat-chai-matchers | 2.1.2 | 合约测试断言 | 验证合约状态变化 |
| @nomicfoundation/hardhat-network-helpers | 1.1.2 | 时间操作 | 测试月度限制逻辑 |
| solidity-coverage | 0.8.17 | 覆盖率报告 | 验证 OPS-02 要求 |

### Frontend Contract Integration
| Pattern | Implementation | Notes |
|---------|----------------|-------|
| Contract initialization | ContractService.jsx | 已有 DeployerRewards 支持 |
| ABI loading | src/abi/*.json | 需要生成 RevenueDistributor.json |
| Real-time updates | React hooks | 需要添加事件监听 |

## Architecture Patterns

### Recommended Project Structure
```
src/
├── pages/
│   └── SelfOpsPanel.jsx          # 需要扩展：Revenue 分红面板
│   └── SelfOpsPanel.css          # 现有样式
├── services/
│   └── ContractService.jsx       # 需要添加：RevenueDistributor 函数
├── components/
│   └── DividendCalculator.jsx    # 新增：分红计算器组件
│   └── DistributionHistory.jsx  # 新增：分红历史组件
└── hooks/
    └── useDeployerRewards.js     # 新增：DeployerRewards React hook
    └── useRevenueDistributor.js  # 新增：RevenueDistributor React hook
```

### Pattern 1: RevenueDistributor ABI Generation
**What:** 从编译产物生成前端 ABI
**When to use:** 需要与新部署合约交互
**Example:**
```bash
# 从 artifacts 生成 ABI（需要先编译）
npx hardhat compile
# 然后复制 ABI 文件
cp contracts/artifacts/contracts/RevenueDistributor.sol/RevenueDistributor.json src/abi/RevenueDistributor.json
```

### Pattern 2: Dividend Calculator
**What:** 基于协议收入历史预估月收入
**When to use:** 帮助部署者理解潜在收益
**Example:**
```javascript
// 简单公式：预估月收入 = 历史月均分红 × 你的权重占比
function calculateMonthlyEstimate(historicalData, deployerWeight, totalWeight) {
  const avgMonthly = historicalData.reduce((sum, d) => sum + d.amount, 0) / historicalData.length;
  return avgMonthly * (deployerWeight / totalWeight);
}
```

### Pattern 3: Event-Based Dividend History
**What:** 监听合约事件构建分红历史
**When to use:** 需要显示用户分红记录
**Example:**
```javascript
// 监听 DividendsDistributed 事件
contract.on("DividendsDistributed", (deployer, amount, total, event) => {
  addToHistory({ deployer, amount, timestamp: event.blockNumber });
});
```

### Anti-Patterns to Avoid
- **Hardcode contract addresses:** 使用 deployments.json 动态加载
- **Poll for updates:** 使用事件监听而非轮询
- **Single mock data:** SelfOpsPanel 当前使用 mock，需要替换为真实数据

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Contract interaction | 自定义 Web3 调用 | ContractService.jsx | 统一管理 provider/signer |
| Dividend tracking | 自己计算余额变化 | 监听 DividendsDistributed 事件 | 实时准确 |
| Coverage reporting | 手动计算 | solidity-coverage | 自动化且准确 |

## Common Pitfalls

### Pitfall 1: RevenueDistributor ABI Missing
**What goes wrong:** 前端无法与合约交互
**Why it happens:** RevenueDistributor.json ABI 不存在于 src/abi/
**How to avoid:** 编译后复制 artifact 到 src/abi/
**Warning signs:** `ContractABI not found` 错误

### Pitfall 2: Event Listener Memory Leaks
**What goes wrong:** React 组件卸载后事件监听器继续运行
**Why it happens:** 未在 useEffect cleanup 中移除监听器
**How to avoid:** 始终返回移除监听器的 cleanup 函数
```javascript
useEffect(() => {
  const handler = (...) => { ... };
  contract.on("Event", handler);
  return () => contract.off("Event", handler);
}, [...]);
```

### Pitfall 3: 测试覆盖率计算不准确
**What goes wrong:** hardhat coverage 显示覆盖率低
**Why it happens:** 未触发内部函数路径
**How to avoid:** 确保测试调用所有公开函数，包括边界条件

## Code Examples

### ContractService - RevenueDistributor Integration
```javascript
// src/services/ContractService.jsx 添加

// RevenueDistributor 函数
export async function getCumulativeDividends(address) {
  const contract = getContract('RevenueDistributor');
  if (!contract) return '0';
  try {
    return ethers.formatEther(await contract.cumulativeDividends(address));
  } catch { return '0'; }
}

export async function getPendingDividends() {
  const contract = getContract('RevenueDistributor');
  if (!contract) return '0';
  try {
    return ethers.formatEther(await contract.getPendingDividends());
  } catch { return '0'; }
}

export async function triggerDistribution() {
  const contract = getContract('RevenueDistributor');
  if (!contract) return { success: false };
  if (!currentSigner) return { success: false, error: 'Wallet not connected' };
  try {
    const tx = await contract.distribute();
    await tx.wait();
    return { success: true, tx };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
```

### DeployerRewards - getRewardRate Test (补充)
```javascript
// contracts/test/DeployerRewards.test.js 添加

describe("getRewardRate", function () {
  it("should return correct rate for Bronze tier", async function () {
    await deployerRewards.connect(deployer).registerDeployer("test.com");
    const rate = await deployerRewards.getRewardRate(deployer.address);
    expect(rate).to.equal(1000); // 10%
  });

  it("should return correct rate for Silver tier", async function () {
    // Upgrade to Silver
    await deployerRewards.connect(deployer).registerDeployer("test.com");
    await mockToken.transfer(await deployerRewards.getAddress(), ethers.parseEther("100000"));
    for (let i = 0; i < 20; i++) {
      await deployerRewards.connect(deployer).onUserRegistered(
        ethers.Wallet.createRandom().address,
        ethers.parseEther("100")
      );
      if (i < 10) {
        await deployerRewards.setUserActive(
          ethers.Wallet.createRandom().address,
          deployer.address
        );
      }
      if (i > 0 && i % 9 === 0) await time.increase(31 * 24 * 60 * 60);
    }
    const rate = await deployerRewards.getRewardRate(deployer.address);
    expect(rate).to.equal(1500); // 15%
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Mock data in frontend | Real contract calls | Phase 20 | Accurate data |
| Minimal RevenueDistributor tests | Comprehensive tests | Phase 20 | 80%+ coverage |
| Manual dividend calculation | Dividend calculator | Phase 20 | User-friendly |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | DeployerRewards 测试覆盖率约 75% | Testing | 可能需要更多测试 |
| A2 | RevenueDistributor 需要生成 ABI | ABI | 如果已存在，任务简化 |
| A3 | SelfOpsPanel 需要添加 RevenueDistributor 数据 | Frontend | 如果已实现，需要更新 |

## Open Questions

1. **RevenueDistributor ABI 是否已生成？**
   - What we know: src/abi/ 目录只有 ASKToken, SkillRegistry, StakingManager, Attribution, DeployerRewards
   - What's unclear: RevenueDistributor ABI 是否存在于 artifacts 但未复制
   - Recommendation: 先检查 artifacts 目录，然后运行 compile

2. **部署地址在哪里？**
   - What we know: 合约已部署到 Polygon Amoy
   - What's unclear: 具体地址，未找到 deployments.json
   - Recommendation: Phase 16 可能还未完成，需要从部署日志或 Explorer 获取

3. **historicalData 数据来源？**
   - What we know: 分红计算器需要历史数据
   - What's unclear: 如何获取分红历史 - 事件监听还是后端索引
   - Recommendation: 先实现事件监听，验证可行性

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Hardhat | 编译/测试 | Yes | 2.28.6 | — |
| Node.js | 运行测试 | [check needed] | — | — |
| ethers.js | 前端合约调用 | Yes | 6.16.0 | — |

**Missing dependencies with no fallback:**
- RevenueDistributor.json ABI（需要编译生成）
- deployments.json（合约地址配置）

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Hardhat + Mocha + Chai |
| Config file | hardhat.config.js |
| Quick run command | `npx hardhat test tests/RevenueDistributor.test.js` |
| Full suite command | `npx hardhat test` |
| Coverage command | `npx hardhat coverage` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| OPS-01 | RevenueDistributor 面板数据获取 | Manual/Integration | Browser test | No - needs frontend |
| OPS-02 | DeployerRewards 测试覆盖率 | Unit | `npx hardhat coverage` | Yes - needs extension |
| OPS-03 | 分红计算器 | Unit | `npx hardhat test` | No - frontend only |

### Current Coverage Gaps (DeployerRewards)
- getDividend() - 未测试
- claimDividend() - 未测试
- getGovernanceWeight() - 未测试
- isGoldTier() - 未测试
- getEffectiveReferrals() - 未测试
- getRewardRate() - 未测试

### Sampling Rate
- **Per task commit:** `npx hardhat test tests/RevenueDistributor.test.js --grep "specific test"`
- **Per wave merge:** `npx hardhat test`
- **Phase gate:** `npx hardhat coverage` shows >80%

### Wave 0 Gaps
- [ ] RevenueDistributor ABI generation command
- [ ] DeployerRewards governance tests (6 functions missing)
- [ ] DividendCalculator.jsx component skeleton

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V4 Access Control | Yes | onlyOwner 修饰符已验证 |
| V5 Input Validation | Yes | Solidity 编译器内置检查 |

### Known Threat Patterns for RevenueDistributor

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| 重复领取分红 | Tampering | cumulativeDividends 映射防止双花 |
| 比例总和不为100% | Denial | require 检查 (line 94-96) |
| Owner 权限滥用 | Elevation | 需要多签或时间锁 (未实现) |

## Sources

### Primary (HIGH confidence)
- DeployerRewards.sol - 合约源码，已阅读完整
- RevenueDistributor.sol - 合约源码，已阅读完整
- ContractService.jsx - 前端集成模式

### Secondary (MEDIUM confidence)
- DeployerRewards.test.js - 现有测试，456 行
- RevenueDistributor.test.js - 现有测试，仅 93 行（需扩展）

### Tertiary (LOW confidence)
- SelfOpsPanel.jsx - 需要与合约集成验证

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - 项目现有技术栈明确
- Architecture: HIGH - 模式清晰，从 Phase 18 延续
- Pitfalls: HIGH - 常见问题，已识别

**Research date:** 2026-05-18
**Valid until:** 2026-06-18 (30 days for stable project)
