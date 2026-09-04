import React from 'react'
import { useTranslation } from 'react-i18next'

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation()
  const currentLang = i18n.language || 'zh-CN'
  const isEnglish = currentLang.startsWith('en')

  const toggleLanguage = () => {
    const next = isEnglish ? 'zh-CN' : 'en-US'
    i18n.changeLanguage(next)
  }

  return (
    <button
      className="language-switcher"
      onClick={toggleLanguage}
      aria-label={t('language.switch')}
      title={t('language.switch')}
    >
      <span className="language-switcher-flag">{isEnglish ? '🇺🇸' : '🇨🇳'}</span>
      <span className="language-switcher-text">{isEnglish ? t('language.en') : t('language.zh')}</span>
    </button>
  )
}
