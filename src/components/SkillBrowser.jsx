import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import ChainDataService from '../services/ChainDataService.js'

export default function SkillBrowser({ user, onUpload }) {
  const { t } = useTranslation()
  const [skills, setSkills] = useState([])
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('reputation')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [fromChain, setFromChain] = useState(false)

  const demoSkills = [
    { id: 1, name: 'email-sender', description: t('browser.demoSkills.emailSender'), owner: '0x1234...abcd', verified: true, riskLevel: 0, likes: 120, reputation: 340 },
    { id: 2, name: 'web-search', description: t('browser.demoSkills.webSearch'), owner: '0x5678...efab', verified: true, riskLevel: 1, likes: 80, reputation: 210 },
    { id: 3, name: 'calendar-helper', description: t('browser.demoSkills.calendarHelper'), owner: '0x9abc...1234', verified: false, riskLevel: 0, likes: 40, reputation: 95 },
  ]

  useEffect(() => {
    async function loadSkills() {
      setLoading(true)
      setError(null)

      try {
        // 经后端网关读取 ChainMaker chain1 真链数据（Phase 28 / v2.0）
        const { skills: chainSkills } = await ChainDataService.fetchSkills({ page: 1, pageSize: 50 })
        if (chainSkills && chainSkills.length > 0) {
          setSkills(chainSkills)
          setFromChain(true)
        } else {
          setSkills(demoSkills)
          setFromChain(false)
        }
      } catch (err) {
        console.error('Error fetching skills:', err)
        setError(err.message)
        setSkills(demoSkills)
        setFromChain(false)
      } finally {
        setLoading(false)
      }
    }

    loadSkills()
  }, [user?.address])

  const handleLike = async (skillId) => {
    if (!user) return alert(t('common.loginRequired'))
    if (user.dailyLikes >= 5) return alert(t('browser.dailyLimit'))

    try {
      // chain1 无链上点赞概念（无代币宪法）：本地乐观更新仅作产品机制演示
      const skill = skills.find(s => s.id === skillId)
      // 未验证技能（审核中/未上架）不可点赞：提示后直接返回，绝不执行点赞逻辑
      if (!skill?.verified) {
        alert(t('common.unverifiedSkillWarning'))
        return
      }

      user.dailyLikes++
      user.reputation += 2
      setSkills(skills.map(s =>
        s.id === skillId ? { ...s, likes: (s.likes || 0) + 1 } : s
      ))
    } catch (err) {
      console.error('Error liking skill:', err)
      alert(t('browser.likeFailed'))
    }
  }

  const sortedSkills = [...skills].sort((a, b) => {
    if (sortBy === 'reputation') {
      return (b.reputation || b.likes || 0) - (a.reputation || a.likes || 0)
    }
    return (b.likes || 0) - (a.likes || 0)
  })

  const filteredSkills = sortedSkills.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.description?.toLowerCase().includes(search.toLowerCase())
  )

  const getRiskBadgeClass = (level) => {
    const classes = {
      0: 'badge-risk-low',
      1: 'badge-risk-medium',
      2: 'badge-risk-high',
      3: 'badge-risk-critical'
    }
    return classes[level] || 'badge-risk-low'
  }

  const getRiskLabel = (level) => {
    const keys = { 0: 'low', 1: 'medium', 2: 'high', 3: 'critical' }
    return t(`browser.riskLevels.${keys[level] || 'low'}`)
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading-state">
          <div className="loading-spinner" />
          <span>{t('common.loading')}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container animate-fade-in">
      <div className="page-header">
        <h2 className="page-title">{t('browser.title')}</h2>
        <p className="page-subtitle">{t('browser.subtitle')}</p>
      </div>

      {fromChain && (
        <div className="badge badge-success" style={{ marginBottom: 'var(--space-4)' }}>
          {t('browser.stats.verified')}
        </div>
      )}

      <div className="toolbar">
        <input
          className="input input-search"
          placeholder={t('browser.searchPlaceholder')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: '200px' }}
        />
        <div className="toolbar-spacer" />
        <button className="btn btn-primary" onClick={onUpload}>
          {t('nav.uploadSkill')}
        </button>
        <select
          className="input"
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          style={{ minWidth: '180px' }}
        >
          <option value="reputation">{t('browser.sortOptions.reputation')}</option>
          <option value="likes">{t('browser.sortOptions.likes')}</option>
        </select>
      </div>

      {filteredSkills.length === 0 && !loading ? (
        <div className="card empty-state">
          {skills.length === 0 ? t('browser.empty') : t('browser.empty')}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          {filteredSkills.map(skill => {
            const canLike = user && (user.dailyLikes || 0) < 5
            return (
              <div key={skill.id} className="card-skill">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: 'var(--text-lg)', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      {skill.verified && <span className="badge-verified">V</span>}
                      {skill.name}
                    </h3>
                    <span className={`badge ${getRiskBadgeClass(skill.riskLevel)}`}>
                      {getRiskLabel(skill.riskLevel)}
                    </span>
                  </div>
                  <p style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-3) 0', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
                    {skill.description}
                  </p>
                  <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', flexWrap: 'wrap' }}>
                    <span>{t('profile.reputation')}: {skill.reputation || skill.likes || 0}</span>
                    <span>{t('browser.likes')}: {skill.likes || 0}</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>
                      {t('leaderboard.address')}: {typeof skill.owner === 'string' ? skill.owner.slice(0, 10) + '...' : skill.creator || 'unknown'}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--space-2)', flexShrink: 0 }}>
                  {!skill.verified ? (
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled
                      title={t('common.unverifiedSkillWarning')}
                      aria-label={`Skill ${skill.name} under review`}
                    >
                      {t('browser.stats.pending')}
                    </button>
                  ) : (
                    <button
                      className={canLike ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                      onClick={() => handleLike(skill.id)}
                      disabled={!canLike}
                      aria-label={`Like skill ${skill.name}`}
                    >
                      {`${t('browser.like')} (${user?.dailyLikes || 0}/5)`}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {error && (
        <div className="alert alert-danger" style={{ marginTop: 'var(--space-4)' }}>
          {t('common.error')}: {error}
        </div>
      )}
    </div>
  )
}
