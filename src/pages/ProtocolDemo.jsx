import { useState, useRef, useEffect } from 'react';
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
export default function ProtocolDemo() {
  const [activeTab, setActiveTab] = useState('standard');
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

  const riskLevels = [
    { level: 'LOW', color: 'var(--color-success)', bg: 'var(--color-success-light)', icon: '+', desc: '只读操作，无风险', stake: 10 },
    { level: 'MEDIUM', color: 'var(--color-warning)', bg: 'var(--color-warning-light)', icon: '!', desc: '有限写入操作', stake: 50 },
    { level: 'HIGH', color: 'var(--color-warning)', bg: 'var(--color-warning-light)', icon: '!!', desc: '涉及资金或重要数据', stake: 100 },
    { level: 'CRITICAL', color: 'var(--color-danger)', bg: 'var(--color-danger-light)', icon: '!!!', desc: '不可逆关键操作', stake: 200 }
  ];

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
      alert('请填写技能名称和描述');
      return;
    }
    const fp = computeFingerprint(demoSkill);
    setFingerprint(fp);
    setVerificationStep(1);
  };

  const simulateVerification = () => {
    const steps = ['提交验证池', '分配验证者', '代码审查', '投票共识', '上链完成'];
    if (verificationStep < steps.length) {
      setTimeout(() => {
        setVerificationStep(prev => prev + 1);
      }, 1500);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadStatus({ status: 'uploading', message: '上传中...' });
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
    { id: 'live', label: '实时演示' },
    { id: 'standard', label: '标准规范' },
    { id: 'risk', label: '风险分类' },
    { id: 'fingerprint', label: '指纹机制' },
    { id: 'antislas', label: '反噬机制' },
    { id: 'register', label: '上传技能' },
    { id: 'freeskill', label: 'FreeSkill' },
    { id: 'metaskills', label: '元技能' }
  ];

  const sectionTitle = { marginTop: 0, marginBottom: 'var(--space-4)', color: 'var(--color-text-primary)', fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)' };

  const renderWalletCard = () => (
    <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h3 style={{ margin: '0 0 var(--space-1) 0', fontSize: 'var(--text-lg)', color: 'var(--color-text-primary)' }}>
            钱包状态
          </h3>
          <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
            {isDemoMode ? '演示模式' : walletConnected ? '已连接' : '未连接'}
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
              {walletConnected ? '断开连接' : '连接钱包'}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderLiveStats = () => (
    <div className="grid-stats" style={{ marginBottom: 'var(--space-6)' }}>
      {[
        { label: 'ASK 余额', value: userBalance, color: 'var(--color-primary)' },
        { label: '声望值', value: userReputation, color: 'var(--color-success)' },
        { label: '链上技能', value: liveSkills.length, color: 'var(--color-warning)' },
        { label: '状态', value: isDemoMode ? '演示模式' : walletConnected ? '已连接' : '未连接', color: 'var(--color-text-primary)' }
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
        <h2 className="page-title">AgentSkills 协议演示</h2>
        <p className="page-subtitle">探索 Skills 标准、责任机制与上链流程</p>
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
            <h2 style={sectionTitle}>实时数据演示</h2>
            {renderLiveStats()}

            <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                <h3 style={{ margin: 0, fontSize: 'var(--text-lg)', color: 'var(--color-text-primary)' }}>链上技能列表</h3>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={loadLiveData}
                  disabled={!walletConnected || isDemoMode}
                >
                  刷新数据
                </button>
              </div>

              {liveSkills.length > 0 ? (
                <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                  {liveSkills.map((skill, index) => (
                    <div key={index} className="card" style={{ padding: 'var(--space-4)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 'var(--space-2)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                        <div>
                          <div style={{ fontWeight: 'var(--font-semibold)', color: 'var(--color-text-primary)', marginBottom: 'var(--space-1)' }}>
                            {skill.name || `技能 #${skill.id}`}
                          </div>
                          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{skill.description || '暂无描述'}</div>
                        </div>
                        <span className={`badge ${skill.verified ? 'badge-success' : 'badge-warning'}`}>
                          {skill.verified ? '已验证' : '待验证'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', flexWrap: 'wrap' }}>
                        <span>风险等级: {skill.riskLevel || 'LOW'}</span>
                        <span>质押: {skill.stakeAmount ? `${Number(skill.stakeAmount) / 1e18} ASK` : '0'}</span>
                        {skill.fingerprint && <span style={{ fontFamily: 'var(--font-mono)' }}>{skill.fingerprint.slice(0, 10)}...</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
                  <p>{isDemoMode ? '当前处于演示模式，连接钱包以查看实时数据' : '链上暂无技能数据'}</p>
                  {!walletConnected && (
                    <button className="btn btn-primary" onClick={handleWalletConnect}>
                      连接钱包
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="card" style={{ background: 'var(--color-primary-light)' }}>
              <h3 style={{ marginTop: 0, marginBottom: 'var(--space-4)', color: 'var(--color-text-primary)', fontSize: 'var(--text-lg)' }}>协议流程</h3>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                {[
                  { step: 1, label: '创建技能' },
                  { step: 2, label: '风险评估' },
                  { step: 3, label: '安全审核' },
                  { step: 4, label: '质押锁定' },
                  { step: 5, label: '上链完成' }
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
            <h2 style={sectionTitle}>Skills 标准规范 v1.1</h2>
            <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
              <h3 style={{ marginTop: 0, marginBottom: 'var(--space-4)', color: 'var(--color-text-primary)', fontSize: 'var(--text-lg)' }}>核心组件</h3>
              <div className="grid-auto">
                {[
                  { name: 'SkillRegistry', desc: '技能注册与状态管理', status: '已部署', variant: 'success' },
                  { name: 'Attribution', desc: '贡献归因与声望系统', status: '已部署', variant: 'success' },
                  { name: 'StakingManager', desc: '质押与反噬机制', status: '已部署', variant: 'success' },
                  { name: 'ASKToken', desc: '积分代币（延迟发行）', status: '规划中', variant: 'warning' }
                ].map((comp, i) => (
                  <div key={i} className="card" style={{ padding: 'var(--space-4)' }}>
                    <div style={{ fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-1)', color: 'var(--color-text-primary)' }}>{comp.name}</div>
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-3)' }}>{comp.desc}</div>
                    <span className={`badge badge-${comp.variant}`}>{comp.status}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ background: 'var(--color-primary-light)' }}>
              <h3 style={{ marginTop: 0, marginBottom: 'var(--space-4)', color: 'var(--color-text-primary)', fontSize: 'var(--text-lg)' }}>协议特性</h3>
              <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                {[
                  { title: '标准化接口', desc: '统一的 Skill 注册、验证、调用接口' },
                  { title: '指纹追溯', desc: 'keccak256 指纹确保技能可追溯' },
                  { title: '风险分级', desc: 'LOW/MEDIUM/HIGH/CRITICAL 四级风险评估' },
                  { title: '反噬机制', desc: '恶意行为触发惩罚，保护社区' }
                ].map((item, i) => (
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
            <h2 style={sectionTitle}>风险等级分类</h2>
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
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>质押要求</div>
                      <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-text-primary)' }}>{risk.stake}</div>
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>ether</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="card" style={{ marginTop: 'var(--space-6)', background: 'var(--color-bg-secondary)' }}>
              <h3 style={{ marginTop: 0, marginBottom: 'var(--space-3)', color: 'var(--color-text-primary)', fontSize: 'var(--text-lg)' }}>风险分类决策树</h3>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>
                只读查询 → LOW<br />
                用户可控文件 → MEDIUM<br />
                他人数据/资金 → HIGH<br />
                系统权限/智能合约 → CRITICAL
              </div>
            </div>
          </section>
        )}

        {activeTab === 'fingerprint' && (
          <section className="animate-fade-in">
            <h2 style={sectionTitle}>指纹追溯机制</h2>

            <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
              <h3 style={{ marginTop: 0, marginBottom: 'var(--space-4)', color: 'var(--color-text-primary)', fontSize: 'var(--text-lg)' }}>工作原理</h3>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)', lineHeight: 1.7 }}>
                每个技能创建时生成唯一指纹（fingerprint），用于追溯整个生命周期。
                指纹基于 IPFS 哈希、创建者地址和时间戳计算。
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
                fingerprint = keccak256(ipfsHash + creator + timestamp)
              </div>
              <div className="grid-cols-3" style={{ display: 'grid', gap: 'var(--space-3)' }}>
                {[
                  { label: 'IPFS 哈希', value: 'QmXxx...', desc: '代码存储地址' },
                  { label: '创建者', value: '0x1234...', desc: '钱包地址' },
                  { label: '时间戳', value: '1714896000', desc: 'Unix 时间' }
                ].map((item, i) => (
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
                  <span style={{ fontWeight: 'var(--font-semibold)', color: 'var(--color-success)' }}>指纹已生成</span>
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
                <p style={{ margin: 0 }}>指纹在上链技能流程中通过验证后生成，用于追溯整个生命周期</p>
              </div>
            )}
          </section>
        )}

        {activeTab === 'antislas' && (
          <section className="animate-fade-in">
            <h2 style={sectionTitle}>反噬机制（Anti-Slash）</h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>
              恶意行为将触发惩罚，保护平台和用户权益。
            </p>

            <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
              {[
                { type: '恶意技能（已损害）', penalty: '100%', rep: '-500', variant: 'danger' },
                { type: '恶意技能（未损害）', penalty: '50%', rep: '-200', variant: 'warning' },
                { type: '验证者失职', penalty: '100%', rep: '-300', variant: 'warning' },
                { type: '虚假举报', penalty: '全额', rep: '-300', variant: 'info' }
              ].map((item, i) => (
                <div key={i} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                  <div>
                    <div style={{ fontWeight: 'var(--font-semibold)', color: 'var(--color-text-primary)' }}>{item.type}</div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
                      声望: {item.rep}
                    </div>
                  </div>
                  <span className={`badge badge-${item.variant}`}>
                    没收 {item.penalty}
                  </span>
                </div>
              ))}
            </div>

            <div className="card" style={{ marginTop: 'var(--space-6)', background: 'var(--color-warning-light)' }}>
              <h3 style={{ marginTop: 0, marginBottom: 'var(--space-4)', color: 'var(--color-warning)', fontSize: 'var(--text-lg)' }}>申诉流程</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                {['收到通知', '7天内申诉', '长老团审核', '结果通知'].map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span className="badge badge-warning">{step}</span>
                    {i < 3 && <span style={{ color: 'var(--color-text-tertiary)' }}>→</span>}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'register' && (
          <section className="animate-fade-in">
            <h2 style={sectionTitle}>上传技能包</h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>
              基于 SKILLS_STANDARD.md v1.1 规范，上传符合 AgentSkills 标准的技能包
            </p>

            <div className="grid-auto" style={{ marginBottom: 'var(--space-6)' }}>
              <div className="card">
                <h3 style={{ marginTop: 0, marginBottom: 'var(--space-3)', color: 'var(--color-text-primary)', fontSize: 'var(--text-base)' }}>.SKILL.md 格式</h3>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
                  单文件格式（推荐）<br />
                  包含 YAML frontmatter<br />
                  和完整代码
                </div>
              </div>

              <div className="card">
                <h3 style={{ marginTop: 0, marginBottom: 'var(--space-3)', color: 'var(--color-text-primary)', fontSize: 'var(--text-base)' }}>文件夹格式</h3>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
                  skill-name/<br />
                  ├── skill.json (必需)<br />
                  ├── main.py (必需)<br />
                  └── README.md
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
                拖拽文件到此处
              </h3>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
                支持 .SKILL.md、.skill.zip 或文件夹
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
                {uploadStatus?.status === 'uploading' ? '处理中...' : '选择文件'}
              </button>

              {uploadStatus && (
                <div className={`alert alert-${uploadStatus.status === 'error' ? 'danger' : uploadStatus.status === 'approved' ? 'success' : 'warning'}`} style={{ marginTop: 'var(--space-4)', textAlign: 'left' }}>
                  <div style={{ fontWeight: 'var(--font-semibold)' }}>
                    {uploadStatus.status === 'uploading' && '上传中...'}
                    {uploadStatus.status === 'pending' && '等待审核...'}
                    {uploadStatus.status === 'auditing' && '安全审核中 (AI Agent 扫描)...'}
                    {uploadStatus.status === 'approved' && '审核通过!'}
                    {uploadStatus.status === 'review' && '需要人工复审'}
                    {uploadStatus.status === 'rejected' && '审核拒绝'}
                    {uploadStatus.status === 'submitting' && '提交上链中...'}
                    {uploadStatus.status === 'on_chain' && '已上链!'}
                    {uploadStatus.status === 'error' && '错误'}
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
                      <div style={{ fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-2)' }}>上链成功!</div>
                      <div style={{ fontSize: 'var(--text-sm)' }}>
                        <div>Skill ID: <code>{uploadResult.skillId}</code></div>
                        <div>Tx Hash: <code style={{ wordBreak: 'break-all' }}>{uploadResult.txHash}</code></div>
                      </div>
                    </>
                  ) : (
                    <div style={{ fontWeight: 'var(--font-semibold)' }}>
                      {uploadResult.status === 'review' ? '需要人工复审' : '审核失败'}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="card">
              <h3 style={{ marginTop: 0, marginBottom: 'var(--space-3)', color: 'var(--color-text-primary)', fontSize: 'var(--text-lg)' }}>
                标准格式示例
              </h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
                FreeSkill 在 AgentSkills.io 基础上扩展，先满足基础字段，再添加治理字段
              </p>

              <div className="grid-cols-2" style={{ display: 'grid', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                <div className="card" style={{ padding: 'var(--space-4)', background: 'var(--color-success-light)', borderColor: 'var(--risk-low-border)' }}>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--color-success)', marginBottom: 'var(--space-2)' }}>AgentSkills.io 基础字段（必须有）</div>
                  <code style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--color-success)', lineHeight: 1.7 }}>
                    name, description, trigger,<br />
                    metadata (version, author, riskLevel),<br />
                    scripts (name, language, code),<br />
                    resources
                  </code>
                </div>
                <div className="card" style={{ padding: 'var(--space-4)', background: 'var(--color-primary-light)', borderColor: 'var(--color-primary-200)' }}>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--color-primary)', marginBottom: 'var(--space-2)' }}>FreeSkill 治理扩展（在其基础上增加）</div>
                  <code style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--color-primary)', lineHeight: 1.7 }}>
                    freeskill (fingerprint, ipfsHash...),<br />
                    responsibility (liability...),<br />
                    antiSlash (enabled, slashRate...),<br />
                    humanAuth (required...)
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
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{`---
name: skill-name                              # AgentSkills 基础
description: 功能描述
trigger: "触发条件 {param}"
metadata:
  version: "1.0.0"
  author: "0x..."
  riskLevel: "LOW"
scripts:
  - name: "main"
    language: "python"
    code: |
      def main(param):
          return {"status": "ok"}
resources: []

# === FreeSkill 治理扩展 ===
freeskill:
  fingerprint: "0x..."
  creator: "0x..."
  ipfsHash: "Qm..."
  stakeRequired: 10
  standard: "freeskill"
responsibility:
  liabilityDeclaration: "我对此技能行为负全部责任"
  scopeDeclaration: "此技能仅访问声明的资源"
antiSlash:
  enabled: true
  slashRate: 0.5
humanAuth:
  required: ["stake", "submit"]
---`}</pre>
              </div>
            </div>

            <div className="card" style={{ marginTop: 'var(--space-6)', background: 'var(--color-primary-light)' }}>
              <h3 style={{ marginTop: 0, marginBottom: 'var(--space-4)', color: 'var(--color-primary)', fontSize: 'var(--text-lg)' }}>上传后流程</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                {['上传', '自动解析', '风险评估', '安全审核', '上链'].map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span className="badge badge-primary" style={{ background: 'var(--color-primary)', color: 'var(--color-text-inverse)' }}>
                      {i + 1}. {step}
                    </span>
                    {i < 4 && <span style={{ color: 'var(--color-text-tertiary)' }}>→</span>}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'freeskill' && (
          <section className="animate-fade-in">
            <h2 style={sectionTitle}>FreeSkill 治理扩展</h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>
              基于 AgentSkills 的可信技能治理标准，补充完整责任链。
            </p>

            <div className="card" style={{ background: 'var(--color-primary)', color: 'var(--color-text-inverse)', marginBottom: 'var(--space-6)' }}>
              <h3 style={{ marginTop: 0, color: 'inherit', fontSize: 'var(--text-xl)' }}>核心理念</h3>
              <p style={{ fontSize: 'var(--text-lg)', margin: '0 0 var(--space-2) 0', fontWeight: 'var(--font-semibold)' }}>
                Free by default. Trusted by design.
              </p>
              <p style={{ opacity: 0.9, margin: 0 }}>
                让 Skill 免于混乱的自由 — 让 AI 技能可追溯、可归因、可验证、可惩罚
              </p>
            </div>

            <h3 style={{ marginBottom: 'var(--space-4)', color: 'var(--color-text-primary)', fontSize: 'var(--text-lg)' }}>责任链（Responsibility Chain）</h3>
            <div className="card" style={{ marginBottom: 'var(--space-6)', background: 'var(--color-bg-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                {[
                  '创建者签署责任声明',
                  '验证者背书',
                  '指纹锚定 IPFS',
                  '使用记录',
                  '审计追踪上链',
                  '反噬惩罚'
                ].map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <div className="card" style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center', minWidth: '120px' }}>
                      <div style={{ fontWeight: 'var(--font-semibold)', color: 'var(--color-primary)' }}>{i + 1}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>{step}</div>
                    </div>
                    {i < 5 && <span style={{ color: 'var(--color-text-tertiary)' }}>→</span>}
                  </div>
                ))}
              </div>
            </div>

            <h3 style={{ marginBottom: 'var(--space-4)', color: 'var(--color-text-primary)', fontSize: 'var(--text-lg)' }}>可信技能 vs 普通技能</h3>
            <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                <thead>
                  <tr style={{ background: 'var(--color-bg-secondary)' }}>
                    <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left', fontWeight: 'var(--font-semibold)', color: 'var(--color-text-secondary)' }}>维度</th>
                    <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center', fontWeight: 'var(--font-semibold)', color: 'var(--color-text-secondary)' }}>普通技能</th>
                    <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center', fontWeight: 'var(--font-semibold)', color: 'var(--color-primary)' }}>FreeSkill</th>
                  </tr>
                </thead>
                <tbody>
                  {['追溯', '归因', '验证', '授权', '反噬'].map((dim, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--color-border)' }}>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--font-medium)', color: 'var(--color-text-primary)' }}>{dim}</td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>—</td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center', color: 'var(--color-success)', fontWeight: 'var(--font-semibold)' }}>✓</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 style={{ marginBottom: 'var(--space-4)', color: 'var(--color-text-primary)', fontSize: 'var(--text-lg)' }}>FreeSkill 必需字段</h3>
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
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{`{
  "freeskill": {
    "fingerprint": "0x...",
    "creator": "0x...",
    "ipfsHash": "QmXxx...",
    "riskLevel": "LOW/MEDIUM/HIGH/CRITICAL",
    "stakeRequired": 100,
    "auditTrail": []
  },
  "responsibility": {
    "liabilityDeclaration": "责任声明"
  },
  "antiSlash": {
    "enabled": true,
    "appealsPeriod": 7
  }
}`}</pre>
            </div>

            <h3 style={{ marginBottom: 'var(--space-4)', color: 'var(--color-text-primary)', fontSize: 'var(--text-lg)' }}>多 Agent 协作标准</h3>
            <div className="grid-auto" style={{ marginBottom: 'var(--space-6)' }}>
              {[
                { name: 'freeskill-orchestrate', desc: '编排协调' },
                { name: 'freeskill-upgrade', desc: '补充责任链' },
                { name: 'freeskill-audit', desc: '安全审核' },
                { name: 'freeskill-evaluate', desc: '风险评估' },
                { name: 'freeskill-chain', desc: '链上提交' }
              ].map((skill, i) => (
                <div key={i} className="card" style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
                  <div style={{ fontWeight: 'var(--font-bold)', color: 'var(--color-primary)', marginBottom: 'var(--space-2)' }}>{i + 1}</div>
                  <div style={{ fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>{skill.name}</div>
                  <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-1)' }}>{skill.desc}</div>
                </div>
              ))}
            </div>

            <h3 style={{ marginBottom: 'var(--space-4)', color: 'var(--color-text-primary)', fontSize: 'var(--text-lg)' }}>人类授权检查点</h3>
            <div className="card" style={{ background: 'var(--color-warning-light)', borderColor: 'var(--risk-medium-border)' }}>
              <table style={{ width: '100%', fontSize: 'var(--text-sm)' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', paddingBottom: 'var(--space-3)', color: 'var(--color-warning)' }}>步骤</th>
                    <th style={{ textAlign: 'left', paddingBottom: 'var(--space-3)', color: 'var(--color-warning)' }}>授权内容</th>
                    <th style={{ textAlign: 'left', paddingBottom: 'var(--space-3)', color: 'var(--color-warning)' }}>触发条件</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { step: 'PRE_UPGRADE', auth: '确认开始升级', trigger: '所有技能' },
                    { step: 'POST_AUDIT', auth: '确认审核结果', trigger: 'HIGH/CRITICAL' },
                    { step: 'RISK_CONFIRM', auth: '确认风险等级', trigger: '所有技能' },
                    { step: 'STAKE_CONFIRM', auth: '确认质押', trigger: '需要质押' },
                    { step: 'CHAIN_SUBMIT', auth: '确认链上提交', trigger: '所有提交' }
                  ].map((row, i) => (
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

        {activeTab === 'metaskills' && (
          <section className="animate-fade-in">
            <h2 style={sectionTitle}>FreeSkill 元技能</h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>
              基于 FreeSkill 规范的元技能，用于创建和升级符合治理标准的技能
            </p>

            <div style={{ display: 'grid', gap: 'var(--space-6)', marginBottom: 'var(--space-8)' }}>
              {[
                { name: 'freeskill-create', desc: '创建符合 FreeSkill 规范的新技能', color: 'var(--color-primary)', file: 'freeskill-create.FREESKILL.md' },
                { name: 'freeskill-upgrade', desc: '将现有 AgentSkills 技能升级为 FreeSkill 规范', color: 'var(--color-purple-600)', file: 'freeskill-upgrade.FREESKILL.md' }
              ].map((skill, i) => (
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
                      下载
                    </a>
                  </div>
                  <div className="grid-auto" style={{ gap: 'var(--space-3)' }}>
                    {[
                      { label: '风险等级', value: 'MEDIUM', variant: 'warning' },
                      { label: '验证者', value: '2', variant: 'info' },
                      { label: '质押', value: '50 ether', variant: 'success' }
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

            <h3 style={{ marginBottom: 'var(--space-4)', color: 'var(--color-text-primary)', fontSize: 'var(--text-lg)' }}>添加的治理字段</h3>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                <thead>
                  <tr style={{ background: 'var(--color-bg-secondary)' }}>
                    <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left', fontWeight: 'var(--font-semibold)', color: 'var(--color-text-secondary)' }}>字段</th>
                    <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left', fontWeight: 'var(--font-semibold)', color: 'var(--color-text-secondary)' }}>说明</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { field: 'freeskill.fingerprint', desc: 'keccak256 指纹，用于追溯' },
                    { field: 'freeskill.stakeRequired', desc: '质押要求 (10/50/100/200 ether)' },
                    { field: 'freeskill.attestationCount', desc: '验证者数量要求' },
                    { field: 'responsibility.liabilityDeclaration', desc: '创建者责任声明' },
                    { field: 'responsibility.scopeDeclaration', desc: '权限边界声明' },
                    { field: 'antiSlash.enabled', desc: '启用反噬机制' },
                    { field: 'antiSlash.slashRate', desc: '惩罚比例 (默认 50%)' },
                    { field: 'humanAuth.required', desc: '人类授权检查点' }
                  ].map((row, i) => (
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
