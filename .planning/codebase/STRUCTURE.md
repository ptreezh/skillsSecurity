# Codebase Structure

**Analysis Date:** 2026-05-08

## Directory Layout

```
F:\skillsSecurity/
├── src/                       # React frontend source
│   ├── components/            # Reusable UI components
│   ├── pages/                 # Page-level components
│   ├── services/             # Business logic services
│   └── main.jsx              # React entry point
├── contracts/                 # Solidity smart contracts
│   ├── *.sol                 # Core contracts
│   ├── scripts/              # Deployment scripts
│   ├── artifacts/            # Compiled contract artifacts
│   ├── cache/                # Hardhat cache
│   └── package.json          # Contract dependencies
├── data/                     # Static test data
├── skills/                   # Skill markdown definitions (.SKILL.md)
├── scripts/                  # Node.js utility scripts
├── dist/                     # Built frontend output
├── downloads/                # Downloaded files
├── community/               # Community documentation
├── .planning/               # Planning documentation
├── .claude/                  # Claude agent configuration
├── package.json              # Frontend dependencies
├── vite.config.cjs           # Vite configuration
├── hardhat.config.cjs        # Hardhat configuration
└── deployments.json         # Deployed contract addresses
```

## Directory Purposes

**src/:**
- Purpose: React frontend application source code
- Contains: Pages, components, services

**src/components/:**
- Purpose: Reusable React UI components
- Contains: `SkillBrowser.jsx`
- Pattern: Functional components with hooks (useState, useEffect)

**src/pages/:**
- Purpose: Route-level page components
- Contains: `UserProfile.jsx`, `Leaderboard.jsx`, `ProtocolDemo.jsx`
- Pattern: Single-file pages with local state management

**src/services/:**
- Purpose: Business logic and external integrations
- Contains: `WalletService.js`
- Pattern: Singleton service class (exported as default instance)

**contracts/:**
- Purpose: Smart contract source code
- Contains: ASKToken.sol, SkillRegistry.sol, StakingManager.sol, Attribution.sol

**contracts/scripts/:**
- Purpose: Deployment automation
- Contains: Deployment scripts
- Pattern: Hardhat task scripts

**contracts/artifacts/:**
- Purpose: Compiled contract ABIs and bytecode
- Generated: Yes (by `npx hardhat compile`)
- Committed: Yes (for frontend access to ABIs)

**data/:**
- Purpose: Static test data
- Contains: `test-users.json` (mock user data)

**skills/:**
- Purpose: Skill definition markdown files
- Contains: `*.SKILL.md` files (email-sender.SKILL.md, web-search.SKILL.md, etc.)

## Key File Locations

**Entry Points:**
- `src/main.jsx` - React application bootstrap
- `contracts/scripts/` - Contract deployment scripts

**Configuration:**
- `vite.config.cjs` - Vite build config (port 5173)
- `hardhat.config.cjs` - Hardhat blockchain config
- `package.json` - Frontend build scripts (dev, build, preview)

**Core Logic (Smart Contracts):**
- `contracts/ASKToken.sol` - ERC20 token (mint, delegate, voting)
- `contracts/SkillRegistry.sol` - Skill registration and management
- `contracts/StakingManager.sol` - Staking and anti-slash logic
- `contracts/Attribution.sol` - Contribution tracking and reputation

**Frontend Pages:**
- `src/pages/ProtocolDemo.jsx` - Protocol demonstration
- `src/pages/UserProfile.jsx` - User reputation and vesting
- `src/pages/Leaderboard.jsx` - Global reputation rankings

**Frontend Components:**
- `src/components/SkillBrowser.jsx` - Skill browsing and liking

**Services:**
- `src/services/WalletService.js` - Wallet abstraction layer

## Naming Conventions

**Files:**
- React components: PascalCase.jsx (e.g., `SkillBrowser.jsx`)
- React pages: PascalCase.jsx (e.g., `UserProfile.jsx`)
- Services: PascalCase.js (e.g., `WalletService.js`)
- Solidity contracts: PascalCase.sol (e.g., `ASKToken.sol`)

**Directories:**
- kebab-case (e.g., `src/components`, `src/pages`)

**Solidity:**
- Contracts: PascalCase (e.g., `SkillRegistry`)
- Structs: PascalCase (e.g., `StakeInfo`, `Contribution`)
- Functions: camelCase (e.g., `registerSkill`, `computeFingerprint`)
- Events: PascalCase (e.g., `SkillRegistered`)
- Enums: PascalCase (e.g., `ContributionType`, `RiskLevel`)
- Constants: UPPER_SNAKE_CASE (e.g., `MIN_STAKE_LOW`)

## Where to Add New Code

**New Page:**
- Location: `src/pages/NewPage.jsx`
- Pattern: Copy existing page structure (UserProfile.jsx as template)
- Export: Default export

**New Component:**
- Location: `src/components/NewComponent.jsx`
- Pattern: Functional component with props and hooks
- Export: Default export

**New Service:**
- Location: `src/services/NewService.js`
- Pattern: Export singleton instance (like WalletService)
- Pattern: `export default new ServiceName()`

**New Smart Contract:**
- Location: `contracts/NewContract.sol`
- Pattern: Inherit Ownable from OpenZeppelin
- Deployment: Add to deployment scripts

## Special Directories

**dist/:**
- Purpose: Built frontend assets
- Generated: Yes (`npm run build`)
- Committed: Yes

**contracts/cache/:**
- Purpose: Hardhat compilation cache
- Generated: Yes
- Typically in .gitignore

**node_modules/:**
- Purpose: npm dependencies
- Generated: Yes (`npm install`)
- Not committed (in .gitignore)

---

*Structure analysis: 2026-05-08*
