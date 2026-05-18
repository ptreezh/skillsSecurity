# Architecture

**Analysis Date:** 2026-05-08

## Pattern Overview

**Overall:** Web3 DApp with React SPA frontend + Solidity smart contract backend

**Key Characteristics:**
- Single Page Application (SPA) with React 18
- Embedded wallet pattern for frictionless onboarding (no MetaMask required)
- On-chain reputation and staking system
- Layered smart contract architecture with OpenZeppelin security

## Layers

**Frontend (React):**
- Purpose: User interface for skill browser, user profile, leaderboard
- Location: `src/`
- Contains: React components (`SkillBrowser.jsx`), Pages (`UserProfile.jsx`, `Leaderboard.jsx`, `ProtocolDemo.jsx`), Services (`WalletService.js`)
- Depends on: React 18, Browser localStorage
- Used by: Browser users

**Smart Contracts (Solidity):**
- Purpose: Trustless execution of reputation, staking, attribution, token economics
- Location: `contracts/`
- Contains: ASKToken, SkillRegistry, Attribution, StakingManager
- Depends on: OpenZeppelin contracts (ERC20, Ownable)
- Used by: Frontend (transactions), external users

**Service Layer:**
- Purpose: Wallet abstraction for frictionless UX
- Location: `src/services/WalletService.js`
- Pattern: Singleton service with init(), signTransaction(), getUser()

**Data Layer:**
- Purpose: User state persistence (off-chain simulation)
- Location: Browser localStorage (`agentskills_user` key)
- Contains: address, reputation, level, dailyLikes, balance, lastLikeDate

## Data Flow

**User Registration (Embedded Wallet):**
1. User visits app
2. `WalletService.init()` called in `main.jsx`
3. Checks localStorage for existing `agentskills_user`
4. If none found, creates new user with random address and 100 ASK airdrop
5. Stores user in localStorage
6. Returns user state to React

**Skill Like Flow:**
1. User clicks like button in `SkillBrowser.jsx`
2. Checks `user.dailyLikes >= 5` limit (constitution rule)
3. If skill flagged: `user.reputation -= 5` (anti-slash)
4. If normal: `user.reputation += 2`, `skill.likes++`
5. Updates localStorage state
6. (Future: Transaction sent to blockchain)

**Skill Registration (On-chain):**
1. User fills form in `ProtocolDemo.jsx`
2. `WalletService.signTransaction()` simulates
3. Transaction sent to `SkillRegistry.registerSkill()`
4. Contract computes fingerprint via `computeFingerprint()`
5. Stake transferred based on RiskLevel
6. Event `SkillRegistered` emitted

**Reputation Vesting:**
1. User profile checks `reputation >= 1000` threshold
2. Progress bar shows vesting progress (30% at 1000 rep)
3. If satisfied, enables vesting button
4. Alert shows vesting eligibility (30%, 500 ASK monthly cap)

## Key Abstractions

**WalletService:**
- Purpose: Abstract wallet operations for embedded (localStorage) and Web3 modes
- Examples: `src/services/WalletService.js`
- Pattern: Singleton with async init(), signTransaction(), getUser()

**Reputation System:**
- Purpose: Non-transferable reputation tracking
- Components:
  - On-chain: `userReputation` mapping in `Attribution.sol` and `StakingManager.sol`
  - Off-chain: `user.reputation` in localStorage
- Levels: L1 (Observer), L2 (Contributor), L3 (Trusted), L4 (Guardian)

**Staking Mechanism:**
- Purpose: Economic security for skills
- Risk-based staking tiers:
  - LOW: 10 ASK minimum
  - MEDIUM: 50 ASK
  - HIGH: 100 ASK
  - CRITICAL: 200 ASK

**Anti-Slash Mechanism:**
- Purpose: Reputation penalty for liking harmful skills
- Implementation: `StakingManager.slashLiker()` and `Attribution.slashLiker()`
- 25% of slashed stake rewards reporter

## Entry Points

**Frontend Entry:**
- Location: `src/main.jsx`
- Triggers: Page load, ReactDOM.createRoot().render()
- Responsibilities: App initialization, wallet init, page routing via useState

**Contract Deployment Entry:**
- Location: `contracts/scripts/` (deploy.js)
- Triggers: `npx hardhat run scripts/deploy.js --network <network>`
- Responsibilities: Deploy all contracts, save addresses

## Error Handling

**Frontend:**
- Alert-based error messages (modal dialogs)
- No try-catch in current implementation
- Basic validation checks

**Smart Contracts:**
- Require statements with descriptive strings
- Custom error messages
- Event emission for off-chain tracking

## Cross-Cutting Concerns

**Logging:** Browser console.log only (no structured logging)
**Validation:** Minimal - trust localStorage data, basic form checks
**Authentication:** Embedded wallet (no real authentication - simulated)

---

*Architecture analysis: 2026-05-08*
