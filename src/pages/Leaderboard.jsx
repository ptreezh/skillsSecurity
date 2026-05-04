import React, { useState, useEffect } from 'react'

// Task 0.8: Leaderboard（宪法第三条：声誉优先排序，类似 GitHub Trending）
export default function Leaderboard() {
  const [users, setUsers] = useState([])
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('reputation')

  useEffect(() => {
    // 模拟数据（宪法第三条：全球声誉排行榜）
    const mockUsers = [
      { address: '0x1234...', reputation: 5000, level: 4, skillsCreated: 15, totalLikes: 1200, flagged: 0 },
      { address: '0x5678...', reputation: 3000, level: 3, skillsCreated: 8, totalLikes: 800, flagged: 0 },
      { address: '0x9abc...', reputation: 1500, level: 3, skillsCreated: 5, totalLikes: 400, flagged: 0 },
      { address: '0xdef0...', reputation: 800, level: 2, skillsCreated: 3, totalLikes: 200, flagged: 0 },
      { address: '0x1111...', reputation: 300, level: 2, skillsCreated: 2, totalLikes: 100, flagged: 1 },
    ]
    
    // 宪法第三条：按声誉排序（默认）
    const sorted = sortBy === 'reputation' 
      ? mockUsers.sort((a, b) => b.reputation - a.reputation)
      : mockUsers.sort((a, b) => b.totalLikes - a.totalLikes)
    
    setUsers(sorted)
  }, [sortBy])

  const filteredUsers = filter === 'all' 
    ? users 
    : filter === 'verified' 
      ? users.filter(u => u.level >= 3) 
      : users.filter(u => u.level < 3)

  return (
    <div className="leaderboard">
      <h2>全球声誉排行榜（宪法第三条：声誉优先）</h2>
      <p>类似 GitHub Trending，按声誉积分排序（不可转让）</p>

      <div className="controls">
        <button onClick={() => setSortBy('reputation')}>
          按声誉排序 {sortBy === 'reputation' && '✅'}
        </button>
        <button onClick={() => setSortBy('likes')}>
          按点赞数排序 {sortBy === 'likes' && '✅'}
        </button>
        
        <select value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">全部</option>
          <option value="verified">守护者/信用者（L3+）</option>
          <option value="normal">观察员/贡献者（L1-2）</option>
        </select>
      </div>

      <div className="leaderboard-list">
        <div className="header">
          <span>排名</span>
          <span>地址</span>
          <span>等级</span>
          <span>声誉积分</span>
          <span>创建技能</span>
          <span>获赞数</span>
          <span>状态</span>
        </div>

        {filteredUsers.map((user, index) => (
          <div key={user.address} className={`leaderboard-item ${index < 50 ? 'featured' : ''}`}>
            <span className="rank">
              {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
            </span>
            <span className="address">{user.address}</span>
            <span className={`level level-${user.level}`}>
              L{user.level} {user.level >= 3 ? '(守护者/信用者)' : '(观察员/贡献者)'}
            </span>
            <span className="reputation" style={{ fontWeight: 'bold', color: '#1890ff' }}>
              {user.reputation}
            </span>
            <span>{user.skillsCreated}</span>
            <span>{user.totalLikes}</span>
            <span>
              {user.flagged > 0 
                ? <span style={{ color: 'red' }>⚠️ 被标记 {user.flagged} 次</span>
                : <span style={{ color: 'green' }}>✅ 无违规</span>
              }
            </span>
            {index < 50 && <span className="badge">Featured（宪法第三条：流量倾斜）</span>}
          </div>
        ))}
      </div>

      <div className="summary">
        <p>宪法第三条：前 50 名获得"推荐位"，平台首页展示，流量倾斜</p>
        <p>宪法第二条：声誉积分不可转让，只积累不交易（类似 GitHub 星标）</p>
        <p>当前展示：{filteredUsers.length} 名用户（宪法第三条：全球声誉排行榜）</p>
      </div>
    </div>
  )
}
