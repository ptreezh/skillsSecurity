/**
 * TreasuryManager
 * Manages community treasury with DAO governance
 *
 * Income: Slash penalties, verification fees, premium features
 * Expenses: Bug bounties, marketing grants, developer grants, gas subsidies
 */

class TreasuryManager {
  constructor(config) {
    this.treasuryAddress = config.treasuryAddress
    this.minimumBalance = config.minimumBalance || BigInt('1000000000000000000') // 1 ETH default
    this.pendingGrants = []
    this.income = []
    this.expenses = []
    this.bugBountyBudget = config.bugBountyBudget || BigInt('0')
    this.gasSubsidyBudget = config.gasSubsidyBudget || BigInt('0')
  }

  /**
   * Get current treasury balance
   * @returns {Promise<bigint>} Balance in wei
   */
  async getBalance() {
    // In production: query chain for actual balance
    // return await provider.getBalance(this.treasuryAddress)
    return BigInt('0')
  }

  /**
   * Allocate funds for a category (requires DAO approval)
   * @param {string} category - Category: bugBounty, marketing, development, gasSubsidy
   * @param {bigint} amount - Amount to allocate
   * @param {Object} proposal - DAO proposal details
   */
  async allocate(category, amount, proposal) {
    if (!this.isValidCategory(category)) {
      throw new Error(`Invalid category: ${category}`)
    }

    const allocation = {
      id: `grant_${Date.now()}`,
      category,
      amount,
      proposal,
      status: 'pending',
      createdAt: new Date().toISOString()
    }

    this.pendingGrants.push(allocation)
    return allocation
  }

  /**
   * Check if category is valid
   */
  isValidCategory(category) {
    const validCategories = ['bugBounty', 'marketing', 'development', 'gasSubsidy']
    return validCategories.includes(category)
  }

  /**
   * Approve a grant after DAO vote passes
   * @param {string} proposalId - Grant proposal ID
   */
  async approveGrant(proposalId) {
    const grant = this.pendingGrants.find(p => p.id === proposalId)
    if (!grant) {
      throw new Error(`Grant not found: ${proposalId}`)
    }

    if (grant.status !== 'pending') {
      throw new Error(`Grant already processed: ${grant.status}`)
    }

    await this.transfer(grant.recipient, grant.amount)
    grant.status = 'paid'
    grant.paidAt = new Date().toISOString()

    this.expenses.push({
      type: 'grant',
      category: grant.category,
      amount: grant.amount,
      recipient: grant.recipient,
      proposalId,
      timestamp: new Date().toISOString()
    })

    return grant
  }

  /**
   * Transfer funds to recipient
   * @param {string} recipient - Recipient address
   * @param {bigint} amount - Amount to transfer
   */
  async transfer(recipient, amount) {
    // In production: execute on-chain transfer
    // const tx = await treasuryContract.transfer(recipient, amount)
    // await tx.wait()
    console.log(`Transferring ${amount} to ${recipient}`)
  }

  /**
   * Create a bug bounty program
   * @param {string} severity - Severity: critical, high, medium, low
   * @param {bigint} reward - Reward amount
   * @returns {Object} Bug bounty details
   */
  async createBugBounty(severity, reward) {
    const bountyRewards = {
      critical: BigInt('2000000000000000000000'),  // 2000 ASK
      high: BigInt('500000000000000000000'),       // 500 ASK
      medium: BigInt('100000000000000000000'),    // 100 ASK
      low: BigInt('50000000000000000000')         // 50 ASK
    }

    const bounty = {
      id: `bounty_${Date.now()}`,
      severity,
      reward: bountyRewards[severity] || reward,
      status: 'active',
      createdAt: new Date().toISOString()
    }

    this.pendingGrants.push(bounty)

    return bounty
  }

  /**
   * Fund gas subsidy budget
   * Budget: 5% of treasury per quarter
   * @param {bigint} treasuryBalance - Current treasury balance
   */
  async fundGasSubsidies(treasuryBalance) {
    const subsidyRate = 0.05 // 5%
    const subsidyAmount = treasuryBalance * BigInt(Math.floor(subsidyRate * 100)) / BigInt(100)

    this.gasSubsidyBudget += subsidyAmount

    this.expenses.push({
      type: 'gas_subsidy_funding',
      amount: subsidyAmount,
      timestamp: new Date().toISOString()
    })

    return {
      amount: subsidyAmount,
      newBudget: this.gasSubsidyBudget
    }
  }

  /**
   * Process gas subsidy for new user
   * @param {string} userAddress - User address
   * @param {bigint} gasCost - Gas cost to subsidize
   */
  async processGasSubsidy(userAddress, gasCost) {
    if (this.gasSubsidyBudget < gasCost) {
      throw new Error('Gas subsidy budget exhausted')
    }

    await this.transfer(userAddress, gasCost)
    this.gasSubsidyBudget -= gasCost

    this.expenses.push({
      type: 'gas_subsidy',
      amount: gasCost,
      recipient: userAddress,
      timestamp: new Date().toISOString()
    })

    return { success: true, subsidized: gasCost }
  }

  /**
   * Record income to treasury
   * @param {string} source - Income source
   * @param {bigint} amount - Amount received
   */
  async recordIncome(source, amount) {
    this.income.push({
      source,
      amount,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Get total income
   */
  getIncome() {
    return this.income.reduce((sum, i) => sum + i.amount, BigInt(0))
  }

  /**
   * Get total expenses
   */
  getExpenses() {
    return this.expenses.reduce((sum, e) => sum + e.amount, BigInt(0))
  }

  /**
   * Generate treasury report
   */
  generateReport() {
    return {
      balance: this.getBalance(),
      income: this.getIncome(),
      expenses: this.getExpenses(),
      pendingGrants: this.pendingGrants.filter(g => g.status === 'pending'),
      bugBountyBudget: this.bugBountyBudget,
      gasSubsidyBudget: this.gasSubsidyBudget,
      totalIncome: this.income.length,
      totalExpenses: this.expenses.length
    }
  }

  /**
   * Get pending grants
   */
  getPendingGrants() {
    return this.pendingGrants.filter(g => g.status === 'pending')
  }
}

export { TreasuryManager }