import React from 'react'

export default function LandingPage({ onStart }) {
  return (
    <div className="animate-fade-in">
      <section className="container hero-section">
        <div className="hero-badge">
          <span>✦</span>
          <span>无代币声誉协议</span>
        </div>
        <h1 className="hero-title text-gradient">加入 Agent Skill 声誉网络</h1>
        <p className="hero-subtitle">
          在这里，你的每一次贡献、验证与治理参与都会被记录为不可篡改的声誉。
          无需购买代币，也无需复杂许可——只要你创造价值，就能赢得信任与权限。
        </p>
        <div className="hero-cta">
          <button className="btn btn-primary btn-lg" onClick={() => onStart('browser')}>
            开始探索技能
          </button>
          <button className="btn btn-secondary btn-lg" onClick={() => document.getElementById('how').scrollIntoView({ behavior: 'smooth' })}>
            了解如何参与
          </button>
        </div>
      </section>

      <section id="value" className="container prototype-section">
        <div className="section-header">
          <span className="section-label">为何参与</span>
          <h2 className="section-title">贡献即声誉，声誉即权限</h2>
          <p className="section-desc">
            我们摒弃了代币投机，用可验证的行为记录构建真正的责任生态。
            你的技能、审核与运营贡献，都会转化为可迁移的链上声誉。
          </p>
        </div>
        <div className="value-grid">
          <div className="value-card">
            <div className="value-icon">🏗️</div>
            <h3>发布技能</h3>
            <p>把你擅长的 Agent 能力注册为 Skill，经过社区验证后获得声誉加成。风险越高、责任越大，回报越显著。</p>
          </div>
          <div className="value-card">
            <div className="value-icon">🔍</div>
            <h3>验证质量</h3>
            <p>通过测试报告、风险评估和同行审核帮助过滤低质技能。优质验证会提升你的专家声誉。</p>
          </div>
          <div className="value-card">
            <div className="value-icon">⚖️</div>
            <h3>参与治理</h3>
            <p>声誉越高，可验证的技能等级越高，参与协议决策的权重也越大。这里没有鲸鱼，只有贡献者。</p>
          </div>
        </div>
      </section>

      <section id="how" className="container prototype-section">
        <div className="section-header">
          <span className="section-label">如何参与</span>
          <h2 className="section-title">四步开启你的声誉之旅</h2>
          <p className="section-desc">
            不需要预付资金，也不需要通过中心化审核。只要一个钱包，就能开始为 Agent Skill 生态做贡献。
          </p>
        </div>
        <div className="steps">
          <div className="step-card">
            <h3>连接钱包</h3>
            <p>使用内置钱包或浏览器钱包创建身份。你的地址就是你的声誉账户。</p>
          </div>
          <div className="step-card">
            <h3>注册技能</h3>
            <p>上传 Skill 元数据与指纹，选择风险等级。低风险技能门槛低，高风险技能需要更多声誉背书。</p>
          </div>
          <div className="step-card">
            <h3>验证与审核</h3>
            <p>为其他技能提交测试报告或参与同行验证。被采纳的审核会为你积累正向声誉。</p>
          </div>
          <div className="step-card">
            <h3>获得权限</h3>
            <p>声誉提升后，你可以验证更高风险技能、参与协议治理，并分享生态收益。</p>
          </div>
        </div>
      </section>

      <section className="container prototype-section">
        <div className="model-banner">
          <h3>无代币，零门槛，纯声誉</h3>
          <p>
            AgentSkills 不相信“先买币再参与”。我们相信：责任来自行为，信任来自记录。
            通过质押、验证与反 slash 机制，让高质量贡献者自然浮出水面。
          </p>
        </div>
      </section>
    </div>
  )
}
