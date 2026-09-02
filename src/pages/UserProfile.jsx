import React, { useState, useEffect } from 'react'
import ContractService from '../services/ContractService.jsx'

const LEVELS = [
  { level: 1, name: '观察员', req: '邮箱验证', perms: '只积累声誉', color: 'var(--color-gray-500)', bg: 'var(--color-gray-100)' },
  { level: 2, name: '贡献者', req: '完成3次行为', perms: '创建/改进/测试', color: 'var(--color-success)', bg: 'var(--color-success-light)' },
  { level: 3, name: '信用者', req: '声誉>=500', perms: '全功能+30%变现', color: 'var(--color-primary)', bg: 'var(--color-primary-light)' },
  { level: 4, name: '守护者', req: '声誉>=2000', perms: '审计/仲裁+70%变现', color: 'var(--color-purple-600)', bg: 'var(--color-purple-100)' },
  { level: 5, name: '长者', req: '声誉>=5000', perms: '治理投票+90%变现', color: 'var(--color-warning)', bg: 'var(--color-warning-light)' }
]

const getLevel = (rep) => {
  if (rep >= 5000) return LEVELS[4]
  if (rep >= 2000) return LEVELS[3]
  if (rep >= 500) return LEVELS[2]
  if (rep >= 100) return LEVELS[1]
  return LEVELS[0]
}

export default function UserProfile({ user }) {
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchProfile() {
      if (!user?.address) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        if (ContractService.isInitialized()) {
          const [reputation, stakes, effective, locked] = await Promise.all([
            ContractService.getReputation(user.address),
            ContractService.getStakes(user.address),
            ContractService.getEffectiveReputation(user.address),
            ContractService.getLockedReputation(user.address)
          ])

          setUserProfile({ reputation, stakes, effective, locked, fromContract: true })
        } else {
          setUserProfile({
            reputation: user.reputation,
            stakes: [],
            effective: user.reputation,
            locked: { lockedAmount: 0, lastClaimTime: 0 },
            fromContract: false
          })
        }
      } catch (err) {
        console.error('Error fetching profile:', err)
        setError(err.message)
        setUserProfile({
          reputation: user.reputation,
          stakes: [],
          effective: user.reputation,
          locked: { lockedAmount: 0, lastClaimTime: 0 },
          fromContract: false
        })
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [user?.address])

  if (!user) {
    return (
      <div className="container">
        <div className="alert alert-warning" style={{ textAlign: 'center' }}>
          请先注册（宪法第二条：低摩擦）
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading-state">
          <div className="loading-spinner" />
          <span>加载用户资料中...</span>
        </div>
      </div>
    )
  }

  const profile = userProfile || {
    reputation: user.reputation,
    effective: user.reputation,
    stakes: [],
    locked: { lockedAmount: 0, lastClaimTime: 0 },
    fromContract: false
  }

  const effectiveRep = profile.effective || profile.reputation || 0
  const levelInfo = getLevel(effectiveRep)
  const userRank = Math.max(1, Math.floor(10000 / (effectiveRep + 1)))
  const vestingProgress = Math.min((effectiveRep / 1000) * 30, 100)
  const vestingRemaining = Math.max(0, 1000 - effectiveRep)

  const handleVest = () => {
    if (effectiveRep < 1000) {
      alert(`需声誉 >= 1000 才可变现（当前：${effectiveRep}）\n宪法第二条：渐进变现`)
      return
    }
    alert(`变现申请已提交！\n可提取：30%（月度上限 500 ASK）\n宪法第二条：防早期 rush`)
  }

  return (
    <div className="container animate-fade-in">
      <div className="page-header">
        <h2 className="page-title">用户声誉中心</h2>
        <p className="page-subtitle">管理你的声誉、等级与变现进度</p>
      </div>

      {profile.fromContract && (
        <div className="badge badge-success" style={{ marginBottom: 'var(--space-4)' }}>
          已连接到合约
        </div>
      )}

      <div className="card card-user" style={{ marginBottom: 'var(--space-4)' }}>
        <div className="avatar avatar-lg" style={{ background: levelInfo.bg, color: levelInfo.color }}>
          {user.address.slice(0, 2).toUpperCase()}
        </div>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ margin: '0 0 var(--space-2) 0', color: 'var(--color-text-primary)', wordBreak: 'break-all', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)' }}>
            {user.address}
          </h3>
          <span className={`badge badge-tier badge-tier-${levelInfo.level}`}>
            L{levelInfo.level} {levelInfo.name}
          </span>
        </div>
      </div>

      <div className="grid-stats">
        <div className="card stat" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>声誉积分</div>
          <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-primary)' }}>{effectiveRep}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-1)' }}>不可转让</div>
        </div>

        <div className="card stat" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>全球排名</div>
          <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-success)' }}>#{userRank}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-1)' }}>宪法第三条</div>
        </div>

        <div className="card stat" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>今日点赞</div>
          <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-text-primary)' }}>{user.dailyLikes || 0} / 5</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-1)' }}>免费限额</div>
        </div>

        <div className="card stat" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>钱包余额</div>
          <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-warning)' }}>{user.balance || 0}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-1)' }}>ASK</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <h3 style={{ marginTop: 0, marginBottom: 'var(--space-4)', color: 'var(--color-text-primary)', fontSize: 'var(--text-lg)' }}>变现进度</h3>
        <div className="progress" style={{ marginBottom: 'var(--space-3)' }}>
          <div className="progress-bar" style={{ width: `${vestingProgress}%` }} />
        </div>
        <p style={{ color: vestingRemaining > 0 ? 'var(--color-warning)' : 'var(--color-success)', margin: '0 0 var(--space-4) 0' }}>
          {vestingRemaining > 0
            ? `距离解锁变现还需 ${vestingRemaining} 声誉`
            : '已解锁 30% 变现权限（月度上限 500 ASK）'
          }
        </p>
        <button
          className={vestingRemaining === 0 ? 'btn btn-primary' : 'btn btn-secondary'}
          onClick={handleVest}
          disabled={vestingRemaining > 0}
          style={{ width: '100%' }}
        >
          {vestingRemaining === 0 ? '申请变现' : `需 ${vestingRemaining} 声誉解锁`}
        </button>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-3)', textAlign: 'center' }}>
          宪法第二条：达到 1000 声誉后才可变现
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0, marginBottom: 'var(--space-4)', color: 'var(--color-text-primary)', fontSize: 'var(--text-lg)' }}>等级体系</h3>
        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          {LEVELS.map(item => (
            <div
              key={item.level}
              className="card"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-3)',
                background: levelInfo.level === item.level ? item.bg : 'var(--color-bg-surface)',
                borderColor: levelInfo.level === item.level ? item.color : 'var(--color-border)',
                borderWidth: levelInfo.level === item.level ? '2px' : '1px'
              }}
            >
              <div className="avatar avatar-sm" style={{ background: item.color, color: 'var(--color-text-inverse)' }}>
                L{item.level}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'var(--font-semibold)', color: 'var(--color-text-primary)' }}>{item.name}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>{item.req} → {item.perms}</div>
              </div>
              {levelInfo.level === item.level && (
                <span style={{ color: item.color, fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-sm)' }}>当前</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginTop: 'var(--space-4)' }}>
          错误: {error}
        </div>
      )}
    </div>
  )
}
