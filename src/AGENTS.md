# FRONTEND

**React + Vite · JSX · Embedded identity · Chinese UI · Browser never touches the chain**

## OVERVIEW
Frontend for the AgentSkills ecosystem — skill browser, reputation dashboards, protocol demo, and operations panel. User-facing interface for the "Responsibility Vacuum" prototype.

## CHAIN ACCESS (READ FIRST)
ChainMaker `chain1` has **no browser-reachable JSON-RPC**. Therefore:
- All on-chain reads/writes go through the backend gateway. The browser never connects to the chain directly.
- `services/ChainDataService.js` is the **only** chain data layer (REST: `/api/skills`, `/api/reputation/:address`, `/api/leaderboard`, `/api/stats`, `/api/health`).
- Writes reuse the existing upload pipeline (`/api/upload` → `/api/status/:jobId` → `/api/chain`).
- `services/WalletService.js` is an **identity layer only** — no provider, no signer, no contract instances, no token balance.

Do not reintroduce `ethers` providers, ABIs, or contract instances into `src/`. That path was removed in the ChainMaker migration and cannot work.

## STRUCTURE
```
src/
├── main.jsx                     # Entry point (routing, identity init)
├── components/
│   ├── LanguageSwitcher.jsx     # zh-CN / en-US toggle
│   ├── SkillBrowser.jsx         # Skill browsing + reputation sort
│   └── common/                  # ChartContainer, EmptyState
├── pages/
│   ├── LandingPage.jsx          # Entry / overview
│   ├── UserProfile.jsx          # User reputation center (Art.2)
│   ├── Leaderboard.jsx          # Global reputation board (Art.3)
│   ├── ProtocolDemo.jsx         # Protocol interaction demo
│   └── DeployerDashboard.jsx    # Deployer incentive dashboard
├── services/
│   ├── ChainDataService.js      # ONLY chain data layer (backend REST gateway)
│   ├── WalletService.js         # Embedded identity (no provider/signer)
│   ├── uploadService.js         # Skill upload pipeline
│   └── apiConfig.js             # API base resolution
├── i18n/                        # i18next (zh-CN default, en-US present)
└── styles/                      # tokens.css, components.css, enhanced.css
```

## WHERE TO LOOK
| Task | File |
|------|------|
| Entry / routing | main.jsx |
| Skill browsing | components/SkillBrowser.jsx |
| User reputation | pages/UserProfile.jsx |
| Leaderboard | pages/Leaderboard.jsx |
| Identity / connection | services/WalletService.js |
| **Chain reads** | services/ChainDataService.js |
| **Chain writes** | services/uploadService.js |
| Design tokens | styles/tokens.css |

## CONVENTIONS
- JSX with React hooks (useState, useEffect)
- Chinese UI labels (宪法 references inline)
- CSS via separate stylesheets
- Embedded identity — no MetaMask, no browser extension

## ANTI-PATTERNS
- Do not add governance fields to skill browsing UI (paper core finding)
- Do not bypass `WalletService` for identity operations
- Do not add `ethers` / RPC / ABI / contract-instance code to `src/` — chain access is backend-only
- Keep i18n Chinese-first (research demo target)

## KNOWN DEVIATION
`i18n/locales/en-US.json` and `LanguageSwitcher.jsx` exist despite the Chinese-first convention. Needs a decision: keep as demo affordance, or drop to honor the convention. Not yet resolved.