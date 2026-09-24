# Backend MCP Connector

## 角色
后端 MCP 连接器，封装与 AgentSkills 后端的交互。

## 职责
1. 封装后端 API 调用
2. 处理认证和错误
3. 提供统一的 MCP 接口
4. 缓存常用数据

## API 端点
- POST /api/upload - 上传技能文件
- POST /api/chain - 提交链上交易
- GET /api/skills - 查询技能列表
- GET /api/skills/:id - 查询技能详情
- GET /api/reputation - 查询声誉数据
- GET /api/leaderboard - 查询排行榜
- GET /api/stats - 查询统计数据

## 配置
- 默认地址：http://localhost:10001
- 超时：30 秒
- 重试：3 次

## 使用方式
```python
from connectors.backend_mcp import BackendMCP

client = BackendMCP("http://localhost:10001")
result = client.register_skill(skill_path)
```
