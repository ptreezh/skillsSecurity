/**
 * HealthMonitor Agent
 * Monitors contract events, gas prices, and service health
 *
 * Schedule: Every 5 minutes via cron or setInterval
 * Output: Console + configurable alert hooks
 */

class HealthMonitor {
  constructor(config) {
    this.provider = config.provider
    this.contracts = config.contracts
    this.alertHooks = config.alertHooks || [console.log]
    this.lastBlock = null
    this.errorThreshold = config.errorThreshold || 5 // alerts after N errors in window
    this.checkInterval = config.checkInterval || 5 * 60 * 1000 // 5 minutes default
    this.intervalId = null
    this.healthHistory = []
    this.maxHistoryLength = 100
  }

  /**
   * Start monitoring on an interval
   */
  start() {
    if (this.intervalId) {
      console.warn('HealthMonitor already running')
      return
    }

    console.log('HealthMonitor started')
    this.check() // Run immediately
    this.intervalId = setInterval(() => this.check(), this.checkInterval)

    return this
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      console.log('HealthMonitor stopped')
    }
    return this
  }

  /**
   * Run all health checks
   */
  async check() {
    try {
      const checks = [
        this.checkContractEvents(),
        this.checkGasVolatility(),
        this.checkUserActivity(),
        this.checkFrontendHealth()
      ]

      const results = await Promise.allSettled(checks)
      const normalizedResults = results.map((r, i) =>
        r.status === 'fulfilled' ? r.value : { status: 'error', name: `check_${i}`, error: r.reason?.message }
      )

      const healthScore = this.calculateHealthScore(normalizedResults)
      const timestamp = Date.now()

      // Store in history
      this.healthHistory.push({ score: healthScore, results: normalizedResults, timestamp })
      if (this.healthHistory.length > this.maxHistoryLength) {
        this.healthHistory.shift()
      }

      // Alert if health is degraded
      if (healthScore < 0.7) {
        this.alert('HEALTH_WARNING', { score: healthScore, results: normalizedResults, timestamp })
      }

      if (healthScore < 0.5) {
        this.alert('HEALTH_CRITICAL', { score: healthScore, results: normalizedResults, timestamp })
      }

      return { score: healthScore, results: normalizedResults, timestamp }
    } catch (error) {
      this.alert('HEALTH_CHECK_ERROR', { error: error.message })
      return { score: 0, error: error.message, timestamp: Date.now() }
    }
  }

  /**
   * Check contract events for errors and slashes
   */
  async checkContractEvents() {
    if (!this.provider || !this.contracts) {
      return { status: 'skipped', name: 'contracts', reason: 'No provider or contracts configured' }
    }

    const sinceBlock = this.lastBlock || (await this.provider.getBlockNumber() - 100)
    const errors = []

    for (const [name, contract] of Object.entries(this.contracts)) {
      try {
        // Try common error/slash event filters
        const filters = ['Error', 'Slash', 'Failed', 'Reverted']
        for (const filterName of filters) {
          const filter = contract.filters[filterName]
          if (filter) {
            const events = await contract.queryFilter(filter(), sinceBlock)
            if (events.length > 0) {
              errors.push({ contract: name, filter: filterName, count: events.length })
            }
          }
        }
      } catch (err) {
        // Contract may not have this filter, skip
      }
    }

    // Update last block
    try {
      this.lastBlock = await this.provider.getBlockNumber()
    } catch (e) {
      // Ignore block number update errors
    }

    if (errors.length >= this.errorThreshold) {
      return { status: 'warning', name: 'contracts', errors, totalErrors: errors.length }
    }

    if (errors.length > 0) {
      return { status: 'info', name: 'contracts', errors, totalErrors: errors.length }
    }

    return { status: 'healthy', name: 'contracts' }
  }

  /**
   * Check gas price volatility
   * Gas price should not fluctuate more than 50% in 10 minutes
   */
  async checkGasVolatility() {
    if (!this.provider) {
      return { status: 'skipped', name: 'gas', reason: 'No provider configured' }
    }

    try {
      const currentGas = await this.provider.getFeeData()
      const gasPrice = currentGas.gasPrice || BigInt(0)

      // Get historical gas price from history or use current as baseline
      const recentChecks = this.healthHistory.slice(-10)
      if (recentChecks.length < 2) {
        return { status: 'healthy', name: 'gas', gasPrice: gasPrice.toString(), volatility: 0 }
      }

      // Find previous gas data
      let previousGas = null
      for (let i = recentChecks.length - 1; i >= 0; i--) {
        const prev = recentChecks[i].results.find(r => r.name === 'gas')
        if (prev?.gasPrice) {
          previousGas = BigInt(prev.gasPrice)
          break
        }
      }

      if (!previousGas || previousGas === BigInt(0)) {
        return { status: 'healthy', name: 'gas', gasPrice: gasPrice.toString(), volatility: 0 }
      }

      const diff = Number(gasPrice - previousGas) / Number(previousGas)
      const volatility = Math.abs(diff)

      if (volatility > 0.5) {
        return {
          status: 'warning',
          name: 'gas',
          gasPrice: gasPrice.toString(),
          previousGas: previousGas.toString(),
          volatility: Math.round(volatility * 100) / 100
        }
      }

      return {
        status: 'healthy',
        name: 'gas',
        gasPrice: gasPrice.toString(),
        volatility: Math.round(volatility * 100) / 100
      }
    } catch (error) {
      return { status: 'error', name: 'gas', error: error.message }
    }
  }

  /**
   * Check for user activity anomalies
   */
  async checkUserActivity() {
    // Placeholder for user activity monitoring
    // In production, this would query analytics or on-chain data
    return { status: 'healthy', name: 'user_activity', users: 'N/A' }
  }

  /**
   * Check frontend/service health
   */
  async checkFrontendHealth() {
    // Placeholder for frontend health checks
    // In production, this would check HTTP endpoints
    return { status: 'healthy', name: 'frontend' }
  }

  /**
   * Calculate overall health score from individual checks
   */
  calculateHealthScore(results) {
    if (results.length === 0) return 1

    const weights = {
      healthy: 1.0,
      info: 0.9,
      skipped: 0.95,
      warning: 0.6,
      error: 0.3,
      critical: 0
    }

    let totalWeight = 0
    let weightedSum = 0

    for (const result of results) {
      const weight = weights[result.status] ?? 0.5
      totalWeight += 1
      weightedSum += weight
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 1
  }

  /**
   * Send alerts through all configured hooks
   */
  alert(type, data) {
    const alertMessage = {
      type,
      data,
      timestamp: new Date().toISOString()
    }

    this.alertHooks.forEach(hook => {
      try {
        hook(alertMessage)
      } catch (err) {
        console.error('Alert hook failed:', err)
      }
    })
  }

  /**
   * Add an alert hook
   */
  addAlertHook(hook) {
    this.alertHooks.push(hook)
    return this
  }

  /**
   * Remove an alert hook
   */
  removeAlertHook(hook) {
    const index = this.alertHooks.indexOf(hook)
    if (index > -1) {
      this.alertHooks.splice(index, 1)
    }
    return this
  }

  /**
   * Get health history
   */
  getHistory() {
    return [...this.healthHistory]
  }

  /**
   * Get latest health status
   */
  getLatestStatus() {
    return this.healthHistory[this.healthHistory.length - 1] || null
  }
}

export { HealthMonitor }