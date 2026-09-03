# AGENTS.md

## PROJECT
Research paper + prototype for "Responsibility Vacuum in Agent Skill Ecosystems".
**Constitution (CONSTITUTION.md): no tokens ever, zero-startup, reputation-based incentives only.**
All 26 planning phases complete (v1.1–v1.7); awaiting v2.0.

## COMMANDS
```bash
npm run dev          # Vite frontend on :5173
npm run build        # Vite production build
npm test             # Hardhat contract tests (NOT Playwright)
npx hardhat test <path>  # MUST pass explicit file paths — hardhat.config.js sets testFiles: []
npx hardhat compile  # Compile contracts (0.8.20, optimizer 200)
npx hardhat coverage # Coverage report
npx playwright test  # E2E tests (separate from npm test)
```

## CONTRACTS
- **No-token architecture**: no token transfers, reputation tracking only.
- **Deployment order**: `StakingManager` → `SkillRegistry` → `Attribution` (Attribution needs `setStakingManager()` after deploy).
- **Tests**: `test/contracts/*.test.cjs` (Hardhat + chai + ethers). Solidity tests in `test/*.t.sol`.
- **Fixtures**: `test/fixtures.cjs` exports `deployContracts` using `loadFixture`.
- **Solidity style**: `CONSTANT_CAPS` for governance parameters, NatSpec on public/external.

## FRONTEND
- React 18 + Vite 5, entry `src/main.jsx`.
- **Embedded wallet** (no MetaMask) — always route wallet ops through `services/WalletService.js`.
- **Chinese UI only** — do not add i18n scaffolding.
- **No governance fields** in skill browsing UI (paper core finding).

## SERVERS
- `server/index.js` — Express API on `:3001` (skill upload, audit, chain submit).
- `src/server.js` — Express monitoring on `:3001` (gas, alerts, events).
- **Port conflict**: both default to 3001. Set `PORT` to run one without collision.

## ENVIRONMENT
- Copy `.env.example` → `.env`. Deployment requires `PRIVATE_KEY`, `POLYGON_RPC` / `POLYGON_AMOY_RPC`.
- Monitoring optional: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `GAS_*_THRESHOLD`.

## CI
- `security.yml`: Slither, Mythril, Hardhat tests, Prettier + solhint lint, `npm audit --audit-level=high`.
- `deploy.yml`: workflow_dispatch only; deploys to Polygon Amoy (staging) or Polygon (production).
- `formal-verification.yml`: Certora Prover on `StakingManager`.

## CONVENTIONS
- **CN docs**: `CONSTITUTION.md`, `ROADMAP.md`, A/B/C/D series.
- **EN doc**: `paper-draft-en.md` only.
- **Never mix CN/EN in the same file.**
- Diagrams: ASCII art with `┌─┐` boxes.
- Cross-references: `§X` notation.

## ANTI-PATTERNS
- No governance fields in skill specs.
- Do not add code files to `archive/`, `paper-submission/`, `community/`, `docs/`.
- Do not bypass `WalletService` for wallet operations.
- Do not mix tokenomics logic into a single contract.

## PLANNING
- `.planning/` is a GSD system. See `.planning/STATE.md` for current milestone.
- `ROADMAP.md` (Chinese) is the whip-system document; check every Monday.
