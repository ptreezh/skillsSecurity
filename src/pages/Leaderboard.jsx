import React, { useState, useEffect } from 'react'
import '../styles/components.css'
import ContractService from '../services/ContractService.jsx'

// Task 0.8: Leaderboard（宪法第三条：声誉优先排序，类似 GitHub Trending）
export default function Leaderboard() {
  const [users, setUsers] = useState([])
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('reputation')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true)
      setError(null)

      try {
        // Try to fetch from contract
        const leaderboardData = await ContractService.getLeaderboard()

        if (leaderboardData && leaderboardData.length > 0) {
          setUsers(leaderboardData)
        } else {
          // Fallback to demo data when contracts not deployed or indexer not available
          setUsers([
            { address: '0x1234...', reputation: 5000, level: 4, skillsCreated: 15, totalLikes: 1200, flagged: 0 },
            { address: '0x5678...', reputation: 3000, level: 3, skillsCreated: 8, totalLikes: 800, flagged: 0 },
            { address: '0x9abc...', reputation: 1500, level: 3, skillsCreated: 5, totalLikes: 400, flagged: 0 },
            { address: '0xdef0...', reputation: 800, level: 2, skillsCreated: 3, totalLikes: 200, flagged: 0 },
            { address: '0x1111...', reputation: 300, level: 2, skillsCreated: 2, totalLikes: 100, flagged: 1 },
          ])
        }
      } catch (err) {
        console.error('Error fetching leaderboard:', err)
        setError(err.message)
        // Fallback to demo data
        setUsers([
          { address: '0x1234...', reputation: 5000, level: 4, skillsCreated: 15, totalLikes: 1200, flagged: 0 },
          { address: '0x5678...', reputation: 3000, level: 3, skillsCreated: 8, totalLikes: 800, flagged: 0 },
          { address: '0x9abc...', reputation: 1500, level: 3, skillsCreated: 5, totalLikes: 400, flagged: 0 },
          { address: '0xdef0...', reputation: 800, level: 2, skillsCreated: 3, totalLikes: 200, flagged: 0 },
          { address: '0x1111...', reputation: 300, level: 2, skillsCreated: 2, totalLikes: 100, flagged: 1 },
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()
  }, [])

  // Sort users based on criteria
  const sortedUsers = sortBy === 'reputation'
    ? [...users].sort((a, b) => b.reputation - a.reputation)
    : [...users].sort((a, b) => b.totalLikes - a.totalLikes)

  // Filter users based on level
  const filteredUsers = filter === 'all'
    ? sortedUsers
    : filter === 'verified'
      ? sortedUsers.filter(u => u.level >= 3)
      : sortedUsers.filter(u => u.level < 3)

  const getTierBadgeClass = (level) => `badge-tier badge-tier-${level}`

  const getRankClass = (index) => {
    if (index === 0) return 'rank-gold'
    if (index === 1) return 'rank-silver'
    if (index === 2) return 'rank-bronze'
    return ''
  }

  const getRankLabel = (index) => {
    if (index === 0) return '[G]'
    if (index === 1) return '[S]'
    if (index === 2) return '[B]'
    return `#${index + 1}`
  }

  // Loading state
  if (loading) {
    return (
      <div className="container" style={{ padding: 'var(--space-5)' }}>
        <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: 'var(--space-6)' }}>
          加载排行榜中...
        </div>
      </div>
    )
  }

  return (
    <div className="container" style={{ padding: 'var(--space-5)' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: 'var(--space-2)', color: 'var(--color-text-primary)' }}>
        全球声誉排行榜（宪法第三条：声誉优先）
      </h2>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-5)', fontSize: 'var(--text-sm)' }}>
        类似 GitHub Trending，按声誉积分排序（不可转让）
      </p>

      {/* Contract status indicator */}
      {ContractService.isInitialized() && (
        <div className="badge badge-success" style={{ marginBottom: 'var(--space-4)' }}>
          已连接到合约
        </div>
      )}

      {/* 控制按钮 */}
      <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-4)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className={sortBy === 'reputation' ? 'btn btn-primary' : 'btn btn-secondary'}
            onClick={() => setSortBy('reputation')}
          >
            按声誉排序 {sortBy === 'reputation' && '[V]'}
          </button>
          <button
            className={sortBy === 'likes' ? 'btn btn-primary' : 'btn btn-secondary'}
            onClick={() => setSortBy('likes')}
          >
            按点赞数排序 {sortBy === 'likes' && '[V]'}
          </button>
          <select
            className="input"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{ marginLeft: 'auto', minWidth: '160px' }}
          >
            <option value="all">全部</option>
            <option value="verified">守护者/信用者（L3+）</option>
            <option value="normal">观察员/贡献者（L1-2）</option>
          </select>
        </div>
      </div>

      {/* Empty state */}
      {filteredUsers.length === 0 && !loading ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          暂无排行榜数据。部署合约后可查看。
        </div>
      ) : (
        <>
          {/* 排行榜列表 */}
          <div className="card" style={{ padding: 'var(--space-4)' }}>
            {/* 表头 */}
            <div className="table-header">
              <span>排名</span>
              <span>地址</span>
              <span>等级</span>
              <span style={{ textAlign: 'right' }}>声誉积分</span>
              <span style={{ textAlign: 'right' }}>创建技能</span>
              <span style={{ textAlign: 'right' }}>获赞数</span>
              <span>状态</span>
            </div>

            {/* 用户列表 */}
            {filteredUsers.map((user, index) => (
              <div key={user.address} className={`card-leaderboard${index < 3 ? ' top-3' : ''}${user.flagged > 0 ? ' flagged' : ''}`}>
                <span className={`rank-badge ${getRankClass(index)}`}>
                  {getRankLabel(index)}
                </span>
                <span style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}>{user.address}</span>
                <span>
                  <span className={getTierBadgeClass(user.level)}>
                    L{user.level}
                  </span>
                </span>
                <span style={{ textAlign: 'right', fontWeight: 'var(--font-bold)', color: 'var(--color-primary)' }}>{user.reputation}</span>
                <span style={{ textAlign: 'right', color: 'var(--color-text-secondary)' }}>{user.skillsCreated}</span>
                <span style={{ textAlign: 'right', color: 'var(--color-text-secondary)' }}>{user.totalLikes}</span>
                <span style={{ color: user.flagged > 0 ? 'var(--color-danger)' : 'var(--color-success)', fontSize: 'var(--text-sm)' }}>
                  {user.flagged > 0 ? `[!] 被标记 ${user.flagged} 次` : '[OK] 无违规'}
                </span>
              </div>
            ))}
          </div>

          {/* 底部说明 */}
          <div className="card" style={{ marginTop: 'var(--space-4)', padding: 'var(--space-4)' }}>
            <p style={{ margin: '0 0 var(--space-2) 0', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
              宪法第三条：前 3 名获得特殊标记 [G/S/B]，前 50 名获得"推荐位"，平台首页展示
            </p>
            <p style={{ margin: '0 0 var(--space-2) 0', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
              宪法第二条：声誉积分不可转让，只积累不交易（类似 GitHub 星标）
            </p>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
              当前展示：{filteredUsers.length} 名用户
            </p>
          </div>
        </>
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