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
- **Chain access is backend-only**: `services/ChainDataService.js` is the sole chain data layer (REST to `server/index.js`); `services/uploadService.js` handles writes. Never add `ethers` / RPC / ABI / contract instances under `src/`.
- **Chinese UI only** — do not add i18n scaffolding.
- **No governance fields** in skill browsing UI (paper core finding).

## SERVERS
- `server/index.js` — the **only** Express API on `:10001`: skill upload/audit, chain submit, and chain reads (`/api/skills`, `/api/reputation/:address`, `/api/leaderboard`, `/api/stats`, `/api/health`).
- The former monitoring server (`src/server.js`, gas/alerts/events) was removed in the ChainMaker migration — its endpoints no longer exist.

## ENVIRONMENT
- Copy `.env.example` → `.env`.
- **Backend chain submission uses ChainMaker** (private chain `chain1` via cmc gateway): `CHAINMAKER_*`, `SKILL_REGISTRY_ADDRESS`. No token/RPC wallet needed for the server submit path.
- The **runtime chain is ChainMaker `chain1` only**. The frontend never reaches the chain directly; all reads/writes go through the backend gateway.
- The public-chain (EVM) deployment path was **removed**: `hardhat.config.js` now defines only `hardhat` / `localhost`; the EVM deploy scripts, `public/deployments.json.template`, and `.github/workflows/deploy.yml` are gone. `PRIVATE_KEY` and public-chain RPC vars are no longer used.

## CI
- `security.yml`: Slither, Mythril, Hardhat tests, Prettier + solhint lint, `npm audit --audit-level=high`.
- `deploy-frontend.yml`: builds and publishes the Vite frontend (GitHub Pages) on push.
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
