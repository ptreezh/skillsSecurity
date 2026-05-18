/**
 * ContentRewards
 * Content creator rewards and verification
 *
 * Content Types & Rewards:
 * - Tutorial: 500-5000 ASK (views + quality)
 * - Bug report: 200-2000 ASK (severity)
 * - Skill showcase: 100-1000 ASK (engagement)
 * - Social posts: 50-500 ASK (reach)
 *
 * Distribution:
 * - Daily pool: 10,000 ASK
 * - Weekly leaderboard: 50,000 ASK
 * - Monthly grants: 200,000 ASK
 */

export class ContentRewards {
  constructor(config) {
    this.treasury = config.treasury
    this.dailyPool = 10000
    this.weeklyPool = 50000
    this.monthlyPool = 200000
    this.pending = []
  }

  generateId() {
    return `content_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  }

  async submit(content) {
    // Types: tutorial, bug_report, showcase, social
    const reward = this.calculateReward(content)

    // AI screening first
    const screened = await this.aiScreen(content)
    if (!screened.passed) {
      return { status: 'rejected', reason: screened.reason }
    }

    // Add to pending for community voting
    this.pending.push({
      id: this.generateId(),
      content,
      reward,
      author: content.author,
      submittedAt: Date.now(),
      votes: 0
    })

    const item = this.pending[this.pending.length - 1]
    return { status: 'pending', id: item.id, reward }
  }

  async vote(contentId, voter, support) {
    const content = this.pending.find(c => c.id === contentId)
    if (!content) throw new Error('Content not found')

    content.votes += support ? 1 : -1

    // Auto-approve if high votes
    if (content.votes >= 10) {
      await this.distribute(content)
    }
  }

  calculateReward(content) {
    const tiers = {
      tutorial: { base: 500, max: 5000, criteria: 'views' },
      bug_report: { base: 200, max: 2000, criteria: 'severity' },
      showcase: { base: 100, max: 1000, criteria: 'engagement' },
      social: { base: 50, max: 500, criteria: 'reach' }
    }

    const tier = tiers[content.type]
    if (!tier) throw new Error(`Unknown content type: ${content.type}`)

    const multiplier = this.getQualityMultiplier(content)
    return Math.min(tier.max, Math.floor(tier.base * multiplier))
  }

  getQualityMultiplier(content) {
    // Quality factors: engagement, completeness, rarity
    const quality = content.quality || 1
    return Math.max(1, Math.min(10, quality))
  }

  async aiScreen(content) {
    // Check for spam, quality, relevance
    // Simplified: reject empty content
    if (!content.body || content.body.length < 10) {
      return { passed: false, reason: 'Content too short' }
    }
    return { passed: true }
  }

  async distribute(content) {
    const index = this.pending.indexOf(content)
    if (index > -1) {
      this.pending.splice(index, 1)
    }

    await this.treasury.transfer(content.author, content.reward)
    return { status: 'distributed', reward: content.reward }
  }

  async getLeaderboard(period = 'week') {
    // Weekly top content creators
    return []
  }

  async getPendingContent() {
    return this.pending
  }
}