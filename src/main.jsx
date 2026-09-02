import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import SkillBrowser from './components/SkillBrowser'
import UserProfile from './pages/UserProfile'
import Leaderboard from './pages/Leaderboard'
import ProtocolDemo from './pages/ProtocolDemo'
import DeployerDashboard from './pages/DeployerDashboard'
import SelfOpsPanel from './pages/SelfOpsPanel'
import WalletService from './services/WalletService'
import './styles/components.css'
import './styles/enhanced.css'

function App() {
  const [user, setUser] = useState(null)
  const [page, setPage] = useState('browser')

  useEffect(() => {
    // 初始化钱包（宪法第二条：低摩擦参与）
    WalletService.init().then(setUser)
  }, [])

  const navItems = [
    { id: 'browser', label: '技能浏览器' },
    { id: 'demo', label: '协议演示' },
    { id: 'leaderboard', label: '排行榜' },
    ...(user ? [
      { id: 'dashboard', label: '激励面板' },
      { id: 'selfops', label: '四自系统' },
      { id: 'profile', label: `我的声誉 (${user.reputation || 0})` }
    ] : [])
  ]

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-brand">
            <div className="app-brand-logo">A</div>
            <h1 className="app-brand-title">AgentSkills</h1>
          </div>
          <nav className="app-nav" aria-label="主导航">
            {navItems.map(item => (
              <button
                key={item.id}
                className={`app-nav-btn ${page === item.id ? 'active' : ''}`}
                onClick={() => setPage(item.id)}
                aria-current={page === item.id ? 'page' : undefined}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="app-main">
        {page === 'browser' && <SkillBrowser user={user} />}
        {page === 'demo' && <ProtocolDemo />}
        {page === 'leaderboard' && <Leaderboard />}
        {page === 'dashboard' && <DeployerDashboard user={user} />}
        {page === 'selfops' && <SelfOpsPanel user={user} deployerStats={user?.deployerStats} />}
        {page === 'profile' && <UserProfile user={user} />}
      </main>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
