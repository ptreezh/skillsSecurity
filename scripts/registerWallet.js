#!/usr/bin/env node
/**
 * Register Wallet on Polygon
 *
 * Sets up a wallet for deployment on Polygon mainnet.
 * Uses free RPC endpoint: https://rpc.ankr.com/polygon
 *
 * Usage:
 *   npx hardhat run scripts/registerWallet.js --network polygon
 *
 * Required: .env file with PRIVATE_KEY
 */

import './env-setup.js'
import hre from 'hardhat'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function main() {
  console.log('🔐 AgentSkills Wallet Registration')
  console.log('================================\n')

  // Validate PRIVATE_KEY
  if (!process.env.PRIVATE_KEY) {
    console.error('❌ PRIVATE_KEY not set in .env file')
    console.error('   Please create .env from .env.example and add your private key')
    process.exit(1)
  }

  const [deployer] = await hre.ethers.getSigners()

  console.log(`📝 Wallet Address: ${deployer.address}`)

  // Check network
  const network = await hre.ethers.provider.getNetwork()
  console.log(`🔗 Network: ${network.name} (Chain ID: ${Number(network.chainId)})`)

  // Check balance
  const balance = await hre.ethers.provider.getBalance(deployer.address)
  const balanceInMATIC = Number(hre.ethers.formatEther(balance))

  console.log(`💰 Balance: ${balanceInMATIC.toFixed(4)} MATIC`)

  if (balanceInMATIC < 0.01) {
    console.error('\n❌ Insufficient balance!')
    console.error('   Need at least 0.01 MATIC for deployment gas fees')
    console.error('\n📋 How to get MATIC:')
    console.error('   1. Buy MATIC on Binance/Coinbase')
    console.error('   2. Withdraw to your wallet: ' + deployer.address)
    console.error('   3. Or use Polygon Bridge: https://wallet.polygon.technology/bridge')
    process.exit(1)
  }

  // Save wallet info
  const walletInfo = {
    address: deployer.address,
    network: network.name,
    chainId: Number(network.chainId),
    balance: balanceInMATIC,
    timestamp: new Date().toISOString()
  }

  const walletsDir = path.join(__dirname, '..', 'wallets')
  if (!fs.existsSync(walletsDir)) {
    fs.mkdirSync(walletsDir, { recursive: true })
  }

  const walletFile = path.join(walletsDir, 'deployer-wallet.json')
  fs.writeFileSync(walletFile, JSON.stringify(walletInfo, null, 2))

  console.log('\n✅ Wallet info saved to: ' + walletFile)

  // Display deployment readiness
  console.log('\n📊 Deployment Readiness:')
  console.log(`   ✓ Wallet configured: ${deployer.address}`)
  console.log(`   ✓ Balance: ${balanceInMATIC.toFixed(4)} MATIC`)
  console.log(`   ✓ Network: ${network.name}`)

  // Check if gas is reasonable
  try {
    const feeData = await hre.ethers.provider.getFeeData()
    const gasPrice = Number(hre.ethers.formatUnits(feeData.gasPrice || 0, 'gwei'))
    console.log(`   ✓ Gas Price: ${gasPrice.toFixed(2)} Gwei`)

    if (gasPrice > 200) {
      console.log('\n⚠️  Warning: Gas prices are high. Consider waiting for lower prices.')
    }
  } catch (e) {
    // Ignore fee data errors
  }

  console.log('\n🎯 Ready for deployment!')
  console.log('\n📋 Next steps:')
  console.log('   1. npx hardhat run scripts/deployCore.js --network polygon')
  console.log('   2. Verify contracts on Polygonscan')
  console.log('   3. Update .env with deployed contract addresses')

  // Update hardhat.config.js with RPC if needed
  const configPath = path.join(__dirname, '..', 'hardhat.config.js')
  let configContent = fs.readFileSync(configPath, 'utf8')

  // Update RPC URL
  if (!configContent.includes('rpc.ankr.com/polygon')) {
    configContent = configContent.replace(
      'POLYGON_RPC',
      'https://rpc.ankr.com/polygon'
    )
    fs.writeFileSync(configPath, configContent)
    console.log('\n   ✓ Updated hardhat.config.js with free RPC endpoint')
  }
}

main().catch((error) => {
  console.error('\n❌ Error:', error.message)
  process.exit(1)
})