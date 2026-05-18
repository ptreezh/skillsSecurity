# External Integrations

**Analysis Date:** 2026-05-08

## APIs & External Services

**Blockchain RPC:**
- Polygon Mumbai Testnet - Development/deployment target
  - RPC: `POLYGON_MUMBAI_RPC` env var
  - Default: `https://rpc-mumbai.maticvigil.com`
  - Chain ID: 80001

- Polygon Mainnet - Production target
  - RPC: `POLYGON_RPC` env var
  - Chain ID: 137

## Data Storage

**Frontend (User Data):**
- Browser localStorage only
  - Key: `agentskills_user`
  - Contains: address, reputation, level, dailyLikes, balance, lastLikeDate

**Smart Contracts (On-chain):**
- ASKToken balances
- SkillRegistry skills mapping
- Attribution contributions and likes
- StakingManager stakes
- userReputation tracking

**Test Data:**
- `data/test-users.json` - Mock user data for development

**IPFS (Planned):**
- Metadata IPFS hash storage in `metadataIPFS` field
- Fingerprint generation: `keccak256(abi.encodePacked(ipfsHash, creator, timestamp))`

## Token Economics

**ASK Token (ERC20):**
- Max Supply: 1,000,000,000 tokens (10^18 decimals)
- Ticker: ASK
- Allocation:
  - Community: 600,000,000 (60%)
  - Team & Ops: 250,000,000 (25%)
  - Revenue Pool: 150,000,000 (15%)

## Authentication & Identity

**Embedded Wallet (Current implementation):**
- Email registration flow via `WalletService.init()`
- Auto-generated wallet addresses (random hex)
- Stored in localStorage
- No private key management

**Web3 Wallet (Planned):**
- MetaMask, WalletConnect compatible
- Integration via Hardhat/ethers.js

## Monitoring & Observability

**Error Tracking:**
- None detected (no Sentry, LogRocket, etc.)

**Logs:**
- Browser console.log for frontend (no structured logging)
- Smart contract events for on-chain activity

## CI/CD & Deployment

**Contract Deployment:**
- Hardhat scripts
- Networks: hardhat (local 31337), polygonMumbai (80001), polygon (137)
- Deployment artifacts saved to `deployments.json`

**Frontend:**
- Vite build: `npm run build` outputs to `dist/`
- Dev server: `npm run dev` (port 5173)
- Preview: `npm run preview`

## Environment Configuration

**Required env vars:**
- `PRIVATE_KEY` - Deployer wallet private key for deployments
- `POLYGON_MUMBAI_RPC` - Polygon Mumbai RPC URL
- `POLYGON_RPC` - Polygon Mainnet RPC URL

**Secrets location:**
- `.env` file at project root (gitignored)
- `contracts/.env.example` as template (committed)

## Webhooks & Callbacks

**Incoming:**
- None currently implemented

**Outgoing (Solidity Events):**
- `SkillRegistered`, `SkillUpdated`, `SkillVerified`, `SkillSlashed`, `FingerprintGenerated`
- `Staked`, `Unstaked`, `Slash`, `AntiSlash`
- `AntiSlash` (Attribution.sol)

---

*Integration audit: 2026-05-08*
