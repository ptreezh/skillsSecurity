/**
 * DeployerDashboard - Deployer Rewards Incentive Panel
 * Phase 19: Deployer Rewards Frontend
 *
 * Shows deployer stats, tier status, referral link, and reward progress.
 */

import React, { useState, useEffect } from 'react'
import './DeployerDashboard.css'
import ContractService from '../services/ContractService.jsx'

// Tier configuration
const TIER_CONFIG = {
  0: { name: '青铜', color: '#94a3b8', bg: '#f1f5f9' },
  1: { name: '白银', color: '#60a5fa', bg: '#dbeafe' },
  2: { name: '黄金', color: '#fbbf24', bg: '#fef3c7' }
}

// Tier thresholds (number of users)
const TIER_THRESHOLDS = {
  0: 0,    // Bronze: 0 users
  1: 50,   // Silver: 50+ users
  2: 100   // Gold: 100+ users
}

export default function DeployerDashboard({ user }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isRegistered, setIsRegistered] = useState(false)
  const [referralLink, setReferralLink] = useState('')
  const [copied, setCopied] = useState(false)

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
    alert('注册功能将在合约部署后启用\n\n请使用: node scripts/deploy-with-rewards.js --register --domain your-site.com')
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
      nextTier: TIER_CONFIG[currentTier + 1]
    }
  }

  // NOT CONNECTED STATE
  if (!user) {
    return (
      <div className="deployer-dashboard">
        <div className="deployer-card">
          <div className="not-connected">
            <div className="not-connected-icon">🔗</div>
            <h2>连接钱包查看你的激励数据</h2>
            <p>成为部署者，享受推荐奖励和等级特权</p>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              连接钱包
            </button>
          </div>
        </div>
      </div>
    )
  }

  // LOADING STATE
  if (loading) {
    return (
      <div className="deployer-dashboard">
        <div className="deployer-card">
          <div className="loading">
            <div className="spinner"></div>
            <p>加载激励数据中...</p>
          </div>
        </div>
      </div>
    )
  }

  // NOT REGISTERED STATE
  if (!isRegistered || !stats) {
    return (
      <div className="deployer-dashboard">
        <div className="deployer-card">
          <div className="not-registered">
            <div className="not-registered-icon">🎯</div>
            <h2>注册成为部署者获取推荐奖励</h2>
            <p>推荐用户使用 AgentSkills，获得 10% 的staking奖励</p>
            <button className="btn btn-primary" onClick={handleRegister}>
              立即注册
            </button>
            <div className="tier-preview">
              <h3>等级特权</h3>
              <div className="tier-list">
                <div className="tier-item" style={{ borderLeftColor: TIER_CONFIG[0].color }}>
                  <span className="tier-name" style={{ color: TIER_CONFIG[0].color }}>{TIER_CONFIG[0].name}</span>
                  <span>0+ 用户 | 基础奖励</span>
                </div>
                <div className="tier-item" style={{ borderLeftColor: TIER_CONFIG[1].color }}>
                  <span className="tier-name" style={{ color: TIER_CONFIG[1].color }}>{TIER_CONFIG[1].name}</span>
                  <span>50+ 用户 | 额外 5%</span>
                </div>
                <div className="tier-item" style={{ borderLeftColor: TIER_CONFIG[2].color }}>
                  <span className="tier-name" style={{ color: TIER_CONFIG[2].color }}>{TIER_CONFIG[2].name}</span>
                  <span>100+ 用户 | VIP 支持</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // REGISTERED STATE - SHOW FULL DASHBOARD
  const tierInfo = TIER_CONFIG[stats.tier] || TIER_CONFIG[0]
  const progress = getProgressToNextTier()

  return (
    <div className="deployer-dashboard">
      <div className="deployer-card">
        {/* Panel Header */}
        <div className="panel-header">
          <div className="panel-title">
            <h2>部署者激励面板</h2>
            <span className="domain-label">{stats.domain}</span>
          </div>
          <span
            className="tier-badge"
            style={{
              backgroundColor: tierInfo.bg,
              color: tierInfo.color,
              borderColor: tierInfo.color
            }}
          >
            {tierInfo.name}
          </span>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">总用户</div>
            <div className="stat-value">{stats.totalUsers}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">活跃用户</div>
            <div className="stat-value">{stats.activeUsers}</div>
          </div>
          <div className="stat-card stat-highlight">
            <div className="stat-label">累计奖励</div>
            <div className="stat-value">{stats.totalRewards.toLocaleString()}</div>
            <div className="stat-unit">ASK</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">待领取</div>
            <div className="stat-value pending">{stats.pendingRewards.toLocaleString()}</div>
          </div>
        </div>

        {/* Referral Section */}
        <div className="referral-section">
          <h3>你的推荐链接</h3>
          <div className="referral-link-container">
            <input
              type="text"
              className="referral-input"
              value={referralLink}
              readOnly
            />
            <button
              className={`btn-copy ${copied ? 'copied' : ''}`}
              onClick={handleCopyLink}
            >
              {copied ? '已复制' : '复制'}
            </button>
          </div>
        </div>

        {/* Tier Progress */}
        <div className="tier-progress">
          <h3>等级进度</h3>
          <div className="progress-info">
            <span className="current-tier" style={{ color: tierInfo.color }}>
              {tierInfo.name} {stats.totalUsers} 用户
            </span>
            {progress.nextTier && (
              <span className="next-tier">
                距离{progress.nextTier.name}还差 {progress.next - progress.current} 用户
              </span>
            )}
            {stats.tier >= 2 && (
              <span className="max-tier">已达最高等级</span>
            )}
          </div>
          <div className="progress-bar-container">
            <div className="progress-bar-bg">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${progress.progress}%`,
                  backgroundColor: tierInfo.color
                }}
              />
            </div>
          </div>
          <div className="tier-markers">
            <span className="marker" style={{ color: TIER_CONFIG[0].color }}>青铜 0</span>
            <span className="marker" style={{ color: TIER_CONFIG[1].color }}>白银 50</span>
            <span className="marker" style={{ color: TIER_CONFIG[2].color }}>黄金 100</span>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="error-banner">
            <span>数据加载部分失败，使用演示数据</span>
          </div>
        )}
      </div>
    </div>
  )
}