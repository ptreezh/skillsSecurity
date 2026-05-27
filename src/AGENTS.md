# FRONTEND

**React + Vite · JSX · Embedded wallet · Chinese UI**

## OVERVIEW
Frontend MVP for the AgentSkills ecosystem — skill browser, reputation dashboards, governance visualization, and self-operations panel. Serves as the user-facing interface for the "Responsibility Vacuum" prototype.

## STRUCTURE
```
src/
├── main.jsx                 # Entry point (routing, wallet init)
├── server.js                # Dev server
├── components/
│   ├── SkillBrowser.jsx     # Skill browsing + reputation sort
│   ├── charts/              # GovernancePieChart, RevenueChart, etc.
│   ├── common/              # ChartContainer, EmptyState
│   └── leaderboard/         # Leaderboard view
├── pages/
│   ├── UserProfile.jsx      # User reputation center (Art.2)
│   ├── Leaderboard.jsx      # Global reputation board (Art.3)
│   ├── ProtocolDemo.jsx     # Protocol interaction demo
│   ├── DeployerDashboard.jsx # Deployer incentive dashboard
│   ├── SelfOpsPanel.jsx     # Self-operations panel
│   └── OpsDashboard.jsx     # Operations dashboard
├── services/
│   ├── WalletService.js     # Embedded wallet (low-friction, Art.2)
│   ├── ContractService.jsx  # Contract interaction layer
│   ├── alertService.js      # Alerts/notifications
│   ├── eventWatcher.js      # On-chain event watcher
│   ├── gasMonitor.js        # Gas price monitoring
│   └── uploadService.js     # File upload service
├── hooks/
│   └── usePolling.js        # Polling hook
├── i18n/
│   └── index.jsx            # Internationalization (Chinese)
├── styles/
│   ├── tokens.css           # Design tokens
│   ├── components.css       # Component styles
│   └── enhanced.css         # Enhanced UI styles
└── abi/                     # Compiled contract ABIs (8 contracts)
```

## WHERE TO LOOK
| Task | File |
|------|------|
| Entry / routing | main.jsx |
| Skill browsing | components/SkillBrowser.jsx |
| User reputation | pages/UserProfile.jsx |
| Leaderboard | pages/Leaderboard.jsx |
| Wallet connection | services/WalletService.js |
| Contract calls | services/ContractService.jsx |
| Charts | components/charts/ |
| Design tokens | styles/tokens.css |

## CONVENTIONS
- JSX with React hooks (useState, useEffect)
- Chinese UI labels (宪法 references inline)
- CSS modules via separate stylesheets
- Embedded wallet (no MetaMask required)

## ANTI-PATTERNS
- Avoid adding governance fields to skill browsing UI
- Don't bypass WalletService for wallet operations
- Keep i18n Chinese-only (target research demo)
