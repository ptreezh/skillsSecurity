#!/usr/bin/env node
/**
 * AgentSkills 统一合约部署脚本
 *
 * 部署上传技能功能所需的核心合约，并生成前端与后端共用的 deployments.json。
 *
 * 用法：
 *   npx hardhat run scripts/deploy-all.js --network hardhat
 *   npx hardhat run scripts/deploy-all.js --network polygonAmoy
 *
 * 环境变量（.env）：
 *   PRIVATE_KEY          - 部署者私钥（Polygon Amoy 必填）
 *   POLYGON_AMOY_RPC     - Polygon Amoy RPC（可选，有默认值）
 *   POLYGON_RPC          - Polygon 主网 RPC（可选）
 */

import './env-setup.js'
import hre from 'hardhat'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ethers = hre.ethers

const DEPLOYMENTS_DIR = path.join(__dirname, '..', 'deployments')
const PUBLIC_DIR = path.join(__dirname, '..', 'public')

// 确保目录存在
if (!fs.existsSync(DEPLOYMENTS_DIR)) {
  fs.mkdirSync(DEPLOYMENTS_DIR, { recursive: true })
}
if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true })
}

async function deployContract(name, args = [], label = name) {
  console.log(`\n📦 Deploying ${label}...`)
  const factory = await ethers.getContractFactory(name)
  const contract = await factory.deploy(...args)
  await contract.waitForDeployment()
  const address = await contract.getAddress()
  console.log(`   ✅ ${label} deployed to: ${address}`)
  return contract
}

async function verifyBalance(deployer, minEth = '0.001') {
  const balance = await ethers.provider.getBalance(deployer.address)
  console.log(`💰 Deployer balance: ${ethers.formatEther(balance)} MATIC`)
  if (balance < ethers.parseEther(minEth)) {
    throw new Error(`余额不足，至少需要 ${minEth} MATIC 支付 Gas`)
  }
}

async function main() {
  console.log('\n🚀 AgentSkills 统一合约部署')
  console.log('================================\n')

  const [deployer] = await ethers.getSigners()
  const network = await ethers.provider.getNetwork()
  const chainId = Number(network.chainId)

  console.log(`📝 Deployer: ${deployer.address}`)
  console.log(`🔗 Network: ${network.name} (Chain ID: ${chainId})\n`)

  // 非本地网络检查余额
  if (chainId !== 31337) {
    await verifyBalance(deployer)
  }

  const deployments = {
    network: network.name,
    chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {}
  }

  try {
    // Step 1: 部署核心合约
    console.log('📋 Step 1: 部署核心合约\n')

    const askToken = await deployContract('ASKToken', [], 'ASKToken')
    deployments.contracts.ASKToken = await askToken.getAddress()

    const stakingManager = await deployContract('StakingManager', [], 'StakingManager')
    deployments.contracts.StakingManager = await stakingManager.getAddress()

    const skillRegistry = await deployContract('SkillRegistry', [await stakingManager.getAddress()], 'SkillRegistry')
    deployments.contracts.SkillRegistry = await skillRegistry.getAddress()

    const attribution = await deployContract('Attribution', [], 'Attribution')
    deployments.contracts.Attribution = await attribution.getAddress()

    // Step 2: 配置跨合约引用
    console.log('\n📋 Step 2: 配置跨合约引用\n')

    console.log('   Setting StakingManager in Attribution...')
    const setStakingTx = await attribution.setStakingManager(await stakingManager.getAddress())
    await setStakingTx.wait()
    console.log('   ✅ StakingManager set in Attribution')

    // 可选：把 SkillRegistry 和 Attribution 地址告知 StakingManager（如未来需要）
    // 目前 StakingManager 没有 setter，保留注释以备忘

    // Step 3: 可选扩展合约
    console.log('\n📋 Step 3: 部署可选扩展合约\n')

    let deployerRewards = null
    let revenueDistributor = null

    try {
      deployerRewards = await deployContract('DeployerRewards', [await askToken.getAddress()], 'DeployerRewards')
      deployments.contracts.DeployerRewards = await deployerRewards.getAddress()
    } catch (error) {
      console.warn(`   ⚠️ DeployerRewards 部署失败: ${error.message}`)
    }

    try {
      revenueDistributor = await deployContract('RevenueDistributor', [await askToken.getAddress()], 'RevenueDistributor')
      deployments.contracts.RevenueDistributor = await revenueDistributor.getAddress()
    } catch (error) {
      console.warn(`   ⚠️ RevenueDistributor 部署失败: ${error.message}`)
    }

    // Step 4: 保存部署信息
    console.log('\n📋 Step 4: 保存部署信息\n')

    const timestamp = Date.now()
    const networkName = network.name.toLowerCase()

    // 4.1 按网络+时间戳保存历史版本
    const historyFile = path.join(DEPLOYMENTS_DIR, `core-${networkName}-${timestamp}.json`)
    fs.writeFileSync(historyFile, JSON.stringify(deployments, null, 2))
    console.log(`   💾 历史部署: ${historyFile}`)

    // 4.2 保存 latest
    const latestFile = path.join(DEPLOYMENTS_DIR, 'core-latest.json')
    fs.writeFileSync(latestFile, JSON.stringify(deployments, null, 2))
    console.log(`   💾 最新部署: ${latestFile}`)

    // 4.3 生成前端/后端共用的 deployments.json
    const frontendConfig = {
      network: network.name,
      chainId,
      timestamp: deployments.timestamp,
      deployer: deployer.address,
      contracts: {
        ASKToken: deployments.contracts.ASKToken,
        SkillRegistry: deployments.contracts.SkillRegistry,
        StakingManager: deployments.contracts.StakingManager,
        Attribution: deployments.contracts.Attribution,
        DeployerRewards: deployments.contracts.DeployerRewards || null,
        RevenueDistributor: deployments.contracts.RevenueDistributor || null
      }
    }

    const rootConfigFile = path.join(__dirname, '..', 'deployments.json')
    fs.writeFileSync(rootConfigFile, JSON.stringify(frontendConfig, null, 2))
    console.log(`   💾 根目录配置: ${rootConfigFile}`)

    const publicConfigFile = path.join(PUBLIC_DIR, 'deployments.json')
    fs.writeFileSync(publicConfigFile, JSON.stringify(frontendConfig, null, 2))
    console.log(`   💾 前端配置: ${publicConfigFile}`)

    // Step 5: 打印摘要
    console.log('\n📊 部署摘要')
    console.log('================================\n')
    console.log('核心合约:')
    console.log(`  ASKToken:           ${deployments.contracts.ASKToken}`)
    console.log(`  StakingManager:     ${deployments.contracts.StakingManager}`)
    console.log(`  SkillRegistry:      ${deployments.contracts.SkillRegistry}`)
    console.log(`  Attribution:        ${deployments.contracts.Attribution}`)
    console.log('\n可选合约:')
    console.log(`  DeployerRewards:    ${deployments.contracts.DeployerRewards || '未部署'}`)
    console.log(`  RevenueDistributor: ${deployments.contracts.RevenueDistributor || '未部署'}`)
    console.log('\n✅ 部署完成！\n')

    if (chainId === 31337) {
      console.log('提示：本地 Hardhat 网络重启后合约会丢失，仅用于测试。')
    } else {
      console.log('下一步：')
      console.log('  1. 把 public/deployments.json 提交到 GitHub（如果前端需要）')
      console.log('  2. 后端设置 SKILL_REGISTRY_ADDRESS 和 PRIVATE_KEY')
      console.log('  3. 前端 GitHub Secret 设置 VITE_API_URL')
    }

  } catch (error) {
    console.error('\n❌ 部署失败:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
