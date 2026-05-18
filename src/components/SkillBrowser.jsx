import React, { useState, useEffect } from 'react'
import '../styles/components.css'

export default function SkillBrowser({ user }) {
  const [skills, setSkills] = useState([])
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('reputation')

  useEffect(() => {
    const mockSkills = [
      { id: 1, name: 'email-sender', description: 'Send emails via AI', reputation: 5000, creator: '0x123...', verified: true, likes: 120, flagged: false, riskLevel: 'LOW' },
      { id: 2, name: 'web-search', description: 'Search web via AI', reputation: 3000, creator: '0x456...', verified: true, likes: 80, flagged: false, riskLevel: 'MEDIUM' },
      { id: 3, name: 'calendar-helper', description: 'Manage calendar via AI', reputation: 1500, creator: '0x789...', verified: false, likes: 40, flagged: false, riskLevel: 'LOW' },
    ]
    setSkills(mockSkills.sort((a, b) => b.reputation - a.reputation))
  }, [])

  const handleLike = (skillId) => {
    if (!user) return alert('请先注册')
    if (user.dailyLikes >= 5) return alert('每日限制: 5 次点赞 (宪法第二条)')

    const skill = skills.find(s => s.id === skillId)
    if (skill?.flagged) {
      alert('Warning: You liked a flagged skill! Reputation -5')
      user.reputation -= 5
      return
    }

    user.dailyLikes++
    user.reputation += 2
    setSkills(skills.map(s =>
      s.id === skillId ? { ...s, likes: s.likes + 1 } : s
    ))
  }

  const filteredSkills = skills.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase())
  )

  // Dynamic styles that depend on data
  const getRiskBadgeClass = (level) => {
    const classes = {
      'LOW': 'badge-risk-low',
      'MEDIUM': 'badge-risk-medium',
      'HIGH': 'badge-risk-high',
      'CRITICAL': 'badge-risk-critical'
    }
    return classes[level] || 'badge-risk-low'
  }

  return (
    <div className="container" style={{ padding: 'var(--space-5)' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '20px', color: 'var(--color-text-primary)' }}>
        技能浏览器
      </h2>

      {/* 搜索和排序 */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        <input
          className="input"
          placeholder="搜索技能..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
        <select
          className="input"
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          style={{ minWidth: '200px' }}
        >
          <option value="reputation">按声誉排序（宪法第三条）</option>
          <option value="likes">按点赞数</option>
        </select>
      </div>

      {/* 技能列表 */}
      <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
        {filteredSkills.map(skill => (
          <div key={skill.id} className="card-skill">
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                <h3 style={{ margin: 0, fontSize: 'var(--text-lg)', color: 'var(--color-text-primary)' }}>
                  {skill.verified && <span className="badge-verified" style={{ marginRight: 'var(--space-1)' }}>✓</span>}
                  {skill.name}
                </h3>
                <span className={`badge ${getRiskBadgeClass(skill.riskLevel)}`}>
                  {skill.riskLevel}
                </span>
              </div>
              <p style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-3) 0', fontSize: 'var(--text-sm)' }}>
                {skill.description}
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                <span>声誉: {skill.reputation}</span>
                <span>点赞: {skill.likes}</span>
                <span>创建者: {skill.creator}</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)' }}>
              <button
                className={skill.flagged ? 'btn btn-danger' : (!user || user.dailyLikes >= 5) ? 'btn btn-secondary' : 'btn btn-primary'}
                onClick={() => handleLike(skill.id)}
                disabled={!user || user.dailyLikes >= 5}
                aria-label={`Like skill ${skill.name}`}
              >
                {skill.flagged ? '[!] 已标记' : `[+] 点赞 (${user?.dailyLikes || 0}/5)`}
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredSkills.length === 0 && (
        <div className="card" style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          没有找到匹配的技能
        </div>
      )}
    </div>
  )
}