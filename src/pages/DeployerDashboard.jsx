/**
 * DeployerDashboard - Deployer Rewards Incentive Panel
 * Phase 19: Deployer Rewards Frontend
 *
 * Shows deployer stats, tier status, referral link, and reward progress.
 */

import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import './DeployerDashboard.css'
import ContractService from '../services/ContractService.jsx'

// Tier thresholds (number of users)
const TIER_THRESHOLDS = {
  0: 0,    // Bronze: 0 users
  1: 50,   // Silver: 50+ users
  2: 100   // Gold: 100+ users
}

const TIER_KEY = { 0: 'bronze', 1: 'silver', 2: 'gold' }

export default function DeployerDashboard({ user }) {
  const { t } = useTranslation()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isRegistered, setIsRegistered] = useState(false)
  const [referralLink, setReferralLink] = useState('')
  const [copied, setCopied] = useState(false)

  const tierConfig = {
    0: { name: t('deployerDashboard.tiers.bronze.name'), key: 'bronze', benefit: t('deployerDashboard.tiers.bronze.benefit') },
    1: { name: t('deployerDashboard.tiers.silver.name'), key: 'silver', benefit: t('deployerDashboard.tiers.silver.benefit') },
    2: { name: t('deployerDashboard.tiers.gold.name'), key: 'gold', benefit: t('deployerDashboard.tiers.gold.benefit') }
  }

  // Fetch deployer stats
  useEffect(() => {
    async function fetchDeployerData() {
      if (!user?.address) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        // Try to get deployer stats from contract
        if (ContractService.isInitialized()) {
          const deployerStats = await ContractService.getDeployerStats(user.address)
          const registered = await ContractService.isDeployer(user.address)

          if (deployerStats) {
            setStats({
              domain: deployerStats.domain,
              tier: Number(deployerStats.tier),
              totalUsers: Number(deployerStats.totalUsers),
              activeUsers: Number(deployerStats.activeUsers),
              totalRewards: Number(deployerStats.totalRewards),
              pendingRewards: Number(deployerStats.pendingRewards),
              monthlyCount: Number(deployerStats.monthlyCount)
            })
            setIsRegistered(registered)
          }

          // Get referral link
          const link = await ContractService.getReferralLink(user.address)
          if (link) {
            setReferralLink(link)
          }
        } else {
          // Demo mode - use mock data
          setStats({
            domain: 'demo.agent-skills.xyz',
            tier: 1,
            totalUsers: 23,
            activeUsers: 18,
            totalRewards: 4500,
            pendingRewards: 1200,
            monthlyCount: 5
          })
          setIsRegistered(true)
          setReferralLink(`https://agent-skills.xyz/ref/${user.address.slice(2, 10).toLowerCase()}`)
        }
      } catch (err) {
        console.error('Error fetching deployer data:', err)
        setError(err.message)
        // Fallback to demo data
        setStats({
          domain: 'demo.agent-skills.xyz',
          tier: 1,
          totalUsers: 23,
          activeUsers: 18,
          totalRewards: 4500,
          pendingRewards: 1200,
          monthlyCount: 5
        })
        setIsRegistered(true)
        setReferralLink(`https://agent-skills.xyz/ref/${user.address.slice(2, 10).toLowerCase()}`)
      } finally {
        setLoading(false)
      }
    }

    fetchDeployerData()
  }, [user?.address])

  // Copy referral link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Handle register (placeholder)
  const handleRegister = () => {
    alert(t('deployerDashboard.registerUnavailable'))
  }

  // Get progress to next tier
  const getProgressToNextTier = () => {
    if (!stats) return { current: 0, next: 0, progress: 0, nextTier: null }

    const currentTier = stats.tier
    if (currentTier >= 2) {
      return { current: stats.totalUsers, next: stats.totalUsers, progress: 100, nextTier: null }
    }

    const nextThreshold = TIER_THRESHOLDS[currentTier + 1]
    const currentThreshold = TIER_THRESHOLDS[currentTier]
    const progress = ((stats.totalUsers - currentThreshold) / (nextThreshold - currentThreshold)) * 100

    return {
      current: stats.totalUsers,
      next: nextThreshold,
      progress: Math.min(Math.max(progress, 0), 100),
      nextTier: tierConfig[currentTier + 1]
    }
  }

  // NOT CONNECTED STATE
  if (!user) {
    return (
      <div className="deployer-dashboard animate-fade-in">
        <div className="deployer-card">
          <div className="not-connected">
            <div className="not-connected-icon">🔗</div>
            <h2>{t('deployerDashboard.notConnectedTitle')}</h2>
            <p>{t('deployerDashboard.notConnectedDesc')}</p>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              {t('wallet.connect')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // LOADING STATE
  if (loading) {
    return (
      <div className="deployer-dashboard animate-fade-in">
        <div className="deployer-card">
          <div className="loading">
            <div className="spinner"></div>
            <p>{t('deployerDashboard.loading')}</p>
          </div>
        </div>
      </div>
    )
  }

  // NOT REGISTERED STATE
  if (!isRegistered || !stats) {
    return (
      <div className="deployer-dashboard animate-fade-in">
        <div className="deployer-card">
          <div className="not-registered">
            <div className="not-registered-icon">🎯</div>
            <h2>{t('deployerDashboard.notRegisteredTitle')}</h2>
            <p>{t('deployerDashboard.notRegisteredDesc')}</p>
            <button className="btn btn-primary" onClick={handleRegister}>
              {t('deployerDashboard.registerNow')}
            </button>
            <div className="tier-preview">
              <h3>{t('deployerDashboard.tierPrivileges')}</h3>
              <div className="tier-list">
                {Object.entries(tierConfig).map(([tier, config]) => (
                  <div key={tier} className={`tier-item tier-item-${config.key}`}>
                    <span className={`tier-name tier-name-${config.key}`}>{config.name}</span>
                    <span>
                      {TIER_THRESHOLDS[tier]}+ {t('deployerDashboard.users')} |{' '}
                      {config.benefit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // REGISTERED STATE - SHOW FULL DASHBOARD
  const tierInfo = tierConfig[stats.tier] || tierConfig[0]
  const tierKey = TIER_KEY[stats.tier] || 'bronze'
  const progress = getProgressToNextTier()

  return (
    <div className="deployer-dashboard animate-fade-in">
      <div className="deployer-card">
        {/* Panel Header */}
        <div className="panel-header">
          <div className="panel-title">
            <h2>{t('deployerDashboard.panelTitle')}</h2>
            <span className="domain-label">{stats.domain}</span>
          </div>
          <span className={`tier-badge tier-badge-${tierKey}`}>
            {tierInfo.name}
          </span>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">{t('deployerDashboard.stats.totalUsers')}</div>
            <div className="stat-value">{stats.totalUsers}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">{t('deployerDashboard.stats.activeUsers')}</div>
            <div className="stat-value">{stats.activeUsers}</div>
          </div>
          <div className="stat-card stat-highlight">
            <div className="stat-label">{t('deployerDashboard.stats.totalRewards')}</div>
            <div className="stat-value">{stats.totalRewards.toLocaleString()}</div>
            <div className="stat-unit">ASK</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">{t('deployerDashboard.stats.pendingRewards')}</div>
            <div className="stat-value pending">{stats.pendingRewards.toLocaleString()}</div>
          </div>
        </div>

        {/* Referral Section */}
        <div className="referral-section">
          <h3>{t('deployerDashboard.referralLink')}</h3>
          <div className="referral-link-container">
            <input
              type="text"
              className="referral-input"
              value={referralLink}
              readOnly
            />
            <button
              className={`btn btn-primary ${copied ? 'copied' : ''}`}
              onClick={handleCopyLink}
            >
              {copied ? t('common.copied') : t('deployerDashboard.copy')}
            </button>
          </div>
        </div>

        {/* Tier Progress */}
        <div className="tier-progress">
          <h3>{t('deployerDashboard.tierProgress')}</h3>
          <div className="progress-info">
            <span className={`current-tier tier-text-${tierKey}`}>
              {tierInfo.name} · {stats.totalUsers} {t('deployerDashboard.users')}
            </span>
            {progress.nextTier ? (
              <span className="next-tier">
                {t('deployerDashboard.toNextTier', { tier: progress.nextTier.name, count: progress.next - progress.current })}
              </span>
            ) : (
              <span className="max-tier">{t('deployerDashboard.maxTier')}</span>
            )}
          </div>
          <div className="progress-bar-container">
            <div className="progress-bar-bg">
              <div
                className={`progress-bar-fill progress-fill-${tierKey}`}
                style={{ width: `${progress.progress}%` }}
              />
            </div>
          </div>
          <div className="tier-markers">
            {Object.entries(tierConfig).map(([tier, config]) => (
              <span key={tier} className={`marker tier-marker-${config.key}`}>
                {config.name} {TIER_THRESHOLDS[tier]}
              </span>
            ))}
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="alert alert-warning" style={{ marginTop: 'var(--space-4)' }}>
            {t('deployerDashboard.partialError')}
          </div>
        )}
      </div>
    </div>
  )
}
