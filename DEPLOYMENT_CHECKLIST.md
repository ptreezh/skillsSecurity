# AgentSkills 生产部署检查清单

> **当前运行架构（2026-09-16 更新）**: 后端链提交走 **ChainMaker 私有链（chain1）**（cmc 网关）。
> 运行后端链提交只需 `CHAINMAKER_*` + `SKILL_REGISTRY_ADDRESS`，无需私钥。
> 公开链部署路径已从仓库移除。

## 📋 部署前准备

### 环境检查
- [ ] Node.js >= 18.x 已安装
- [ ] npm 依赖已安装 (`npm install`)
- [ ] Hardhat 已配置 (`hardhat.config.js`，仅 `hardhat` / `localhost` 网络)
- [ ] .env 文件已创建并配置
- [ ] 后端链提交：`CHAINMAKER_*` + `SKILL_REGISTRY_ADDRESS`（chain1）已配置
- [ ] cmc-debug 容器可访问，`/work` 下 SDK 配置与证书就绪

### 代码检查
- [ ] 合约编译成功 (`npx hardhat compile`)
- [ ] 测试通过 (`npm run test` 或 `hardhat test`)
- [ ] 前端构建成功 (`npm run build`)
- [ ] 代码审查完成
- [ ] 安全审核通过 (生产必需)

## 🚀 合约部署 (ChainMaker chain1)

### 步骤 1: 部署核心合约
在 cmc-debug 容器内使用 `cmc create` 部署合约（EVM 地址类型 `addr_type: 2`）。

- [ ] GovernanceTimelock 部署成功
- [ ] AgentPausable 部署成功
- [ ] StakingManager 部署成功
- [ ] SkillRegistry 部署成功
- [ ] Attribution 部署成功
- [ ] AgentTimelock 部署成功
- [ ] AgentVotes 部署成功
- [ ] AgentGovernor 部署成功

### 步骤 2: 跨合约接线
- [ ] `setStakingManager()` 接线完成
- [ ] `setReputationOracle()` / `setReputationBadges()` 接线完成
- [ ] 授权调用者（authorizedCallers）配置完成

### 步骤 3: 验证部署
```bash
# 在 cmc-debug 容器内重跑接线验证脚本
docker exec cmc-debug sh -c "sh /work/verify_v3_wiring.sh"
```

- [ ] 所有合约验证通过
- [ ] 状态读回全部一致
- [ ] 链上地址已记录

### 步骤 4: 前端配置
- [ ] `public/deployments.json` 已更新
- [ ] 前端重新构建 (`npm run build`)
- [ ] 前端部署到测试环境

### 步骤 5: 功能测试
- [ ] 钱包连接测试
- [ ] 链上数据读取测试
- [ ] 技能注册测试
- [ ] 技能验证测试
- [ ] 质押功能测试
- [ ] 反噬机制测试

### 步骤 6: 集成测试
- [ ] 技能上传端到端测试
- [ ] 风险评估测试
- [ ] 安全审核集成测试
- [ ] IPFS 存储测试
- [ ] 链上数据同步测试

## 🔐 安全检查 (生产部署必需)

### 合约安全
- [ ] OpenZeppelin 合约使用正确
- [ ] 重入攻击防护已验证
- [ ] 整数溢出防护已检查
- [ ] 访问控制正确设置
- [ ] 暂停机制功能正常

### 部署安全
- [ ] 私钥/证书安全存储 (未提交到 Git)
- [ ] 环境变量正确配置
- [ ] 部署脚本权限控制
- [ ] 部署日志已保存

### 运行安全
- [ ] 应急暂停机制测试
- [ ] 监控系统部署
- [ ] 异常报警配置
- [ ] cmc-debug 容器仅内部可访问

## 📊 部署后验证

### 合约功能
- [ ] SkillRegistry 正常工作
- [ ] StakingManager 正常工作
- [ ] Attribution 正常工作
- [ ] Governance 功能正常

### 前端功能
- [ ] 钱包连接正常
- [ ] 数据显示正确
- [ ] 交互功能正常
- [ ] 错误处理正确

### 性能检查
- [ ] 首屏加载 < 3s
- [ ] API 响应 < 1s
- [ ] 链上提交耗时合理
- [ ] 无内存泄漏

## 🔄 回滚计划

### 触发条件
- 严重安全漏洞
- 资金损失风险
- 系统不可用 > 1小时

### 回滚步骤
1. 暂停所有合约 (`AgentPausable.pause()`)
2. 通知所有用户
3. 评估损失
4. 执行回滚或修复
5. 恢复服务

## 📞 紧急联系

- 技术负责人: [联系方式]
- 安全团队: [联系方式]
- 运维团队: [联系方式]
- 社区管理员: [联系方式]

---

**最后更新**: 2026-09-16
**版本**: 1.1.0
**状态**: ChainMaker chain1 部署