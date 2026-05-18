import React, { useState, useEffect } from 'react'
import '../styles/components.css'
import ContractService from '../services/ContractService.jsx'

export default function SkillBrowser({ user }) {
  const [skills, setSkills] = useState([])
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('reputation')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch skills from contract or show demo data
  useEffect(() => {
    async function fetchSkills() {
      setLoading(true)
      setError(null)

      try {
        // Try to fetch from contract
        const contractSkills = await ContractService.getSkills()

        if (contractSkills && contractSkills.length > 0) {
          setSkills(contractSkills)
        } else {
          // Fallback to demo data when contracts not deployed
          setSkills([
            { id: 1, name: 'email-sender', description: 'Send emails via AI', owner: '0x123...', verified: true, riskLevel: 0, likes: 120 },
            { id: 2, name: 'web-search', description: 'Search web via AI', owner: '0x456...', verified: true, riskLevel: 1, likes: 80 },
            { id: 3, name: 'calendar-helper', description: 'Manage calendar via AI', owner: '0x789...', verified: false, riskLevel: 0, likes: 40 },
          ])
        }
      } catch (err) {
        console.error('Error fetching skills:', err)
        setError(err.message)
        // Fallback to demo data
        setSkills([
          { id: 1, name: 'email-sender', description: 'Send emails via AI', owner: '0x123...', verified: true, riskLevel: 0, likes: 120 },
          { id: 2, name: 'web-search', description: 'Search web via AI', owner: '0x456...', verified: true, riskLevel: 1, likes: 80 },
          { id: 3, name: 'calendar-helper', description: 'Manage calendar via AI', owner: '0x789...', verified: false, riskLevel: 0, likes: 40 },
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchSkills()
  }, [user?.address])

  // Like a skill (calls contract when available)
  const handleLike = async (skillId) => {
    if (!user) return alert('请先注册')
    if (user.dailyLikes >= 5) return alert('每日限制: 5 次点赞 (宪法第二条)')

    try {
      // Try contract call first
      if (ContractService.isInitialized()) {
        const result = await ContractService.likeSkill(skillId)
        if (result.success) {
          // Update local state
          setSkills(skills.map(s =>
            s.id === skillId ? { ...s, likes: s.likes + 1 } : s
          ))
          user.dailyLikes++
          user.reputation += 2
          return
        } else {
          alert('交易失败: ' + result.error)
          return
        }
      }

      // Fallback to local update for demo mode
      const skill = skills.find(s => s.id === skillId)
      if (skill?.verified === false) {
        alert('Warning: You liked an unverified skill!')
      }

      user.dailyLikes++
      user.reputation += 2
      setSkills(skills.map(s =>
        s.id === skillId ? { ...s, likes: s.likes + 1 } : s
      ))
    } catch (err) {
      console.error('Error liking skill:', err)
      alert('点赞失败')
    }
  }

  // Sort skills
  const sortedSkills = [...skills].sort((a, b) => {
    if (sortBy === 'reputation') {
      return (b.reputation || b.likes || 0) - (a.reputation || a.likes || 0)
    }
    return (b.likes || 0) - (a.likes || 0)
  })

  // Filter skills
  const filteredSkills = sortedSkills.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.description?.toLowerCase().includes(search.toLowerCase())
  )

  // Dynamic styles that depend on data
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
    const labels = {
      0: 'LOW',
      1: 'MEDIUM',
      2: 'HIGH',
      3: 'CRITICAL'
    }
    return labels[level] || 'LOW'
  }

  // Loading state
  if (loading) {
    return (
      <div className="container" style={{ padding: 'var(--space-5)' }}>
        <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: 'var(--space-6)' }}>
          加载技能中...
        </div>
      </div>
    )
  }

  return (
    <div className="container" style={{ padding: 'var(--space-5)' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '20px', color: 'var(--color-text-primary)' }}>
        技能浏览器
      </h2>

      {/* Contract status indicator */}
      {ContractService.isInitialized() && (
        <div className="badge badge-success" style={{ marginBottom: 'var(--space-4)' }}>
          已连接到合约
        </div>
      )}

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

      {/* Empty state when no skills */}
      {filteredSkills.length === 0 && !loading ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          {skills.length === 0 ? '暂无技能。部署合约后可查看。' : '没有找到匹配的技能'}
        </div>
      ) : (
        /* 技能列表 */
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          {filteredSkills.map(skill => (
            <div key={skill.id} className="card-skill">
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                  <h3 style={{ margin: 0, fontSize: 'var(--text-lg)', color: 'var(--color-text-primary)' }}>
                    {skill.verified && <span className="badge-verified" style={{ marginRight: 'var(--space-1)' }}>V</span>}
                    {skill.name}
                  </h3>
                  <span className={`badge ${getRiskBadgeClass(skill.riskLevel)}`}>
                    {getRiskLabel(skill.riskLevel)}
                  </span>
                </div>
                <p style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-3) 0', fontSize: 'var(--text-sm)' }}>
                  {skill.description}
                </p>
                <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                  <span>声誉: {skill.reputation || skill.likes || 0}</span>
                  <span>点赞: {skill.likes || 0}</span>
                  <span>创建者: {typeof skill.owner === 'string' ? skill.owner.slice(0, 8) + '...' : skill.creator || 'unknown'}</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)' }}>
                <button
                  className={!skill.verified ? 'btn btn-danger' : (!user || user.dailyLikes >= 5) ? 'btn btn-secondary' : 'btn btn-primary'}
                  onClick={() => handleLike(skill.id)}
                  disabled={!user || user.dailyLikes >= 5}
                  aria-label={`Like skill ${skill.name}`}
                >
                  {!skill.verified ? '[!] 未验证' : `[+] 点赞 (${user?.dailyLikes || 0}/5)`}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="card" style={{ marginTop: 'var(--space-4)', background: 'var(--color-danger-light)' }}>
          <p style={{ color: 'var(--color-danger)', margin: 0 }}>错误: {error}</p>
        </div>
      )}
    </div>
  )
}