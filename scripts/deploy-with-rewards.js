#!/usr/bin/env node
/**
 * AgentSkills Deploy Script with Automatic Deployer Registration
 *
 * Usage:
 *   node scripts/deploy-with-rewards.js --register --domain my-site.com --locale zh
 *   node scripts/deploy-with-rewards.js --locale en
 *
 * Options:
 *   --register     Register as a deployer (requires wallet with PRIVATE_KEY)
 *   --domain       Your deployment domain (required with --register)
 *   --locale       Default language (zh, en, ja, ko) - default: zh
 *   --skip-build   Skip the build step
 */

import './env-setup.js'
import { ethers } from 'ethers'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Contract ABI for DeployerRewards
const DEPLOYER_REWARDS_ABI = [
  'function registerDeployer(string memory domain) external',
  'function getDeployerStats(address deployer) external view returns (string memory domain, uint256 totalUsers, uint256 totalStaked, uint256 totalRewards, uint256 pendingRewards, uint256 claimedRewards, uint256 lastClaimTime)',
  'function getReferralLink(address deployer) external view returns (string memory)',
  'function isDeployer(address account) external view returns (bool)'
]

// Network configuration
const NETWORK_CONFIG = {
  chainId: 80002,
  chainName: 'Polygon Amoy',
  rpcUrl: process.env.POLYGON_AMOY_RPC || 'https://rpc-amoy.polygon.technology',
  symbol: 'MATIC'
}

// Contract addresses from environment
const CONTRACTS = {
  DEPLOYER_REWARDS_ADDRESS: process.env.DEPLOYER_REWARDS_ADDRESS || null,
  ASK_TOKEN_ADDRESS: process.env.ASK_TOKEN_ADDRESS || null,
  SKILL_REGISTRY_ADDRESS: process.env.SKILL_REGISTRY_ADDRESS || null,
  STAKING_MANAGER_ADDRESS: process.env.STAKING_MANAGER_ADDRESS || null,
  ATTRIBUTION_ADDRESS: process.env.ATTRIBUTION_ADDRESS || null
}

// Supported languages
const SUPPORTED_LANGUAGES = ['zh', 'en', 'ja', 'ko']

// Rewards configuration (for frontend display)
const REWARDS_CONFIG = {
  deployerShare: 0.10,
  userShare: 0.05,
  baseDeployerReward: 1000,
  baseUserReward: 500,
  tokenSymbol: 'ASK'
}

/**
 * Parse command line arguments
 * @returns {{ register: boolean, domain: string, locale: string, skipBuild: boolean }}
 */
function parseArgs() {
  const args = process.argv.slice(2)
  const config = {
    register: false,
    domain: '',
    locale: 'zh',
    skipBuild: false
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const nextArg = args[i + 1]

    if (arg === '--register') {
      config.register = true
    } else if (arg === '--domain' && nextArg && !nextArg.startsWith('--')) {
      config.domain = nextArg
      i++
    } else if (arg === '--locale' && nextArg && !nextArg.startsWith('--')) {
      config.locale = nextArg
      i++
    } else if (arg === '--skip-build') {
      config.skipBuild = true
    }
  }

  return config
}

/**
 * Validate command line arguments
 * @param {Object} config - Parsed arguments
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateArgs(config) {
  const errors = []

  if (config.register) {
    if (!config.domain) {
      errors.push('--domain is required when --register is specified')
    }
    if (config.domain && !isValidDomain(config.domain)) {
      errors.push(`Invalid domain format: ${config.domain}`)
    }
  }

  if (!SUPPORTED_LANGUAGES.includes(config.locale)) {
    errors.push(`--locale must be one of: ${SUPPORTED_LANGUAGES.join(', ')}`)
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Validate domain format
 * @param {string} domain - Domain to validate
 * @returns {boolean}
 */
function isValidDomain(domain) {
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-_.]{0,61}[a-zA-Z0-9]$|^[a-zA-Z0-9]$/
  return domainRegex.test(domain) && domain.length <= 253
}

/**
 * Check if contract addresses are configured
 * @returns {{ hasRewards: boolean, hasToken: boolean }}
 */
function checkConfiguredContracts() {
  return {
    hasRewards: !!CONTRACTS.DEPLOYER_REWARDS_ADDRESS,
    hasToken: !!CONTRACTS.ASK_TOKEN_ADDRESS
  }
}

/**
 * Connect to Polygon Amoy and verify network
 * @param {ethers.JsonRpcProvider} provider
 * @returns {Promise<{ connected: boolean, chainId: number, error?: string }>}
 */
async function verifyNetwork(provider) {
  try {
    const network = await provider.getNetwork()
    const chainId = Number(network.chainId)

    if (chainId !== NETWORK_CONFIG.chainId) {
      return {
        connected: true,
        chainId,
        error: `Expected chainId ${NETWORK_CONFIG.chainId} (Polygon Amoy), got ${chainId}`
      }
    }

    return { connected: true, chainId }
  } catch (error) {
    return { connected: false, chainId: 0, error: error.message }
  }
}

/**
 * Check if a contract is deployed at the given address
 * @param {ethers.JsonRpcProvider} provider
 * @param {string} address
 * @returns {Promise<boolean>}
 */
async function isContractDeployed(provider, address) {
  if (!address || address === '0x0000000000000000000000000000000000000000') {
    return false
  }
  try {
    const code = await provider.getCode(address)
    return code !== '0x'
  } catch {
    return false
  }
}

/**
 * Register deployer on-chain
 * @param {string} domain - Deployer's domain
 * @param {ethers.Wallet} wallet - Wallet with private key
 * @param {ethers.JsonRpcProvider} provider
 * @returns {Promise<{ success: boolean, referralLink?: string, error?: string }>}
 */
async function registerDeployer(domain, wallet, provider) {
  // Check if DEPLOYER_REWARDS_ADDRESS is configured
  if (!CONTRACTS.DEPLOYER_REWARDS_ADDRESS) {
    return {
      success: false,
      error: 'DEPLOYER_REWARDS_ADDRESS not configured. Set it in .env file.'
    }
  }

  // Verify contract is deployed
  const deployed = await isContractDeployed(provider, CONTRACTS.DEPLOYER_REWARDS_ADDRESS)
  if (!deployed) {
    return {
      success: false,
      error: `DeployerRewards contract not deployed at ${CONTRACTS.DEPLOYER_REWARDS_ADDRESS}`
    }
  }

  const contract = new ethers.Contract(
    CONTRACTS.DEPLOYER_REWARDS_ADDRESS,
    DEPLOYER_REWARDS_ABI,
    wallet
  )

  try {
    // Check if already registered
    const alreadyRegistered = await contract.isDeployer(wallet.address)

    if (alreadyRegistered) {
      console.log('  [INFO] Already registered as a deployer')
      const referralLink = await contract.getReferralLink(wallet.address)
      return { success: true, referralLink }
    }

    // Register new deployer
    console.log('  [WAIT] Sending registration transaction...')
    const tx = await contract.registerDeployer(domain)
    console.log(`  [INFO] Transaction submitted: ${tx.hash}`)

    // Wait for confirmation
    console.log('  [WAIT] Waiting for confirmation...')
    const receipt = await tx.wait(1)

    if (receipt.status === 1) {
      console.log('  [SUCCESS] Registration confirmed!')

      // Get referral link
      const referralLink = await contract.getReferralLink(wallet.address)
      return { success: true, referralLink }
    } else {
      return { success: false, error: 'Transaction failed on-chain' }
    }

  } catch (error) {
    // Parse common errors
    if (error.code === 'INSUFFICIENT_FUNDS') {
      return { success: false, error: 'Insufficient MATIC for transaction fees' }
    }
    if (error.code === 'ACTION_REJECTED') {
      return { success: false, error: 'Transaction rejected by user' }
    }

    return { success: false, error: error.message || 'Unknown error' }
  }
}

/**
 * Generate deploy configuration for frontend
 * @param {string} locale - Default language
 * @param {Object} deployerInfo - Deployer info if registered
 * @returns {Object}
 */
function generateDeployConfig(locale, deployerInfo = null) {
  const config = {
    version: '1.4.0',
    deployedAt: new Date().toISOString(),
    network: {
      chainId: NETWORK_CONFIG.chainId,
      chainName: NETWORK_CONFIG.chainName,
      rpcUrl: NETWORK_CONFIG.rpcUrl,
      symbol: NETWORK_CONFIG.symbol
    },
    contracts: {
      askToken: CONTRACTS.ASK_TOKEN_ADDRESS,
      skillRegistry: CONTRACTS.SKILL_REGISTRY_ADDRESS,
      stakingManager: CONTRACTS.STAKING_MANAGER_ADDRESS,
      attribution: CONTRACTS.ATTRIBUTION_ADDRESS,
      deployerRewards: CONTRACTS.DEPLOYER_REWARDS_ADDRESS
    },
    i18n: {
      default: locale,
      supported: SUPPORTED_LANGUAGES
    },
    features: {
      referral: !!CONTRACTS.DEPLOYER_REWARDS_ADDRESS,
      contentRewards: !!CONTRACTS.ASK_TOKEN_ADDRESS,
      deployerRewards: !!CONTRACTS.DEPLOYER_REWARDS_ADDRESS
    },
    rewards: REWARDS_CONFIG
  }

  // Add deployer info if registered
  if (deployerInfo) {
    config.deployer = {
      address: deployerInfo.address,
      referralLink: deployerInfo.referralLink,
      registered: true
    }
  }

  return config
}

/**
 * Save deploy configuration to public directory
 * @param {Object} config - Configuration to save
 * @returns {string} - Path to saved file
 */
function saveDeployConfig(config) {
  const publicDir = path.join(__dirname, '..', 'public')

  // Ensure public directory exists
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true })
  }

  const configPath = path.join(publicDir, 'deploy-config.json')
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

  return configPath
}

/**
 * Display deployer registration success
 * @param {Object} result - Registration result
 */
function displayRegistrationResult(result) {
  console.log('\n' + '='.repeat(50))
  console.log('  DEPLOYER REGISTRATION COMPLETE')
  console.log('='.repeat(50))

  if (result.referralLink) {
    console.log('\n  Your referral link:')
    console.log(`  ${result.referralLink}\n`)
    console.log('  Share this link with users who want to deploy AgentSkills.')
    console.log('  You will earn rewards when users stake tokens using your link.\n')
  }
}

/**
 * Main deployment function
 * @param {Object} config - Parsed and validated arguments
 */
async function main(config) {
  console.log('\n' + '='.repeat(50))
  console.log('  AgentSkills Deploy Script')
  console.log('  Polygon Amoy Network')
  console.log('='.repeat(50))

  // Validate arguments
  const validation = validateArgs(config)
  if (!validation.valid) {
    console.error('\n[ERROR] Invalid arguments:')
    validation.errors.forEach(e => console.error(`  - ${e}`))
    console.log('\nUsage:')
    console.log('  node scripts/deploy-with-rewards.js --register --domain my-site.com --locale zh')
    console.log('  node scripts/deploy-with-rewards.js --locale en')
    process.exit(1)
  }

  // Check contract configuration
  const { hasRewards, hasToken } = checkConfiguredContracts()

  if (!hasRewards && config.register) {
    console.error('\n[ERROR] DEPLOYER_REWARDS_ADDRESS not configured')
    console.log('  Set DEPLOYER_REWARDS_ADDRESS in your .env file')
    console.log('  Skipping registration...\n')
    config.register = false
  }

  // Connect to network
  const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl)

  // Verify network
  console.log('\n[INFO] Connecting to Polygon Amoy...')
  const networkStatus = await verifyNetwork(provider)

  if (!networkStatus.connected) {
    console.error(`\n[ERROR] Failed to connect: ${networkStatus.error}`)
    process.exit(1)
  }

  console.log(`[INFO] Connected to ${NETWORK_CONFIG.chainName} (chainId: ${networkStatus.chainId})`)

  // Handle deployer registration
  let deployerInfo = null

  if (config.register) {
    if (!process.env.PRIVATE_KEY) {
      console.error('\n[ERROR] PRIVATE_KEY not configured')
      console.log('  Set PRIVATE_KEY in your .env file to register as deployer')
      console.log('  Example: PRIVATE_KEY=0x1234567890abcdef...')
      process.exit(1)
    }

    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider)
    console.log(`\n[INFO] Using wallet: ${wallet.address}`)

    console.log(`\n[INFO] Registering deployer for domain: ${config.domain}`)
    const result = await registerDeployer(config.domain, wallet, provider)

    if (!result.success) {
      console.error(`\n[ERROR] Registration failed: ${result.error}`)
      console.log('\n  Troubleshooting:')
      console.log('  1. Ensure DeployerRewards contract is deployed')
      console.log('  2. Ensure wallet has sufficient MATIC for gas')
      console.log('  3. Check network connectivity')
      process.exit(1)
    }

    deployerInfo = {
      address: wallet.address,
      referralLink: result.referralLink
    }

    displayRegistrationResult(result)
  }

  // Generate and save deploy config
  console.log('[INFO] Generating deploy configuration...')
  const deployConfig = generateDeployConfig(config.locale, deployerInfo)
  const configPath = saveDeployConfig(deployConfig)
  console.log(`[INFO] Configuration saved to: ${configPath}`)

  // Show config summary
  console.log('\n' + '-'.repeat(50))
  console.log('  DEPLOY CONFIGURATION SUMMARY')
  console.log('-'.repeat(50))
  console.log(`  Network:        ${NETWORK_CONFIG.chainName} (${NETWORK_CONFIG.chainId})`)
  console.log(`  Language:       ${config.locale}`)
  console.log(`  Referral:       ${deployConfig.features.referral ? 'Enabled' : 'Disabled'}`)
  console.log(`  Rewards:        ${deployConfig.features.deployerRewards ? 'Enabled' : 'Disabled'}`)
  console.log(`  Contracts:      ${Object.values(deployConfig.contracts).filter(Boolean).length}/5 configured`)

  // Build
  if (!config.skipBuild) {
    console.log('\n[INFO] Building frontend...')
    try {
      const { execSync } = await import('child_process')
      execSync('npm run build', { stdio: 'inherit', cwd: path.join(__dirname, '..') })
      console.log('[SUCCESS] Build complete!')
    } catch (error) {
      console.error('[ERROR] Build failed')
      process.exit(1)
    }
  } else {
    console.log('\n[INFO] Build skipped (--skip-build)')
  }

  // Completion
  console.log('\n' + '='.repeat(50))
  console.log('  DEPLOYMENT READY')
  console.log('='.repeat(50))
  console.log('\n  Next steps:')
  console.log('  1. Deploy dist/ directory to your hosting (Vercel, Netlify, etc.)')
  console.log('  2. Configure your domain DNS')
  if (deployerInfo?.referralLink) {
    console.log('  3. Share your referral link to earn rewards!')
  }
  console.log('\n')
}

// Run main function
const args = parseArgs()
main(args).catch(error => {
  console.error('\n[ERROR] Unexpected error:', error.message)
  process.exit(1)
})

// Export for testing
export { parseArgs, validateArgs, generateDeployConfig, CONTRACTS, NETWORK_CONFIG, SUPPORTED_LANGUAGES }
