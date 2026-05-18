import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import SkillBrowser from './components/SkillBrowser'
import UserProfile from './pages/UserProfile'
import Leaderboard from './pages/Leaderboard'
import ProtocolDemo from './pages/ProtocolDemo'
import DeployerDashboard from './pages/DeployerDashboard'
import WalletService from './services/WalletService'

function App() {
  const [user, setUser] = useState(null)
  const [page, setPage] = useState('browser')

  useEffect(() => {
    // 初始化钱包（宪法第二条：低摩擦参与）
    WalletService.init().then(setUser)
  }, [])

  return (
    <div className="app">
      <header>
        <h1>AgentSkills</h1>
        <nav>
          <button onClick={() => setPage('browser')}>技能浏览器</button>
          <button onClick={() => setPage('demo')}>协议演示</button>
          <button onClick={() => setPage('leaderboard')}>排行榜</button>
          {user && <button onClick={() => setPage('dashboard')}>激励面板</button>}
          {user && <button onClick={() => setPage('profile')}>我的声誉 ({user.reputation})</button>}
        </nav>
      </header>

      {page === 'browser' && <SkillBrowser user={user} />}
      {page === 'demo' && <ProtocolDemo />}
      {page === 'leaderboard' && <Leaderboard />}
      {page === 'dashboard' && <DeployerDashboard user={user} />}
      {page === 'profile' && <UserProfile user={user} />}
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
