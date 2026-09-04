# AgentSkills 生产部署检查清单

## 📋 部署前准备

### 环境检查
- [ ] Node.js >= 18.x 已安装
- [ ] npm 依赖已安装 (`npm install`)
- [ ] Hardhat 已配置 (`hardhat.config.js`)
- [ ] .env 文件已创建并配置

### 钱包准备
- [ ] 部署者钱包地址已确认
- [ ] 私钥已安全配置 (`PRIVATE_KEY` in .env)
- [ ] 钱包余额充足 (>= 0.1 MATIC for testnet, >= 1 MATIC for mainnet)

### 代码检查
- [ ] 合约编译成功 (`npx hardhat compile`)
- [ ] 测试通过 (`npm run test` 或 `hardhat test`)
- [ ] 前端构建成功 (`npm run build`)
- [ ] 代码审查完成
- [ ] 安全审核通过 (生产必需)

## 🚀 测试网部署 (Polygon Amoy)

### 步骤 1: 部署核心合约
```bash
npx hardhat run scripts/deployCore.js --network polygonAmoy
```

- [ ] GovernanceTimelock 部署成功
- [ ] AgentPausable 部署成功
- [ ] StakingManager 部署成功
- [ ] SkillRegistry 部署成功
- [ ] Attribution 部署成功
- [ ] AgentTimelock 部署成功
- [ ] AgentVotes 部署成功
- [ ] AgentGovernor 部署成功

### 步骤 2: 验证部署
```bash
npx hardhat run scripts/verify-deployment.js --network polygonAmoy
```

- [ ] 所有合约验证通过
- [ ] 合约余额正常
- [ ] 前端配置已生成 (`public/deployments.json`)

### 步骤 3: 前端配置
- [ ] `public/deployments.json` 已更新
- [ ] 前端重新构建 (`npm run build`)
- [ ] 前端部署到测试环境

### 步骤 4: 功能测试
- [ ] 钱包连接测试 (MetaMask)
- [ ] 合约交互测试 (读取数据)
- [ ] 技能注册测试
- [ ] 技能验证测试
- [ ] 质押功能测试
- [ ] 反噬机制测试

### 步骤 5: 集成测试
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
- [ ] 私钥安全存储 (未提交到 Git)
- [ ] 环境变量正确配置
- [ ] 部署脚本权限控制
- [ ] 部署日志已保存

### 运行安全
- [ ] 多签钱包配置 (生产必需)
- [ ] 应急暂停机制测试
- [ ] 监控系统部署
- [ ] 异常报警配置

## 🌐 主网部署 (Polygon Mainnet)

### 前置条件
- [ ] 所有测试网测试通过
- [ ] 安全审核报告完成
- [ ] 代码审计完成
- [ ] 应急方案准备
- [ ] 团队准备就绪

### 部署步骤
```bash
# 1. 切换到主网配置
export NETWORK=polygon

# 2. 验证余额 (>1 MATIC)
npx hardhat run scripts/check-balance.js --network polygon

# 3. 部署合约
npx hardhat run scripts/deployCore.js --network polygon

# 4. 验证部署
npx hardhat run scripts/verify-deployment.js --network polygon

# 5. 合约验证 (PolygonScan)
npx hardhat verify --network polygon <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

### 部署后检查
- [ ] 所有合约在 PolygonScan 可见
- [ ] 合约源码已验证
- [ ] 前端配置已更新
- [ ] DNS 配置完成
- [ ] 监控系统运行
- [ ] 用户访问测试

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
- [ ] Gas 费用合理
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

**最后更新**: 2026-08-10
**版本**: 1.0.0
**状态**: 测试网部署准备中
