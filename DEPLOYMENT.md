# AgentSkills 部署架构设计

## 核心问题

| 问题 | 回答 |
|------|------|
| **是否允许多部署？** | ✅ **是的，完全支持** |
| **是否允许分散部署？** | ✅ **是的，去中心化设计** |
| **是否支持国际化？** | ✅ **是的，中英日韩** |

---

## 1. 多部署架构

```
┌─────────────────────────────────────────────────────────────┐
│                    AgentSkills 去中心化网络                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐             │
│   │ 主节点   │◄──►│ 社区节点 │◄──►│ 矿工节点 │             │
│   │ (官方)  │    │ (任何用户)│    │ (任何用户)│             │
│   └──────────┘    └──────────┘    └──────────┘             │
│        │               │               │                    │
│        └───────────────┴───────────────┘                    │
│                        │                                    │
│                        ▼                                    │
│              ┌──────────────────┐                          │
│              │   共享合约地址   │                          │
│              │ (Polygon Amoy)  │                          │
│              └──────────────────┘                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 部署类型

| 类型 | 描述 | 谁运行 |
|------|------|--------|
| **官方主站** | 主界面 + 最新功能 | 官方团队 |
| **社区镜像** | 社区运营的界面 | 任何社区 |
| **个人部署** | 完全独立的界面 | 任何用户 |
| **白标版本** | 品牌定制版本 | 合作伙伴 |

---

## 2. 部署配置

### 配置文件结构

```json
// deploy.config.json
{
  "version": "1.4.0",
  "network": {
    "chainId": 80002,
    "chainName": "Polygon Amoy",
    "contracts": {
      "ASKToken": "0x...",
      "SkillRegistry": "0x...",
      "StakingManager": "0x...",
      "Attribution": "0x..."
    }
  },
  "features": {
    "i18n": {
      "default": "en",
      "supported": ["zh", "en", "ja", "ko"]
    },
    "referral": true,
    "contentRewards": true,
    "communityBot": false
  },
  "appearance": {
    "theme": "dark",
    "branding": {
      "name": "AgentSkills",
      "logo": "/logo.svg",
      "primaryColor": "#2563eb"
    }
  },
  "branding": {
    "customName": "My AgentSkills",
    "customLogo": "https://...",
    "customColors": false,
    "footerLinks": [
      { "text": "About", "url": "/about" },
      { "text": "Discord", "url": "https://discord.gg/..." }
    ]
  }
}
```

### 启动命令

```bash
# 官方部署
npm run deploy -- --mode official

# 社区镜像
npm run deploy -- --mode community --config ./my-config.json

# 个人部署
npm run deploy -- --mode personal --name "MyAgentSkills"
```

---

## 3. 国际化 (i18n) 支持

### 语言支持

| 语言 | 代码 | 状态 |
|------|------|------|
| 中文 | `zh` | ✅ 完全支持 |
| English | `en` | ✅ 完全支持 |
| 日本語 | `ja` | ✅ 支持 |
| 한국어 | `ko` | ✅ 支持 |

### 翻译文件结构

```
src/i18n/
├── index.jsx          # 核心翻译函数
├── zh.json           # 中文翻译
├── en.json           # 英文翻译
├── ja.json           # 日文翻译
└── ko.json           # 韩文翻译
```

### 使用方式

```jsx
import { useI18n } from './i18n'

function SkillCard() {
  const { t, lang, setLang } = useI18n()

  return (
    <div>
      <h3>{t('skill.title')}</h3>
      <span>{t('skill.likes')}</span>

      {/* 语言切换器 */}
      <select onChange={(e) => setLang(e.target.value)} value={lang}>
        <option value="zh">中文</option>
        <option value="en">English</option>
        <option value="ja">日本語</option>
        <option value="ko">한국어</option>
      </select>
    </div>
  )
}
```

### 自动检测

```javascript
// 优先级：
// 1. URL参数 ?lang=zh
// 2. localStorage 保存的语言
// 3. 浏览器语言
// 4. 默认英文

function detectLanguage() {
  const urlLang = new URLSearchParams(window.location.search).get('lang')
  if (urlLang) return urlLang

  const savedLang = localStorage.getItem('agentskills-lang')
  if (savedLang) return savedLang

  const browserLang = navigator.language.split('-')[0]
  return ['zh', 'en', 'ja', 'ko'].includes(browserLang) ? browserLang : 'en'
}
```

---

## 4. 分散部署流程

### 步骤 1: Fork 项目

```bash
git clone https://github.com/agentskills/agentskills.git
cd agentskills
```

### 步骤 2: 配置

```bash
cp deploy.config.example.json deploy.config.json
# 编辑 deploy.config.json
```

### 步骤 3: 自定义

```bash
# 修改品牌
npm run customize -- --name "MySkillMarket" --logo ./my-logo.svg

# 选择语言
npm run customize -- --lang zh,en

# 选择功能模块
npm run customize -- --features referral,contentRewards
```

### 步骤 4: 部署

```bash
# Vercel
vercel --prod

# Netlify
netlify deploy --prod --dir=dist

# GitHub Pages
npm run build && gh-pages -d dist
```

---

## 5. 数据同步

```
┌─────────────────────────────────────────────────────────────┐
│                    数据流                                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   前端 A (中文) ──┐                                         │
│                   ├──► 共享合约 (Polygon Amoy) ──► 全局数据   │
│   前端 B (English)─┘                                         │
│                                                              │
│   前端 C (日文) ──┐                                         │
│                   ├──► IPFS (内容) ──► 分布式存储            │
│   前端 D (韩文) ──┘                                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 多语言内容同步

```javascript
// 每个前端都连接同一个合约
// 合约返回的数据由请求语言决定显示语言

const contract = new ethers.Contract(address, abi, provider)

// 请求中文数据
const skills = await contract.getSkills(lang: 'zh')

// 请求英文数据
const skills = await contract.getSkills(lang: 'en')
```

---

## 6. 部署选项汇总

| 平台 | 特点 | 适合场景 |
|------|------|----------|
| **Vercel** | 自动 HTTPS, CDN, 预览部署 | 快速上线 |
| **Netlify** | 静态托管, 表单处理 | 社区版本 |
| **GitHub Pages** | 免费, 简单 | 个人部署 |
| **Cloudflare Pages** | 全球 CDN, Workers | 高性能 |
| **自建服务器** | 完全控制 | 企业/商业 |

---

## 7. 白标定制

```bash
# 创建白标版本
npm run whitelabel \
  --name "SkillHub" \
  --logo "./brands/skillhub/logo.png" \
  --primary "#10b981" \
  --footer "Powered by SkillHub"
```

白标版本可以：
- 使用自定义品牌名称
- 使用自定义 Logo
- 修改主题颜色
- 添加自定义链接
- 修改底部版权

---

## 8. 限制说明

**允许的：**
- ✅ 完全 fork 和部署
- ✅ 修改界面和品牌
- ✅ 使用不同语言
- ✅ 连接到相同合约
- ✅ 创建白标版本

**需要遵守的：**
- ⚠️ 合约地址需要与官方同步（才能读写同一数据）
- ⚠️ 不能修改核心逻辑（会影响合约交互）
- ⚠️ 白标版本需要注明基于 AgentSkills

---

## 9. 快速开始

```bash
# 1. Clone
git clone https://github.com/agentskills/agentskills.git

# 2. 安装
npm install

# 3. 配置 (使用默认中文)
cp .env.example .env

# 4. 启动本地开发
npm run dev

# 5. 构建
npm run build

# 6. 部署到 Vercel
vercel --prod
```

---

*本文档定义了 AgentSkills 的去中心化部署架构*