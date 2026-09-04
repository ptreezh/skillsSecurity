import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { fullAuditFlow } from '../services/uploadService';
import WalletService from '../services/WalletService.js';
import {
  getSkills,
  getBalance,
  getReputation,
  getAddresses,
  isInitialized
} from '../services/ContractService.jsx';

/**
 * ProtocolDemo - 协议演示页
 * 展示 AgentSkills 协议的核心机制
 */
export default function ProtocolDemo({ initialTab = 'standard' }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [demoSkill, setDemoSkill] = useState({
    name: '',
    description: '',
    trigger: '',
    riskLevel: 'LOW'
  });
  const [fingerprint, setFingerprint] = useState(null);
  const [verificationStep, setVerificationStep] = useState(0);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const fileInputRef = useRef(null);

  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [liveSkills, setLiveSkills] = useState([]);
  const [userBalance, setUserBalance] = useState('0');
  const [userReputation, setUserReputation] = useState(0);
  const [contractAddresses, setContractAddresses] = useState({});
  const [isDemoMode, setIsDemoMode] = useState(true);

  useEffect(() => {
    initializeWallet();
    loadContractAddresses();
  }, []);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (walletConnected) {
      loadLiveData();
    }
  }, [walletConnected]);

  const initializeWallet = async () => {
    try {
      const user = await WalletService.init();
      if (user?.connected) {
        setWalletConnected(true);
        setWalletAddress(user.address);
        setIsDemoMode(false);
      }
    } catch (error) {
      console.log('Wallet init failed, using demo mode');
    }
  };

  const loadContractAddresses = async () => {
    try {
      const addresses = getAddresses();
      setContractAddresses(addresses);
      const hasContracts = Object.values(addresses).some(addr => addr !== null);
      setIsDemoMode(!hasContracts);
    } catch (error) {
      console.log('Failed to load contract addresses');
    }
  };

  const loadLiveData = async () => {
    if (!isInitialized()) return;

    try {
      const skills = await getSkills();
      setLiveSkills(skills.slice(0, 10));

      if (walletAddress) {
        const [balance, reputation] = await Promise.all([
          getBalance(walletAddress),
          getReputation(walletAddress)
        ]);
        setUserBalance(balance);
        setUserReputation(reputation);
      }
    } catch (error) {
      console.error('Failed to load live data:', error);
    }
  };

  const handleWalletConnect = async () => {
    try {
      const user = await WalletService.connect();
      if (user) {
        setWalletConnected(true);
        setWalletAddress(user.address);
        setIsDemoMode(!user.connected);
        await loadContractAddresses();
        await loadLiveData();
      }
    } catch (error) {
      console.error('Wallet connection failed:', error);
    }
  };

  const handleWalletDisconnect = () => {
    WalletService.disconnect();
    setWalletConnected(false);
    setWalletAddress(null);
    setIsDemoMode(true);
    setLiveSkills([]);
    setUserBalance('0');
    setUserReputation(0);
  };

  const riskLevelColors = {
    LOW: { color: 'var(--color-success)', bg: 'var(--color-success-light)' },
    MEDIUM: { color: 'var(--color-warning)', bg: 'var(--color-warning-light)' },
    HIGH: { color: 'var(--color-warning)', bg: 'var(--color-warning-light)' },
    CRITICAL: { color: 'var(--color-danger)', bg: 'var(--color-danger-light)' }
  };

  const riskLevels = (t('demo.risk.levels', { returnObjects: true }) || []).map(r => ({
    ...r,
    ...riskLevelColors[r.level]
  }));

  const computeFingerprint = (skill) => {
    const data = JSON.stringify(skill) + Date.now();
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return '0x' + Math.abs(hash).toString(16).padStart(64, '0');
  };

  const handleRegister = () => {
    if (!demoSkill.name || !demoSkill.description) {
      alert(t('demo.register.fillRequired'));
      return;
    }
    const fp = computeFingerprint(demoSkill);
    setFingerprint(fp);
    setVerificationStep(1);
  };

  const simulateVerification = () => {
    const steps = t('demo.fingerprint.steps', { returnObjects: true }) || [];
    if (verificationStep < steps.length) {
      setTimeout(() => {
        setVerificationStep(prev => prev + 1);
      }, 1500);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadStatus({ status: 'uploading', message: t('demo.status.uploading') });
    setUploadResult(null);

    try {
      const result = await fullAuditFlow(file, {
        onStatusChange: (status) => setUploadStatus(status),
        onComplete: (result) => setUploadResult(result),
        onError: (error) => setUploadStatus({ status: 'error', message: error.error })
      });
      setUploadResult(result);
    } catch (error) {
      setUploadStatus({ status: 'error', message: error.message });
    }
  };

  const tabs = [
    { id: 'live', label: t('demo.tabs.live') },
    { id: 'standard', label: t('demo.tabs.standard') },
    { id: 'risk', label: t('demo.tabs.risk') },
    { id: 'fingerprint', label: t('demo.tabs.fingerprint') },
    { id: 'antislas', label: t('demo.tabs.antislas') },
    { id: 'register', label: t('demo.tabs.register') },
    { id: 'freeskill', label: t('demo.tabs.freeskill') },
    { id: 'templates', label: t('demo.tabs.templates') }
  ];

  const sectionTitle = { marginTop: 0, marginBottom: 'var(--space-4)', color: 'var(--color-text-primary)', fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)' };

  const renderWalletCard = () => (
    <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h3 style={{ margin: '0 0 var(--space-1) 0', fontSize: 'var(--text-lg)', color: 'var(--color-text-primary)' }}>
            {t('wallet.status')}
          </h3>
          <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
            {isDemoMode ? t('wallet.demoMode') : walletConnected ? t('wallet.connected') : t('wallet.connect')}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {walletAddress && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </span>
          )}
          {!isDemoMode && (
            <button
              className={walletConnected ? 'btn btn-secondary btn-sm' : 'btn btn-primary btn-sm'}
              onClick={walletConnected ? handleWalletDisconnect : handleWalletConnect}
            >
              {walletConnected ? t('wallet.disconnect') : t('wallet.connect')}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderLiveStats = () => (
    <div className="grid-stats" style={{ marginBottom: 'var(--space-6)' }}>
      {[
        { label: t('wallet.balance'), value: userBalance, color: 'var(--color-primary)' },
        { label: t('profile.reputation'), value: userReputation, color: 'var(--color-success)' },
        { label: t('demo.live.onChainSkills'), value: liveSkills.length, color: 'var(--color-warning)' },
        { label: t('wallet.status'), value: isDemoMode ? t('wallet.demoMode') : walletConnected ? t('wallet.connected') : t('wallet.connect'), color: 'var(--color-text-primary)' }
      ].map((stat, i) => (
        <div key={i} className="card stat" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>{stat.label}</div>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', color: stat.color }}>{stat.value}</div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="container animate-fade-in">
      <div className="page-header">
        <h2 className="page-title">{t('demo.title')}</h2>
        <p className="page-subtitle">{t('demo.subtitle')}</p>
      </div>

      {renderWalletCard()}

      <div className="tabs" style={{
        display: 'flex',
        gap: 'var(--space-1)',
        borderBottom: '1px solid var(--color-border)',
        marginBottom: 'var(--space-6)',
        flexWrap: 'wrap'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={activeTab === tab.id ? 'app-nav-btn active' : 'app-nav-btn'}
            style={{
              borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
              marginBottom: '-1px',
              borderBottom: activeTab === tab.id ? '2px solid var(--color-primary)' : '2px solid transparent'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <main>
        {activeTab === 'live' && (
          <section className="animate-fade-in">
            <h2 style={sectionTitle}>{t('demo.live.title')}</h2>
            {renderLiveStats()}

            <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                <h3 style={{ margin: 0, fontSize: 'var(--text-lg)', color: 'var(--color-text-primary)' }}>{t('demo.live.skillList')}</h3>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={loadLiveData}
                  disabled={!walletConnected || isDemoMode}
                >
                  {t('demo.live.refresh')}
                </button>
              </div>

              {liveSkills.length > 0 ? (
                <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                  {liveSkills.map((skill, index) => (
                    <div key={index} className="card" style={{ padding: 'var(--space-4)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 'var(--space-2)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                        <div>
                          <div style={{ fontWeight: 'var(--font-semibold)', color: 'var(--color-text-primary)', marginBottom: 'var(--space-1)' }}>
                            {skill.name || `${t('demo.live.skill')} #${skill.id}`}
                          </div>
                          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{skill.description || t('demo.live.noDescription')}</div>
                        </div>
                        <span className={`badge ${skill.verified ? 'badge-success' : 'badge-warning'}`}>
                          {skill.verified ? t('browser.stats.verified') : t('browser.stats.pending')}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', flexWrap: 'wrap' }}>
                        <span>{t('browser.filters.riskLevel')}: {skill.riskLevel || 'LOW'}</span>
                        <span>{t('demo.live.stake')}: {skill.stakeAmount ? `${Number(skill.stakeAmount) / 1e18} ASK` : '0'}</span>
                        {skill.fingerprint && <span style={{ fontFamily: 'var(--font-mono)' }}>{skill.fingerprint.slice(0, 10)}...</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
                  <p>{isDemoMode ? t('demo.live.demoHint') : t('demo.live.noData')}</p>
                  {!walletConnected && (
                    <button className="btn btn-primary" onClick={handleWalletConnect}>
                      {t('wallet.connect')}
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="card" style={{ background: 'var(--color-primary-light)' }}>
              <h3 style={{ marginTop: 0, marginBottom: 'var(--space-4)', color: 'var(--color-text-primary)', fontSize: 'var(--text-lg)' }}>{t('demo.live.flow.title')}</h3>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                {[
                  { step: 1, label: t('demo.live.flow.create') },
                  { step: 2, label: t('demo.live.flow.risk') },
                  { step: 3, label: t('demo.live.flow.audit') },
                  { step: 4, label: t('demo.live.flow.stake') },
                  { step: 5, label: t('demo.live.flow.finish') }
                ].map((item, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'var(--color-primary)',
                      color: 'var(--color-text-inverse)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'var(--font-bold)',
                      fontSize: 'var(--text-sm)'
                    }}>
                      {item.step}
                    </div>
                    <div style={{
                      background: 'var(--color-bg-surface)',
                      padding: 'var(--space-2) var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-primary-200)',
                      fontWeight: 'var(--font-medium)',
                      color: 'var(--color-primary)',
                      fontSize: 'var(--text-sm)'
                    }}>
                      {item.label}
                    </div>
                    {index < 4 && <span style={{ color: 'var(--color-text-tertiary)' }}>→</span>}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'standard' && (
          <section className="animate-fade-in">
            <h2 style={sectionTitle}>{t('demo.standard.title')}</h2>
            <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
              <h3 style={{ marginTop: 0, marginBottom: 'var(--space-4)', color: 'var(--color-text-primary)', fontSize: 'var(--text-lg)' }}>{t('demo.standard.coreComponents')}</h3>
              <div className="grid-auto">
                {(t('demo.standard.components', { returnObjects: true }) || []).map((comp, i) => (
                  <div key={i} className="card" style={{ padding: 'var(--space-4)' }}>
                    <div style={{ fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-1)', color: 'var(--color-text-primary)' }}>{comp.name}</div>
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-3)' }}>{comp.desc}</div>
                    <span className={`badge badge-${comp.variant}`}>{comp.status}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ background: 'var(--color-primary-light)' }}>
              <h3 style={{ marginTop: 0, marginBottom: 'var(--space-4)', color: 'var(--color-text-primary)', fontSize: 'var(--text-lg)' }}>{t('demo.standard.protocolFeatures')}</h3>
              <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                {(t('demo.standard.features', { returnObjects: true }) || []).map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--color-primary)',
                      color: 'var(--color-text-inverse)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'var(--font-bold)',
                      fontSize: 'var(--text-xs)',
                      flexShrink: 0
                    }}>
                      {i + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: 'var(--font-medium)', color: 'var(--color-text-primary)' }}>{item.title}</div>
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'risk' && (
          <section className="animate-fade-in">
            <h2 style={sectionTitle}>{t('demo.risk.title')}</h2>
            <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
              {riskLevels.map(risk => (
                <div key={risk.level} className="card" style={{ borderLeft: `4px solid ${risk.color}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: 'var(--radius-lg)',
                      background: risk.bg,
                      color: risk.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'var(--font-bold)',
                      fontSize: 'var(--text-lg)',
                      flexShrink: 0,
                      border: `1px solid ${risk.color}`
                    }}>
                      {risk.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', color: risk.color }}>
                        {risk.level}
                      </div>
                      <div style={{ color: 'var(--color-text-secondary)' }}>{risk.desc}</div>
                    </div>
                    <div style={{ textAlign: 'right', paddingLeft: 'var(--space-4)', borderLeft: '1px solid var(--color-border)' }}>
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{t('demo.risk.stakeRequirement')}</div>
                      <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-text-primary)' }}>{risk.stake}</div>
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{t('demo.risk.stakeUnit')}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="card" style={{ marginTop: 'var(--space-6)', background: 'var(--color-bg-secondary)' }}>
              <h3 style={{ marginTop: 0, marginBottom: 'var(--space-3)', color: 'var(--color-text-primary)', fontSize: 'var(--text-lg)' }}>{t('demo.risk.decisionTreeTitle')}</h3>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.8, whiteSpace: 'pre-line' }}>
                {t('demo.risk.decisionTree')}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'fingerprint' && (
          <section className="animate-fade-in">
            <h2 style={sectionTitle}>{t('demo.fingerprint.title')}</h2>

            <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
              <h3 style={{ marginTop: 0, marginBottom: 'var(--space-4)', color: 'var(--color-text-primary)', fontSize: 'var(--text-lg)' }}>{t('demo.fingerprint.howItWorks')}</h3>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)', lineHeight: 1.7 }}>
                {t('demo.fingerprint.desc')}
              </p>
              <div style={{
                background: 'var(--color-gray-800)',
                color: 'var(--color-gray-100)',
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-md)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-sm)',
                marginBottom: 'var(--space-4)'
              }}>
                {t('demo.fingerprint.formula')}
              </div>
              <div className="grid-cols-3" style={{ display: 'grid', gap: 'var(--space-3)' }}>
                {(t('demo.fingerprint.inputs', { returnObjects: true }) || []).map((item, i) => (
                  <div key={i} className="card" style={{ padding: 'var(--space-4)', background: 'var(--color-bg-secondary)' }}>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>{item.label}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)', marginTop: 'var(--space-1)' }}>{item.value}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {fingerprint ? (
              <div className="card" style={{ border: '2px solid var(--color-success)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                  <span className="badge badge-success">OK</span>
                  <span style={{ fontWeight: 'var(--font-semibold)', color: 'var(--color-success)' }}>{t('demo.fingerprint.generated')}</span>
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-sm)',
                  wordBreak: 'break-all',
                  color: 'var(--color-success)',
                  background: 'var(--color-success-light)',
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius-md)'
                }}>
                  {fingerprint}
                </div>
              </div>
            ) : (
              <div className="card empty-state" style={{ padding: 'var(--space-8)' }}>
                <p style={{ margin: 0 }}>{t('demo.fingerprint.emptyState')}</p>
              </div>
            )}
          </section>
        )}

        {activeTab === 'antislas' && (
          <section className="animate-fade-in">
            <h2 style={sectionTitle}>{t('demo.antislas.title')}</h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>
              {t('demo.antislas.desc')}
            </p>

            <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
              {(t('demo.antislas.penalties', { returnObjects: true }) || []).map((item, i) => (
                <div key={i} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                  <div>
                    <div style={{ fontWeight: 'var(--font-semibold)', color: 'var(--color-text-primary)' }}>{item.type}</div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
                      {t('demo.antislas.reputation')}: {item.rep}
                    </div>
                  </div>
                  <span className={`badge badge-${item.variant}`}>
                    {t('demo.antislas.confiscate', { penalty: item.penalty })}
                  </span>
                </div>
              ))}
            </div>

            <div className="card" style={{ marginTop: 'var(--space-6)', background: 'var(--color-warning-light)' }}>
              <h3 style={{ marginTop: 0, marginBottom: 'var(--space-4)', color: 'var(--color-warning)', fontSize: 'var(--text-lg)' }}>{t('demo.antislas.appealTitle')}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                {(t('demo.antislas.appealSteps', { returnObjects: true }) || []).map((step, i, arr) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span className="badge badge-warning">{step}</span>
                    {i < arr.length - 1 && <span style={{ color: 'var(--color-text-tertiary)' }}>→</span>}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'register' && (
          <section className="animate-fade-in">
            <h2 style={sectionTitle}>{t('demo.register.title')}</h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>
              {t('demo.register.desc')}
            </p>

            <div className="card upload-entry-banner" style={{ marginBottom: 'var(--space-6)' }}>
              <div className="upload-entry-content">
                <div>
                  <h3 style={{ margin: '0 0 var(--space-2) 0', fontSize: 'var(--text-lg)', color: 'var(--color-text-primary)' }}>
                    {t('demo.register.altEntries.title')}
                  </h3>
                  <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
                    {t('demo.register.altEntries.desc')}
                  </p>
                </div>
                <div className="upload-entry-actions">
                  <button className="btn btn-secondary" onClick={() => setActiveTab('freeskill')}>
                    {t('demo.register.altEntries.freeskill')}
                  </button>
                  <button className="btn btn-primary" onClick={() => setActiveTab('templates')}>
                    {t('demo.register.altEntries.templates')}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid-auto" style={{ marginBottom: 'var(--space-6)' }}>
              <div className="card">
                <h3 style={{ marginTop: 0, marginBottom: 'var(--space-3)', color: 'var(--color-text-primary)', fontSize: 'var(--text-base)' }}>{t('demo.register.formatSkillMd')}</h3>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                  {t('demo.register.formatSkillMdDesc')}
                </div>
              </div>

              <div className="card">
                <h3 style={{ marginTop: 0, marginBottom: 'var(--space-3)', color: 'var(--color-text-primary)', fontSize: 'var(--text-base)' }}>{t('demo.register.formatFolder')}</h3>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                  {t('demo.register.formatFolderDesc')}
                </div>
              </div>
            </div>

            <div className="card" style={{
              border: uploadStatus?.status === 'error' ? '2px solid var(--color-danger)' : '2px dashed var(--color-border)',
              background: 'var(--color-bg-secondary)',
              textAlign: 'center',
              padding: 'var(--space-12) var(--space-6)',
              marginBottom: 'var(--space-6)'
            }}>
              <h3 style={{ marginTop: 0, marginBottom: 'var(--space-2)', color: 'var(--color-text-primary)' }}>
                {t('demo.register.dropHint')}
              </h3>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
                {t('demo.register.supportedFormats')}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".SKILL.md,.skill.zip,.zip,.md"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <button
                className="btn btn-primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadStatus?.status === 'uploading'}
              >
                {uploadStatus?.status === 'uploading' ? t('demo.register.processing') : t('demo.register.selectFile')}
              </button>

              {uploadStatus && (
                <div className={`alert alert-${uploadStatus.status === 'error' ? 'danger' : uploadStatus.status === 'approved' ? 'success' : 'warning'}`} style={{ marginTop: 'var(--space-4)', textAlign: 'left' }}>
                  <div style={{ fontWeight: 'var(--font-semibold)' }}>
                    {uploadStatus.status === 'uploading' && t('demo.status.uploading')}
                    {uploadStatus.status === 'pending' && t('demo.status.pending')}
                    {uploadStatus.status === 'auditing' && t('demo.status.auditing')}
                    {uploadStatus.status === 'approved' && t('demo.status.approved')}
                    {uploadStatus.status === 'review' && t('demo.status.review')}
                    {uploadStatus.status === 'rejected' && t('demo.status.rejected')}
                    {uploadStatus.status === 'submitting' && t('demo.status.submitting')}
                    {uploadStatus.status === 'on_chain' && t('demo.status.onChain')}
                    {uploadStatus.status === 'error' && t('common.error')}
                  </div>
                  {uploadStatus.message && uploadStatus.status !== 'error' && (
                    <div style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>{uploadStatus.message}</div>
                  )}
                </div>
              )}

              {uploadResult && (
                <div className={`alert alert-${uploadResult.success ? 'success' : 'danger'}`} style={{ marginTop: 'var(--space-4)', textAlign: 'left' }}>
                  {uploadResult.success ? (
                    <>
                      <div style={{ fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-2)' }}>{t('demo.chain.success')}</div>
                      <div style={{ fontSize: 'var(--text-sm)' }}>
                        <div>{t('demo.chain.skillId')}: <code>{uploadResult.skillId}</code></div>
                        <div>{t('demo.chain.txHash')}: <code style={{ wordBreak: 'break-all' }}>{uploadResult.txHash}</code></div>
                      </div>
                    </>
                  ) : (
                    <div style={{ fontWeight: 'var(--font-semibold)' }}>
                      {uploadResult.status === 'review' ? t('demo.status.review') : t('demo.audit.rejected')}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="card">
              <h3 style={{ marginTop: 0, marginBottom: 'var(--space-3)', color: 'var(--color-text-primary)', fontSize: 'var(--text-lg)' }}>
                {t('demo.register.exampleTitle')}
              </h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
                {t('demo.register.exampleDesc')}
              </p>

              <div className="grid-cols-2" style={{ display: 'grid', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                <div className="card" style={{ padding: 'var(--space-4)', background: 'var(--color-success-light)', borderColor: 'var(--risk-low-border)' }}>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--color-success)', marginBottom: 'var(--space-2)' }}>{t('demo.register.baseFieldsLabel')}</div>
                  <code style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--color-success)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                    {t('demo.register.baseFieldsCode')}
                  </code>
                </div>
                <div className="card" style={{ padding: 'var(--space-4)', background: 'var(--color-primary-light)', borderColor: 'var(--color-primary-200)' }}>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--color-primary)', marginBottom: 'var(--space-2)' }}>{t('demo.register.extensionFieldsLabel')}</div>
                  <code style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--color-primary)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                    {t('demo.register.extensionFieldsCode')}
                  </code>
                </div>
              </div>

              <div style={{
                background: 'var(--color-gray-800)',
                color: 'var(--color-gray-100)',
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-md)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-xs)',
                overflowX: 'auto'
              }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{t('demo.register.exampleCode')}</pre>
              </div>
            </div>

            <div className="card" style={{ marginTop: 'var(--space-6)', background: 'var(--color-primary-light)' }}>
              <h3 style={{ marginTop: 0, marginBottom: 'var(--space-4)', color: 'var(--color-primary)', fontSize: 'var(--text-lg)' }}>{t('demo.register.workflowTitle')}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                {(t('demo.register.workflowSteps', { returnObjects: true }) || []).map((step, i, arr) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span className="badge badge-primary" style={{ background: 'var(--color-primary)', color: 'var(--color-text-inverse)' }}>
                      {i + 1}. {step}
                    </span>
                    {i < arr.length - 1 && <span style={{ color: 'var(--color-text-tertiary)' }}>→</span>}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'freeskill' && (
          <section className="animate-fade-in">
            <h2 style={sectionTitle}>{t('demo.freeskill.governanceTitle')}</h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>
              {t('demo.freeskill.governanceDesc')}
            </p>

            <div className="card upload-entry-banner" style={{ marginBottom: 'var(--space-6)' }}>
              <div className="upload-entry-content">
                <div>
                  <h3 style={{ margin: '0 0 var(--space-2) 0', fontSize: 'var(--text-lg)', color: 'var(--color-text-primary)' }}>
                    {t('demo.freeskill.readyTitle')}
                  </h3>
                  <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
                    {t('demo.freeskill.readyDesc')}
                  </p>
                </div>
                <button className="btn btn-primary" onClick={() => setActiveTab('register')}>
                  {t('demo.freeskill.uploadNow')}
                </button>
              </div>
            </div>

            <div className="card" style={{ background: 'var(--color-primary)', color: 'var(--color-text-inverse)', marginBottom: 'var(--space-6)' }}>
              <h3 style={{ marginTop: 0, color: 'inherit', fontSize: 'var(--text-xl)' }}>{t('demo.freeskill.coreIdea')}</h3>
              <p style={{ fontSize: 'var(--text-lg)', margin: '0 0 var(--space-2) 0', fontWeight: 'var(--font-semibold)' }}>
                {t('demo.freeskill.tagline')}
              </p>
              <p style={{ opacity: 0.9, margin: 0 }}>
                {t('demo.freeskill.taglineDesc')}
              </p>
            </div>

            <h3 style={{ marginBottom: 'var(--space-4)', color: 'var(--color-text-primary)', fontSize: 'var(--text-lg)' }}>{t('demo.freeskill.responsibilityChain')}</h3>
            <div className="card" style={{ marginBottom: 'var(--space-6)', background: 'var(--color-bg-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                {(t('demo.freeskill.chainSteps', { returnObjects: true }) || []).map((step, i, arr) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <div className="card" style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center', minWidth: '120px' }}>
                      <div style={{ fontWeight: 'var(--font-semibold)', color: 'var(--color-primary)' }}>{i + 1}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>{step}</div>
                    </div>
                    {i < arr.length - 1 && <span style={{ color: 'var(--color-text-tertiary)' }}>→</span>}
                  </div>
                ))}
              </div>
            </div>

            <h3 style={{ marginBottom: 'var(--space-4)', color: 'var(--color-text-primary)', fontSize: 'var(--text-lg)' }}>{t('demo.freeskill.comparisonTitle')}</h3>
            <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                <thead>
                  <tr style={{ background: 'var(--color-bg-secondary)' }}>
                    <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left', fontWeight: 'var(--font-semibold)', color: 'var(--color-text-secondary)' }}>{t('common.none')}</th>
                    <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center', fontWeight: 'var(--font-semibold)', color: 'var(--color-text-secondary)' }}>{t('demo.freeskill.comparisonRegular')}</th>
                    <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center', fontWeight: 'var(--font-semibold)', color: 'var(--color-primary)' }}>{t('demo.freeskill.comparisonFreeskill')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(t('demo.freeskill.comparisonDimensions', { returnObjects: true }) || []).map((dim, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--color-border)' }}>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--font-medium)', color: 'var(--color-text-primary)' }}>{dim}</td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>—</td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center', color: 'var(--color-success)', fontWeight: 'var(--font-semibold)' }}>✓</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 style={{ marginBottom: 'var(--space-4)', color: 'var(--color-text-primary)', fontSize: 'var(--text-lg)' }}>{t('demo.freeskill.requiredFieldsTitle')}</h3>
            <div style={{
              background: 'var(--color-gray-800)',
              color: 'var(--color-gray-100)',
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-sm)',
              overflowX: 'auto',
              marginBottom: 'var(--space-6)'
            }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{t('demo.freeskill.requiredFieldsCode')}</pre>
            </div>

            <h3 style={{ marginBottom: 'var(--space-4)', color: 'var(--color-text-primary)', fontSize: 'var(--text-lg)' }}>{t('demo.freeskill.collaborationTitle')}</h3>
            <div className="grid-auto" style={{ marginBottom: 'var(--space-6)' }}>
              {(t('demo.freeskill.collaborationSkills', { returnObjects: true }) || []).map((skill, i) => (
                <div key={i} className="card" style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
                  <div style={{ fontWeight: 'var(--font-bold)', color: 'var(--color-primary)', marginBottom: 'var(--space-2)' }}>{i + 1}</div>
                  <div style={{ fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>{skill.name}</div>
                  <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-1)' }}>{skill.desc}</div>
                </div>
              ))}
            </div>

            <h3 style={{ marginBottom: 'var(--space-4)', color: 'var(--color-text-primary)', fontSize: 'var(--text-lg)' }}>{t('demo.freeskill.authCheckpointsTitle')}</h3>
            <div className="card" style={{ background: 'var(--color-warning-light)', borderColor: 'var(--risk-medium-border)' }}>
              <table style={{ width: '100%', fontSize: 'var(--text-sm)' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', paddingBottom: 'var(--space-3)', color: 'var(--color-warning)' }}>{t('demo.freeskill.authStepHeader')}</th>
                    <th style={{ textAlign: 'left', paddingBottom: 'var(--space-3)', color: 'var(--color-warning)' }}>{t('demo.freeskill.authContentHeader')}</th>
                    <th style={{ textAlign: 'left', paddingBottom: 'var(--space-3)', color: 'var(--color-warning)' }}>{t('demo.freeskill.authTriggerHeader')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(t('demo.freeskill.authRows', { returnObjects: true }) || []).map((row, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--risk-medium-border)' }}>
                      <td style={{ padding: 'var(--space-2) 0', fontFamily: 'var(--font-mono)', color: 'var(--color-primary)', fontWeight: 'var(--font-semibold)' }}>{row.step}</td>
                      <td style={{ padding: 'var(--space-2) 0', color: 'var(--color-text-primary)' }}>{row.auth}</td>
                      <td style={{ padding: 'var(--space-2) 0', color: 'var(--color-text-secondary)' }}>{row.trigger}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'templates' && (
          <section className="animate-fade-in">
            <h2 style={sectionTitle}>{t('demo.templates.sectionTitle')}</h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>
              {t('demo.templates.sectionDesc')}
            </p>

            <div className="card upload-entry-banner" style={{ marginBottom: 'var(--space-6)' }}>
              <div className="upload-entry-content">
                <div>
                  <h3 style={{ margin: '0 0 var(--space-2) 0', fontSize: 'var(--text-lg)', color: 'var(--color-text-primary)' }}>
                    {t('demo.templates.bannerTitle')}
                  </h3>
                  <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
                    {t('demo.templates.bannerDesc')}
                  </p>
                </div>
                <button className="btn btn-primary" onClick={() => setActiveTab('register')}>
                  {t('demo.templates.uploadSkill')}
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 'var(--space-6)', marginBottom: 'var(--space-8)' }}>
              {(t('demo.templates.templateList', { returnObjects: true }) || []).map((skill, i) => (
                <div key={i} className="card" style={{ borderLeft: `4px solid ${skill.color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                    <div>
                      <h3 style={{ margin: '0 0 var(--space-2) 0', color: 'var(--color-text-primary)', fontSize: 'var(--text-xl)' }}>
                        {skill.name}
                      </h3>
                      <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: 'var(--text-sm)' }}>{skill.desc}</p>
                    </div>
                    <a
                      href={`/downloads/${skill.file}`}
                      download
                      className="btn btn-primary btn-sm"
                      style={{ background: skill.color, borderColor: skill.color, flexShrink: 0 }}
                    >
                      {t('demo.templates.download')}
                    </a>
                  </div>
                  <div className="grid-auto" style={{ gap: 'var(--space-3)' }}>
                    {[
                      { label: t('demo.templates.stats.riskLevel'), value: 'MEDIUM', variant: 'warning' },
                      { label: t('demo.templates.stats.validators'), value: '2', variant: 'info' },
                      { label: t('demo.templates.stats.stake'), value: '50 ether', variant: 'success' }
                    ].map((stat, j) => (
                      <div key={j} className="card" style={{ padding: 'var(--space-3)', textAlign: 'center', background: 'var(--color-bg-secondary)' }}>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>{stat.label}</div>
                        <div className={`text-${stat.variant}`} style={{ fontWeight: 'var(--font-semibold)', marginTop: 'var(--space-1)' }}>{stat.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <h3 style={{ marginBottom: 'var(--space-4)', color: 'var(--color-text-primary)', fontSize: 'var(--text-lg)' }}>{t('demo.templates.governanceFieldsTitle')}</h3>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                <thead>
                  <tr style={{ background: 'var(--color-bg-secondary)' }}>
                    <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left', fontWeight: 'var(--font-semibold)', color: 'var(--color-text-secondary)' }}>{t('demo.templates.fieldHeader')}</th>
                    <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left', fontWeight: 'var(--font-semibold)', color: 'var(--color-text-secondary)' }}>{t('demo.templates.descHeader')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(t('demo.templates.governanceFields', { returnObjects: true }) || []).map((row, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--color-border)' }}>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', fontFamily: 'var(--font-mono)', color: 'var(--color-primary)', fontWeight: 'var(--font-semibold)' }}>{row.field}</td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-secondary)' }}>{row.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
