import React, { useState } from 'react'

// Task 0.7: UserProfile（宪法第二条：渐进变现，声誉 ≥ 1000 才可变现）
export default function UserProfile({ user }) {
  const [vestingPercent, setVestingPercent] = useState(0)

  if (!user) return <div>请先注册（宪法第二条：低摩擦）</div>

  // 宪法第二条：声誉等级
  const getLevel = (rep) => {
    if (rep >= 5000) return { level: 4, name: '守护者', color: 'purple' }
    if (rep >= 1000) return { level: 3, name: '信用者', color: 'blue' }
    if (rep >= 100) return { level: 2, name: '贡献者', color: 'green' }
    return { level: 1, name: '观察员', color: 'gray' }
  }

  const levelInfo = getLevel(user.reputation)
  
  // 宪法第二条：变现进度（声誉 ≥ 1000 解锁 30%）
  const vestingProgress = Math.min((user.reputation / 1000) * 30, 100)

  const handleVest = () => {
    if (user.reputation < 1000) {
      alert(`需声誉 ≥ 1000 才可变现（当前：${user.reputation}）\n宪法第二条：渐进变现`)
      return
    }
    alert(`变现申请已提交！\n可提取：30%（月度上限 500 ASK）\n宪法第二条：防早期 rush`)
  }

  return (
    <div className="user-profile">
      <h2>用户声誉中心（宪法第二条）</h2>
      
      <div className="profile-card">
        <div className="avatar">{user.address.slice(0, 2).toUpperCase()}</div>
        <div className="info">
          <h3>{user.address}</h3>
          <span className={`level level-${levelInfo.level}`} style={{ color: levelInfo.color }}>
            等级 {levelInfo.level}：{levelInfo.name}
          </span>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <label>声誉积分（不可转让）</label>
          <value style={{ fontSize: '2rem', color: '#1890ff' }}>{user.reputation}</value>
          <small>宪法第二条：只积累不交易，类似 GitHub 星标</small>
        </div>

        <div className="stat">
          <label>全球排名</label>
          <value style={{ fontSize: '2rem', color: '#52c41a' }>#{Math.max(1, Math.floor(10000 / (user.reputation + 1))}</value>
          <small>宪法第三条：声誉优先排序</small>
        </div>

        <div className="stat">
          <label>今日点赞</label>
          <value style={{ fontSize: '2rem' }}>{user.dailyLikes || 0} / 5</value>
          <small>宪法第二条：每日 5 次免费</small>
        </div>

        <div className="stat">
          <label>钱包余额</label>
          <value style={{ fontSize: '2rem', color: '#faad14' }}>{user.balance || 0} ASK</value>
          <small>宪法第一条：代币激励代替现金</small>
        </div>
      </div>

      <div className="vesting-progress">
        <h3>变现进度（宪法第二条：渐进式）</h3>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${vestingProgress}%`, backgroundColor: '#1890ff' }}
          ></div>
        </div>
        <p>
          {user.reputation < 1000 
            ? `距离解锁变现还需 ${1000 - user.reputation} 声誉（宪法第二条）`
            : `✅ 已解锁 30% 变现权限（月度上限 500 ASK）`
          }
        </p>
        <button 
          onClick={handleVest}
          disabled={user.reputation < 1000}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: user.reputation >= 1000 ? '#1890ff' : '#d9d9d9',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: user.reputation >= 1000 ? 'pointer' : 'not-allowed'
          }}
        >
          {user.reputation >= 1000 ? '申请变现（30% 比例）' : `需 ${1000 - user.reputation} 声誉解锁`}
        </button>
        <small>宪法第二条：防早期 rush，达到 1000 声誉后才可变现</small>
      </div>

      <div className="level-info">
        <h3>等级体系（宪法第二条）</h3>
        <ul>
          <li className={levelInfo.level === 1 ? 'active' : ''}>L1 观察员（邮箱验证）→ 只积累声誉</li>
          <li className={levelInfo.level === 2 ? 'active' : ''}>L2 贡献者（完成 3 次有效行为）→ 创建/改进/测试</li>
          <li className={levelInfo.level === 3 ? 'active' : ''}>L3 信用者（声誉 ≥ 1000）→ 全功能 + 30% 变现</li>
          <li className={levelInfo.level === 4 ? 'active' : ''}>L4 守护者（声誉 ≥ 5000）→ 审计/仲裁 + 70% 变现</li>
        </ul>
      </div>
    </div>
  )
}
