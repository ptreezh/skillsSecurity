#!/bin/bash
# AgentSkills 一键部署脚本
# 用法: ./scripts/deploy-all.sh [testnet|mainnet]

set -e

NETWORK=${1:-testnet}
ENV_FILE=".env"

echo "🚀 AgentSkills 部署脚本"
echo "========================"
echo "目标网络: $NETWORK"
echo ""

# 检查环境变量
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ 错误: .env 文件不存在"
    echo "请创建 .env 文件并配置 PRIVATE_KEY"
    exit 1
fi

# 加载环境变量
export $(cat .env | grep -v '^#' | xargs)

if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ 错误: PRIVATE_KEY 未配置"
    exit 1
fi

# 检查余额
echo "📋 检查钱包余额..."
BALANCE=$(node -e "
const ethers = require('ethers');
const provider = new ethers.JsonRpcProvider(
  '$NETWORK' === 'mainnet'
    ? 'https://rpc.ankr.com/polygon'
    : 'https://rpc-amoy.polygon.technology'
);
const wallet = new ethers.Wallet('$PRIVATE_KEY', provider);
provider.getBalance(wallet.address).then(b => console.log(ethers.formatEther(b)));
" 2>/dev/null || echo "0")

if (( $(echo "$BALANCE < 0.01" | bc -l) )); then
    echo "❌ 余额不足: $BALANCE MATIC (需要至少 0.01 MATIC)"
    echo "请从水龙头获取测试币: https://faucet.polygon.technology/"
    exit 1
fi

echo "✓ 余额充足: $BALANCE MATIC"
echo ""

# 编译合约
echo "📦 编译合约..."
npx hardhat compile
echo "✓ 编译完成"
echo ""

# 部署合约
echo "🚀 部署合约到 $NETWORK..."

if [ "$NETWORK" = "testnet" ]; then
    npx hardhat run scripts/deployCore.js --network polygonAmoy
else
    npx hardhat run scripts/deployCore.js --network polygon
fi

echo ""
echo "✓ 部署完成"
echo ""

# 验证部署
echo "🔍 验证部署..."
if [ "$NETWORK" = "testnet" ]; then
    npx hardhat run scripts/verify-deployment.js --network polygonAmoy
else
    npx hardhat run scripts/verify-deployment.js --network polygon
fi

echo ""
echo "✓ 验证完成"
echo ""

# 构建前端
echo "🎨 构建前端..."
npm run build
echo "✓ 前端构建完成"
echo ""

# 输出摘要
echo "📊 部署摘要"
echo "============"
echo "网络: $NETWORK"
echo "部署文件: deployments/core-latest.json"
echo "前端配置: public/deployments.json"
echo "构建输出: dist/"
echo ""
echo "✅ 部署完成！"
echo ""
echo "下一步:"
echo "1. 检查合约功能"
echo "2. 测试前端连接"
echo "3. 运行端到端测试"
