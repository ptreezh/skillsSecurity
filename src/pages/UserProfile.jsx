import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import ContractService from '../services/ContractService.jsx'

const getLevel = (rep, levels) => {
  if (rep >= 5000) return levels[4]
  if (rep >= 2000) return levels[3]
  if (rep >= 500) return levels[2]
  if (rep >= 100) return levels[1]
  return levels[0]
}

export default function UserProfile({ user }) {
  const { t } = useTranslation()
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const levels = [
    { level: 1, name: t('profile.levelNames.observer'), req: t('profile.levelReq.observer'), perms: t('profile.levelPerms.observer'), color: 'var(--color-gray-500)', bg: 'var(--color-gray-100)' },
    { level: 2, name: t('profile.levelNames.contributor'), req: t('profile.levelReq.contributor'), perms: t('profile.levelPerms.contributor'), color: 'var(--color-success)', bg: 'var(--color-success-light)' },
    { level: 3, name: t('profile.levelNames.trusted'), req: t('profile.levelReq.trusted'), perms: t('profile.levelPerms.trusted'), color: 'var(--color-primary)', bg: 'var(--color-primary-light)' },
    { level: 4, name: t('profile.levelNames.guardian'), req: t('profile.levelReq.guardian'), perms: t('profile.levelPerms.guardian'), color: 'var(--color-purple-600)', bg: 'var(--color-purple-100)' },
    { level: 5, name: t('profile.levelNames.elder'), req: t('profile.levelReq.elder'), perms: t('profile.levelPerms.elder'), color: 'var(--color-warning)', bg: 'var(--color-warning-light)' }
  ]

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
          {t('profile.notSignedIn')}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading-state">
          <div className="loading-spinner" />
          <span>{t('profile.loading')}</span>
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
  const levelInfo = getLevel(effectiveRep, levels)
  const userRank = Math.max(1, Math.floor(10000 / (effectiveRep + 1)))
  const vestingProgress = Math.min((effectiveRep / 1000) * 30, 100)
  const vestingRemaining = Math.max(0, 1000 - effectiveRep)

  const handleVest = () => {
    if (effectiveRep < 1000) {
      alert(t('profile.vesting.requirement', { current: effectiveRep }))
      return
    }
    alert(t('profile.vesting.applied'))
  }

  return (
    <div className="container animate-fade-in">
      <div className="page-header">
        <h2 className="page-title">{t('profile.title')}</h2>
        <p className="page-subtitle">{t('profile.subtitle')}</p>
      </div>

      {profile.fromContract && (
        <div className="badge badge-success" style={{ marginBottom: 'var(--space-4)' }}>
          {t('profile.connectedToContract')}
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
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>{t('profile.reputationPoints')}</div>
          <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-primary)' }}>{effectiveRep}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-1)' }}>{t('profile.nonTransferable')}</div>
        </div>

        <div className="card stat" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>{t('profile.globalRank')}</div>
          <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-success)' }}>#{userRank}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-1)' }}>{t('profile.constitutionArticle3')}</div>
        </div>

        <div className="card stat" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>{t('profile.dailyLikes')}</div>
          <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-text-primary)' }}>{user.dailyLikes || 0} / 5</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-1)' }}>{t('profile.freeQuota')}</div>
        </div>

        <div className="card stat" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>{t('profile.walletBalance')}</div>
          <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-warning)' }}>{user.balance || 0}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-1)' }}>ASK</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <h3 style={{ marginTop: 0, marginBottom: 'var(--space-4)', color: 'var(--color-text-primary)', fontSize: 'var(--text-lg)' }}>{t('profile.vesting.title')}</h3>
        <div className="progress" style={{ marginBottom: 'var(--space-3)' }}>
          <div className="progress-bar" style={{ width: `${vestingProgress}%` }} />
        </div>
        <p style={{ color: vestingRemaining > 0 ? 'var(--color-warning)' : 'var(--color-success)', margin: '0 0 var(--space-4) 0' }}>
          {vestingRemaining > 0
            ? t('profile.vesting.remaining', { count: vestingRemaining })
            : t('profile.vesting.unlocked')
          }
        </p>
        <button
          className={vestingRemaining === 0 ? 'btn btn-primary' : 'btn btn-secondary'}
          onClick={handleVest}
          disabled={vestingRemaining > 0}
          style={{ width: '100%' }}
        >
          {vestingRemaining === 0 ? t('profile.vesting.apply') : t('profile.vesting.locked', { count: vestingRemaining })}
        </button>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-3)', textAlign: 'center' }}>
          {t('profile.vesting.rule')}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0, marginBottom: 'var(--space-4)', color: 'var(--color-text-primary)', fontSize: 'var(--text-lg)' }}>{t('profile.levelSystem')}</h3>
        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          {levels.map(item => (
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
                <span style={{ color: item.color, fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-sm)' }}>{t('profile.current')}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginTop: 'var(--space-4)' }}>
          {t('profile.error')}{error}
        </div>
      )}
    </div>
  )
}
