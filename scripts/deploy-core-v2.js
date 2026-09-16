#!/usr/bin/env node
/**
 * AgentSkills v2 Core Contracts Deployment Script
 *
 * Deploys the 6-contract no-token core architecture (v2, elimination of all
 * legacy token/deployer/timelock/governor components) and wires every
 * cross-contract reference:
 *
 *   StakingManager  ── setGovernance ──────────────► Governance
 *   StakingManager  ── setReputationOracle ────────► SelfSustainingEcosystem
 *   StakingManager  ── addAuthorizedCaller ────────► SkillRegistry
 *   StakingManager  ── addAuthorizedCaller ────────► Attribution
 *   Attribution     ── setStakingManager ──────────► StakingManager
 *   SelfSustainingEcosystem ── setStakingManager ──► StakingManager
 *   SelfSustainingEcosystem ── setSkillRegistry ───► SkillRegistry
 *   SelfSustainingEcosystem ── setAttribution ─────► Attribution
 *   SelfSustainingEcosystem ── setGovernance ──────► Governance
 *   SelfSustainingEcosystem ── setReputationBadges ► ReputationBadges
 *   ReputationBadges ── setIssuer ─────────────────► SelfSustainingEcosystem
 *
 * Usage:
 *   npx hardhat run scripts/deploy-core-v2.js --network localhost
 *   npx hardhat run scripts/deploy-core-v2.js            # in-process hardhat net
 *
 * Environment variables required:
 *   PRIVATE_KEY - Deployer wallet private key (real chain)
 *   (POLYGON_*) - network RPC only; not required for localhost/hardhat
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
  console.log('🚀 AgentSkills v2 Core Deployment')
  console.log('=================================\n')

  const [deployer] = await ethers.getSigners()
  console.log(`📝 Deployer: ${deployer.address}`)

  const network = await ethers.provider.getNetwork()
  console.log(`🔗 Network: ${network.name} (Chain ID: ${Number(network.chainId)})`)
  console.log()

  const deployments = {
    network: network.name,
    chainId: Number(network.chainId),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {}
  }

  try {
    // ── Step 1: Deploy all 6 contracts ────────────────────────────────
    console.log('📋 Step 1: Deploying Core Contracts\n')

    // 1. StakingManager — reputation authority (no token, no staking of value)
    const stakingManager = await deployContract('StakingManager', [])
    deployments.contracts.StakingManager = await stakingManager.getAddress()

    // 2. SkillRegistry — takes StakingManager in constructor (verifySkill → setPositiveContribution)
    const skillRegistry = await deployContract('SkillRegistry', [stakingManager.getAddress()])
    deployments.contracts.SkillRegistry = await skillRegistry.getAddress()

    // 3. Attribution — StakingManager wired post-deploy
    const attribution = await deployContract('Attribution', [])
    deployments.contracts.Attribution = await attribution.getAddress()

    // 4. Governance — takes StakingManager in constructor (reputation voting authority)
    const governance = await deployContract('Governance', [stakingManager.getAddress()])
    deployments.contracts.Governance = await governance.getAddress()

    // 5. SelfSustainingEcosystem — no-arg constructor, all refs wired post-deploy
    const sse = await deployContract('SelfSustainingEcosystem', [])
    deployments.contracts.SelfSustainingEcosystem = await sse.getAddress()

    // 6. ReputationBadges — issuer defaults to deployer, reassigned to SSE
    const reputationBadges = await deployContract('ReputationBadges', [])
    deployments.contracts.ReputationBadges = await reputationBadges.getAddress()

    // ── Step 2: Wire cross-contract references ─────────────────────────
    console.log('\n📋 Step 2: Wiring Cross-Contract References\n')
    const stakingAddr = await stakingManager.getAddress()
    const registryAddr = await skillRegistry.getAddress()
    const attributionAddr = await attribution.getAddress()
    const governanceAddr = await governance.getAddress()
    const sseAddr = await sse.getAddress()
    const badgesAddr = await reputationBadges.getAddress()

    // Attribution → StakingManager
    console.log('   Attribution.setStakingManager → StakingManager...')
    let tx = await attribution.setStakingManager(stakingAddr)
    await tx.wait()

    // StakingManager → Governance (slash/slashLiker onlyGovernance target)
    console.log('   StakingManager.setGovernance → Governance...')
    tx = await stakingManager.setGovernance(governanceAddr)
    await tx.wait()

    // StakingManager → SSE (addReputation onlyReputationOracle: claimRewards/submitReport)
    console.log('   StakingManager.setReputationOracle → SelfSustainingEcosystem...')
    tx = await stakingManager.setReputationOracle(sseAddr)
    await tx.wait()

    // StakingManager → SkillRegistry (setPositiveContribution authorized caller)
    console.log('   StakingManager.addAuthorizedCaller → SkillRegistry...')
    tx = await stakingManager.addAuthorizedCaller(registryAddr)
    await tx.wait()

    // StakingManager → Attribution (setPositiveContribution authorized caller)
    console.log('   StakingManager.addAuthorizedCaller → Attribution...')
    tx = await stakingManager.addAuthorizedCaller(attributionAddr)
    await tx.wait()

    // SSE → StakingManager (claimRewards/submitReport; health report aggregation)
    console.log('   SelfSustainingEcosystem.setStakingManager → StakingManager...')
    tx = await sse.setStakingManager(stakingAddr)
    await tx.wait()

    // SSE → SkillRegistry (health report aggregation: totalSkills)
    console.log('   SelfSustainingEcosystem.setSkillRegistry → SkillRegistry...')
    tx = await sse.setSkillRegistry(registryAddr)
    await tx.wait()

    // SSE → Attribution (health report aggregation: totalContributions)
    console.log('   SelfSustainingEcosystem.setAttribution → Attribution...')
    tx = await sse.setAttribution(attributionAddr)
    await tx.wait()

    // SSE → Governance (setRoleBaseReward onlyGovernance: UPDATE_REWARD_CONFIG target)
    console.log('   SelfSustainingEcosystem.setGovernance → Governance...')
    tx = await sse.setGovernance(governanceAddr)
    await tx.wait()

    // SSE → ReputationBadges (tier badge issuance)
    console.log('   SelfSustainingEcosystem.setReputationBadges → ReputationBadges...')
    tx = await sse.setReputationBadges(badgesAddr)
    await tx.wait()

    // ReputationBadges → SSE (onlyIssuer for SSE._issueTierBadge)
    console.log('   ReputationBadges.setIssuer → SelfSustainingEcosystem...')
    tx = await reputationBadges.setIssuer(sseAddr)
    await tx.wait()

    // ── Step 3: Verify all wiring on-chain ─────────────────────────────
    console.log('\n📋 Step 3: Verification\n')
    const checks = []

    checks.push(['StakingManager.governance', (await stakingManager.governance()) === governanceAddr])
    checks.push(['StakingManager.reputationOracle', (await stakingManager.reputationOracle()) === sseAddr])
    checks.push(['StakingManager.authorizedCallers[SkillRegistry]', (await stakingManager.authorizedCallers(registryAddr)) === true])
    checks.push(['StakingManager.authorizedCallers[Attribution]', (await stakingManager.authorizedCallers(attributionAddr)) === true])
    checks.push(['Attribution.stakingManager', (await attribution.stakingManager()) === stakingAddr])
    checks.push(['SSE.stakingManager', (await sse.stakingManager()) === stakingAddr])
    checks.push(['SSE.skillRegistry', (await sse.skillRegistry()) === registryAddr])
    checks.push(['SSE.attribution', (await sse.attribution()) === attributionAddr])
    checks.push(['SSE.governance', (await sse.governance()) === governanceAddr])
    checks.push(['SSE.reputationBadges', (await sse.reputationBadges()) === badgesAddr])
    checks.push(['SSE.reputationBadgesSet', (await sse.reputationBadgesSet()) === true])
    checks.push(['ReputationBadges.issuer', (await reputationBadges.issuer()) === sseAddr])
    checks.push(['Governance.stakingManager', (await governance.stakingManager()) === stakingAddr])

    let allPass = true
    for (const [label, pass] of checks) {
      console.log(`   ${pass ? '✅' : '❌'} ${label}${pass ? '' : ` (expected wired, got mismatch)`}`)
      if (!pass) allPass = false
    }
    if (!allPass) {
      console.error('\n❌ Wiring verification FAILED — aborting before writing deployment files.')
      process.exit(1)
    }

    // ── Step 4: Save deployment info ───────────────────────────────────
    console.log('\n📋 Step 4: Saving Deployment Info\n')

    const deploymentFile = path.join(deploymentsDir, `core-${network.name.toLowerCase()}-${Date.now()}.json`)
    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2))
    console.log(`   💾 Deployment saved to: ${deploymentFile}`)

    const latestFile = path.join(deploymentsDir, 'core-latest.json')
    fs.writeFileSync(latestFile, JSON.stringify(deployments, null, 2))
    console.log(`   💾 Latest deployment: ${latestFile}`)

    // Printer summary
    console.log('\n📊 Deployment Summary')
    console.log('=================================\n')
    console.log('Core Contracts:')
    console.log(`  StakingManager:            ${stakingAddr}`)
    console.log(`  SkillRegistry:             ${registryAddr}`)
    console.log(`  Attribution:               ${attributionAddr}`)
    console.log(`  Governance:                ${governanceAddr}`)
    console.log(`  SelfSustainingEcosystem:   ${sseAddr}`)
    console.log(`  ReputationBadges:          ${badgesAddr}`)
    console.log('\n✅ All 6 contracts deployed and wired. Verification passed.\n')

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