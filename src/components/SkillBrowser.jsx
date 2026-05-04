import React, { useState, useEffect } from 'react'

// Task 0.5: SkillBrowser（宪法第三条：声誉优先排序）
export default function SkillBrowser({ user }) {
  const [skills, setSkills] = useState([])
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('reputation')

  useEffect(() => {
    // 模拟数据（宪法第三条：按声誉排序）
    const mockSkills = [
      { id: 1, name: 'email-sender', description: 'Send emails via AI', reputation: 5000, creator: '0x123...', verified: true, likes: 120, flagged: false },
      { id: 2, name: 'web-search', description: 'Search web via AI', reputation: 3000, creator: '0x456...', verified: true, likes: 80, flagged: false },
      { id: 3, name: 'calendar-helper', description: 'Manage calendar via AI', reputation: 1500, creator: '0x789...', verified: false, likes: 40, flagged: false },
    ]
    setSkills(mockSkills.sort((a, b) => b.reputation - a.reputation))
  }, [])

  const handleLike = (skillId) => {
    if (!user) return alert('Please register first')
    if (user.dailyLikes >= 5) return alert('Daily limit: 5 likes (宪法第二条）')
    
    // 宪法第三条：反噬机制
    const skill = skills.find(s => s.id === skillId)
    if (skill.flagged) {
      // 反噬：点赞有害技能 → 声誉 -5
      alert('Warning: You liked a flagged skill! Reputation -5')
      user.reputation -= 5
      return
    }
    
    // 正常点赞
    user.dailyLikes++
    user.reputation += 2
    setSkills(skills.map(s => 
      s.id === skillId ? { ...s, likes: s.likes + 1 } : s
    ))
  }

  const filteredSkills = skills.filter(s => 
    s.name.includes(search) || s.description.includes(search)
  )

  return (
    <div className="skill-browser">
      <div className="controls">
        <input 
          placeholder="搜索技能（宪法第二条：低摩擦）" 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
        />
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="reputation">按声誉排序（宪法第三条）</option>
          <option value="likes">按点赞数</option>
        </select>
      </div>
      
      <div className="skill-list">
        {filteredSkills.map(skill => (
          <div key={skill.id} className="skill-card">
            <h3>{skill.name} {skill.verified && '✅'}</h3>
            <p>{skill.description}</p>
            <div className="meta">
              <span>声誉: {skill.reputation}</span>
              <span>点赞: {skill.likes}</span>
              <span>等级: {skill.verified ? '守护者' : '普通'}</span>
            </div>
            <button 
              onClick={() => handleLike(skill.id)}
              disabled={user?.dailyLikes >= 5}
            >
              点赞 ({user?.dailyLikes || 0}/5 免费）
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
