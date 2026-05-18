import React, { useState, useEffect } from 'react'
import '../styles/components.css'
import ContractService from '../services/ContractService.jsx'

export default function UserProfile({ user }) {
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch user profile from contract
  useEffect(() => {
    async function fetchProfile() {
      if (!user?.address) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        // Try to fetch from contract
        if (ContractService.isInitialized()) {
          const [reputation, stakes, effective, locked] = await Promise.all([
            ContractService.getReputation(user.address),
            ContractService.getStakes(user.address),
            ContractService.getEffectiveReputation(user.address),
            ContractService.getLockedReputation(user.address)
          ])

          setUserProfile({
            reputation,
            stakes,
            effective,
            locked,
            fromContract: true
          })
        } else {
          // Fallback to local user data
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
        // Fallback to local user data
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

  if (!user) return (
    <div className="container" style={{ padding: 'var(--space-5)' }}>
      <div style={{ background: 'var(--color-warning-light)', padding: 'var(--space-6)', borderRadius: 'var(--radius-lg)', textAlign: 'center', color: '#92400e' }}>
        请先注册（宪法第二条：低摩擦）
      </div>
    </div>
  )

  // Loading state
  if (loading) {
    return (
      <div className="container" style={{ padding: 'var(--space-5)' }}>
        <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: 'var(--space-6)' }}>
          加载用户资料中...
        </div>
      </div>
    )
  }

  const profile = userProfile || { reputation: user.reputation, effective: user.reputation, stakes: [], locked: { lockedAmount: 0, lastClaimTime: 0 }, fromContract: false }
  const effectiveRep = profile.effective || profile.reputation || 0

  const getLevel = (rep) => {
    if (rep >= 5000) return { level: 5, name: '长者', color: '#d97706', bg: '#fef3c7' }
    if (rep >= 2000) return { level: 4, name: '守护者', color: '#7c3aed', bg: '#f3e8ff' }
    if (rep >= 500) return { level: 3, name: '信用者', color: '#2563eb', bg: '#dbeafe' }
    if (rep >= 100) return { level: 2, name: '贡献者', color: '#16a34a', bg: '#dcfce7' }
    return { level: 1, name: '观察员', color: '#64748b', bg: '#f1f5f9' }
  }

  const levelInfo = getLevel(effectiveRep)
  const userRank = Math.max(1, Math.floor(10000 / (effectiveRep + 1)))
  const vestingProgress = Math.min((effectiveRep / 1000) * 30, 100)

  const handleVest = () => {
    if (effectiveRep < 1000) {
      alert(`需声誉 >= 1000 才可变现（当前：${effectiveRep}）\n宪法第二条：渐进变现`)
      return
    }
    alert(`变现申请已提交！\n可提取：30%（月度上限 500 ASK）\n宪法第二条：防早期 rush`)
  }

  return (
    <div className="container" style={{ padding: 'var(--space-5)' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: 'var(--space-5)', color: 'var(--color-text-primary)' }}>
        用户声誉中心
      </h2>

      {/* Contract status indicator */}
      {profile.fromContract && (
        <div className="badge badge-success" style={{ marginBottom: 'var(--space-4)' }}>
          已连接到合约
        </div>
      )}

      {/* User Info Card */}
      <div className="card" style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <div className="avatar" style={{
            background: levelInfo.bg,
            color: levelInfo.color
          }}>
            {user.address.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 style={{ margin: '0 0 var(--space-2) 0', color: 'var(--color-text-primary)', wordBreak: 'break-all', fontSize: 'var(--text-sm)' }}>
              {user.address}
            </h3>
            <span className={`badge badge-tier badge-tier-${levelInfo.level}`}>
              L{levelInfo.level} {levelInfo.name}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
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
          <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-bold)', color: '#f59e0b' }}>{user.balance || 0}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-1)' }}>ASK</div>
        </div>
      </div>

      {/* Vesting Progress Card */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <h3 style={{ marginTop: 0, marginBottom: 'var(--space-4)', color: '#475569' }}>变现进度</h3>
        <div className="progress" style={{ marginBottom: 'var(--space-3)' }}>
          <div className="progress-bar" style={{ width: `${vestingProgress}%` }} />
        </div>
        <p style={{ color: effectiveRep < 1000 ? '#92400e' : 'var(--color-success)', margin: '0 0 var(--space-4) 0' }}>
          {effectiveRep < 1000
            ? `距离解锁变现还需 ${1000 - effectiveRep} 声誉`
            : '已解锁 30% 变现权限（月度上限 500 ASK）'
          }
        </p>
        <button
          className={effectiveRep >= 1000 ? 'btn btn-primary' : 'btn btn-secondary'}
          onClick={handleVest}
          disabled={effectiveRep < 1000}
          style={{ width: '100%' }}
        >
          {effectiveRep >= 1000 ? '申请变现' : `需 ${1000 - effectiveRep} 声誉解锁`}
        </button>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-3)', textAlign: 'center' }}>
          宪法第二条：达到 1000 声誉后才可变现
        </div>
      </div>

      {/* Level System Card */}
      <div className="card">
        <h3 style={{ marginTop: 0, marginBottom: 'var(--space-4)', color: '#475569' }}>等级体系</h3>
        <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
          {[
            { level: 1, name: '观察员', req: '邮箱验证', perms: '只积累声誉', color: '#64748b', bg: '#f1f5f9' },
            { level: 2, name: '贡献者', req: '完成3次行为', perms: '创建/改进/测试', color: '#16a34a', bg: '#dcfce7' },
            { level: 3, name: '信用者', req: '声誉>=500', perms: '全功能+30%变现', color: '#2563eb', bg: '#dbeafe' },
            { level: 4, name: '守护者', req: '声誉>=2000', perms: '审计/仲裁+70%变现', color: '#7c3aed', bg: '#f3e8ff' },
            { level: 5, name: '长者', req: '声誉>=5000', perms: '治理投票+90%变现', color: '#d97706', bg: '#fef3c7' }
          ].map(item => (
            <div
              key={item.level}
              className="card"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-3)',
                background: levelInfo.level === item.level ? item.bg : 'transparent',
                border: levelInfo.level === item.level ? `2px solid ${item.color}` : '1px solid var(--color-border)'
              }}
            >
              <div className="avatar avatar-sm" style={{
                background: item.color,
                color: '#fff'
              }}>
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

      {/* Error display */}
      {error && (
        <div className="card" style={{ marginTop: 'var(--space-4)', background: 'var(--color-danger-light)' }}>
          <p style={{ color: 'var(--color-danger)', margin: 0 }}>错误: {error}</p>
        </div>
      )}
    </div>
  )
}