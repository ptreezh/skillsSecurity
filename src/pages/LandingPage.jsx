import React from 'react'

export default function LandingPage({ onStart }) {
  return (
    <div className="animate-fade-in">
      <section className="container hero-section">
        <div className="hero-badge">
          <span>✦</span>
          <span>可信 Agent 技能市场</span>
        </div>
        <h1 className="hero-title text-gradient">发现与共建高质量的 Agent 技能</h1>
        <p className="hero-subtitle">
          AgentSkills 连接技能创作者、使用者和领域专家。每个 Skill 都经过公开验证与声誉背书，
          让你找工具更放心、发技能被看见、做审核有回报。
        </p>
        <div className="hero-cta">
          <button className="btn btn-primary btn-lg" onClick={() => onStart('browser')}>
            探索技能库
          </button>
          <button className="btn btn-secondary btn-lg" onClick={() => document.getElementById('value').scrollIntoView({ behavior: 'smooth' })}>
            看看你能获得什么
          </button>
        </div>
      </section>

      <section id="value" className="container prototype-section">
        <div className="section-header">
          <span className="section-label">平台价值</span>
          <h2 className="section-title">不同角色，都能在这里获得可信价值</h2>
          <p className="section-desc">
            不管你是想使用 Agent 技能、发布自己的技能，还是成为质量审核专家，
            AgentSkills 都为你提供透明、可验证的声誉与机会。
          </p>
        </div>
        <div className="value-grid">
          <div className="value-card">
            <div className="value-icon">🔧</div>
            <h3>使用者：用得放心</h3>
            <p>浏览经过验证的 Agent Skills，查看评分、审核记录和创作者声誉。降低试错成本，找到真正可靠的工具。</p>
          </div>
          <div className="value-card">
            <div className="value-icon">🚀</div>
            <h3>创作者：被看见、被信任</h3>
            <p>把你的 Agent 能力发布为 Skill，通过社区验证建立专业声誉。优质技能会获得更多曝光和使用机会。</p>
          </div>
          <div className="value-card">
            <div className="value-icon">🏅</div>
            <h3>审核者：建立专家影响力</h3>
            <p>通过测试、评估和同行审核为优质技能背书。你的专业判断会转化为可迁移的行业声誉。</p>
          </div>
        </div>
      </section>

      <section id="how" className="container prototype-section">
        <div className="section-header">
          <span className="section-label">如何开始</span>
          <h2 className="section-title">三步进入 Agent 技能生态</h2>
          <p className="section-desc">
            无需复杂流程，从浏览到贡献只需要几分钟。
          </p>
        </div>
        <div className="steps">
          <div className="step-card">
            <h3>浏览与发现</h3>
            <p>在技能库中按类别、评分、风险等级筛选，找到适合你场景的 Agent Skill。</p>
          </div>
          <div className="step-card">
            <h3>使用或发布</h3>
            <p>直接调用已验证技能；或者注册自己的 Skill，让社区看到你的能力。</p>
          </div>
          <div className="step-card">
            <h3>贡献与验证</h3>
            <p>提交使用反馈、测试报告或审核意见。有价值的贡献会记录在你的声誉档案中。</p>
          </div>
          <div className="step-card">
            <h3>积累声誉</h3>
            <p>声誉越高，你能发布和验证的技能等级越高，在生态中的话语权和机会也越大。</p>
          </div>
        </div>
      </section>

      <section className="container prototype-section">
        <div className="model-banner">
          <h3>为什么 AgentSkills 更可信</h3>
          <p>
            每个 Skill 的行为记录、验证历史和贡献者声誉都公开可查。没有暗箱操作，
            只有可验证的质量。我们相信：好技能会自己说话，好贡献者会被看见。
          </p>
        </div>
      </section>
    </div>
  )
}
