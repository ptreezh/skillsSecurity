/**
 * ContractService - Unified contract interaction layer
 * Phase 18: Contract Integration
 *
 * Provides standardized interface to all smart contracts on Polygon Amoy.
 * Works in demo mode when contracts are not deployed.
 */

import { ethers } from 'ethers'
import ASKToken from '../abi/ASKToken.json'
import SkillRegistry from '../abi/SkillRegistry.json'
import StakingManager from '../abi/StakingManager.json'
import Attribution from '../abi/Attribution.json'

// Network configuration
const AMOY_CONFIG = {
  chainId: 80002,
  name: 'Polygon Amoy',
  rpcUrl: 'https://rpc-amoy.polygon.technology'
}

// Contract ABI definitions (extracted from compiled artifacts)
const CONTRACT_ABIS = {
  ASKToken: ASKToken.abi,
  SkillRegistry: SkillRegistry.abi,
  StakingManager: StakingManager.abi,
  Attribution: Attribution.abi
}

// Contract addresses (loaded from deployments.json when available)
let CONTRACT_ADDRESSES = {
  ASKToken: null,
  SkillRegistry: null,
  StakingManager: null,
  Attribution: null
}

// Contract instances (initialized on connect)
let contractInstances = {
  ASKToken: null,
  SkillRegistry: null,
  StakingManager: null,
  Attribution: null
}

// Provider and signer state
let currentProvider = null
let currentSigner = null

/**
 * Initialize contracts with provider and addresses
 * @param {ethers.Provider} provider - ethers.js provider
 * @param {Object} addresses - Contract addresses from deployments.json
 */
export async function initContracts(provider, addresses) {
  currentProvider = provider
  CONTRACT_ADDRESSES = { ...CONTRACT_ADDRESSES, ...addresses }

  // Create contract instances
  const instances = {}

  for (const [name, address] of Object.entries(CONTRACT_ADDRESSES)) {
    if (address && CONTRACT_ABIS[name]) {
      instances[name] = new ethers.Contract(address, CONTRACT_ABIS[name], provider)
    }
  }

  contractInstances = instances
  return instances
}

/**
 * Initialize contracts with a signer (for write operations)
 * @param {ethers.Signer} signer - ethers.js signer
 * @param {Object} addresses - Contract addresses
 */
export async function initContractsWithSigner(signer, addresses) {
  currentSigner = signer
  currentProvider = signer.provider
  CONTRACT_ADDRESSES = { ...CONTRACT_ADDRESSES, ...addresses }

  const instances = {}

  for (const [name, address] of Object.entries(CONTRACT_ADDRESSES)) {
    if (address && CONTRACT_ABIS[name]) {
      instances[name] = new ethers.Contract(address, CONTRACT_ABIS[name], signer)
    }
  }

  contractInstances = instances
  return instances
}

/**
 * Get a single contract instance
 * @param {string} contractName - Name of the contract
 * @returns {ethers.Contract|null}
 */
export function getContract(contractName) {
  return contractInstances[contractName] || null
}

/**
 * Get all initialized contracts
 * @returns {Object} All contract instances
 */
export function getAllContracts() {
  return { ...contractInstances }
}

/**
 * Get current provider
 * @returns {ethers.Provider|null}
 */
export function getProvider() {
  return currentProvider
}

/**
 * Get current signer
 * @returns {ethers.Signer|null}
 */
export function getSigner() {
  return currentSigner
}

/**
 * Check if contracts are deployed and initialized
 * @returns {boolean}
 */
export function isInitialized() {
  return currentProvider !== null && Object.values(contractInstances).some(c => c !== null)
}

/**
 * Get network configuration
 * @returns {Object}
 */
export function getNetworkConfig() {
  return { ...AMOY_CONFIG }
}

/**
 * Get all contract addresses
 * @returns {Object}
 */
export function getAddresses() {
  return { ...CONTRACT_ADDRESSES }
}

// ============================================
// Helper functions for contract interactions
// ============================================

/**
 * Get all skills from SkillRegistry
 * @returns {Promise<Array>} Array of skill objects
 */
export async function getSkills() {
  if (!contractInstances.SkillRegistry) {
    return []
  }

  try {
    const skills = []
    // SkillRegistry has a nextSkillId() function to get total count
    const totalSkills = await contractInstances.SkillRegistry.nextSkillId()

    for (let i = 1; i < Number(totalSkills); i++) {
      const skill = await contractInstances.SkillRegistry.skills(i)
      skills.push({
        id: i,
        owner: skill[0],
        name: skill[1],
        description: skill[2],
        trigger: skill[3],
        metadataIPFS: skill[4],
        riskLevel: skill[5],
        stakeAmount: skill[6],
        verified: skill[7],
        createdAt: skill[8],
        updatedAt: skill[9],
        version: skill[10],
        fingerprint: skill[11]
      })
    }

    return skills
  } catch (error) {
    console.error('Error fetching skills:', error)
    return []
  }
}

/**
 * Get a single skill by ID
 * @param {number} skillId
 * @returns {Promise<Object|null>}
 */
export async function getSkill(skillId) {
  if (!contractInstances.SkillRegistry) {
    return null
  }

  try {
    const skill = await contractInstances.SkillRegistry.skills(skillId)
    return {
      id: skillId,
      owner: skill[0],
      name: skill[1],
      description: skill[2],
      trigger: skill[3],
      metadataIPFS: skill[4],
      riskLevel: skill[5],
      stakeAmount: skill[6],
      verified: skill[7],
      createdAt: skill[8],
      updatedAt: skill[9],
      version: skill[10],
      fingerprint: skill[11]
    }
  } catch (error) {
    console.error('Error fetching skill:', error)
    return null
  }
}

/**
 * Get user reputation from StakingManager
 * @param {string} address - User wallet address
 * @returns {Promise<number>}
 */
export async function getReputation(address) {
  if (!contractInstances.StakingManager) {
    return 0
  }

  try {
    const reputation = await contractInstances.StakingManager.userReputation(address)
    return Number(reputation)
  } catch (error) {
    console.error('Error fetching reputation:', error)
    return 0
  }
}

/**
 * Get user effective reputation
 * @param {string} address - User wallet address
 * @returns {Promise<number>}
 */
export async function getEffectiveReputation(address) {
  if (!contractInstances.StakingManager) {
    return 0
  }

  try {
    const effective = await contractInstances.StakingManager.getUserReputation(address)
    return Number(effective)
  } catch (error) {
    console.error('Error fetching effective reputation:', error)
    return 0
  }
}

/**
 * Get user stakes
 * @param {string} address - User wallet address
 * @returns {Promise<Array>}
 */
export async function getStakes(address) {
  if (!contractInstances.StakingManager) {
    return []
  }

  try {
    const stakes = []
    // Get stake IDs for this user (simplified - may need event indexing)
    const userStakeIds = await contractInstances.StakingManager.userStakeIds(address, 0)
    if (userStakeIds) {
      for (let i = 0; i < 100; i++) { // Limit to 100 stakes
        try {
          const stakeId = await contractInstances.StakingManager.userStakeIds(address, i)
          if (!stakeId || stakeId.toString() === '0') break

          const stake = await contractInstances.StakingManager.stakes(address, stakeId)
          stakes.push({
            skillId: stakeId,
            amount: stake[0],
            lockedUntil: stake[1],
            slashed: stake[2]
          })
        } catch {
          break
        }
      }
    }
    return stakes
  } catch (error) {
    console.error('Error fetching stakes:', error)
    return []
  }
}

/**
 * Get user's locked reputation (for vesting)
 * @param {string} address - User wallet address
 * @returns {Promise<Object>}
 */
export async function getLockedReputation(address) {
  if (!contractInstances.StakingManager) {
    return { lockedAmount: 0, lastClaimTime: 0 }
  }

  try {
    const locked = await contractInstances.StakingManager.reputationLocks(address)
    return {
      lockedAmount: Number(locked[0]),
      lastClaimTime: Number(locked[1])
    }
  } catch (error) {
    console.error('Error fetching locked reputation:', error)
    return { lockedAmount: 0, lastClaimTime: 0 }
  }
}

/**
 * Get recoverable reputation
 * @param {string} address - User wallet address
 * @returns {Promise<Object>}
 */
export async function getRecoverableReputation(address) {
  if (!contractInstances.StakingManager) {
    return { lockedAmount: 0, lastClaimTime: 0 }
  }

  try {
    const recoverable = await contractInstances.StakingManager.getRecoverableReputation(address)
    return {
      lockedAmount: Number(recoverable[0]),
      lastClaimTime: Number(recoverable[1])
    }
  } catch (error) {
    console.error('Error fetching recoverable reputation:', error)
    return { lockedAmount: 0, lastClaimTime: 0 }
  }
}

/**
 * Like a skill (writes to blockchain)
 * @param {number} skillId - Skill ID to like
 * @returns {Promise<Object>}
 */
export async function likeSkill(skillId) {
  if (!contractInstances.StakingManager) {
    return { success: false, error: 'Contracts not initialized' }
  }

  if (!currentSigner) {
    return { success: false, error: 'Wallet not connected' }
  }

  try {
    const tx = await contractInstances.StakingManager.likeSkill(skillId)
    await tx.wait()
    return { success: true, tx }
  } catch (error) {
    console.error('Error liking skill:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get skill likes count
 * @param {number} skillId
 * @returns {Promise<number>}
 */
export async function getLikesCount(skillId) {
  if (!contractInstances.Attribution) {
    return 0
  }

  try {
    const likes = await contractInstances.Attribution.likeCount(skillId)
    return Number(likes)
  } catch (error) {
    console.error('Error fetching likes:', error)
    return 0
  }
}

/**
 * Check if user has liked a skill
 * @param {string} address - User address
 * @param {number} skillId - Skill ID
 * @returns {Promise<boolean>}
 */
export async function hasLiked(address, skillId) {
  if (!contractInstances.StakingManager) {
    return false
  }

  try {
    return await contractInstances.StakingManager.hasLiked(address)
  } catch (error) {
    console.error('Error checking like status:', error)
    return false
  }
}

/**
 * Get user's token balance
 * @param {string} address - User address
 * @returns {Promise<string>}
 */
export async function getBalance(address) {
  if (!contractInstances.ASKToken) {
    return '0'
  }

  try {
    const balance = await contractInstances.ASKToken.balanceOf(address)
    return ethers.formatEther(balance)
  } catch (error) {
    console.error('Error fetching balance:', error)
    return '0'
  }
}

/**
 * Register a new skill (writes to blockchain)
 * @param {Object} skillData - Skill registration data
 * @returns {Promise<Object>}
 */
export async function registerSkill(skillData) {
  if (!contractInstances.SkillRegistry) {
    return { success: false, error: 'Contracts not initialized' }
  }

  if (!currentSigner) {
    return { success: false, error: 'Wallet not connected' }
  }

  try {
    const tx = await contractInstances.SkillRegistry.registerSkill(
      skillData.name,
      skillData.description,
      skillData.trigger,
      skillData.metadataIPFS,
      skillData.riskLevel,
      skillData.version
    )
    await tx.wait()
    return { success: true, tx }
  } catch (error) {
    console.error('Error registering skill:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Verify a skill (writes to blockchain)
 * @param {number} skillId - Skill ID
 * @param {boolean} pass - Whether skill passes verification
 * @returns {Promise<Object>}
 */
export async function verifySkill(skillId, pass) {
  if (!contractInstances.SkillRegistry) {
    return { success: false, error: 'Contracts not initialized' }
  }

  if (!currentSigner) {
    return { success: false, error: 'Wallet not connected' }
  }

  try {
    const tx = await contractInstances.SkillRegistry.verifySkill(skillId, pass)
    await tx.wait()
    return { success: true, tx }
  } catch (error) {
    console.error('Error verifying skill:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Stake on a skill (writes to blockchain)
 * @param {number} skillId - Skill ID
 * @param {string} amount - Amount to stake (in ASK)
 * @returns {Promise<Object>}
 */
export async function stake(skillId, amount) {
  if (!contractInstances.StakingManager) {
    return { success: false, error: 'Contracts not initialized' }
  }

  if (!currentSigner) {
    return { success: false, error: 'Wallet not connected' }
  }

  try {
    const amountWei = ethers.parseEther(amount)
    const tx = await contractInstances.StakingManager.stake(skillId, amountWei)
    await tx.wait()
    return { success: true, tx }
  } catch (error) {
    console.error('Error staking:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Unstake from a skill (writes to blockchain)
 * @param {number} skillId - Skill ID
 * @returns {Promise<Object>}
 */
export async function unstake(skillId) {
  if (!contractInstances.StakingManager) {
    return { success: false, error: 'Contracts not initialized' }
  }

  if (!currentSigner) {
    return { success: false, error: 'Wallet not connected' }
  }

  try {
    const tx = await contractInstances.StakingManager.unstake(skillId)
    await tx.wait()
    return { success: true, tx }
  } catch (error) {
    console.error('Error unstaking:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Slash a skill (writes to blockchain)
 * @param {number} skillId - Skill ID
 * @param {string} amount - Amount to slash
 * @returns {Promise<Object>}
 */
export async function slashSkill(skillId, amount) {
  if (!contractInstances.SkillRegistry) {
    return { success: false, error: 'Contracts not initialized' }
  }

  if (!currentSigner) {
    return { success: false, error: 'Wallet not connected' }
  }

  try {
    const amountWei = ethers.parseEther(amount)
    const tx = await contractInstances.SkillRegistry.slashSkill(skillId, amountWei)
    await tx.wait()
    return { success: true, tx }
  } catch (error) {
    console.error('Error slashing skill:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get leaderboard data
 * Note: Full leaderboard may require event indexing service
 * For now, returns empty array (to be implemented with indexer)
 * @returns {Promise<Array>}
 */
export async function getLeaderboard() {
  // TODO: Implement with event indexing or leaderboard contract
  // For now, return empty array - leaderboard will show fallback message
  return []
}

/**
 * Reset/clear all contract state (for disconnect)
 */
export function resetContracts() {
  currentProvider = null
  currentSigner = null
  contractInstances = {
    ASKToken: null,
    SkillRegistry: null,
    StakingManager: null,
    Attribution: null
  }
  CONTRACT_ADDRESSES = {
    ASKToken: null,
    SkillRegistry: null,
    StakingManager: null,
    Attribution: null
  }
}

// Default export with all functions
export default {
  initContracts,
  initContractsWithSigner,
  getContract,
  getAllContracts,
  getProvider,
  getSigner,
  isInitialized,
  getNetworkConfig,
  getAddresses,
  getSkills,
  getSkill,
  getReputation,
  getEffectiveReputation,
  getStakes,
  getLockedReputation,
  getRecoverableReputation,
  likeSkill,
  getLikesCount,
  hasLiked,
  getBalance,
  registerSkill,
  verifySkill,
  stake,
  unstake,
  slashSkill,
  getLeaderboard,
  resetContracts
}