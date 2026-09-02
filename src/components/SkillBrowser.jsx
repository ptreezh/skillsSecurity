import React, { useState, useEffect } from 'react'
import ContractService from '../services/ContractService.jsx'

export default function SkillBrowser({ user }) {
  const [skills, setSkills] = useState([])
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('reputation')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const demoSkills = [
    { id: 1, name: 'email-sender', description: '通过 AI 代理发送邮件，支持模板与收件人管理', owner: '0x1234...abcd', verified: true, riskLevel: 0, likes: 120, reputation: 340 },
    { id: 2, name: 'web-search', description: '使用 AI 进行网络搜索并汇总结果', owner: '0x5678...efab', verified: true, riskLevel: 1, likes: 80, reputation: 210 },
    { id: 3, name: 'calendar-helper', description: '管理日程安排、提醒与会议预订', owner: '0x9abc...1234', verified: false, riskLevel: 0, likes: 40, reputation: 95 },
  ]

  useEffect(() => {
    async function fetchSkills() {
      setLoading(true)
      setError(null)

      try {
        const contractSkills = await ContractService.getSkills()
        if (contractSkills && contractSkills.length > 0) {
          setSkills(contractSkills)
        } else {
          setSkills(demoSkills)
        }
      } catch (err) {
        console.error('Error fetching skills:', err)
        setError(err.message)
        setSkills(demoSkills)
      } finally {
        setLoading(false)
      }
    }

    fetchSkills()
  }, [user?.address])

  const handleLike = async (skillId) => {
    if (!user) return alert('请先注册')
    if (user.dailyLikes >= 5) return alert('每日限制: 5 次点赞 (宪法第二条)')

    try {
      if (ContractService.isInitialized()) {
        const result = await ContractService.likeSkill(skillId)
        if (result.success) {
          setSkills(skills.map(s =>
            s.id === skillId ? { ...s, likes: (s.likes || 0) + 1 } : s
          ))
          user.dailyLikes++
          user.reputation += 2
          return
        } else {
          alert('交易失败: ' + result.error)
          return
        }
      }

      const skill = skills.find(s => s.id === skillId)
      if (skill?.verified === false) {
        alert('Warning: You liked an unverified skill!')
      }

      user.dailyLikes++
      user.reputation += 2
      setSkills(skills.map(s =>
        s.id === skillId ? { ...s, likes: (s.likes || 0) + 1 } : s
      ))
    } catch (err) {
      console.error('Error liking skill:', err)
      alert('点赞失败')
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
    const labels = { 0: 'LOW', 1: 'MEDIUM', 2: 'HIGH', 3: 'CRITICAL' }
    return labels[level] || 'LOW'
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading-state">
          <div className="loading-spinner" />
          <span>加载技能中...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container animate-fade-in">
      <div className="page-header">
        <h2 className="page-title">技能浏览器</h2>
        <p className="page-subtitle">探索社区技能，按声誉排序（宪法第三条）</p>
      </div>

      {ContractService.isInitialized() && (
        <div className="badge badge-success" style={{ marginBottom: 'var(--space-4)' }}>
          已连接到合约
        </div>
      )}

      <div className="toolbar">
        <input
          className="input input-search"
          placeholder="搜索技能..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: '200px' }}
        />
        <div className="toolbar-spacer" />
        <select
          className="input"
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          style={{ minWidth: '180px' }}
        >
          <option value="reputation">按声誉排序</option>
          <option value="likes">按点赞数</option>
        </select>
      </div>

      {filteredSkills.length === 0 && !loading ? (
        <div className="card empty-state">
          {skills.length === 0 ? '暂无技能。部署合约后可查看。' : '没有找到匹配的技能'}
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
                    <span>声誉: {skill.reputation || skill.likes || 0}</span>
                    <span>点赞: {skill.likes || 0}</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>
                      创建者: {typeof skill.owner === 'string' ? skill.owner.slice(0, 10) + '...' : skill.creator || 'unknown'}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--space-2)', flexShrink: 0 }}>
                  <button
                    className={!skill.verified ? 'btn btn-danger btn-sm' : canLike ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                    onClick={() => handleLike(skill.id)}
                    disabled={!canLike}
                    aria-label={`点赞技能 ${skill.name}`}
                  >
                    {!skill.verified ? '未验证' : `点赞 (${user?.dailyLikes || 0}/5)`}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {error && (
        <div className="alert alert-danger" style={{ marginTop: 'var(--space-4)' }}>
          错误: {error}
        </div>
      )}
    </div>
  )
}
