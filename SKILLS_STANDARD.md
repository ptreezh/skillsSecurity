# AgentSkills Skills 标准规范 v1.1

**版本：** 1.1
**制定日期：** 2026-05-05
**状态：** 正式版 v1.1
**更新日期：** 2026-05-05

---

## 目录

- [1. 目的与范围](#1-目的与范围)
  - [1.1 目的](#1-1-目的)
  - [1.2 适用范围](#1-2-适用范围)
- [2. 技能分类标准](#2-技能分类标准)
  - [2.1 风险等级定义](#2-1-风险等级定义)
  - [2.2 风险分类判断标准](#2-2-风险分类判断标准)
  - [2.3 Solidity 实现](#2-3-solidity-实现)
- [3. 安全验证标准](#3-安全验证标准)
  - [3.1 验证流程](#3-1-验证流程)
  - [3.2 验证者要求](#3-2-验证者要求)
  - [3.3 验证清单](#3-3-验证清单)
- [4. 责任追溯标准](#4-责任追溯标准)
  - [4.1 指纹机制](#4-1-指纹机制)
  - [4.2 追溯要素](#4-2-追溯要素)
  - [4.3 审计追踪](#4-3-审计追踪)
- [5. 上链流程标准](#5-上链流程标准)
  - [5.1 完整流程图](#5-1-完整流程图)
  - [5.2 数据格式](#5-2-数据格式)
  - [5.3 状态机](#5-3-状态机)
- [6. 反噬机制标准](#6-反噬机制标准)
  - [6.1 反噬触发条件](#6-1-反噬触发条件)
  - [6.2 反噬执行合约](#6-2-反噬执行合约)
  - [6.3 申诉流程](#6-3-申诉流程)
- [7. 积分/声望系统（无代币阶段）](#7-积分声望系统无代币阶段)
  - [7.1 积分系统](#7-1-积分系统)
  - [7.2 声望系统](#7-2-声望系统)
  - [7.3 声望计算](#7-3-声望计算)
- [8. 协议接口标准](#8-协议接口标准)
  - [8.1 核心接口](#8-1-核心接口)
- [9. 附录](#9-附录)
  - [9.1 版本历史](#9-1-版本历史)
  - [9.2 参考实现](#9-2-参考实现)
  - [9.3 术语表](#9-3-术语表)
  - [9.4 反馈渠道](#9-4-反馈渠道)

---

## 摘要

本文档定义了 AgentSkills 平台中技能（Skill）的标准化规范体系，包括：
1. 技能分类标准
2. 安全验证标准
3. 责任追溯标准
4. 上链流程标准
5. 积分/声望系统（无代币阶段）

---

## 1. 目的与范围 {#1-目的与范围}

### 1.1 目的 {#1-1-目的}
- 建立技能的标准定义和分类体系
- 确保技能的安全性和可追溯性
- 构建基于责任机制的信任体系
- 为未来代币激励奠定基础

### 1.2 适用范围 {#1-2-适用范围}
- 所有在 AgentSkills 平台注册的技能
- 所有参与技能验证的验证者
- 所有使用 AgentSkills 协议的应用

---

## 2. 技能分类标准 {#2-技能分类标准}

### 2.1 风险等级定义 {#2-1-风险等级定义}

| 等级 | 代码 | 积分要求 | 验证者数量 | 验证者声望 | 示例技能 |
|------|------|----------|-----------|------------|----------|
| 低风险 | LOW | 50 | 1 | 100+ | 日历查询、邮件发送、天气查询 |
| 中风险 | MEDIUM | 100 | 2 | 500+ | 文件操作、API 调用、数据抓取 |
| 高风险 | HIGH | 200 | 3 | 1000+ | 支付转账、消息发送、数据修改 |
| 极高风险 | CRITICAL | 500 | 5 | 2000+ | 资金操作、权限变更、系统管理 |

### 2.2 风险分类判断标准 {#2-2-风险分类判断标准}

#### LOW（低风险）
- ✅ 只读操作，不修改外部状态
- ✅ 无资金风险
- ✅ 无数据泄露风险
- ✅ 操作可逆或影响有限
- ⚠️ 示例：获取天气、查询汇率、搜索内容

#### MEDIUM（中风险）
- ⚠️ 有限写入操作
- ⚠️ 修改用户可控数据
- ⚠️ 可能造成有限损失
- ⚠️ 有一定影响但不致命
- ⚠️ 示例：发送邮件、创建文件、更新配置

#### HIGH（高风险）
- 🔴 修改他人数据
- 🔴 涉及资金操作
- 🔴 可能造成较大损失
- 🔴 难以完全恢复
- 🔴 示例：转账、支付、删除数据、修改权限

#### CRITICAL（极高风险）
- 🚨 不可逆操作
- 🚨 涉及大量资金或关键系统
- 🚨 可导致系统性风险
- 🚨 需要专业审计
- 🚨 示例：智能合约调用、数据库管理、用户权限授予

### 2.3 Solidity 实现 {#2-3-solidity-实现}

```solidity
// contracts/SkillRegistry.sol
enum RiskLevel { LOW, MEDIUM, HIGH, CRITICAL }

// 风险等级常量
uint256 public constant MIN_STAKE_LOW = 10 ether;
uint256 public constant MIN_STAKE_MEDIUM = 50 ether;
uint256 public constant MIN_STAKE_HIGH = 100 ether;
uint256 public constant MIN_STAKE_CRITICAL = 200 ether;
```

---

## 3. 安全验证标准 {#3-安全验证标准}

### 3.1 验证流程 {#3-1-验证流程}

```
┌─────────────────────────────────────────────────────────────┐
│                    技能验证流程                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. 自检阶段                                                 │
│     └── 创建者自我审查                                       │
│         ├── 代码安全检查                                     │
│         ├── 功能完整性检查                                   │
│         └── 文档完整性检查                                   │
│                                                             │
│  2. 提交阶段                                                 │
│     └── 提交至验证池                                         │
│         ├── IPFS 上传                                        │
│         ├── 生成指纹                                        │
│         └── 等待验证者                                       │
│                                                             │
│  3. 验证阶段                                                 │
│     └── 多方验证                                             │
│         ├── 验证者申请                                       │
│         ├── 代码审查                                         │
│         └── 投票通过/拒绝                                    │
│                                                             │
│  4. 上链阶段                                                 │
│     └── 写入区块链                                           │
│         ├── 更新技能状态                                    │
│         ├── 发放积分奖励                                    │
│         └── 通知创建者                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 验证者要求 {#3-2-验证者要求}

| 风险等级 | 验证者数量 | 声望要求 | 验证时间限制 | 奖励积分 |
|----------|-----------|-----------|-------------|----------|
| LOW | 1 | 100+ | 7 天 | 20 |
| MEDIUM | 2 | 500+ | 5 天 | 50 |
| HIGH | 3 | 1000+ | 3 天 | 100 |
| CRITICAL | 5 | 2000+ | 1 天 | 200 |

### 3.3 验证清单 {#3-3-验证清单}

创建者自检清单：
- [ ] 代码无已知漏洞
- [ ] 功能与描述一致
- [ ] 无恶意代码（后门、木马等）
- [ ] 权限最小化原则
- [ ] 错误处理完善
- [ ] 日志记录完整
- [ ] 输入验证充分
- [ ] 无敏感信息泄露

验证者检查清单：
- [ ] 代码逻辑正确
- [ ] 安全性符合标准
- [ ] 性能可接受
- [ ] 文档清晰准确
- [ ] 无版权问题

---

## 4. 责任追溯标准 {#4-责任追溯标准}

### 4.1 指纹机制 {#4-1-指纹机制}

每个技能创建时生成唯一指纹，用于追溯：

```solidity
// 指纹计算
function computeFingerprint(
    string memory _ipfsHash,   // IPFS 存储地址
    address _creator,           // 创建者地址
    uint256 _timestamp         // 创建时间戳
) public pure returns (bytes32) {
    return keccak256(abi.encodePacked(_ipfsHash, _creator, _timestamp));
}
```

### 4.2 追溯要素 {#4-2-追溯要素}

| 要素 | 说明 | 存储位置 | 可追溯性 |
|------|------|----------|----------|
| 技能 ID | 唯一标识 | 链上 | ✅ 完全 |
| 创建者 | 钱包地址 | 链上 | ✅ 完全 |
| 创建时间 | Unix 时间戳 | 链上 | ✅ 完全 |
| IPFS 哈希 | 代码存储地址 | 链上 | ✅ 完全 |
| 指纹 | 唯一标识符 | 链上 | ✅ 完全 |
| 风险等级 | 安全分类 | 链上 | ✅ 完全 |
| 更新历史 | 版本变更记录 | 链上+IPFS | ✅ 完全 |
| 验证记录 | 验证者签名 | 链上 | ✅ 完全 |
| 调用记录 | 使用情况 | 链上 | ✅ 完全 |

### 4.3 审计追踪 {#4-3-审计追踪}

```solidity
// 审计追踪
mapping(uint256 => string[]) public skillAuditTrail;

// 添加审计记录
function addAuditTrail(uint256 _skillId, string memory _action) external {
    skillAuditTrail[_skillId].push(
        string.concat(
            uint2str(block.timestamp),
            "-",
            addressToString(msg.sender),
            "-",
            _action
        )
    );
}

// 获取完整审计记录
function getAuditTrail(uint256 _skillId)
    external view returns (string[] memory) {
    return skillAuditTrail[_skillId];
}
```

---

## 5. 上链流程标准 {#5-上链流程标准}

### 5.1 完整流程图 {#5-1-完整流程图}

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   准备阶段    │ ──▶ │   创建阶段    │ ──▶ │   验证阶段    │
└─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │
      ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ • 编写代码  │     │ • 连接钱包  │     │ • 申请验证  │
│ • 写 SKILL  │     │ • 填写表单  │     │ • 代码审查  │
│ • 本地测试  │     │ • 提交积分  │     │ • 投票决策  │
│ • 上传 IPFS │     │ • 提交交易  │     │ • 达成共识  │
└─────────────┘     └─────────────┘     └─────────────┘
                                                │
                                                ▼
                    ┌─────────────┐     ┌─────────────┐
                    │   上链完成    │ ◀── │   上链阶段    │
                    └─────────────┘     └─────────────┘
                          │                   │
                          ▼                   ▼
                    ┌─────────────┐     ┌─────────────┐
                    │ • 状态更新  │     │ • 生成指纹  │
                    │ • 通知用户  │     │ • 写入合约  │
                    │ • 开放使用  │     │ • 返回地址  │
                    └─────────────┘     └─────────────┘
```

### 5.2 数据格式 {#5-2-数据格式}

#### 技能创建请求
```json
{
  "name": "send-email",
  "description": "发送格式化邮件",
  "trigger": "when user says send email to {recipient} with subject {subject}",
  "metadataIPFS": "QmXxx...",
  "riskLevel": 1,
  "codeIPFS": "QmYyy...",
  "version": "1.0.0"
}
```

#### 技能链上数据
```json
{
  "skillId": 1,
  "name": "send-email",
  "owner": "0x1234...",
  "riskLevel": 1,
  "stakeAmount": "100",
  "fingerprint": "0xabc123...",
  "metadataIPFS": "QmXxx...",
  "verified": true,
  "createdAt": 1714896000,
  "updatedAt": 1714896000
}
```

### 5.3 状态机 {#5-3-状态机}

```
                    ┌──────────────────┐
                    │      DRAFT        │
                    │     (草稿状态)      │
                    └────────┬───────────┘
                             │ submit()
                             ▼
                    ┌──────────────────┐
                    │     PENDING      │
                    │    (等待验证)      │
                    └────────┬───────────┘
                             │ assignVerifiers()
                             ▼
                    ┌──────────────────┐
                    │    VERIFYING      │
                    │     (验证中)       │
                    └────────┬───────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
     ┌────────────────┐           ┌────────────────┐
     │    APPROVED    │           │   REJECTED     │
     │   (已批准)      │           │   (已拒绝)      │
     └────────┬───────┘           └────────────────┘
              │ approve()
              ▼
     ┌────────────────┐
     │    ACTIVE      │
     │    (已激活)     │
     └────────┬───────┘
              │
              ▼
     ┌────────────────┐
     │   SLAUGHTERED   │
     │   (已被惩罚)     │
     └────────────────┘
```

---

## 6. 反噬机制标准 {#6-反噬机制标准}

### 6.1 反噬触发条件 {#6-1-反噬触发条件}

| 违规类型 | 惩罚措施 | 声望损失 | 申诉期限 |
|----------|---------|----------|----------|
| 恶意技能（造成实际损害） | 100% 积分没收 | -500 | 7 天 |
| 恶意技能（未造成损害） | 50% 积分没收 | -200 | 7 天 |
| 验证者失职（通过恶意技能） | 100% 积分没收 | -300 | 7 天 |
| 验证者失职（误判） | 25% 积分没收 | -50 | 7 天 |
| 虚假举报 | 举报者积分没收 | -300 | 无 |
| 重复创建相似恶意技能 | 100% 积分没收 + 封禁 | -1000 | 7 天 |

### 6.2 反噬执行合约 {#6-2-反噬执行合约}

```solidity
// contracts/StakingManager.sol
event AntiSlash(address indexed user, int256 penalty, string reason);

// 反噬机制 - 惩罚点赞有害技能者
function slashLiker(address _liker, int256 _penalty, string memory _reason)
    external onlyOwner {
    userReputation[_liker] += _penalty;  // 可为正或负
    emit AntiSlash(_liker, _penalty, _reason);
}

// 获取用户声誉
function getUserReputation(address _user) external view returns (int256) {
    return userReputation[_user];
}
```

### 6.3 申诉流程 {#6-3-申诉流程}

```
1. 收到惩罚通知
       │
       ▼
2. 7 天内提交申诉
       │
       ▼
3. 长老团审核
       │
       ├─── 通过 ────▶ 撤销惩罚
       │
       └─── 拒绝 ────▶ 维持惩罚
```

---

## 7. 积分/声望系统（无代币阶段） {#7-积分声望系统无代币阶段}

### 7.1 积分系统 {#7-1-积分系统}

| 行为 | 积分变化 | 说明 |
|------|----------|------|
| 创建技能（LOW） | +100 | 通过验证后发放 |
| 创建技能（MEDIUM） | +200 | 通过验证后发放 |
| 创建技能（HIGH） | +300 | 通过验证后发放 |
| 创建技能（CRITICAL） | +500 | 通过验证后发放 |
| 技能被调用 | +10 | 每次调用 |
| 验证技能（LOW） | +20 | 通过验证 |
| 验证技能（MEDIUM） | +50 | 通过验证 |
| 验证技能（HIGH） | +100 | 通过验证 |
| 验证技能（CRITICAL） | +200 | 通过验证 |
| 报告 Bug | +50 | 确认有效 |
| 修复 Bug | +100 | 被接受 |
| 举报恶意技能 | +30 | 确认有效 |
| 虚假举报 | -300 | 无故举报 |

### 7.2 声望系统 {#7-2-声望系统}

| 等级 | 声望要求 | 操作权限 |
|------|----------|----------|
| 观察者 | 0+ | 浏览公开技能 |
| 贡献者 | 50+ | 创建 LOW 技能 |
| 贡献者+ | 100+ | 创建 MEDIUM 技能 |
| 验证者 | 500+ | 验证 LOW/MEDIUM |
| 高级验证者 | 1000+ | 验证所有等级 |
| 守护者 | 2000+ | 监督、举报 |
| 长老 | 5000+ | 申诉裁决、参与治理 |

### 7.3 声望计算 {#7-3-声望计算}

```solidity
// 基础声望
int256 public constant BASE_REPUTATION = 0;

// 声望变化事件
event ReputationChanged(address indexed user, int256 change, string reason);

function updateReputation(address _user, int256 _change, string memory _reason) internal {
    userReputation[_user] += _change;
    emit ReputationChanged(_user, _change, _reason);
}
```

---

## 8. 协议接口标准 {#8-协议接口标准}

### 8.1 核心接口 {#8-1-核心接口}

```solidity
interface ISkillRegistry {
    // 创建技能
    function registerSkill(
        string memory _name,
        string memory _description,
        string memory _trigger,
        string memory _metadataIPFS,
        RiskLevel _riskLevel,
        string memory _version
    ) external returns (uint256);

    // 验证技能
    function verifySkill(uint256 _skillId, bool _pass) external;

    // 获取技能
    function getSkill(uint256 _skillId) external view returns (Skill memory);

    // 计算指纹
    function computeFingerprint(
        string memory _ipfsHash,
        address _creator,
        uint256 _timestamp
    ) external pure returns (bytes32);
}

interface IAttribution {
    // 添加贡献
    function addContribution(
        uint256 _skillId,
        address _contributor,
        uint256 _share,
        ContributionType _ctype,
        string memory _contentHash
    ) external;

    // 获取用户声望
    function getUserReputation(address _user) external view returns (int256);
}
```

---

## 9. 附录 {#9-附录}

### 9.1 版本历史 {#9-1-版本历史}

| 版本 | 日期 | 修改内容 |
|------|------|----------|
| v1.0 | 2026-05-05 | 初稿 |
| v1.1 | 2026-05-05 | 完善流程图、增加示例 |

### 9.2 参考实现 {#9-2-参考实现}

| 组件 | 文件路径 | 说明 |
|------|---------|------|
| SkillRegistry | contracts/SkillRegistry.sol | 技能注册合约 |
| Attribution | contracts/Attribution.sol | 贡献归因合约 |
| StakingManager | contracts/StakingManager.sol | 质押管理合约 |
| ASKToken | contracts/ASKToken.sol | 代币合约（延迟发行） |

### 9.3 术语表 {#9-3-术语表}

| 术语 | 定义 |
|------|------|
| Skill | 可复用的 AI Agent 功能单元 |
| Fingerprint | 技能的唯一标识哈希 |
| Trigger | 触发技能的条件/命令 |
| RiskLevel | 技能风险等级分类 |
| Verification | 多方验证技能安全性 |
| Anti-Slash | 惩罚恶意行为的机制 |
| Reputation | 用户在平台上的声望值 |
| Points | 用户在平台上的积分 |

### 9.4 反馈渠道 {#9-4-反馈渠道}

如对本文档有建议，请通过以下方式反馈：
- GitHub Issue
- Discord 社区
- 邮件联系

---

**下一步**
- v1.2：整合社区反馈
- v2.0：正式发布

**文档状态**：正式版 v1.1