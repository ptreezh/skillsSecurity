# Phase 35：本地端到端联调与验证
> Milestone: v3.0 | Phase: 35 | Status: planning

## 需求映射
REQ-35：本地端到端验证

## 目标
在本地 WorkBuddy 环境中验证 7 个 SKILL + 专家智能体 + 连接器的完整功能。

---

## Task 35-01：7 个 SKILL 独立加载测试

### 测试清单
| SKILL | 测试场景 | 预期结果 |
|-------|----------|----------|
| skill-auditor | 审计合规 .SKILL.md | passed: true |
| skill-auditor | 审计缺字段 .SKILL.md | passed: false, 指出缺失 |
| skill-auditor | 审计含危险脚本 | passed: false, 指出风险 |
| skill-publisher | 打包 template 目录 | 生成有效 .zip |
| skill-publisher | 打包不合法目录 | 报错并指出原因 |
| skill-registry | 上传合规技能（demo 模式） | 返回 on_chain |
| skill-registry | 上传不合规技能 | 返回 rejected |
| reputation-analyst | 查询声誉（demo 模式） | 返回模拟数据 |
| reputation-analyst | 查询排行榜（demo 模式） | 返回模拟数据 |
| skill-browser | 浏览技能列表（demo 模式） | 返回模拟列表 |
| fingerprint-verifier | 计算文件指纹 | 返回 SHA-256 hash |
| risk-classifier | 评估低风险技能 | RiskLevel: LOW |
| risk-classifier | 评估高风险技能 | RiskLevel: HIGH |

### 验收标准
1. 13 个测试场景全部通过
2. 每个 SKILL 可在 WorkBuddy 中被独立调用

---

## Task 35-02：专家智能体编排测试

### 测试场景
**场景 1：完整发布流程**
1. 用户说：「我要发布一个技能，文件是 test.SKILL.md」
2. Team Lead 调用 skill-auditor 审计
3. Team Lead 调用 risk-classifier 评估
4. Team Lead 调用 fingerprint-verifier 计算指纹
5. Team Lead 调用 skill-publisher 打包
6. Team Lead 调用 skill-registry 注册
7. Team Lead 调用 reputation-analyst 查询发布者声誉
8. Team Lead 生成完整报告

**场景 2：查询流程**
1. 用户说：「查看排行榜」
2. Team Lead 调用 reputation-analyst 查询排行榜
3. Team Lead 整理结果并展示

### 验收标准
1. 场景 1 完整流程执行成功，输出包含所有步骤的结果
2. 场景 2 能正确查询并展示排行榜
3. Team Lead 能处理异常（如审计不通过时停止流程）

---

## Task 35-03：连接器对接测试

### 测试场景
1. 本地后端运行（localhost:10001）→ 连接器能正常调用
2. 本地后端停止 → 连接器返回清晰错误
3. 使用 Bearer Token 认证 → 请求带正确 Authorization header
4. 请求不存在的端点 → 返回 404 错误

### 验收标准
1. 4 个测试场景全部通过
2. 连接器日志清晰，便于调试

---

## Task 35-04：性能与稳定性测试

### 测试项
1. 10 次连续审计请求，平均响应时间 < 2s
2. 10 次连续打包请求，平均响应时间 < 1s
3. 10 次连续声誉查询（demo 模式），平均响应时间 < 0.5s
4. 内存泄漏检查：连续 100 次请求后内存增长 < 10MB

### 验收标准
1. 性能测试全部通过
2. 无内存泄漏

---

## 依赖
- Phase 32：7 个 SKILL 已实现
- Phase 33：专家智能体已实现
- Phase 34：连接器已实现

## 风险
| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| WorkBuddy 本地环境限制 | 中 | 高 | 提前在 WorkBuddy 社区测试环境验证 |
| Team Lead 调度逻辑 bug | 中 | 中 | 充分单元测试 + 日志追踪 |

## 工时估算
- Task 35-01：4 小时
- Task 35-02：4 小时
- Task 35-03：2 小时
- Task 35-04：2 小时
- **总计：12 小时**
