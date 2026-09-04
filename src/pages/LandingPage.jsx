import React from 'react'
import { useTranslation } from 'react-i18next'

export default function LandingPage({ onStart, onUpload }) {
  const { t } = useTranslation()

  return (
    <div className="animate-fade-in">
      <section className="container hero-section">
        <div className="hero-badge">
          <span>✦</span>
          <span>{t('landing.badge')}</span>
        </div>
        <h1 className="hero-title text-gradient">{t('landing.title')}</h1>
        <p className="hero-subtitle">
          {t('landing.subtitle')}
        </p>
        <div className="hero-cta">
          <button className="btn btn-primary btn-lg" onClick={() => onStart('browser')}>
            {t('landing.exploreSkills')}
          </button>
          <button className="btn btn-secondary btn-lg" onClick={() => document.getElementById('value').scrollIntoView({ behavior: 'smooth' })}>
            {t('landing.seeValue')}
          </button>
        </div>
        <div className="hero-cta hero-cta-secondary" style={{ marginTop: 'var(--space-4)' }}>
          <button className="btn btn-primary btn-lg" onClick={onUpload}>
            {t('landing.uploadSkill')}
          </button>
          <span className="hero-cta-hint">{t('landing.uploadHint')}</span>
        </div>
      </section>

      <section id="value" className="container prototype-section">
        <div className="section-header">
          <span className="section-label">{t('landing.valueSection.label')}</span>
          <h2 className="section-title">{t('landing.valueSection.title')}</h2>
          <p className="section-desc">
            {t('landing.valueSection.desc')}
          </p>
        </div>
        <div className="value-grid">
          <div className="value-card">
            <div className="value-icon">🔧</div>
            <h3>{t('landing.valueSection.user.title')}</h3>
            <p>{t('landing.valueSection.user.desc')}</p>
          </div>
          <div className="value-card value-card-highlight">
            <div className="value-icon">🚀</div>
            <h3>{t('landing.valueSection.creator.title')}</h3>
            <p>{t('landing.valueSection.creator.desc')}</p>
            <button className="btn btn-primary btn-sm" onClick={onUpload} style={{ marginTop: 'var(--space-3)' }}>
              {t('landing.uploadSkill')}
            </button>
          </div>
          <div className="value-card">
            <div className="value-icon">🏅</div>
            <h3>{t('landing.valueSection.auditor.title')}</h3>
            <p>{t('landing.valueSection.auditor.desc')}</p>
          </div>
        </div>
      </section>

      <section id="how" className="container prototype-section">
        <div className="section-header">
          <span className="section-label">{t('landing.howSection.label')}</span>
          <h2 className="section-title">{t('landing.howSection.title')}</h2>
          <p className="section-desc">
            {t('landing.howSection.desc')}
          </p>
        </div>
        <div className="steps">
          <div className="step-card">
            <h3>{t('landing.howSection.browse.title')}</h3>
            <p>{t('landing.howSection.browse.desc')}</p>
          </div>
          <div className="step-card step-card-highlight">
            <h3>{t('landing.howSection.publish.title')}</h3>
            <p>{t('landing.howSection.publish.desc')}</p>
            <button className="btn btn-primary btn-sm" onClick={onUpload} style={{ marginTop: 'var(--space-3)' }}>
              {t('landing.uploadSkill')}
            </button>
          </div>
          <div className="step-card">
            <h3>{t('landing.howSection.contribute.title')}</h3>
            <p>{t('landing.howSection.contribute.desc')}</p>
          </div>
          <div className="step-card">
            <h3>{t('landing.howSection.reputation.title')}</h3>
            <p>{t('landing.howSection.reputation.desc')}</p>
          </div>
        </div>
      </section>

      <section className="container prototype-section">
        <div className="model-banner">
          <h3>{t('landing.trustBanner.title')}</h3>
          <p>
            {t('landing.trustBanner.desc')}
          </p>
        </div>
      </section>

      <section id="faq" className="container prototype-section">
        <div className="section-header">
          <span className="section-label">{t('landing.faq.label')}</span>
          <h2 className="section-title">{t('landing.faq.title')}</h2>
          <p className="section-desc">
            {t('landing.faq.desc')}
          </p>
        </div>
        <div className="faq-list">
          <div className="faq-item">
            <h3 className="faq-question">{t('landing.faq.q1')}</h3>
            <p className="faq-answer">{t('landing.faq.a1')}</p>
          </div>
          <div className="faq-item">
            <h3 className="faq-question">{t('landing.faq.q2')}</h3>
            <p className="faq-answer">{t('landing.faq.a2')}</p>
          </div>
          <div className="faq-item">
            <h3 className="faq-question">{t('landing.faq.q3')}</h3>
            <p className="faq-answer">{t('landing.faq.a3')}</p>
          </div>
          <div className="faq-item">
            <h3 className="faq-question">{t('landing.faq.q4')}</h3>
            <p className="faq-answer">{t('landing.faq.a4')}</p>
          </div>
          <div className="faq-item">
            <h3 className="faq-question">{t('landing.faq.q5')}</h3>
            <p className="faq-answer">{t('landing.faq.a5')}</p>
          </div>
          <div className="faq-item">
            <h3 className="faq-question">{t('landing.faq.q6')}</h3>
            <p className="faq-answer">{t('landing.faq.a6')}</p>
          </div>
        </div>
      </section>
    </div>
  )
}
