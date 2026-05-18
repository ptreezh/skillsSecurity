/**
 * ReferralManager
 * Referral system with multi-tier rewards
 *
 * Rewards:
 * - Referrer: 1000 ASK per successful referral
 * - Referee: 500 ASK + 1 month Pro trial
 * - Bonus: 10x for first 100 referrals (Pioneer status)
 */

import crypto from 'crypto'

export class ReferralManager {
  constructor(config) {
    this.stakingManager = config.stakingManager
    this.tokens = config.tokens
    this.rewards = {
      referrer: 1000,      // ASK tokens
      referee: 500,
      trialDays: 30
    }
    this.bonus = {
      threshold: 100,      // First 100 referrals
      multiplier: 10      // 10x reward
    }
    this.referrals = new Map() // code -> { referrer, count }
  }

  generateCode(address) {
    // Unique referral code per user
    const hash = crypto.createHash('sha256')
    hash.update(address + Date.now())
    return hash.toString('hex').substring(0, 8)
  }

  async trackReferral(referralCode, refereeAddress) {
    const referrer = this.referrals.get(referralCode)?.referrer
    if (!referrer) throw new Error('Invalid referral code')

    // Check if referee is new
    const isNew = await this.isNewUser(refereeAddress)
    if (!isNew) throw new Error('User already exists')

    // Calculate reward
    const count = await this.getReferralCount(referrer)
    const multiplier = count < this.bonus.threshold ? this.bonus.multiplier : 1

    const referrerReward = this.rewards.referrer * multiplier
    const refereeReward = this.rewards.referee

    // Distribute rewards
    await this.tokens.transfer(referrer, referrerReward)
    await this.tokens.transfer(refereeAddress, refereeReward)
    await this.upgradeTrial(refereeAddress)

    // Track
    const ref = this.referrals.get(referralCode)
    ref.count++
    ref.successful++

    return { referrerReward, refereeReward, multiplier }
  }

  async isNewUser(address) {
    // Check if address has any activity
    return true // Simplified
  }

  async getReferralCount(address) {
    // Count successful referrals
    let count = 0
    for (const [, ref] of this.referrals) {
      if (ref.referrer === address) count += ref.count || 0
    }
    return count
  }

  async getLeaderboard() {
    // Top 10 referrers this month
    const entries = Array.from(this.referrals.entries())
      .map(([code, ref]) => ({ code, ...ref }))
      .sort((a, b) => (b.count || 0) - (a.count || 0))
      .slice(0, 10)
    return entries
  }

  async upgradeTrial(address) {
    // Give 1 month Pro trial
  }

  async registerReferrer(address) {
    const code = this.generateCode(address)
    this.referrals.set(code, { referrer: address, count: 0, successful: 0 })
    return code
  }
}