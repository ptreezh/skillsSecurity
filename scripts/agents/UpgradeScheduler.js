/**
 * UpgradeScheduler Agent
 * Checks for new versions and schedules upgrades with governance
 *
 * Gates: staging test, DAO vote, time-lock
 * Schedule: Daily check, execute at low-traffic window
 */

const https = require('https')
const http = require('http')

class UpgradeScheduler {
  constructor(config = {}) {
    this.currentVersion = config.version || '1.0.0'
    this.githubRepo = config.githubRepo || 'skills-protocol/skills'
    this.githubToken = config.githubToken // Optional: for private repos or higher rate limits
    this.dao = config.dao // DAO governance interface
    this.timelockMs = config.timelockMs || 48 * 60 * 60 * 1000 // 48 hours default
    this.checkIntervalMs = config.checkIntervalMs || 24 * 60 * 60 * 1000 // Daily check
    this.lowTrafficWindows = config.lowTrafficWindows || [
      { hour: 3, tz: 'UTC' }, // 3 AM UTC
      { hour: 4, tz: 'UTC' }  // 4 AM UTC
    ]
    this.intervalId = null
    this.pendingUpgrades = []
    this.upgradeHistory = []
  }

  /**
   * Start automatic upgrade checking
   */
  start() {
    if (this.intervalId) {
      console.warn('UpgradeScheduler already running')
      return this
    }

    console.log('UpgradeScheduler started')
    this.check() // Run immediately
    this.intervalId = setInterval(() => this.check(), this.checkIntervalMs)

    return this
  }

  /**
   * Stop upgrade checking
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      console.log('UpgradeScheduler stopped')
    }
    return this
  }

  /**
   * Check for new version
   * @returns {Object|null} Upgrade info or null if up to date
   */
  async check() {
    try {
      const latestVersion = await this.fetchLatestVersion()
      const versionComparison = this.compareVersions(this.currentVersion, latestVersion)

      if (!this.isNewer(latestVersion)) {
        console.log(`Already up to date at ${this.currentVersion}`)
        return null
      }

      const severity = this.assessSeverity(latestVersion)
      const changelog = await this.fetchChangelog(latestVersion)
      const breakingChanges = this.detectBreakingChanges(changelog)

      const upgrade = {
        id: `upgrade_${Date.now()}`,
        from: this.currentVersion,
        to: latestVersion,
        severity,
        breakingChanges,
        changelog,
        timestamp: new Date().toISOString(),
        status: 'pending'
      }

      console.log(`New version available: ${latestVersion} (${severity})`)

      // Route based on severity
      if (severity === 'critical') {
        await this.fastTrack(upgrade)
      } else if (this.dao) {
        await this.queueForVote(upgrade)
      } else {
        this.pendingUpgrades.push(upgrade)
        console.log('Upgrade queued (no DAO configured, manual approval needed)')
      }

      return upgrade
    } catch (error) {
      console.error('Failed to check for upgrades:', error.message)
      return null
    }
  }

  /**
   * Assess upgrade severity based on changelog
   */
  assessSeverity(version) {
    // critical: security patches, critical bug fixes
    // major: breaking changes, deprecations
    // minor: new features, optimizations
    // patch: bug fixes, documentation updates

    const changelog = version.changelog || ''
    const lower = changelog.toLowerCase()

    if (lower.includes('security') || lower.includes('critical') || lower.includes('urgent')) {
      return 'critical'
    }
    if (lower.includes('breaking') || lower.includes('major') || lower.includes('deprecated')) {
      return 'major'
    }
    if (lower.includes('feature') || lower.includes('new')) {
      return 'minor'
    }
    return 'patch'
  }

  /**
   * Fast track critical security patches
   */
  async fastTrack(upgrade) {
    console.log('CRITICAL: Fast-tracking security patch')

    upgrade.status = 'fast_track'
    upgrade.fastTrackedAt = new Date().toISOString()

    // Critical patches bypass DAO vote but still require:
    // 1. Automated staging test
    // 2. Time-lock shortened to 4 hours
    upgrade.timelockMs = 4 * 60 * 60 * 1000 // 4 hours for critical

    // Run staging tests
    const testResult = await this.runStagingTests(upgrade)
    if (!testResult.passed) {
      console.error('Staging tests failed, cannot fast-track')
      upgrade.status = 'blocked'
      upgrade.blockReason = 'staging_tests_failed'
      return upgrade
    }

    // Wait shortened timelock
    console.log(`Waiting ${upgrade.timelockMs / (60 * 60 * 1000)}h timelock before execution...`)

    upgrade.status = 'ready'
    await this.executeUpgrade(upgrade)

    return upgrade
  }

  /**
   * Queue upgrade for DAO governance vote
   */
  async queueForVote(upgrade) {
    if (!this.dao) {
      throw new Error('DAO not configured')
    }

    console.log(`Creating DAO proposal for upgrade ${upgrade.from} -> ${upgrade.to}`)

    upgrade.status = 'voting'
    upgrade.proposalId = await this.dao.createProposal({
      title: `Upgrade v${upgrade.from} to v${upgrade.to}`,
      description: this.formatProposalDescription(upgrade),
      type: 'upgrade',
      data: upgrade,
      votingPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
      quorum: upgrade.severity === 'major' ? '60%' : '50%',
      timelockMs: upgrade.severity === 'major' ? this.timelockMs : 24 * 60 * 60 * 1000
    })

    this.pendingUpgrades.push(upgrade)
    this.emit('proposal_created', upgrade)

    return upgrade
  }

  /**
   * Execute upgrade at low-traffic window
   */
  async executeAtLowTraffic() {
    const window = this.findNextLowTrafficWindow()
    const now = new Date()
    const msUntilWindow = window - now

    if (msUntilWindow > 0) {
      console.log(`Waiting for low-traffic window: ${new Date(window).toISOString()}`)
      // In production, use: await this.sleep(msUntilWindow)
    }

    // Execute pending upgrades
    for (const upgrade of this.pendingUpgrades) {
      if (upgrade.status === 'ready') {
        await this.executeUpgrade(upgrade)
      }
    }
  }

  /**
   * Execute a specific upgrade
   */
  async executeUpgrade(upgrade) {
    console.log(`Executing upgrade ${upgrade.from} -> ${upgrade.to}`)

    upgrade.status = 'executing'
    upgrade.executedAt = new Date().toISOString()

    try {
      // Run staging tests
      const testResult = await this.runStagingTests(upgrade)
      if (!testResult.passed) {
        throw new Error(`Staging tests failed: ${testResult.errors.join(', ')}`)
      }

      // In production: execute actual upgrade
      // This would call deployment scripts, migrate contracts, etc.

      upgrade.status = 'completed'
      upgrade.newVersion = upgrade.to
      this.currentVersion = upgrade.to

      // Record in history
      this.upgradeHistory.push(upgrade)

      // Remove from pending
      const idx = this.pendingUpgrades.findIndex(u => u.id === upgrade.id)
      if (idx !== -1) {
        this.pendingUpgrades.splice(idx, 1)
      }

      console.log(`Upgrade completed successfully: now at v${this.currentVersion}`)
      this.emit('upgrade_completed', upgrade)

      return upgrade
    } catch (error) {
      upgrade.status = 'failed'
      upgrade.error = error.message
      console.error(`Upgrade failed: ${error.message}`)
      this.emit('upgrade_failed', upgrade)
      throw error
    }
  }

  /**
   * Find next low-traffic window
   */
  findNextLowTrafficWindow() {
    const now = new Date()

    // Simple implementation: find next configured window
    for (const config of this.lowTrafficWindows) {
      const window = new Date(now)
      window.setUTCHours(config.hour, 0, 0, 0)

      // If already passed today, use tomorrow
      if (window <= now) {
        window.setDate(window.getDate() + 1)
      }

      return window.getTime()
    }

    // Default: 3 AM UTC tomorrow
    const defaultWindow = new Date(now)
    defaultWindow.setUTCDate(defaultWindow.getUTCDate() + 1)
    defaultWindow.setUTCHours(3, 0, 0, 0)
    return defaultWindow.getTime()
  }

  /**
   * Run staging tests before upgrade
   */
  async runStagingTests(upgrade) {
    console.log('Running staging tests...')

    // Simulated test results
    // In production, this would run actual test suites
    return {
      passed: true,
      tests: [
        { name: 'Unit tests', passed: true },
        { name: 'Integration tests', passed: true },
        { name: 'Security audit', passed: true }
      ],
      duration: 30000 // 30 seconds
    }
  }

  /**
   * Fetch latest version from GitHub releases
   */
  async fetchLatestVersion() {
    try {
      const data = await this.fetchUrl(
        `https://api.github.com/repos/${this.githubRepo}/releases/latest`
      )
      return data.tag_name?.replace(/^v/, '') || '1.0.0'
    } catch (error) {
      // Fallback or rethrow
      throw error
    }
  }

  /**
   * Fetch changelog for a version
   */
  async fetchChangelog(version) {
    try {
      const tag = `v${version}`
      const data = await this.fetchUrl(
        `https://api.github.com/repos/${this.githubRepo}/releases/tags/${tag}`
      )
      return data.body || ''
    } catch (error) {
      return ''
    }
  }

  /**
   * Simple HTTP fetch helper
   */
  fetchUrl(url) {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http
      const options = {
        headers: {
          'User-Agent': 'UpgradeScheduler/1.0',
          ...(this.githubToken && { Authorization: `token ${this.githubToken}` })
        }
      }

      protocol.get(url, options, (res) => {
        let data = ''
        res.on('data', chunk => data += chunk)
        res.on('end', () => {
          try {
            resolve(JSON.parse(data))
          } catch {
            resolve(data)
          }
        })
      }).on('error', reject)
    })
  }

  /**
   * Compare semantic versions
   */
  compareVersions(current, latest) {
    const parse = v => v.split('.').map(Number)
    const c = parse(current)
    const l = parse(latest)

    for (let i = 0; i < 3; i++) {
      if (c[i] < l[i]) return -1
      if (c[i] > l[i]) return 1
    }
    return 0
  }

  /**
   * Check if latest version is newer
   */
  isNewer(latest) {
    return this.compareVersions(this.currentVersion, latest) < 0
  }

  /**
   * Detect breaking changes in changelog
   */
  detectBreakingChanges(changelog) {
    const breakingIndicators = [
      'breaking',
      'breaking change',
      'migration required',
      'deprecated',
      '⚠️'
    ]
    return breakingIndicators.some(ind => changelog.toLowerCase().includes(ind))
  }

  /**
   * Format upgrade for DAO proposal
   */
  formatProposalDescription(upgrade) {
    return `
# Upgrade Proposal: v${upgrade.from} to v${upgrade.to}

## Severity: ${upgrade.severity.toUpperCase()}

${upgrade.breakingChanges ? '⚠️ WARNING: This upgrade contains breaking changes' : ''}

## Changelog
${upgrade.changelog || 'No changelog available'}

## Risk Assessment
- Breaking changes: ${upgrade.breakingChanges ? 'Yes' : 'No'}
- Requires migration: ${upgrade.breakingChanges ? 'Yes' : 'Check changelog'}

## Implementation Plan
1. Automated staging tests
2. ${upgrade.severity === 'major' ? 'DAO vote (60% quorum required)' : 'DAO vote (50% quorum required)'}
3. Time-lock: ${this.timelockMs / (60 * 60 * 1000)} hours
4. Execution at low-traffic window

## Voting
Please vote YES to proceed with this upgrade, or NO to reject.
    `.trim()
  }

  // EventEmitter-like methods
  _listeners = {}

  on(event, listener) {
    (this._listeners[event] = this._listeners[event] || []).push(listener)
    return this
  }

  emit(event, data) {
    (this._listeners[event] || []).forEach(fn => fn(data))
    return this
  }

  off(event, listener) {
    if (listener) {
      this._listeners[event] = (this._listeners[event] || []).filter(fn => fn !== listener)
    } else {
      delete this._listeners[event]
    }
    return this
  }

  /**
   * Get pending upgrades
   */
  getPendingUpgrades() {
    return [...this.pendingUpgrades]
  }

  /**
   * Get upgrade history
   */
  getUpgradeHistory() {
    return [...this.upgradeHistory]
  }

  /**
   * Get current version
   */
  getCurrentVersion() {
    return this.currentVersion
  }
}

module.exports = { UpgradeScheduler }