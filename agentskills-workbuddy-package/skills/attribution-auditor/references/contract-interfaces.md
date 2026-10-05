# 链上责任审计参考

## Attribution 合约接口

### recordSkill(uint256 skillId, address responsibleParty, address reputationRecipient)

记录技能责任归属。

**参数**：
- `skillId`: 技能 ID（uint256）
- `responsibleParty`: 责任方地址
- `reputationRecipient`: reputation 接收地址

**事件**：
```solidity
event SkillAttributionRecorded(
  uint256 indexed skillId,
  address indexed responsibleParty,
  address reputationRecipient,
  uint256 timestamp
);
```

## SkillRegistry 合约接口

### registerSkill(string memory name, string memory category, string memory description) returns (uint256)

注册新技能。

**参数**：
- `name`: 技能名称
- `category`: 技能分类
- `description`: 技能描述

**返回**：
- `skillId`: 分配的技能 ID

### getSkill(uint256 skillId) returns (string memory, address, uint256)

查询技能信息。

**返回**：
- `name`: 技能名称
- `owner`: 技能所有者
- `createdAt`: 创建时间戳

## 地址格式验证

```javascript
// 以太坊地址格式验证
function isValidAddress(address) {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
}
```

## 常见链 ID

| 链 ID | 网络 | 说明 |
|-------|------|------|
| chain1 | ChainMaker | 长安链私有链（联盟链，运行时目标链） |
