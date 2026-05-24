#!/usr/bin/env node
/**
 * AgentSkills Core Contracts Deployment Script
 *
 * Deploys the core no-token architecture contracts to Polygon Amoy
 *
 * Usage:
 *   npx hardhat run scripts/deployCore.js --network polygonAmoy
 *
 * Environment variables required:
 *   PRIVATE_KEY - Deployer wallet private key
 *   POLYGON_AMOY_RPC - RPC URL (optional, uses default)
 */

import './env-setup.js'
import hre from 'hardhat'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const deploymentsDir = path.join(__dirname, '..', 'deployments')
const ethers = hre.ethers

// Ensure deployments directory exists
if (!fs.existsSync(deploymentsDir)) {
  fs.mkdirSync(deploymentsDir, { recursive: true })
}

// Contract factory helper
async function deployContract(contractName, args = []) {
  console.log(`\n📦 Deploying ${contractName}...`)
  const factory = await ethers.getContractFactory(contractName)
  const contract = await factory.deploy(...args)
  await contract.waitForDeployment()
  const address = await contract.getAddress()
  console.log(`   ✅ ${contractName} deployed to: ${address}`)
  return contract
}

async function main() {
  console.log('🚀 AgentSkills Core Deployment')
  console.log('================================\n')

  const [deployer] = await ethers.getSigners()
  console.log(`📝 Deployer: ${deployer.address}`)

  const network = await ethers.provider.getNetwork()
  console.log(`🔗 Network: ${network.name} (Chain ID: ${Number(network.chainId)})`)

  const balance = await ethers.provider.getBalance(deployer.address)
  console.log(`💰 Balance: ${ethers.formatEther(balance)} MATIC\n`)

  if (balance < ethers.parseEther('0.01')) {
    console.error('❌ Insufficient balance. Need at least 0.01 MATIC for gas.')
    process.exit(1)
  }

  const deployments = {
    network: network.name,
    chainId: Number(network.chainId),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {}
  }

  try {
    // Step 1: Deploy core contracts
    console.log('📋 Step 1: Deploying Core Contracts\n')

    // GovernanceTimelock requires >= 3 guardians
    const guardians = [
      deployer.address,
      '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // Hardhat account 1
      '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'   // Hardhat account 2
    ]
    const governanceTimelock = await deployContract('GovernanceTimelock', [guardians])
    deployments.contracts.GovernanceTimelock = await governanceTimelock.getAddress()

    const agentPausable = await deployContract('AgentPausable', [])
    deployments.contracts.AgentPausable = await agentPausable.getAddress()

    const stakingManager = await deployContract('StakingManager', [])
    deployments.contracts.StakingManager = await stakingManager.getAddress()

    const skillRegistry = await deployContract('SkillRegistry', [stakingManager.getAddress()])
    deployments.contracts.SkillRegistry = await skillRegistry.getAddress()

    const attribution = await deployContract('Attribution', [stakingManager.getAddress()])
    deployments.contracts.Attribution = await attribution.getAddress()

    // Step 2: Deploy governance contracts
    console.log('\n📋 Step 2: Deploying Governance Contracts\n')

    const MIN_DELAY = 48 * 60 * 60 // 48 hours
    const timelock = await deployContract('AgentTimelock', [
      MIN_DELAY,
      [deployer.address], // proposers
      [deployer.address], // executors
      deployer.address    // admin
    ])
    deployments.contracts.AgentTimelock = await timelock.getAddress()

    const agentVotes = await deployContract('AgentVotes', [stakingManager.getAddress()])
    deployments.contracts.AgentVotes = await agentVotes.getAddress()

    const agentGovernor = await deployContract('AgentGovernor', [
      agentVotes.getAddress(),
      timelock.getAddress()
    ])
    deployments.contracts.AgentGovernor = await agentGovernor.getAddress()

    // Step 3: Configure cross-references
    console.log('\n📋 Step 3: Configuring Contract References\n')

    // Set governance in StakingManager
    console.log('   Setting GovernanceTimelock in StakingManager...')
    const setGovTx = await stakingManager.setGovernance(governanceTimelock.getAddress())
    await setGovTx.wait()
    console.log('   ✅ GovernanceTimelock set in StakingManager')

    // Set GovernanceTimelock as owner of AgentPausable
    // Note: This requires transferring ownership, which is done via Ownable
    console.log('   Transferring AgentPausable ownership to GovernanceTimelock...')
    const transferTx = await agentPausable.transferOwnership(governanceTimelock.getAddress())
    await transferTx.wait()
    console.log('   ✅ Ownership transferred')

    // Grant proposer role to AgentGovernor in AgentTimelock
    const PROPOSER_ROLE = await timelock.PROPOSER_ROLE()
    console.log(`   Granting PROPOSER_ROLE to AgentGovernor (${await agentGovernor.getAddress()})...`)
    const grantTx = await timelock.grantRole(PROPOSER_ROLE, await agentGovernor.getAddress())
    await grantTx.wait()
    console.log('   ✅ PROPOSER_ROLE granted')

    // Step 4: Verify deployment
    console.log('\n📋 Step 4: Verification\n')

    const verifyStaking = await stakingManager.governance()
    console.log(`   StakingManager.governance: ${verifyStaking}`)

    const verifyPaused = await agentPausable.paused()
    console.log(`   AgentPausable.paused: ${verifyPaused}`)

    const verifyTimelockDelay = await timelock.getMinDelay()
    console.log(`   AgentTimelock.delay: ${Number(verifyTimelockDelay) / 3600} hours`)

    // Step 5: Save deployment info
    console.log('\n📋 Step 5: Saving Deployment Info\n')

    const deploymentFile = path.join(deploymentsDir, `core-${network.name.toLowerCase()}-${Date.now()}.json`)
    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2))
    console.log(`   💾 Deployment saved to: ${deploymentFile}`)

    // Save latest.json for frontend reference
    const latestFile = path.join(deploymentsDir, 'core-latest.json')
    fs.writeFileSync(latestFile, JSON.stringify(deployments, null, 2))
    console.log(`   💾 Latest deployment: ${latestFile}`)

    // Print summary
    console.log('\n📊 Deployment Summary')
    console.log('================================\n')
    console.log('Core Contracts:')
    console.log(`  GovernanceTimelock: ${deployments.contracts.GovernanceTimelock}`)
    console.log(`  AgentPausable:      ${deployments.contracts.AgentPausable}`)
    console.log(`  StakingManager:     ${deployments.contracts.StakingManager}`)
    console.log(`  SkillRegistry:      ${deployments.contracts.SkillRegistry}`)
    console.log(`  Attribution:        ${deployments.contracts.Attribution}`)
    console.log('\nGovernance Contracts:')
    console.log(`  AgentTimelock:      ${deployments.contracts.AgentTimelock}`)
    console.log(`  AgentVotes:        ${deployments.contracts.AgentVotes}`)
    console.log(`  AgentGovernor:      ${deployments.contracts.AgentGovernor}`)
    console.log('\n✅ Deployment complete!\n')

  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})