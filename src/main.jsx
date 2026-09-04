import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { useTranslation } from 'react-i18next'
import SkillBrowser from './components/SkillBrowser'
import UserProfile from './pages/UserProfile'
import Leaderboard from './pages/Leaderboard'
import ProtocolDemo from './pages/ProtocolDemo'
import DeployerDashboard from './pages/DeployerDashboard'
import SelfOpsPanel from './pages/SelfOpsPanel'
import LandingPage from './pages/LandingPage'
import LanguageSwitcher from './components/LanguageSwitcher'
import WalletService from './services/WalletService'
import './i18n'
import './styles/components.css'
import './styles/enhanced.css'

function App() {
  const { t } = useTranslation()
  const [user, setUser] = useState(null)
  const [page, setPage] = useState('start')
  const [demoTab, setDemoTab] = useState('standard')

  useEffect(() => {
    // 初始化钱包（宪法第二条：低摩擦参与）
    WalletService.init().then(setUser)
  }, [])

  const navItems = [
    { id: 'start', label: t('nav.start') },
    { id: 'browser', label: t('nav.browser') },
    { id: 'demo', label: t('nav.demo') },
    { id: 'leaderboard', label: t('nav.leaderboard') },
    ...(user ? [
      { id: 'dashboard', label: t('nav.dashboard') },
      { id: 'selfops', label: t('nav.selfops') },
      { id: 'profile', label: `${t('nav.profile')} (${user.reputation || 0})` }
    ] : [])
  ]

  const goToUpload = (tab = 'register') => {
    setDemoTab(tab)
    setPage('demo')
  }

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
                onClick={() => {
                  if (item.id === 'demo') setDemoTab('standard')
                  setPage(item.id)
                }}
                aria-current={page === item.id ? 'page' : undefined}
              >
              {item.label}
            </button>
          ))}
          <button
            className="btn btn-primary btn-sm upload-skill-nav-btn"
            onClick={() => goToUpload('register')}
            aria-label={t('nav.uploadSkill')}
          >
            {t('nav.uploadSkill')}
          </button>
          <LanguageSwitcher />
        </nav>
      </div>
    </header>

      <main className="app-main">
        {page === 'start' && <LandingPage onStart={setPage} onUpload={() => goToUpload('register')} />}
        {page === 'browser' && <SkillBrowser user={user} onUpload={() => goToUpload('register')} />}
        {page === 'demo' && <ProtocolDemo initialTab={demoTab} />}
        {page === 'leaderboard' && <Leaderboard />}
        {page === 'dashboard' && <DeployerDashboard user={user} />}
        {page === 'selfops' && <SelfOpsPanel user={user} deployerStats={user?.deployerStats} />}
        {page === 'profile' && <UserProfile user={user} />}
      </main>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
