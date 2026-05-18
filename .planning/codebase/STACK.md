# Technology Stack

**Analysis Date:** 2026-05-08

## Languages

**Primary:**
- JavaScript ES6+ (JSX) - Frontend React components
- Solidity 0.8.20 - Smart contracts (`contracts/*.sol`)

**Secondary:**
- JSX - React component syntax
- CSS - Inline styles in React components

## Runtime

**Frontend:**
- Node.js 18+ (implied by React 18)
- Vite 5.1.0 - Build tool and dev server

**Smart Contracts:**
- Hardhat 2.19.4 - Ethereum development environment

## Frameworks

**Frontend:**
- React 18.2.0 - UI library
- Vite 5.1.0 - Build tool with hot reload

**Smart Contracts:**
- OpenZeppelin Contracts 4.9.6 - Secure smart contract library
- Hardhat 2.19.4 - Development, testing, and deployment framework

## Key Dependencies

**Frontend (`package.json`):**
- `react` ^18.2.0 - UI framework
- `react-dom` ^18.2.0 - React DOM renderer
- `@vitejs/plugin-react` ^4.2.1 - Vite React integration
- `dotenv` ^17.4.2 - Environment variable loading

**Smart Contracts:**
- `@openzeppelin/contracts` 4.9.6 - ERC20, ERC20Burnable, Ownable, MerkleProof
- `hardhat` 2.19.4 - Development framework

## Configuration

**Build:**
- `vite.config.cjs` - Frontend build config (port 5173)
- `hardhat.config.cjs` - Hardhat blockchain config

**Environment:**
- `.env` files (not committed) - RPC URLs, private keys
- `contracts/.env.example` - Template for required environment variables

## Platform Requirements

**Development:**
- Node.js 18+
- npm or yarn
- Git

**Production (Contracts):**
- Polygon network (Mumbai testnet chainId:80001, Polygon mainnet chainId:137)
- EVM-compatible blockchain

**Frontend:**
- Modern browser with ES6+ support
- MetaMask or similar Web3 wallet (optional - embedded wallet available)

---

*Stack analysis: 2026-05-08*
