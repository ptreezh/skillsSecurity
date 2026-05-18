/**
 * StakingRewards
 * Distributes staking rewards based on lock duration
 *
 * APY Tiers:
 * - Skill creators: 8% (1 year lock)
 * - Validators: 12% (6 months lock)
 * - Liquidity providers: 5% (flexible)
 */

class StakingRewards {
  constructor(config) {
    this.stakingManager = config.stakingManager
    this.rewardPool = config.rewardPool || BigInt(0)
    this.apyTiers = {
      skillCreator: 0.08,  // 8%
      validator: 0.12,     // 12%
      liquidity: 0.05      // 5%
    }
    this.compoundThreshold = 90 * 24 * 60 * 60 * 1000 // 90 days in ms
    this.rewardHistory = []
  }

  /**
   * Calculate reward breakdown for an address
   * @param {string} address - Staker address
   * @returns {Object} Reward breakdown
   */
  calculateReward(address) {
    const stake = this.getStake(address)
    const tier = this.getTier(address)
    const apy = this.apyTiers[tier]

    // Convert stake amount to number for calculation
    const stakeAmount = Number(stake.amount)

    // Calculate daily reward
    const dailyRate = apy / 365
    const dailyReward = stakeAmount * dailyRate

    return {
      tier,
      apy,
      stakeAmount: stake.amount,
      lockEnd: stake.lockEnd,
      daily: dailyReward,
      weekly: dailyReward * 7,
      monthly: dailyReward * 30,
      yearly: stakeAmount * apy,
      compounding: this.isCompounding(address)
    }
  }

  /**
   * Get stake information for an address
   * @param {string} address - Staker address
   * @returns {Object} Stake info
   */
  getStake(address) {
    // In production: this.stakingManager.getStake(address)
    // For now, return placeholder
    return {
      amount: BigInt(0),
      lockEnd: 0,
      tier: this.getTier(address)
    }
  }

  /**
   * Determine tier for an address
   * @param {string} address - Staker address
   * @returns {string} Tier name
   */
  getTier(address) {
    // In production: check on-chain data or user profile
    // L4+ (Guardian): validator tier (12%)
    // Skill creator: skillCreator tier (8%)
    // Default: liquidity tier (5%)

    // Placeholder logic - in production this would check:
    // 1. Guardian level from staking contract
    // 2. Skill creation activity
    // 3. Validation participation

    if (this.isGuardian(address)) {
      return 'validator'
    }
    if (this.isSkillCreator(address)) {
      return 'skillCreator'
    }
    return 'liquidity'
  }

  /**
   * Check if address is a guardian (L4+)
   */
  isGuardian(address) {
    // In production: query staking contract for level
    return false
  }

  /**
   * Check if address has created skills
   */
  isSkillCreator(address) {
    // In production: check skill registry
    return false
  }

  /**
   * Check if staker is in compounding period (lock > 90 days)
   * @param {string} address - Staker address
   */
  isCompounding(address) {
    const stake = this.getStake(address)
    if (!stake.lockEnd) return false

    const remainingLock = stake.lockEnd - Date.now()
    return remainingLock > this.compoundThreshold
  }

  /**
   * Distribute reward to address
   * @param {string} address - Staker address
   */
  async distribute(address) {
    const reward = this.calculateReward(address)
    const dailyReward = reward.daily

    // Compound if lock > 90 days
    if (reward.compounding) {
      return this.compoundReward(address, dailyReward)
    }

    // Otherwise claim to wallet
    return this.claimReward(address, dailyReward)
  }

  /**
   * Compound reward (add to stake)
   * @param {string} address - Staker address
   * @param {number} reward - Reward amount to compound
   */
  async compoundReward(address, reward) {
    // In production: call stakingManager.compound(address, reward)
    // This increases the staked amount without withdrawing

    this.rewardHistory.push({
      address,
      type: 'compound',
      amount: reward,
      timestamp: new Date().toISOString()
    })

    return {
      success: true,
      type: 'compounded',
      amount: reward,
      newStake: this.getStake(address).amount + BigInt(Math.floor(reward))
    }
  }

  /**
   * Claim reward to wallet
   * @param {string} address - Staker address
   * @param {number} reward - Reward amount to claim
   */
  async claimReward(address, reward) {
    // In production: transfer from reward pool to address
    // const tx = await rewardToken.transfer(address, reward)
    // await tx.wait()

    if (this.rewardPool < BigInt(Math.floor(reward))) {
      throw new Error('Reward pool insufficient')
    }

    this.rewardPool -= BigInt(Math.floor(reward))

    this.rewardHistory.push({
      address,
      type: 'claim',
      amount: reward,
      timestamp: new Date().toISOString()
    })

    return {
      success: true,
      type: 'claimed',
      amount: reward,
      remainingPool: this.rewardPool
    }
  }

  /**
   * Get APY for a tier
   * @param {string} tier - Tier name
   */
  getAPY(tier) {
    return this.apyTiers[tier]
  }

  /**
   * Get all available tiers
   */
  getTiers() {
    return {
      skillCreator: { apy: this.apyTiers.skillCreator, lockPeriod: '1 year' },
      validator: { apy: this.apyTiers.validator, lockPeriod: '6 months' },
      liquidity: { apy: this.apyTiers.liquidity, lockPeriod: 'flexible' }
    }
  }

  /**
   * Get reward history for an address
   * @param {string} address - Staker address
   */
  getHistory(address) {
    return this.rewardHistory.filter(r => r.address === address)
  }

  /**
   * Get total rewards distributed
   */
  getTotalDistributed() {
    return this.rewardHistory.reduce((sum, r) => sum + r.amount, 0)
  }

  /**
   * Fund the reward pool
   * @param {bigint} amount - Amount to add to pool
   */
  fundPool(amount) {
    this.rewardPool += amount
    return { success: true, newPool: this.rewardPool }
  }
}

export { StakingRewards }