/**
 * WalletService - Wallet connection with contract access
 * Phase 18: Contract Integration
 *宪法第二条：低摩擦参与，嵌入式钱包（无感知注册）
 */

import { ethers } from 'ethers'
import ContractService from './ContractService.jsx'

class WalletService {
  constructor() {
    this.user = null
    this.provider = null
    this.signer = null
    this.contracts = null
  }

  async init() {
    // 简化版：邮箱注册 → 自动生成钱包（宪法第二条）
    const savedUser = localStorage.getItem('agentskills_user')
    if (savedUser) {
      this.user = JSON.parse(savedUser)
      return this.user
    }

    // 新用户注册（嵌入式，无感知）
    const newUser = {
      address: '0x' + Math.random().toString(16).substr(2, 40),
      reputation: 0,
      level: 1,
      dailyLikes: 0,
      lastLikeDate: 0,
      balance: 100  // Airdrop: 100 ASK
    }

    localStorage.setItem('agentskills_user', JSON.stringify(newUser))
    this.user = newUser
    return this.user
  }

  /**
   * Connect wallet with MetaMask or WalletConnect
   * Initializes ContractService with deployed addresses
   */
  async connect() {
    try {
      // Check for MetaMask
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum)
        const signer = await provider.getSigner()
        const address = await signer.getAddress()

        // Load deployments.json for contract addresses
        let addresses = {}
        try {
          const response = await fetch('/deployments.json')
          if (response.ok) {
            const data = await response.json()
            addresses = {
              ASKToken: data.contracts?.ASKToken || null,
              SkillRegistry: data.contracts?.SkillRegistry || null,
              StakingManager: data.contracts?.StakingManager || null,
              Attribution: data.contracts?.Attribution || null
            }
          }
        } catch (e) {
          console.log('Deployments.json not found, running in demo mode')
        }

        // Initialize contracts with signer
        const contracts = await ContractService.initContractsWithSigner(signer, addresses)

        this.provider = provider
        this.signer = signer
        this.contracts = contracts

        // Update user with real wallet address
        const savedUser = localStorage.getItem('agentskills_user')
        const userData = savedUser ? JSON.parse(savedUser) : this.user

        this.user = {
          ...userData,
          address: address,
          connected: true
        }

        localStorage.setItem('agentskills_user', JSON.stringify(this.user))
        return this.user

      } else {
        // No wallet extension - use demo mode
        console.log('No wallet extension found, using demo mode')
        return this.init()
      }
    } catch (error) {
      console.error('Wallet connection error:', error)
      throw error
    }
  }

  /**
   * Disconnect wallet and reset contract state
   */
  disconnect() {
    ContractService.resetContracts()
    this.provider = null
    this.signer = null
    this.contracts = null

    // Keep local user data but clear wallet connection
    if (this.user) {
      this.user = {
        ...this.user,
        connected: false
      }
      localStorage.setItem('agentskills_user', JSON.stringify(this.user))
    }
  }

  /**
   * Get current user
   */
  getUser() {
    return this.user
  }

  /**
   * Get ethers.js provider
   */
  getProvider() {
    return this.provider
  }

  /**
   * Get ethers.js signer
   */
  getSigner() {
    return this.signer
  }

  /**
   * Get all contract instances
   */
  getContracts() {
    return this.contracts
  }

  /**
   * Sign a transaction (后台签名，宪法第二条)
   */
  async signTransaction(tx) {
    if (!this.signer) {
      // Fallback to demo mode
      console.log('TX signed (demo):', tx)
      return { success: true, hash: '0x...' + Date.now() }
    }

    try {
      const result = await this.signer.signTransaction(tx)
      return { success: true, hash: result }
    } catch (error) {
      console.error('Transaction signing error:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Check if wallet is connected with contracts initialized
   */
  isConnected() {
    return ContractService.isInitialized()
  }
}

export default new WalletService()