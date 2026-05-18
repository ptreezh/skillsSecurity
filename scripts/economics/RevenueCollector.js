/**
 * RevenueCollector
 * Collects protocol fees automatically
 *
 * Fee Structure:
 * - Skill usage: 0.5% of call value
 * - Verification: 0.1% of stake amount
 * - Slash penalty: 5% of slashed amount
 */

class RevenueCollector {
  constructor(config) {
    this.stakingManager = config.stakingManager
    this.treasury = config.treasury
    this.feeRates = {
      usage: 0.005,      // 0.5%
      verification: 0.001,  // 0.1%
      slash: 0.05       // 5%
    }
    this.revenue = { usage: 0, verification: 0, slash: 0 }
    this.totalCollected = { usage: 0, verification: 0, slash: 0, total: 0 }
  }

  /**
   * Event: Skill was used
   * @param {string} skillId - Skill identifier
   * @param {number} value - Transaction value
   */
  async onSkillUsed(skillId, value) {
    const fee = value * this.feeRates.usage
    this.revenue.usage += fee
    this.totalCollected.usage += fee
    await this.sweepToTreasury()
  }

  /**
   * Event: Verification completed
   * @param {string} skillId - Skill identifier
   * @param {number} stakeAmount - Stake amount
   */
  async onVerification(skillId, stakeAmount) {
    const fee = stakeAmount * this.feeRates.verification
    this.revenue.verification += fee
    this.totalCollected.verification += fee
    await this.sweepToTreasury()
  }

  /**
   * Event: Slash occurred
   * @param {number} slashedAmount - Amount that was slashed
   */
  async onSlash(slashedAmount) {
    const penalty = slashedAmount * this.feeRates.slash
    this.revenue.slash += penalty
    this.totalCollected.slash += penalty
    await this.sweepToTreasury()
  }

  /**
   * Sweep accumulated revenue to treasury
   */
  async sweepToTreasury() {
    const total = this.getPendingTotal()
    if (total > 0) {
      await this.treasury.deposit(total)
      this.totalCollected.total += total
      this.revenue = { usage: 0, verification: 0, slash: 0 }
    }
  }

  /**
   * Get total pending revenue (not yet swept)
   */
  getPendingTotal() {
    return this.revenue.usage + this.revenue.verification + this.revenue.slash
  }

  /**
   * Get current pending revenue breakdown
   */
  getRevenue() {
    return { ...this.revenue }
  }

  /**
   * Get total collected revenue (all-time)
   */
  getTotalCollected() {
    return { ...this.totalCollected }
  }

  /**
   * Get fee rate for a specific category
   */
  getFeeRate(category) {
    return this.feeRates[category]
  }

  /**
   * Update fee rate
   */
  setFeeRate(category, rate) {
    if (this.feeRates[category] !== undefined) {
      this.feeRates[category] = rate
    }
  }

  /**
   * Calculate fee for a given category and amount
   */
  calculateFee(category, amount) {
    const rate = this.feeRates[category]
    if (rate === undefined) {
      throw new Error(`Unknown fee category: ${category}`)
    }
    return amount * rate
  }
}

export { RevenueCollector }