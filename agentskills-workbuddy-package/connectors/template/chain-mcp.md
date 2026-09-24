# Chain MCP Connector

## 角色
链上 MCP 连接器，封装与区块链的交互。

## 职责
1. 封装链上查询
2. 提交链上交易
3. 验证链上存证
4. 提供统一的 MCP 接口

## 技术栈
- ChainMaker 私有链（chain1）
- cmc gateway
- 无 token 转账（仅声誉追踪）

## 使用方式
```python
from connectors.chain_mcp import ChainMCP

client = ChainMCP()
result = client.query_skill(skill_id)
```

## 注意事项
- 需要 CHAINMAKER_* 环境变量
- 需要 SKILL_REGISTRY_ADDRESS
- 仅用于查询，注册通过后端 API
