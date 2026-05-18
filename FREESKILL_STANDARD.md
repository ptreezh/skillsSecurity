# FreeSkill 标准规范 v1.0

**版本：** 1.0
**制定日期：** 2026-05-05
**前身：** SKILLS_STANDARD.md v1.1
**状态：** 草稿 v1.0
**依据：** AgentSkills 项目宪法 + 论文 "Responsibility Shield"
**全称：** FreeAgentSkills FreeSkill Standard

---

## 摘要

FreeSkill 是 FreeAgentSkills 平台的**可信技能治理标准**，核心理念：

> **让 Skill 免于混乱的自由 — 让 AI 技能可追溯、可归因、可验证、可惩罚**

本标准为 Skills 补充完整责任链，使技能创建者、验证者、使用者之间建立可验证的信任，从而建立用户信任。

---

## 1. 目的与范围

### 1.1 目的
- 为 Skills 补充治理接口，填补 AgentSkills.io 功能完整但治理真空的结构性缺陷
- 建立技能全生命周期的责任闭环（创建→传播→使用）
- 构建基于信任的技能市场，降低用户使用 AI 技能的风险
- 为 AI 行业从"能力竞争"转向"可信度竞争"提供标准路径

### 1.2 与 AgentSkills.io 的关系

| AgentSkills.io | FreeSkill |
|----------------|------------|
| 功能接口完整 | 治理接口补充 |
| 无责任声明 | 强制责任声明 |
| 无审计记录 | 链上审计追踪 |
| 无授权控制 | 多级授权机制 |
| 无反噬机制 | Anti-Slash 惩罚 |

FreeSkill **向后兼容** AgentSkills.io——所有现有 Skills 无需修改结构，只需补充治理字段。

### 1.3 口号

> **Free by default. Trusted by design.**

---

## 2. 核心概念

### 2.1 责任链（Responsibility Chain）

```
创建者签署责任声明 → 验证者背书 → 指纹锚定 IPFS
       ↓                              ↓
   使用记录                    审计追踪上链
       ↓                              ↓
   损害发生时 ← ──────────── → 反噬惩罚
```

### 2.2 可信技能 vs 普通技能

| 维度 | 普通技能 | FreeSkill |
|------|---------|------------|
| 追溯 | ❌ 无 | ✅ 指纹 + IPFS |
| 归因 | ❌ 无 | ✅ 贡献者记录 |
| 验证 | ❌ 无 | ✅ 多方验证者 |
| 授权 | ❌ 无 | ✅ 人类确认 |
| 反噬 | ❌ 无 | ✅ 惩罚机制 |
| 信任 | ⚠️ 低 | ✅ 高 |

---

## 3. 治理标准（FreeSkill Governance）

### 3.1 必需字段（新增）

每个 FreeSkill 必须包含以下治理字段：

```json
{
  // AgentSkills.io 原有字段（保留）
  "name": "skill-name",
  "description": "功能描述",
  "trigger": "触发条件",
  "metadata": {},
  "scripts": {},
  "resources": {},

  // === FreeSkill 新增治理字段 ===
  "freeskill": {
    "fingerprint": "0x指纹(keccak256)",
    "creator": "0x创建者地址",
    "createdAt": 1714896000,
    "ipfsHash": "QmXxx...",
    "riskLevel": "LOW/MEDIUM/HIGH/CRITICAL",
    "stakeRequired": 100,
    "attestationCount": 2,
    "auditTrail": [],
    "standard": "freeskill",
    "version": "1.0"
  },
  "responsibility": {
    "creator": "创建者签名",
    "verifiers": ["验证者地址列表"],
    "auditReport": "IPFS哈希",
    "liabilityDeclaration": "责任声明文本",
    "scopeDeclaration": "权限边界声明"
  },
  "antiSlash": {
    "enabled": true,
    "slashRate": 0.5,
    "appealsPeriod": 7
  },
  "humanAuth": {
    "required": ["stake", "submit"],
    "confirmedBy": "0x授权者地址"
  }
}
```

### 3.2 风险等级

| 等级 | 代码 | 积分要求 | 验证者数量 | 验证者声望 | 示例 |
|------|------|----------|-----------|------------|------|
| LOW | 0 | 50 | 1 | 100+ | 日历查询、天气查询 |
| MEDIUM | 1 | 100 | 2 | 500+ | 文件操作、API调用 |
| HIGH | 2 | 200 | 3 | 1000+ | 支付转账、消息发送 |
| CRITICAL | 3 | 500 | 5 | 2000+ | 资金操作、权限变更 |

### 3.3 指纹机制

```solidity
// 指纹 = keccak256(ipfsHash + creator + timestamp)
function computeFingerprint(
    string memory _ipfsHash,
    address _creator,
    uint256 _timestamp
) public pure returns (bytes32) {
    return keccak256(abi.encodePacked(_ipfsHash, _creator, _timestamp));
}
```

### 3.4 反噬机制（Anti-Slash）

| 违规类型 | 惩罚措施 | 声望损失 | 申诉期限 |
|----------|---------|----------|----------|
| 恶意技能（已损害） | 100% 积分没收 | -500 | 7 天 |
| 恶意技能（未损害） | 50% 积分没收 | -200 | 7 天 |
| 验证者失职 | 100% 积分没收 | -300 | 7 天 |
| 虚假举报 | 举报者积分没收 | -300 | 无 |

---

## 4. 多 Agent 协作标准

### 4.1 技能体系架构

```
freeskill-orchestrate (编排层)
       ↓
┌──────┼──────┐
↓      ↓      ↓
upgrade audit evaluate
       ↓
   freeskill-chain
       ↓ human-auth
    社区链
```

### 4.2 各 Skill 职责

| Skill | 职责 | 输出 |
|-------|------|------|
| freeskill-upgrade | 补充责任链 | 标准化代码 + 指纹 |
| freeskill-audit | 安全审核 | 安全报告 + 验证者签名 |
| freeskill-evaluate | 风险评估 | 风险等级 + 质押建议 |
| freeskill-chain | 链上提交 | skillId + txHash |
| freeskill-orchestrate | 编排协调 | 完整流程管理 |

### 4.3 人类授权检查点

| 步骤 | 授权内容 | 触发条件 |
|------|----------|----------|
| PRE_UPGRADE | 确认开始升级 | 所有技能 |
| POST_AUDIT | 确认审核结果 | HIGH/CRITICAL |
| RISK_CONFIRM | 确认风险等级 | 所有技能 |
| STAKE_CONFIRM | 确认质押 | 需要质押 |
| CHAIN_SUBMIT | 确认链上提交 | 所有提交 |

---

## 5. 积分/声望系统

### 5.1 积分奖励

| 行为 | 积分变化 | 说明 |
|------|----------|------|
| 创建技能（LOW） | +100 | 通过验证后发放 |
| 创建技能（MEDIUM） | +200 | 通过验证后发放 |
| 创建技能（HIGH） | +300 | 通过验证后发放 |
| 创建技能（CRITICAL） | +500 | 通过验证后发放 |
| 技能被调用 | +10 | 每次调用 |
| 验证技能 | +20~200 | 根据风险等级 |
| 报告 Bug | +50 | 确认有效 |
| 修复 Bug | +100 | 被接受 |

### 5.2 声望等级

| 等级 | 声望要求 | 操作权限 |
|------|----------|----------|
| 观察者 | 0+ | 浏览公开技能 |
| 贡献者 | 50+ | 创建 LOW 技能 |
| 验证者 | 500+ | 验证 LOW/MEDIUM |
| 高级验证者 | 1000+ | 验证所有等级 |
| 守护者 | 2000+ | 监督、举报 |
| 长老 | 5000+ | 申诉裁决、参与治理 |

---

## 6. Agent 自主参与机制

### 6.1 全自动流程（LOW 风险）

```
freeskill-upgrade (自动)
  → freeskill-audit (自动)
    → freeskill-evaluate (自动)
      → human-auth (自动，仅记录)
        → freeskill-chain (自动提交)
```

### 6.2 半自动流程（MEDIUM/HIGH 风险）

```
freeskill-upgrade (自动)
  → freeskill-audit (自动)
    → freeskill-evaluate (自动)
      → human-auth (手动确认质押) ← 人类授权
        → freeskill-chain (手动授权交易) ← 人类授权
```

### 6.3 人工审核流程（CRITICAL 风险）

```
freeskill-upgrade (自动)
  → freeskill-audit (人工复审) ← 多方审核
    → freeskill-evaluate (人工确认)
      → human-auth (多方授权) ← 多签确认
        → freeskill-chain (多签提交)
```

---

## 7. 宪法对齐

| 宪法条款 | FreeSkill 实现 |
|---------|---------------|
| 第三条：全链条追溯 | 指纹 + IPFS + 链上审计 |
| 第三条：反噬机制 | Anti-Slash + 惩罚通知 |
| 第三条：声誉优先排序 | 声望等级系统 |
| 第二条：低摩擦参与 | 自动升级 ≤3 次点击 |
| 第五条：技术实施准则 | Polygon + IPFS + React |

---

## 8. 升级路径

### 8.1 普通 Skills → FreeSkill

任何现有 Skills 可通过 `freeskill-upgrade` Skill 自动升级：

```
输入: 普通技能代码
     ↓ freeskill-upgrade
输出: FreeSkill 标准化代码
     + 指纹
     + 治理字段
     + 反噬接口
     ↓ 可选: freeskill-audit
输出: 安全审核报告
     ↓ 可选: freeskill-chain
输出: 社区链上技能
```

### 8.2 向后兼容

FreeSkill 完全兼容 AgentSkills.io：
- 原有字段保持不变
- 新增治理字段可选添加
- 现有 Skills 无需强制升级
- 信任市场可区分普通/可信技能

---

## 9. Skill 包上传标准（FreeAgentSkills 平台）

### 9.1 上传格式

用户上传 `.skill.zip` 或 `.zip` 技能包，包含以下结构：

```
skill-package/
├── skill.json          # 必需：技能定义
├── main.py             # 必需：技能实现
├── README.md           # 必需：文档
├── requirements.txt    # 必需：依赖
├── config.json         # 可选：配置
├── tests/              # 可选：测试
└── examples/           # 可选：示例
```

### 9.2 上传流程

```
用户上传 skill.zip
       ↓
1. 解压并验证结构
   ├── 检查 skill.json 存在
   ├── 检查 main.py/main.js 存在
   └── 检查 README.md 存在
       ↓
2. freeskill-audit 安全审核
   ├── 恶意代码扫描
   ├── 漏洞检测
   └── 权限声明验证
       ↓
3. freeskill-upgrade 标准化
   ├── 生成指纹
   ├── 添加治理字段
   └── 输出标准 FreeSkill
       ↓
4. (可选) freeskill-chain 链上提交
```

---

## 10. 参考文件

| 文件 | 说明 |
|------|------|
| SKILLS_STANDARD.md | 原 AgentSkills 标准（已整合） |
| CONSTITUTION.md | 项目宪法 |
| paper-draft-en.md | 论文 "Responsibility Shield" |
| contracts/SkillRegistry.sol | 链上注册合约 |
| contracts/Attribution.sol | 贡献归因合约 |
| contracts/StakingManager.sol | 质押与反噬合约 |
| freeskill-upgrade | 技能升级 Skill |
| freeskill-audit | 安全审核 Skill |
| freeskill-chain | 链上提交 Skill |

---

## 11. 版本历史

| 版本 | 日期 | 修改内容 |
|------|------|----------|
| v1.0 | 2026-05-05 | 初始版本，命名为 FreeSkill Standard，整合原 SKILLS_STANDARD.md v1.1 |

---

*FreeSkill — 让 AI 技能可信赖*

**下一步**
- v1.1：整合社区反馈
- v2.0：正式发布

**文档状态**：草稿，待社区评审
