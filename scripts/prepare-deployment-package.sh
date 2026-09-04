#!/bin/bash
# Prepare deployment package for remote execution

set -e

echo "📦 准备部署包..."
echo "===================="
echo ""

PACKAGE_NAME="agentskills-deploy-$(date +%Y%m%d-%H%M%S)"
PACKAGE_DIR=".deployment-package"
PACKAGE_FILE="$PACKAGE_DIR/$PACKAGE_NAME.tar.gz"

# Create package directory
mkdir -p "$PACKAGE_DIR"

# Create temporary directory for packaging
TEMP_DIR=$(mktemp -d)
mkdir -p "$TEMP_DIR/agentskills"

# Copy essential files
echo "📋 复制必要文件..."
cp -r contracts/ "$TEMP_DIR/agentskills/"
cp -r scripts/ "$TEMP_DIR/agentskills/"
cp hardhat.config.js "$TEMP_DIR/agentskills/"
cp package.json "$TEMP_DIR/agentskills/"
cp package-lock.json "$TEMP_DIR/agentskills/" 2>/dev/null || true
cp .env.example "$TEMP_DIR/agentskills/" 2>/dev/null || echo "# 环境变量模板" > "$TEMP_DIR/agentskills/.env.example"

# Create deployment instructions
cat > "$TEMP_DIR/agentskills/DEPLOY_INSTRUCTIONS.txt" << 'EOF'
AgentSkills 远程部署说明
========================

1. 环境准备
-----------
npm install

2. 配置环境变量
----------------
创建 .env 文件并添加:
PRIVATE_KEY=0x... (你的私钥)
POLYGON_AMOY_RPC=https://rpc-amoy.polygon.technology

3. 检查余额
-----------
node -e "
const ethers = require('ethers');
const provider = new ethers.JsonRpcProvider(process.env.POLYGON_AMOY_RPC);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
provider.getBalance(wallet.address).then(b => {
  console.log('余额:', ethers.formatEther(b), 'MATIC');
});
"

如余额不足，访问: https://faucet.polygon.technology/

4. 编译合约
-----------
npx hardhat compile

5. 部署合约
-----------
npx hardhat run scripts/deployCore.js --network polygonAmoy

6. 验证部署
-----------
npx hardhat run scripts/verify-deployment.js --network polygonAmoy

7. 返回部署信息
---------------
将生成的以下文件返回:
- deployments/core-latest.json
- public/deployments.json

成功后，合约将部署在 Polygon Amoy 测试网 (Chain ID: 80002)
EOF

# Create README for the package
cat > "$TEMP_DIR/agentskills/README.md" << 'EOF'
# AgentSkills 部署包

此包包含在 Polygon Amoy 测试网部署 AgentSkills 所需的所有文件。

## 快速开始

\`\`\`bash
npm install
# 配置 .env 文件
npx hardhat compile
npx hardhat run scripts/deployCore.js --network polygonAmoy
\`\`\`

## 合约列表

- GovernanceTimelock - 治理时间锁
- AgentPausable - 暂停机制
- StakingManager - 质押管理
- SkillRegistry - 技能注册
- Attribution - 贡献归因
- AgentTimelock - 提案时间锁
- AgentVotes - 投票代币
- AgentGovernor - 治理 Governor

## 支持

查看 DEPLOY_INSTRUCTIONS.txt 获取详细说明。
EOF

# Create the package
echo "📦 创建部署包..."
cd "$TEMP_DIR"
tar -czf "$PACKAGE_FILE" agentskills/
cd - > /dev/null

# Move to package directory
mv "$TEMP_DIR/$PACKAGE_NAME.tar.gz" "$PACKAGE_FILE"

# Cleanup
rm -rf "$TEMP_DIR"

echo ""
echo "✅ 部署包创建完成!"
echo ""
echo "📁 包位置: $PACKAGE_FILE"
echo "📊 包大小: $(du -h "$PACKAGE_FILE" | cut -f1)"
echo ""
echo "📋 使用说明:"
echo "1. 传输此包到目标环境"
echo "2. 解压: tar -xzf $PACKAGE_NAME.tar.gz"
echo "3. 进入目录: cd agentskills"
echo "4. 按照 DEPLOY_INSTRUCTIONS.txt 执行"
echo ""
echo "🔐 安全提醒:"
echo "- .env 文件包含敏感信息，请妥善保管"
echo "- 部署完成后请删除私钥相关文件"
echo ""
