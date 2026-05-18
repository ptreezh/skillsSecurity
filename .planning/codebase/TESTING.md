# Testing Patterns

**Analysis Date:** 2026-05-06

## Test Framework

**Smart Contracts (Hardhat):**
- Framework: Hardhat ^2.19.4
- Testing: **No test framework configured** - Tests run manually via console or scripts
- Solidity Version: ^0.8.20
- Dependencies: OpenZeppelin Contracts ^4.9.6

**Frontend:**
- No testing framework configured
- Manual testing via Vite dev server (`npm run dev`)

**Build/Dev:**
```bash
# Frontend
npm run dev      # Development server
npm run build    # Production build
npm run preview # Preview production build

# Smart Contracts
npx hardhat compile     # Compile contracts
npx hardhat run scripts/deploy.js --network polygonMumbai  # Deploy
```

---

## Test File Organization

### Current State
**No test directory exists.** Testing approach:
- Smart contracts: Manual verification via Hardhat console
- Frontend: Manual testing via browser
- Scripts: Console output verification

### Recommended Structure (Not Implemented)
```
test/
├── contracts/
│   ├── ASKToken.test.js
│   ├── SkillRegistry.test.js
│   ├── StakingManager.test.js
│   └── Attribution.test.js
└── frontend/
    └── components/
        ├── SkillBrowser.test.jsx
        └── UserProfile.test.jsx
```

---

## Test Structure

### Smart Contract Testing (Hardhat)
**Not currently implemented.** Hardhat supports:
```javascript
const { expect } = require("chai");

describe("ASKToken", function() {
  it("Should set the right name and symbol", async function() {
    const Token = await ethers.getContractFactory("ASKToken");
    const token = await Token.deploy();
    await token.deployed();
    
    expect(await token.name()).to.equal("AgentSkills Token");
    expect(await token.symbol()).to.equal("ASK");
  });
});
```

### Frontend Testing (Not Configured)
**Not currently implemented.** Would use:
- React Testing Library for component tests
- Vitest as test runner

---

## Mocking Patterns

### Current State
**No mocking infrastructure exists.** All testing is manual.

### Recommended Approach
```javascript
// Mock contract interactions
const mockToken = {
  transfer: async () => true,
  balanceOf: async () => 1000,
  transferFrom: async () => true
};

// Mock WalletService
const mockWalletService = {
  user: { address: '0x123...', reputation: 500 },
  init: async () => mockWalletService.user
};
```

---

## Fixtures and Factories

### Test Data
**Not implemented.** Mock data defined inline in scripts:
```javascript
// scripts/auto-tasks.js - In-code test data
const mockSkills = [
  { id: 1, name: 'email-sender', reputation: 5000, ... },
  { id: 2, name: 'web-search', reputation: 3000, ... }
];
```

### Data Files
- `data/test-users.json` - Generated test user list
- `data/bug-bounty.json` - Bug bounty claims
- `data/creator-rewards.json` - Creator reward data
- `data/airdrop-phase1-batch-1.json` - Airdrop recipients

---

## Coverage

**Requirements:** None enforced
**Reporting:** Not configured
**View Coverage:** No command available

**Current coverage: 0%** - No automated tests exist.

---

## Test Types

### Unit Tests
**Not implemented.**
- No unit test framework configured
- No unit tests written for any module

### Integration Tests
**Not implemented.**
- Manual testing via Hardhat console
- Contract interactions tested live on local network

### E2E Tests
**Not implemented.**
- Manual browser testing
- ProtocolDemo.jsx for UI verification

---

## Contract Testing Patterns

### Deploy and Verify
```javascript
// scripts/deploy.js pattern (reference only)
async function main() {
  const ASKToken = await ethers.getContractFactory("ASKToken");
  const token = await ASKToken.deploy();
  await token.deployed();
  console.log("ASKToken deployed to:", token.address);
}
```

### Event Verification
```javascript
// Pattern used in contracts - emit after state change
emit SkillRegistered(msg.sender, skillId, _name);
emit AntiSlash(_liker, _penalty, _reason);
```

### State Assertions (Hardhat)
```javascript
// Not written, but framework supports
expect(await token.totalSupply()).to.equal(MAX_SUPPLY);
expect(await skill.stakeAmount).to.equal(expectedAmount);
```

---

## Common Patterns

### Testing Async Operations
```javascript
// Hardhat pattern (not implemented)
it("Should stake tokens", async function() {
  const stakeTx = await stakingManager.stake(skillId, amount);
  await stakeTx.wait();
  
  const stakeInfo = await stakingManager.stakes(user, skillId);
  expect(stakeInfo.amount).to.equal(amount);
});
```

### Testing Error Cases
```solidity
// Solidity pattern - require statements
require(!hasLiked[msg.sender], "Already liked");
require(info.amount > 0, "No stake");
require(block.timestamp > info.lockedUntil, "Still locked");
```

### Testing Revert Conditions
```javascript
// Hardhat pattern (not implemented)
await expect(
  stakingManager.connect(user).unstake(skillId)
).to.be.revertedWith("Still locked");
```

---

## Manual Testing Workflow

### Frontend Manual Test
1. Run `npm run dev` to start Vite dev server
2. Open browser to localhost
3. Test user registration flow
4. Test skill browser interactions
5. Verify leaderboard sorting
6. Check profile page calculations

### Smart Contract Manual Test
1. Run `npx hardhat compile`
2. Run `npx hardhat node` for local network
3. Deploy contracts via scripts
4. Interact via Hardhat console or scripts
5. Verify state changes and events

---

## Test Gaps

### Critical Missing Tests
1. **ASKToken.sol** - No tests for mint, burn, delegate, vote tracking
2. **SkillRegistry.sol** - No tests for registration, verification, slashing
3. **StakingManager.sol** - No tests for stake/unstake logic
4. **Attribution.sol** - No tests for contributions, likes, anti-slash

### Frontend Component Tests
1. **SkillBrowser.jsx** - No tests for like functionality
2. **UserProfile.jsx** - No tests for vesting calculations
3. **Leaderboard.jsx** - No tests for sorting/filtering
4. **ProtocolDemo.jsx** - No tests for fingerprint computation

### Integration Tests
1. Cross-contract interactions (SkillRegistry -> ASKToken)
2. End-to-end user flows (register -> stake -> earn)
3. Anti-slash cascading effects

---

## Recommended Test Configuration

### For Smart Contracts (Hardhat)
```javascript
// hardhat.config.cjs addition
mocha: {
  timeout: 40000
},
hardhat-network-helpers: "^1.0.0",
@openzeppelin/test-helpers: "^0.5.15"
```

### For Frontend Components (Vitest)
```javascript
// vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.{js,jsx}']
  }
});
```

---

## CI/CD Testing

**Current State:** No CI pipeline configured

**Recommended:**
```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm test
      - run: npx hardhat test
```

---

*Testing analysis: 2026-05-06*
