#!/bin/bash
# AgentSkills 部署就绪脚本
# 当网络环境恢复时，直接执行此脚本即可完成部署

set -e

echo "🚀 AgentSkills 部署就绪检查"
echo "================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. 检查环境
echo "📋 1/5 检查环境配置..."
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env 文件不存在${NC}"
    exit 1
fi
source .env
if [ -z "$PRIVATE_KEY" ]; then
    echo -e "${RED}❌ PRIVATE_KEY 未配置${NC}"
    exit 1
fi
echo -e "${GREEN}✅ 环境配置完成${NC}"
echo ""

# 2. 测试网络连接
echo "🌐 2/5 测试网络连接..."
NETWORK_URL=${POLYGON_AMOY_RPC:-"https://rpc-amoy.polygon.technology"}

RPC_OK=$(node -e "
const ethers = require('ethers');
const provider = new ethers.JsonRpcProvider('$NETWORK_URL');
provider.getNetwork().then(
  () => console.log('OK'),
  (e) => console.log('FAIL:' + e.message)
)" 2>/dev/null || echo "FAIL:Unknown error")

if [[ $RPC_OK == "OK" ]]; then
    echo -e "${GREEN}✅ 网络连接正常${NC}"
else
    echo -e "${RED}❌ 网络连接失败: $RPC_OK${NC}"
    echo ""
    echo "请检查:"
    echo "1. 网络连接是否正常"
    echo "2. 防火墙是否阻止 RPC 访问"
    echo "3. 尝试更换网络环境或使用 VPN"
    exit 1
fi
echo ""

# 3. 检查余额
echo "💰 3/5 检查钱包余额..."
BALANCE=$(node -e "
const ethers = require('ethers');
const provider = new ethers.JsonRpcProvider('$NETWORK_URL');
const wallet = new ethers.Wallet('$PRIVATE_KEY', provider);
provider.getBalance(wallet.address).then(b => console.log(ethers.formatEther(b)));
" 2>/dev/null || echo "0")

if (( $(echo "$BALANCE < 0.01" | bc -l) )); then
    echo -e "${YELLOW}⚠️ 余额不足: $BALANCE MATIC (需要至少 0.01 MATIC)${NC}"
    echo "请从水龙头获取测试币: https://faucet.polygon.technology/"
    read -p "按回车键继续，或 Ctrl+C 退出..."
else
    echo -e "${GREEN}✅ 余额充足: $BALANCE MATIC${NC}"
fi
echo ""

# 4. 编译合约
echo "📦 4/5 编译合约..."
npx hardhat compile > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 编译成功${NC}"
else
    echo -e "${RED}❌ 编译失败${NC}"
    exit 1
fi
echo ""

# 5. 部署合约
echo "🚀 5/5 部署合约到 Polygon Amoy..."
echo "======================================"
echo ""

npx hardhat run scripts/deployCore.js --network polygonAmoy

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ 部署完成！${NC}"
    echo ""

    # 验证部署
    echo "🔍 验证部署..."
    npx hardhat run scripts/verify-deployment.js --network polygonAmoy

    echo ""
    echo "📊 部署摘要"
    echo "============"
    echo "网络: Polygon Amoy (Chain ID: 80002)"
    echo "部署文件: deployments/core-latest.json"
    echo "前端配置: public/deployments.json"
    echo ""
    echo -e "${GREEN}🎉 部署成功完成！${NC}"
    echo ""
    echo "下一步:"
    echo "1. 检查合约功能: npm run test"
    echo "2. 构建前端: npm run build"
    echo "3. 运行 E2E 测试: npm run test:e2e"
else
    echo -e "${RED}❌ 部署失败${NC}"
    echo "请检查错误日志并重试"
    exit 1
fi
