#!/usr/bin/env node
/**
 * AgentSkills Deployment Verification Script
 *
 * 验证合约部署是否成功并检查基本功能
 *
 * Usage:
 *   npx hardhat run scripts/verify-deployment.js --network polygonAmoy
 */

import hre from 'hardhat'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ethers = hre.ethers

async function verifyContract(address, name) {
  try {
    const code = await ethers.provider.getCode(address)
    if (code === '0x') {
      return { success: false, error: 'No contract code deployed' }
    }

    // Try to get contract info
    const balance = await ethers.provider.getBalance(address)

    return {
      success: true,
      address,
      name,
      balance: ethers.formatEther(balance),
      codeLength: code.length
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function main() {
  console.log('🔍 AgentSkills Deployment Verification')
  console.log('=====================================\n')

  const network = await ethers.provider.getNetwork()
  console.log(`Network: ${network.name} (Chain ID: ${Number(network.chainId)})\n`)

  // Read deployment file
  const deploymentFile = path.join(__dirname, '..', 'deployments', 'core-latest.json')

  if (!fs.existsSync(deploymentFile)) {
    console.error('❌ No deployment file found. Run deployment first.')
    process.exit(1)
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'))
  const contracts = deployment.contracts

  console.log('📋 Verifying Contracts\n')

  const results = []

  for (const [name, address] of Object.entries(contracts)) {
    console.log(`Checking ${name}...`)
    const result = await verifyContract(address, name)

    if (result.success) {
      console.log(`  ✅ ${name}: ${address}`)
      console.log(`     Balance: ${result.balance} MATIC`)
      console.log(`     Code: ${result.codeLength} bytes\n`)
      results.push({ name, address, status: '✅' })
    } else {
      console.log(`  ❌ ${name}: ${result.error}\n`)
      results.push({ name, address, status: '❌', error: result.error })
    }
  }

  // Summary
  console.log('📊 Verification Summary')
  console.log('========================')

  const success = results.filter(r => r.status === '✅').length
  const failed = results.filter(r => r.status === '❌').length

  console.log(`✅ Success: ${success}`)
  console.log(`❌ Failed: ${failed}`)

  if (failed > 0) {
    console.log('\n⚠️  Some contracts failed verification. Check the logs above.')
    process.exit(1)
  }

  console.log('\n✅ All contracts deployed successfully!')

  // Generate frontend config
  const frontendConfig = {
    network: network.name,
    chainId: Number(network.chainId),
    timestamp: new Date().toISOString(),
    contracts: {}
  }

  // Map contract names to frontend expected names
  const nameMap = {
    GovernanceTimelock: 'GovernanceTimelock',
    AgentPausable: 'AgentPausable',
    StakingManager: 'StakingManager',
    SkillRegistry: 'SkillRegistry',
    Attribution: 'Attribution',
    AgentTimelock: 'AgentTimelock',
    AgentVotes: 'AgentVotes',
    AgentGovernor: 'AgentGovernor'
  }

  for (const [name, address] of Object.entries(contracts)) {
    if (nameMap[name]) {
      frontendConfig.contracts[nameMap[name]] = address
    }
  }

  const configFile = path.join(__dirname, '..', 'public', 'deployments.json')
  fs.writeFileSync(configFile, JSON.stringify(frontendConfig, null, 2))

  console.log(`\n📝 Frontend config written to: ${configFile}`)
  console.log('\n✅ Deployment verification complete!')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
