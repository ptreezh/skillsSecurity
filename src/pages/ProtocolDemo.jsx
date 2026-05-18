import { useState, useRef } from 'react';
import { fullAuditFlow } from '../services/uploadService';

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

  // 风险等级配置
  const riskLevels = [
    { level: 'LOW', color: '#22c55e', bg: '#dcfce7', icon: '[+]', desc: '只读操作，无风险', stake: 10 },
    { level: 'MEDIUM', color: '#eab308', bg: '#fef9c3', icon: '[!]', desc: '有限写入操作', stake: 50 },
    { level: 'HIGH', color: '#f97316', bg: '#ffedd5', icon: '[!!]', desc: '涉及资金或重要数据', stake: 100 },
    { level: 'CRITICAL', color: '#ef4444', bg: '#fee2e2', icon: '[!!!]', desc: '不可逆关键操作', stake: 200 }
  ];

  // 计算技能指纹
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

  // 模拟注册流程
  const handleRegister = () => {
    if (!demoSkill.name || !demoSkill.description) {
      alert('请填写技能名称和描述');
      return;
    }
    const fp = computeFingerprint(demoSkill);
    setFingerprint(fp);
    setVerificationStep(1);
  };

  // 模拟验证流程
  const simulateVerification = () => {
    const steps = ['提交验证池', '分配验证者', '代码审查', '投票共识', '上链完成'];
    if (verificationStep < steps.length) {
      setTimeout(() => {
        setVerificationStep(prev => prev + 1);
      }, 1500);
    }
  };

  // 真实上传流程 - 连接后端审核服务
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
    { id: 'standard', label: '标准规范' },
    { id: 'risk', label: '风险分类' },
    { id: 'fingerprint', label: '指纹机制' },
    { id: 'antislas', label: '反噬机制' },
    { id: 'register', label: '上传技能' },
    { id: 'freeskill', label: 'FreeSkill' },
    { id: 'metaskills', label: '元技能' }
  ];

  // 通用样式
  const cardStyle = {
    background: '#fff',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  };

  const sectionTitle = {
    fontSize: '1.5rem',
    fontWeight: '600',
    marginBottom: '20px',
    color: '#1e293b'
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* 头部 */}
      <header style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', color: '#1e293b', marginBottom: '10px', fontWeight: '700' }}>
          AgentSkills 协议演示
        </h1>
        <p style={{ color: '#64748b', fontSize: '1.1rem' }}>
          探索 Skills 标准、责任机制与上链流程
        </p>
      </header>

      {/* 标签页导航 */}
      <nav style={{
        display: 'flex',
        gap: '4px',
        borderBottom: '2px solid #e5e7eb',
        marginBottom: '32px',
        flexWrap: 'wrap'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: 'transparent',
              color: activeTab === tab.id ? '#2563eb' : '#64748b',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: activeTab === tab.id ? '600' : '500',
              fontSize: '0.95rem',
              borderBottom: activeTab === tab.id ? '2px solid #2563eb' : '2px solid transparent',
              marginBottom: '-2px',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* 内容区 */}
      <main>
        {/* 标准规范 */}
        {activeTab === 'standard' && (
          <section style={{ animation: 'fadeIn 0.3s' }}>
            <h2 style={sectionTitle}>Skills 标准规范 v1.1</h2>
            <div style={cardStyle}>
              <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#475569' }}>核心组件</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                {[
                  { name: 'SkillRegistry', desc: '技能注册与状态管理', status: '已部署', color: '#16a34a' },
                  { name: 'Attribution', desc: '贡献归因与声望系统', status: '已部署', color: '#16a34a' },
                  { name: 'StakingManager', desc: '质押与反噬机制', status: '已部署', color: '#16a34a' },
                  { name: 'ASKToken', desc: '积分代币（延迟发行）', status: '规划中', color: '#f59e0b' }
                ].map((comp, i) => (
                  <div key={i} style={{
                    background: '#f8fafc',
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div style={{ fontWeight: '600', marginBottom: '4px', color: '#1e293b' }}>{comp.name}</div>
                    <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '12px' }}>{comp.desc}</div>
                    <span style={{
                      background: comp.color === '#16a34a' ? '#dcfce7' : '#fef3c7',
                      color: comp.color,
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: '500'
                    }}>
                      {comp.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ ...cardStyle, marginTop: '20px', background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)' }}>
              <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#475569' }}>协议特性</h3>
              <div style={{ display: 'grid', gap: '12px' }}>
                {[
                  { icon: '[v]', title: '标准化接口', desc: '统一的 Skill 注册、验证、调用接口' },
                  { icon: '[#]', title: '指纹追溯', desc: 'keccak256 指纹确保技能可追溯' },
                  { icon: '[!]', title: '风险分级', desc: 'LOW/MEDIUM/HIGH/CRITICAL 四级风险评估' },
                  { icon: '[*]', title: '反噬机制', desc: '恶意行为触发惩罚，保护社区' }
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: '#2563eb',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '600',
                      fontSize: '0.85rem'
                    }}>{item.icon}</span>
                    <div>
                      <div style={{ fontWeight: '500', color: '#1e293b' }}>{item.title}</div>
                      <div style={{ fontSize: '0.875rem', color: '#64748b' }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 风险分类 */}
        {activeTab === 'risk' && (
          <section style={{ animation: 'fadeIn 0.3s' }}>
            <h2 style={sectionTitle}>风险等级分类</h2>
            <div style={{ display: 'grid', gap: '16px' }}>
              {riskLevels.map(risk => (
                <div key={risk.level} style={{
                  ...cardStyle,
                  border: `2px solid ${risk.color}`,
                  background: risk.bg
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '12px',
                      background: risk.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontWeight: '700',
                      fontSize: '0.9rem',
                      flexShrink: 0
                    }}>
                      {risk.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: '600', color: risk.color }}>
                        {risk.level}
                      </div>
                      <div style={{ color: '#475569' }}>{risk.desc}</div>
                    </div>
                    <div style={{ textAlign: 'right', paddingLeft: '16px', borderLeft: '1px solid #d1d5db' }}>
                      <div style={{ fontSize: '0.875rem', color: '#64748b' }}>质押要求</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e293b' }}>{risk.stake}</div>
                      <div style={{ fontSize: '0.875rem', color: '#64748b' }}>ether</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ ...cardStyle, marginTop: '20px', background: '#f8fafc' }}>
              <h3 style={{ marginTop: 0, marginBottom: '12px', color: '#475569' }}>风险分类决策树</h3>
              <div style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: '#64748b', lineHeight: '1.6' }}>
                只读查询 → LOW<br/>
                用户可控文件 → MEDIUM<br/>
                他人数据/资金 → HIGH<br/>
                系统权限/智能合约 → CRITICAL
              </div>
            </div>
          </section>
        )}

        {/* 指纹机制 */}
        {activeTab === 'fingerprint' && (
          <section style={{ animation: 'fadeIn 0.3s' }}>
            <h2 style={sectionTitle}>指纹追溯机制</h2>

            <div style={cardStyle}>
              <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#475569' }}>工作原理</h3>
              <p style={{ color: '#64748b', marginBottom: '20px' }}>
                每个技能创建时生成唯一指纹（fingerprint），用于追溯整个生命周期。
                指纹基于 IPFS 哈希、创建者地址和时间戳计算。
              </p>
              <div style={{
                background: '#1e293b',
                color: '#e2e8f0',
                padding: '20px',
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontSize: '0.9rem',
                marginBottom: '16px'
              }}>
                <div style={{ color: '#94a3b8', marginBottom: '8px' }}>// Solidity 实现</div>
                fingerprint = keccak256(ipfsHash + creator + timestamp)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                  { label: 'IPFS 哈希', value: 'QmXxx...', desc: '代码存储地址' },
                  { label: '创建者', value: '0x1234...', desc: '钱包地址' },
                  { label: '时间戳', value: '1714896000', desc: 'Unix 时间' }
                ].map((item, i) => (
                  <div key={i} style={{ background: '#f1f5f9', padding: '12px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.label}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#1e293b', marginTop: '4px' }}>{item.value}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {fingerprint ? (
              <div style={{ ...cardStyle, marginTop: '20px', border: '2px solid #22c55e', background: '#f0fdf4' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ width: '24px', height: '24px', background: '#22c55e', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.75rem' }}>OK</span>
                  <span style={{ fontWeight: '600', color: '#166534' }}>指纹已生成</span>
                </div>
                <div style={{
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  wordBreak: 'break-all',
                  color: '#166534',
                  background: '#dcfce7',
                  padding: '12px',
                  borderRadius: '6px'
                }}>
                  {fingerprint}
                </div>
              </div>
            ) : (
              <div style={{ ...cardStyle, marginTop: '20px', textAlign: 'center', background: '#f8fafc' }}>
                <p style={{ color: '#64748b', margin: 0 }}>
                  指纹在上链技能流程中通过验证后生成，用于追溯整个生命周期
                </p>
              </div>
            )}
          </section>
        )}

        {/* 反噬机制 */}
        {activeTab === 'antislas' && (
          <section style={{ animation: 'fadeIn 0.3s' }}>
            <h2 style={sectionTitle}>反噬机制（Anti-Slash）</h2>
            <p style={{ color: '#64748b', marginBottom: '24px' }}>
              恶意行为将触发惩罚，保护平台和用户权益。
            </p>

            <div style={{ display: 'grid', gap: '12px' }}>
              {[
                { type: '恶意技能（已损害）', penalty: '100%', rep: '-500', bg: '#fef2f2', border: '#fecaca' },
                { type: '恶意技能（未损害）', penalty: '50%', rep: '-200', bg: '#fff7ed', border: '#fed7aa' },
                { type: '验证者失职', penalty: '100%', rep: '-300', bg: '#fef3c7', border: '#fde68a' },
                { type: '虚假举报', penalty: '全额', rep: '-300', bg: '#f3e8ff', border: '#ddd6fe' }
              ].map((item, i) => (
                <div key={i} style={{
                  ...cardStyle,
                  background: item.bg,
                  border: `1px solid ${item.border}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: '600', color: '#1e293b' }}>{item.type}</div>
                    <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '4px' }}>
                      声望: {item.rep}
                    </div>
                  </div>
                  <div style={{
                    background: '#ef4444',
                    color: '#fff',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '0.875rem'
                  }}>
                    没收 {item.penalty}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ ...cardStyle, marginTop: '20px', background: '#fffbeb', border: '1px solid #fbbf24' }}>
              <h3 style={{ marginTop: 0, marginBottom: '12px', color: '#92400e' }}>申诉流程</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {['收到通知', '7天内申诉', '长老团审核', '结果通知'].map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ background: '#fbbf24', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '0.875rem', fontWeight: '500' }}>
                      {step}
                    </span>
                    {i < 3 && <span style={{ color: '#64748b' }}>→</span>}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 注册流程 */}
        {activeTab === 'register' && (
          <section style={{ animation: 'fadeIn 0.3s' }}>
            <h2 style={sectionTitle}>上传技能包</h2>
            <p style={{ color: '#64748b', marginBottom: '24px' }}>
              基于 SKILLS_STANDARD.md v1.1 规范，上传符合 AgentSkills 标准的技能包
            </p>

            {/* 支持格式说明 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div style={cardStyle}>
                <h3 style={{ marginTop: 0, marginBottom: '12px', color: '#475569', fontSize: '1rem' }}>
                  <span style={{ marginRight: '8px', color: '#2563eb' }}>[*]</span> .SKILL.md 格式
                </h3>
                <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#64748b', lineHeight: '1.6' }}>
                  单文件格式（推荐）<br/>
                  包含 YAML frontmatter<br/>
                  和完整代码
                </div>
              </div>

              <div style={cardStyle}>
                <h3 style={{ marginTop: 0, marginBottom: '12px', color: '#475569', fontSize: '1rem' }}>
                  <span style={{ marginRight: '8px', color: '#2563eb' }}>[#]</span> 文件夹格式
                </h3>
                <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#64748b', lineHeight: '1.6' }}>
                  skill-name/<br/>
                  ├── skill.json (必需)<br/>
                  ├── main.py (必需)<br/>
                  └── README.md
                </div>
              </div>
            </div>

            {/* 上传区域 - 真实上传流程 */}
            <div style={{
              ...cardStyle,
              border: uploadStatus?.status === 'error' ? '2px solid #ef4444' : '2px dashed #cbd5e1',
              background: '#f8fafc',
              textAlign: 'center',
              padding: '48px 24px',
              marginBottom: '24px'
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '12px', color: '#94a3b8' }}>[+]</div>
              <h3 style={{ marginTop: 0, marginBottom: '8px', color: '#475569' }}>
                拖拽文件到此处
              </h3>
              <p style={{ color: '#64748b', marginBottom: '16px' }}>
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
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadStatus?.status === 'uploading'}
                style={{
                  padding: '10px 24px',
                  background: uploadStatus?.status === 'uploading' ? '#94a3b8' : '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '500',
                  cursor: uploadStatus?.status === 'uploading' ? 'wait' : 'pointer',
                  marginBottom: '16px'
                }}
              >
                {uploadStatus?.status === 'uploading' ? '处理中...' : '选择文件'}
              </button>

              {/* 状态显示 */}
              {uploadStatus && (
                <div style={{
                  padding: '16px',
                  borderRadius: '8px',
                  background: uploadStatus.status === 'error' ? '#fee2e2' :
                             uploadStatus.status === 'approved' ? '#dcfce7' :
                             '#fef9c3',
                  color: uploadStatus.status === 'error' ? '#dc2626' :
                         uploadStatus.status === 'approved' ? '#16a34a' :
                         '#ca8a04',
                  marginBottom: '16px'
                }}>
                  <div style={{ fontWeight: '600' }}>
                    {uploadStatus.status === 'uploading' && '↑ 上传中...'}
                    {uploadStatus.status === 'pending' && '⏳ 等待审核...'}
                    {uploadStatus.status === 'auditing' && '🔍 安全审核中 (AI Agent 扫描)...'}
                    {uploadStatus.status === 'approved' && '✓ 审核通过!'}
                    {uploadStatus.status === 'review' && '⚠️ 需要人工复审'}
                    {uploadStatus.status === 'rejected' && '✗ 审核拒绝'}
                    {uploadStatus.status === 'submitting' && '⛓️ 提交上链中...'}
                    {uploadStatus.status === 'on_chain' && '✓ 已上链!'}
                    {uploadStatus.status === 'error' && '✗ 错误'}
                  </div>
                  {uploadStatus.message && uploadStatus.status !== 'error' && (
                    <div style={{ fontSize: '0.9rem', marginTop: '4px' }}>{uploadStatus.message}</div>
                  )}
                </div>
              )}

              {/* 上链结果 */}
              {uploadResult && (
                <div style={{
                  padding: '16px',
                  borderRadius: '8px',
                  background: uploadResult.success ? '#dcfce7' : '#fee2e2',
                  color: uploadResult.success ? '#16a34a' : '#dc2626',
                  textAlign: 'left'
                }}>
                  {uploadResult.success ? (
                    <>
                      <div style={{ fontWeight: '600', marginBottom: '8px' }}>上链成功!</div>
                      <div style={{ fontSize: '0.85rem' }}>
                        <div>Skill ID: <code>{uploadResult.skillId}</code></div>
                        <div>Tx Hash: <code style={{ wordBreak: 'break-all' }}>{uploadResult.txHash}</code></div>
                      </div>
                    </>
                  ) : (
                    <div style={{ fontWeight: '600' }}>
                      {uploadResult.status === 'review' ? '需要人工复审' : '审核失败'}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 正确格式示例 - 展示层级关系 */}
            <div style={cardStyle}>
              <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#475569' }}>
                <span style={{ color: '#2563eb', marginRight: '8px' }}>[v]</span>
                标准格式示例（AgentSkills 基础 + FreeSkill 扩展）
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '16px' }}>
                FreeSkill 在 AgentSkills.io 基础上扩展，先满足基础字段，再添加治理字段
              </p>

              {/* 层级图示 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#166534', marginBottom: '8px' }}>AgentSkills.io 基础字段（必须有）</div>
                  <code style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#166534' }}>
                    name, description, trigger,<br/>
                    metadata (version, author, riskLevel),<br/>
                    scripts (name, language, code),<br/>
                    resources
                  </code>
                </div>
                <div style={{ background: '#eef2ff', padding: '12px', borderRadius: '8px', border: '1px solid #c4b5fd' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#4338ca', marginBottom: '8px' }}>FreeSkill 治理扩展（在其基础上增加）</div>
                  <code style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#4338ca' }}>
                    freeskill (fingerprint, ipfsHash...),<br/>
                    responsibility (liability...),<br/>
                    antiSlash (enabled, slashRate...),<br/>
                    humanAuth (required...)
                  </code>
                </div>
              </div>

              {/* 完整示例 */}
              <div style={{
                background: '#1e293b',
                color: '#e2e8f0',
                padding: '16px',
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontSize: '0.75rem',
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
freeskill:                                  # 新增
  fingerprint: "0x..."
  creator: "0x..."
  ipfsHash: "Qm..."
  stakeRequired: 10
  standard: "freeskill"
responsibility:                            # 新增
  liabilityDeclaration: "我对此技能行为负全部责任"
  scopeDeclaration: "此技能仅访问声明的资源"
antiSlash:                              # 新增
  enabled: true
  slashRate: 0.5
humanAuth:                              # 新增
  required: ["stake", "submit"]
---`}</pre>
              </div>
              <div style={{ marginTop: '12px', fontSize: '0.85rem', color: '#64748b' }}>
                <strong>必需字段：</strong> name, description, trigger, metadata.riskLevel, scripts（基础）+
                freeskill, responsibility, antiSlash（治理扩展）
              </div>
            </div>

            {/* 流程说明 */}
            <div style={{ ...cardStyle, marginTop: '24px', background: '#eff6ff' }}>
              <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#1e40af' }}>上传后流程</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {['上传', '自动解析', '风险评估', '安全审核', '上链'].map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      background: '#2563eb',
                      color: '#fff',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: '500'
                    }}>
                      {i + 1}. {step}
                    </span>
                    {i < 4 && <span style={{ color: '#64748b' }}>→</span>}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* FreeSkill Tab */}
      {activeTab === 'freeskill' && (
        <section style={{ animation: 'fadeIn 0.3s' }}>
          <h2 style={sectionTitle}>FreeSkill 治理扩展</h2>
          <p style={{ color: '#64748b', marginBottom: '24px' }}>
            基于 AgentSkills 的可信技能治理标准，补充完整责任链。
          </p>

          {/* 核心理念 */}
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            padding: '24px',
            borderRadius: '12px',
            marginBottom: '24px'
          }}>
            <h3 style={{ marginTop: 0, color: '#fff' }}>核心理念</h3>
            <p style={{ fontSize: '1.1rem', margin: 0, fontWeight: '600' }}>
              Free by default. Trusted by design.
            </p>
            <p style={{ opacity: 0.9, marginTop: '8px' }}>
              让 Skill 免于混乱的自由 — 让 AI 技能可追溯、可归因、可验证、可惩罚
            </p>
          </div>

          {/* 责任链 */}
          <h3 style={{ marginBottom: '16px', color: '#1e293b' }}>责任链（Responsibility Chain）</h3>
          <div style={{
            ...cardStyle,
            background: '#f8fafc',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { icon: '[*]', text: '创建者签署责任声明' },
                { icon: '[v]', text: '验证者背书' },
                { icon: '[#]', text: '指纹锚定 IPFS' },
                { icon: '[i]', text: '使用记录' },
                { icon: '[@]', text: '审计追踪上链' },
                { icon: '[!]', text: '反噬惩罚' }
              ].map((step, i) => (
                <div key={i} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: '#fff',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  minWidth: '100px'
                }}>
                  <span style={{ fontWeight: '700', color: '#2563eb' }}>{step.icon}</span>
                  <div style={{ fontSize: '0.8rem', textAlign: 'center', marginTop: '4px', color: '#475569' }}>{step.text}</div>
                </div>
              ))}
            </div>
          </div>

          {/* FreeSkill vs 普通技能 */}
          <h3 style={{ marginBottom: '16px', color: '#1e293b' }}>可信技能 vs 普通技能</h3>
          <div style={{ ...cardStyle, marginBottom: '24px', padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>维度</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '600', color: '#64748b' }}>普通技能</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '600', color: '#2563eb' }}>FreeSkill</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { dim: '追溯', normal: '[-]', freeskill: '[#]' },
                  { dim: '归因', normal: '[-]', freeskill: '[v]' },
                  { dim: '验证', normal: '[-]', freeskill: '[v]' },
                  { dim: '授权', normal: '[-]', freeskill: '[!]' },
                  { dim: '反噬', normal: '[-]', freeskill: '[!]' }
                ].map((row, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px 16px', fontWeight: '500', color: '#1e293b' }}>{row.dim}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: '#94a3b8' }}>{row.normal}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: '#16a34a', fontWeight: '600' }}>{row.freeskill}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 必需字段 */}
          <h3 style={{ marginBottom: '16px', color: '#1e293b' }}>FreeSkill 必需字段</h3>
          <div style={{
            background: '#1e293b',
            color: '#e2e8f0',
            padding: '16px',
            borderRadius: '8px',
            fontFamily: 'monospace',
            fontSize: '0.85rem',
            overflowX: 'auto',
            marginBottom: '24px'
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

          {/* 多 Agent 协作流程 */}
          <h3 style={{ marginBottom: '16px', color: '#1e293b' }}>多 Agent 协作标准</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            {[
              { name: 'freeskill-orchestrate', desc: '编排协调', icon: '[*]' },
              { name: 'freeskill-upgrade', desc: '补充责任链', icon: '[+]' },
              { name: 'freeskill-audit', desc: '安全审核', icon: '[v]' },
              { name: 'freeskill-evaluate', desc: '风险评估', icon: '[#]' },
              { name: 'freeskill-chain', desc: '链上提交', icon: '[@]' }
            ].map((skill, i) => (
              <div key={i} style={{
                ...cardStyle,
                padding: '14px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#2563eb', marginBottom: '6px' }}>{skill.icon}</div>
                <div style={{ fontWeight: '600', fontSize: '0.8rem', color: '#1e293b' }}>{skill.name}</div>
                <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '4px' }}>{skill.desc}</div>
              </div>
            ))}
          </div>

          {/* 人类授权检查点 */}
          <h3 style={{ marginBottom: '16px', color: '#1e293b' }}>人类授权检查点</h3>
          <div style={{ ...cardStyle, background: '#fffbeb', border: '1px solid #fbbf24', marginBottom: '24px' }}>
            <table style={{ width: '100%', fontSize: '0.9rem' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', paddingBottom: '10px', color: '#92400e' }}>步骤</th>
               <th style={{ textAlign: 'left', paddingBottom: '10px', color: '#92400e' }}>授权内容</th>
                  <th style={{ textAlign: 'left', paddingBottom: '10px', color: '#92400e' }}>触发条件</th>
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
                  <tr key={i} style={{ borderTop: '1px solid #fde68a' }}>
                    <td style={{ padding: '8px 0', fontFamily: 'monospace', color: '#7c3aed', fontWeight: '600' }}>{row.step}</td>
                    <td style={{ padding: '8px 0', color: '#1e293b' }}>{row.auth}</td>
                    <td style={{ padding: '8px 0', color: '#64748b' }}>{row.trigger}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 向后兼容说明 */}
          <div style={{
            padding: '16px',
            background: '#f0fdf4',
            borderRadius: '8px',
            border: '1px solid #bbf7d0'
          }}>
            <strong style={{ color: '#166534' }}>[*] 向后兼容</strong>
            <p style={{ margin: '8px 0 0 0', color: '#166534', fontSize: '0.9rem' }}>
              FreeSkill 完全兼容 AgentSkills.io — 原有字段保持不变，新增加治字段可选添加。
            </p>
          </div>
        </section>
      )}

      {/* 元技能 Tab */}
      {activeTab === 'metaskills' && (
        <section style={{ animation: 'fadeIn 0.3s' }}>
          <h2 style={sectionTitle}>FreeSkill 元技能</h2>
          <p style={{ color: '#64748b', marginBottom: '24px' }}>
            基于 FreeSkill 规范的元技能，用于创建和升级符合治理标准的技能
          </p>

          {/* 元技能卡片 */}
          <div style={{ display: 'grid', gap: '24px', marginBottom: '32px' }}>
            {/* freeskill-create */}
            <div style={{ ...cardStyle, border: '2px solid #6366f1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ background: '#6366f1', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>[+]</span>
                    freeskill-create
                  </h3>
                  <p style={{ color: '#64748b', margin: '8px 0 0 0', fontSize: '0.9rem' }}>
                    创建符合 FreeSkill 规范的新技能
                  </p>
                </div>
                <a
                  href="/downloads/freeskill-create.FREESKILL.md"
                  download
                  style={{
                    padding: '10px 20px',
                    background: '#6366f1',
                    color: '#fff',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: '500',
                    fontSize: '0.9rem'
                  }}
                >
                  [v] 下载
                </a>
              </div>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '8px' }}>
                  <strong>触发条件：</strong>
                </div>
                <code style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#475569' }}>
                    create freeskill {"{skill_name}"} with description {"{description}"} and trigger {"{trigger}"}
                  </code>
              </div>
              <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                <div style={{ background: '#fef3c7', padding: '12px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#92400e' }}>风险等级</div>
                  <div style={{ fontWeight: '600', color: '#92400e' }}>MEDIUM</div>
                </div>
                <div style={{ background: '#dbeafe', padding: '12px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#1e40af' }}>验证者</div>
                  <div style={{ fontWeight: '600', color: '#1e40af' }}>2</div>
                </div>
                <div style={{ background: '#dcfce7', padding: '12px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#166534' }}>质押</div>
                  <div style={{ fontWeight: '600', color: '#166534' }}>50 ether</div>
                </div>
              </div>
            </div>

            {/* freeskill-upgrade */}
            <div style={{ ...cardStyle, border: '2px solid #8b5cf6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ background: '#8b5cf6', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>[#]</span>
                    freeskill-upgrade
                  </h3>
                  <p style={{ color: '#64748b', margin: '8px 0 0 0', fontSize: '0.9rem' }}>
                    将现有 AgentSkills 技能升级为 FreeSkill 规范
                  </p>
                </div>
                <a
                  href="/downloads/freeskill-upgrade.FREESKILL.md"
                  download
                  style={{
                    padding: '10px 20px',
                    background: '#8b5cf6',
                    color: '#fff',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: '500',
                    fontSize: '0.9rem'
                  }}
                >
                  [v] 下载
                </a>
              </div>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '8px' }}>
                  <strong>触发条件：</strong>
                </div>
                <code style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#475569' }}>
                    upgrade skill {"{skill_name}"} to freeskill with author {"{author_address}"}
                  </code>
              </div>
              <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                <div style={{ background: '#fef3c7', padding: '12px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#92400e' }}>风险等级</div>
                  <div style={{ fontWeight: '600', color: '#92400e' }}>MEDIUM</div>
                </div>
                <div style={{ background: '#dbeafe', padding: '12px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#1e40af' }}>验证者</div>
                  <div style={{ fontWeight: '600', color: '#1e40af' }}>2</div>
                </div>
                <div style={{ background: '#dcfce7', padding: '12px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#166534' }}>质押</div>
                  <div style={{ fontWeight: '600', color: '#166534' }}>50 ether</div>
                </div>
              </div>
            </div>
          </div>

          {/* 功能对比 */}
          <h3 style={{ marginBottom: '16px', color: '#1e293b' }}>功能说明</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={cardStyle}>
              <h4 style={{ marginTop: 0, marginBottom: '12px', color: '#6366f1' }}>[*] freeskill-create</h4>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#64748b', fontSize: '0.9rem', lineHeight: '1.8' }}>
                <li>输入技能名称、描述、触发条件、代码</li>
                <li>自动生成 FreeSkill 治理字段</li>
                <li>计算指纹: keccak256(ipfsHash + creator + timestamp)</li>
                <li>输出完整 .FREESKILL.md 文件</li>
              </ul>
            </div>
            <div style={cardStyle}>
              <h4 style={{ marginTop: 0, marginBottom: '12px', color: '#8b5cf6' }}>[*] freeskill-upgrade</h4>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#64748b', fontSize: '0.9rem', lineHeight: '1.8' }}>
                <li>解析现有 .SKILL.md 文件</li>
                <li>保留所有原始字段不变</li>
                <li>自动添加 FreeSkill 治理字段</li>
                <li>输出升级后的 .FREESKILL.md 文件</li>
              </ul>
            </div>
          </div>

          {/* 治理字段 */}
          <h3 style={{ marginBottom: '16px', color: '#1e293b' }}>添加的治理字段</h3>
          <div style={{ ...cardStyle, overflow: 'hidden', padding: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>字段</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>说明</th>
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
                  <tr key={i} style={{ borderTop: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '10px 16px', fontFamily: 'monospace', color: '#7c3aed' }}>{row.field}</td>
                    <td style={{ padding: '10px 16px', color: '#64748b' }}>{row.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 参考文档 */}
          <div style={{ marginTop: '24px', ...cardStyle, background: '#eff6ff' }}>
            <h4 style={{ marginTop: 0, marginBottom: '12px', color: '#1e40af' }}>[i] 参考文档</h4>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.9rem' }}>
              <a href="/downloads/README.md" download style={{ color: '#2563eb', textDecoration: 'none' }}>[v] 下载说明</a>
              <span style={{ color: '#94a3b8' }}>|</span>
              <span style={{ color: '#64748b' }}>FreeSkill 规范: FREESKILL_STANDARD.md</span>
              <span style={{ color: '#94a3b8' }}>|</span>
              <span style={{ color: '#64748b' }}>AgentSkills 规范: SKILLS_STANDARD.md</span>
            </div>
          </div>
        </section>
      )}

      {/* 页脚 */}
      <footer style={{
        marginTop: '48px',
        paddingTop: '24px',
        borderTop: '1px solid #e5e7eb',
        textAlign: 'center',
        color: '#64748b',
        fontSize: '0.875rem'
      }}>
        <p>AgentSkills 协议演示 · 基于 SKILLS_STANDARD.md v1.1</p>
        <p style={{ fontSize: '0.8rem', marginTop: '8px' }}>
          合约地址（本地测试网）:<br />
          ASKToken: 0x5fbdb... | SkillRegistry: 0xe7f172...
        </p>
      </footer>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        input:focus, select:focus, textarea:focus {
          border-color: #2563eb !important;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
        }
      `}</style>
    </div>
  );
}