/**
 * AgentSkills i18n (Internationalization)
 * 支持: 中文, English, 日本語, 한국어
 */

export const translations = {
  // Navigation
  nav: {
    skills: { zh: '技能浏览器', en: 'Skills', ja: 'スキル', ko: '스킬' },
    demo: { zh: '协议演示', en: 'Demo', ja: 'デモ', ko: '데모' },
    leaderboard: { zh: '排行榜', en: 'Leaderboard', ja: 'ランキング', ko: '리더보드' },
    profile: { zh: '我的声誉', en: 'My Reputation', ja: 'プロフィール', ko: '내 평판' },
  },

  // Common
  common: {
    loading: { zh: '加载中...', en: 'Loading...', ja: '読み込み中...', ko: '로딩 중...' },
    connect: { zh: '连接钱包', en: 'Connect Wallet', ja: '接続', ko: '지갑 연결' },
    disconnect: { zh: '断开', en: 'Disconnect', ja: '切断', ko: '연결 해제' },
    search: { zh: '搜索...', en: 'Search...', ja: '検索...', ko: '검색...' },
    noResults: { zh: '暂无结果', en: 'No results', ja: '結果なし', ko: '결과 없음' },
  },

  // Skill Browser
  skill: {
    title: { zh: 'AI 技能市场', en: 'AI Skill Marketplace', ja: 'AIスキルマーケット', ko: 'AI 스킬 마켓' },
    likes: { zh: '点赞', en: 'Likes', ja: 'いいね', ko: '좋아요' },
    verified: { zh: '已验证', en: 'Verified', ja: '検証済み', ko: '검증됨' },
    unverified: { zh: '未验证', en: 'Unverified', ja: '未検証', ko: '미검증' },
    riskLevel: { zh: '风险等级', en: 'Risk Level', ja: 'リスクレベル', ko: '위험 수준' },
    creator: { zh: '创建者', en: 'Creator', ja: '作成者', ko: '생성자' },
    reputation: { zh: '声誉', en: 'Reputation', ja: '評判', ko: '평판' },
  },

  // Risk Levels
  risk: {
    low: { zh: '低风险', en: 'LOW', ja: '低', ko: '낮음' },
    medium: { zh: '中风险', en: 'MEDIUM', ja: '中', ko: '중간' },
    high: { zh: '高风险', en: 'HIGH', ja: '高', ko: '높음' },
    critical: { zh: '极高风险', en: 'CRITICAL', ja: '超高', ko: '위험' },
  },

  // Reputation Tiers
  tier: {
    observer: { zh: '观察者', en: 'Observer', ja: 'オブザーバー', ko: '옵저버' },
    contributor: { zh: '贡献者', en: 'Contributor', ja: 'コントリビューター', ko: '기여자' },
    trusted: { zh: '信用者', en: 'Trusted', ja: 'トラステッド', ko: '신뢰' },
    guardian: { zh: '守护者', en: 'Guardian', ja: 'ガーディアン', ko: '가디언' },
    elder: { zh: '长老', en: 'Elder', ja: 'エルダー', ko: '엘더' },
  },

  // Leaderboard
  leaderboard: {
    title: { zh: '声誉排行榜', en: 'Reputation Leaderboard', ja: '評判ランキング', ko: '평판 리더보드' },
    rank: { zh: '排名', en: 'Rank', ja: '順位', ko: '순위' },
    user: { zh: '用户', en: 'User', ja: 'ユーザー', ko: '사용자' },
    effective: { zh: '有效声誉', en: 'Effective', ja: '有効', ko: '유효' },
    staked: { zh: '质押', en: 'Staked', ja: 'ステーク', ko: '스테이크' },
    level: { zh: '等级', en: 'Level', ja: 'レベル', ko: '레벨' },
  },

  // Profile
  profile: {
    title: { zh: '个人资料', en: 'Profile', ja: 'プロフィール', ko: '프로필' },
    myLevel: { zh: '我的等级', en: 'My Level', ja: 'マイレベル', ko: '내 레벨' },
    myRep: { zh: '我的声誉', en: 'My Reputation', ja: 'マイ評判', ko: '내 평판' },
    myStakes: { zh: '我的质押', en: 'My Stakes', ja: 'マイステーク', ko: '내 스테이크' },
    vesting: { zh: '解锁进度', en: 'Vesting', ja: 'ヴェスティング', ko: '베스팅' },
    locked: { zh: '已锁定', en: 'Locked', ja: 'ロック中', ko: '잠금' },
  },

  // Messages
  msg: {
    connectPrompt: { zh: '连接钱包查看您的声誉', en: 'Connect wallet to view your reputation', ja: 'ウォレットを接続して評判を表示', ko: '지갑을 연결하여 평판 확인' },
    noSkills: { zh: '暂无技能，部署合约后开始使用', en: 'No skills yet. Deploy contracts to start.', ja: 'スキルなし。コントラクトをデプロイして開始', ko: '스킬 없음. 컨트랙트 배포 후 시작' },
    dailyLimit: { zh: '已达每日点赞上限 (5次)', en: 'Daily like limit reached (5)', ja: '1日のいいね上限 (5)', ko: '하루 좋아요 제한 (5)' },
  }
}

// Language detection
export function detectLanguage() {
  const browserLang = navigator.language || 'en'
  const lang = browserLang.split('-')[0]
  return ['zh', 'en', 'ja', 'ko'].includes(lang) ? lang : 'en'
}

// Translation function
export function t(key, lang = detectLanguage()) {
  const keys = key.split('.')
  let value = translations

  for (const k of keys) {
    value = value?.[k]
  }

  return value?.[lang] || value?.en || key
}

// Language switcher context
import { createContext, useContext, useState } from 'react'

const I18nContext = createContext()

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(detectLanguage())

  const changeLang = (newLang) => {
    setLang(newLang)
    localStorage.setItem('agentskills-lang', newLang)
  }

  return (
    <I18nContext.Provider value={{ lang, setLang: changeLang, t: (key) => t(key, lang) }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}