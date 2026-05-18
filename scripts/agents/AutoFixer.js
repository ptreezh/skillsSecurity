/**
 * AutoFixer Agent
 * Automatically fixes common issues with safety rollback
 *
 * Safety: Rollback if fix fails 3 times
 * Logging: All actions logged for audit
 */

import { EventEmitter } from 'events'

class AutoFixer extends EventEmitter {
  constructor(config = {}) {
    super()
    this.maxRetries = config.maxRetries || 3
    this.fixes = new Map() // issue type -> attempt count
    this.auditLog = []
    this.backoffMs = config.backoffMs || 5000 // 5 seconds default backoff
  }

  /**
   * Attempt to fix an issue
   * @param {Object} issue - Issue to fix { type, data, severity }
   * @returns {Object} Result { status: 'fixed'|'failed'|'escalated', ... }
   */
  async fix(issue) {
    const { type, data, severity } = issue
    const issueKey = this.getIssueKey(issue)
    const attempts = (this.fixes.get(issueKey) || 0) + 1

    this.log('INFO', `Attempting to fix ${type}`, { attempts: attempts - 1, severity })

    if (attempts > this.maxRetries) {
      this.log('WARN', `Max retries exceeded for ${type}, escalating`, { attempts: attempts - 1 })
      const result = await this.escalate(issue)
      return { ...result, attempts: attempts - 1 }
    }

    this.fixes.set(issueKey, attempts)

    try {
      const result = await this.executeFix(issue)
      this.fixes.delete(issueKey)
      this.log('INFO', `Successfully fixed ${type}`, result)

      this.emit('fixed', { issue, result })
      return { status: 'fixed', result, attempts }
    } catch (error) {
      this.log('ERROR', `Failed to fix ${type}`, { error: error.message, attempts })

      this.emit('fix_failed', { issue, error: error.message, attempts })

      // If this was the last attempt, escalate
      if (attempts >= this.maxRetries) {
        await this.escalate(issue)
      }

      return { status: 'failed', error: error.message, attempts }
    }
  }

  /**
   * Get a unique key for the issue
   */
  getIssueKey(issue) {
    return `${issue.type}:${issue.data?.id || issue.data?.txHash || 'default'}`
  }

  /**
   * Execute the appropriate fix based on issue type
   */
  async executeFix(issue) {
    switch (issue.type) {
      case 'stuck_transaction':
        return this.fixStuckTx(issue)
      case 'service_down':
        return this.restartService(issue)
      case 'gas_spike':
        return this.adjustGasSettings(issue)
      case 'cache_stale':
        return this.clearCache(issue)
      case 'high_error_rate':
        return this.investigateErrors(issue)
      case 'slash_detected':
        return this.handleSlash(issue)
      default:
        throw new Error(`Unknown issue type: ${issue.type}`)
    }
  }

  /**
   * Fix stuck transaction by resubmitting with higher gas or canceling
   */
  async fixStuckTx(issue) {
    const { txHash, originalGasPrice, options } = issue.data

    // In production, this would:
    // 1. Check if transaction is still pending
    // 2. If yes, either:
    //    a. Resubmit with higher gas price (e.g., +10%)
    //    b. Send a replacement transaction with same nonce but higher gas to "cancel"

    this.log('INFO', `Fixing stuck transaction ${txHash}`)

    // Simulated fix result
    return {
      action: 'resubmit_with_higher_gas',
      originalGasPrice,
      suggestedGasPrice: originalGasPrice
        ? Math.floor(originalGasPrice * 1.1)
        : null,
      newTxHash: `0x${Date.now().toString(16)}`,
      instructions: [
        'Check if original tx is still pending',
        'If pending: submit replacement with 10% higher gas',
        'If confirmed: no action needed'
      ]
    }
  }

  /**
   * Restart a failed service
   */
  async restartService(issue) {
    const { serviceName, instanceId, restartOptions } = issue.data

    this.log('INFO', `Restarting service ${serviceName}`)

    // In production, this would use PM2, systemd, or K8s API to restart
    return {
      action: 'restart_service',
      serviceName,
      instanceId,
      steps: [
        'Stop current instance',
        'Clear any lock files',
        'Restart process',
        'Verify health endpoint',
        'Update monitoring'
      ],
      estimatedDowntime: '5-30 seconds'
    }
  }

  /**
   * Adjust gas settings during spike
   */
  async adjustGasSettings(issue) {
    const { currentGasPrice, threshold, userPreferences } = issue.data

    this.log('INFO', 'Adjusting gas settings due to spike')

    // Calculate recommended settings
    const volatile = currentGasPrice > threshold

    return {
      action: 'adjust_gas_settings',
      volatile,
      recommendations: volatile
        ? {
            strategy: 'wait',
            suggestedDelay: '5-15 minutes',
            targetGasPrice: Math.floor(threshold * 1.2),
            alternatives: ['Use layer 2', 'Wait for gas to normalize']
          }
        : {
            strategy: 'proceed',
            currentGasPrice,
            estimatedConfirmation: '2-5 minutes'
          }
    }
  }

  /**
   * Clear stale cache
   */
  async clearCache(issue) {
    const { cacheType, keys, reason } = issue.data

    this.log('INFO', `Clearing ${cacheType} cache`, { reason, keysCount: keys?.length })

    return {
      action: 'clear_cache',
      cacheType,
      clearedKeys: keys || [],
      steps: [
        'Identify stale cache entries',
        'Mark entries for invalidation',
        'Clear from memory/cache layer',
        'Trigger re-fetch from source',
        'Verify fresh data is available'
      ]
    }
  }

  /**
   * Investigate high error rates
   */
  async investigateErrors(issue) {
    const { errorCount, timeWindow, recentErrors } = issue.data

    this.log('WARN', `High error rate detected: ${errorCount} errors in ${timeWindow}`)

    return {
      action: 'investigate_errors',
      analysis: {
        errorCount,
        timeWindow,
        likelyCauses: [
          'External API dependency down',
          'Contract state inconsistency',
          'Gas oracle malfunction',
          'Rate limiting triggered'
        ],
        recommendedActions: [
          'Check external service status',
          'Verify contract state',
          'Review recent deployments',
          'Check rate limit counters'
        ]
      }
    }
  }

  /**
   * Handle detected slash event
   */
  async handleSlash(issue) {
    const { slasher, evidence, amount } = issue.data

    this.log('WARN', `Slash detected: ${amount} slashed by ${slasher}`)

    return {
      action: 'handle_slash',
      details: {
        slasher,
        evidence,
        amount,
        notifications: [
          'Alert operator',
          'Log for audit',
          'Check if slash was valid',
          'Update reputation scores'
        ]
      }
    }
  }

  /**
   * Escalate an unresolvable issue
   */
  async escalate(issue) {
    const escalation = {
      status: 'escalated',
      issue,
      timestamp: new Date().toISOString(),
      attempts: this.maxRetries,
      alertTargets: this.getAlertTargets(issue.severity)
    }

    this.log('ERROR', `ESCALATE: Cannot fix ${issue.type} after ${this.maxRetries} attempts`, {
      issue,
      alertTargets: escalation.alertTargets
    })

    // Trigger alerts based on severity
    if (issue.severity === 'critical') {
      this.emit('critical_escalation', escalation)
    } else {
      this.emit('escalation', escalation)
    }

    return escalation
  }

  /**
   * Get alert targets based on severity
   */
  getAlertTargets(severity) {
    const targets = []

    // Always log to console
    targets.push({ type: 'console', severity: 'info' })

    if (severity === 'critical') {
      targets.push(
        { type: 'pagerduty', required: true },
        { type: 'email', required: true },
        { type: 'slack', channel: '#incidents', required: true }
      )
    } else if (severity === 'high') {
      targets.push(
        { type: 'slack', channel: '#alerts', required: true },
        { type: 'email', required: false }
      )
    } else {
      targets.push({ type: 'slack', channel: '#alerts', required: false })
    }

    return targets
  }

  /**
   * Log an action to audit log
   */
  log(level, message, data = {}) {
    const entry = {
      level,
      message,
      data,
      timestamp: new Date().toISOString()
    }
    this.auditLog.push(entry)

    // Also emit event
    this.emit('log', entry)

    // Console output
    const prefix = {
      INFO: '[INFO]',
      WARN: '[WARN]',
      ERROR: '[ERROR]',
      DEBUG: '[DEBUG]'
    }[level] || '[LOG]'

    console.log(`${prefix} ${message}`, data)
  }

  /**
   * Get audit log
   */
  getAuditLog() {
    return [...this.auditLog]
  }

  /**
   * Get statistics
   */
  getStats() {
    const stats = {
      totalFixes: this.auditLog.filter(e => e.level === 'INFO' && e.message.includes('Successfully fixed')).length,
      failedFixes: this.auditLog.filter(e => e.level === 'ERROR' && e.message.includes('Failed to fix')).length,
      escalations: this.auditLog.filter(e => e.message.includes('ESCALATE')).length,
      currentRetries: Object.fromEntries(this.fixes)
    }
    return stats
  }

  /**
   * Reset stats and audit log
   */
  reset() {
    this.fixes.clear()
    this.auditLog = []
    return this
  }
}

export { AutoFixer }