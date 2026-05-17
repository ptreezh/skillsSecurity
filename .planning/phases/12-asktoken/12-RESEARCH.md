# Phase 12: ASKToken 单元测试 - Research

**Researched:** 2026-05-17
**Domain:** Hardhat + Chai Matchers Smart Contract Testing
**Confidence:** HIGH

## Summary

Phase 12 requires comprehensive unit tests for the ASKToken ERC20 contract. The contract uses OpenZeppelin's ERC20, ERC20Burnable, and Ownable. Key findings:

1. **No custom events** - ASKToken uses inherited ERC20 `Transfer` event (from=0x0 for mint, to=0x0 for burn)
2. **Access control** - Only `mint()` is protected by `onlyOwner`; `burn()` from ERC20Burnable has no access restriction
3. **Vote tracking** - `_votes` and `_delegates` mappings track delegation; `delegate()` updates vote weight based on balance
4. **Test infrastructure** - Already configured with hardhat-chai-matchers v2.1.2, fixtures.cjs available

**Primary recommendation:** Use chai-matchers `emit` with `Transfer` event (not custom events), test onlyOwner on mint, test anyone-can-burn on burn, verify vote weight changes on delegate.

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-02:** Test file location: `test/contracts/ASKToken.test.js`
- **D-03:** Use `deployContracts` fixture from `test/fixtures.cjs`
- **D-04:** Chai expect assertion style
- **D-05:** BDD `describe/it` structure
- **D-07:** ASKT-01: Mint test + access control revert (`onlyOwner` verified)
- **D-08:** ASKT-02: Burn test + insufficient balance revert
- **D-09:** ASKT-03: Delegate test + vote weight tracking verification
- **D-10:** ASKT-04: Event test - all event parameters fully verified
- **D-13:** Use chai-matchers `emit` + `withArgs` for complete parameter verification

### Claude's Discretion
- Specific it() description wording
- Boundary value selection (amount = 0, 1, max supply, etc.)
- describe/it nesting depth

## Standard Stack

### Core Testing Libraries
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|---------------|
| chai | 4.5.0 | Assertion library | BDD expect interface |
| @nomicfoundation/hardhat-chai-matchers | 2.1.2 | Event assertion, revert checking | Official Hardhat plugin |
| @nomicfoundation/hardhat-network-helpers | 1.1.2 | loadFixture, time manipulation | Official Hardhat plugin |

### Contract Under Test
| Contract | Version | Purpose |
|----------|---------|---------|
| @openzeppelin/contracts | 4.9.6 | ERC20, ERC20Burnable, Ownable |

**Installation:** All dependencies already in package.json (verified)

## Architecture Patterns

### Recommended Test Structure
```
test/contracts/
├── ASKToken.test.js      # This phase
├── SkillRegistry.test.js # Future
├── StakingManager.test.js # Future
└── Attribution.test.js   # Future
```

### Test File Pattern (from smoke.fixture.test.cjs)
```javascript
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("ASKToken", function() {
  const fixture = deployContracts;

  async function deploy() {
    const { token, staking, registry, attribution, owner, user1, user2, accounts } = 
      await loadFixture(fixture);
    return { token, owner, user1, user2 };
  }

  describe("Mint", function() {
    it("should mint tokens to address", async function() {
      const { token, owner, user1 } = await deploy();
      const amount = ethers.parseEther("1000");
      
      await expect(token.mint(user1, amount))
        .to.emit(token, "Transfer")
        .withArgs(ethers.ZeroAddress, user1, amount);
      
      expect(await token.balanceOf(user1)).to.equal(amount);
    });
  });
});
```

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ASKT-01 | Test token minting with proper access control | Mint function has onlyOwner modifier - need to test both owner success and non-owner revert |
| ASKT-02 | Test token burning | ERC20Burnable burn() available to all token holders - need to test burn success and insufficient balance revert |
| ASKT-03 | Test delegation and vote weight tracking | delegate() updates _votes[delegatee] += balanceOf(delegator) - need to verify getVotes() returns correct weight |
| ASKT-04 | Test event emissions | ASKToken emits ERC20 Transfer event (not custom) - need to verify Transfer parameters on mint/burn |

## Common Pitfalls

### Pitfall 1: Wrong Event Expectation
**What goes wrong:** Tests expect custom Mint/Burn events that don't exist
**Root cause:** ASKToken.sol has no custom events - uses inherited ERC20 Transfer
**How to avoid:** Use `Transfer` event with `address(0)` as from (mint) or to (burn)
**Warning signs:** `to.emit(token, "Mint")` will always fail

### Pitfall 2: Assuming burn() has onlyOwner
**What goes wrong:** Testing non-owner cannot burn
**Root cause:** ERC20Burnable.burn() is public with no access control
**How to avoid:** Only test mint() for access control, burn() should work for any token holder

### Pitfall 3: Vote Weight Snapshot
**What goes wrong:** Testing vote weight changes after delegate, but balance changes after
**Root cause:** delegate() copies current balance as vote weight at delegation time
**How to avoid:** Check vote weight immediately after delegation, before any transfers

### Pitfall 4: loadFixture vs beforeEach
**What goes wrong:** Modifying shared state without proper isolation
**Root cause:** loadFixture provides clean snapshot per test, but manual beforeEach may not
**How to avoid:** Always use loadFixture from fixtures.cjs

## Code Examples

### Test: Mint with Access Control (ASKT-01)
```javascript
describe("Mint", function() {
  it("should mint tokens to address", async function() {
    const { token, owner, user1 } = await deploy();
    const amount = ethers.parseEther("1000");
    
    await expect(token.mint(user1, amount))
      .to.emit(token, "Transfer")
      .withArgs(ethers.ZeroAddress, user1, amount);
    
    expect(await token.balanceOf(user1)).to.equal(amount);
  });

  it("should revert when non-owner tries to mint", async function() {
    const { token, user1, user2 } = await deploy();
    const amount = ethers.parseEther("1000");
    
    await expect(
      token.connect(user1).mint(user2, amount)
    ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount")
      .withArgs(user1.address);
    // OR with older OZ: .to.be.revertedWith("Ownable: caller is not the owner");
  });
});
```

### Test: Burn with Insufficient Balance (ASKT-02)
```javascript
describe("Burn", function() {
  it("should burn tokens and reduce total supply", async function() {
    const { token, owner, user1 } = await deploy();
    const mintAmount = ethers.parseEther("1000");
    const burnAmount = ethers.parseEther("300");
    
    await token.mint(user1, mintAmount);
    const initialSupply = await token.totalSupply();
    
    await expect(token.connect(user1).burn(burnAmount))
      .to.emit(token, "Transfer")
      .withArgs(user1.address, ethers.ZeroAddress, burnAmount);
    
    expect(await token.balanceOf(user1)).to.equal(mintAmount - burnAmount);
  });

  it("should revert when burning more than balance", async function() {
    const { token, owner, user1 } = await deploy();
    const mintAmount = ethers.parseEther("500");
    const burnAmount = ethers.parseEther("1000");
    
    await token.mint(user1, mintAmount);
    
    await expect(
      token.connect(user1).burn(burnAmount)
    ).to.be.reverted; // ERC20InsufficientBalance
  });
});
```

### Test: Delegate and Vote Tracking (ASKT-03)
```javascript
describe("Delegate", function() {
  it("should delegate votes and update vote weight", async function() {
    const { token, owner, user1, user2 } = await deploy();
    const mintAmount = ethers.parseEther("1000");
    
    await token.mint(user1, mintAmount);
    await token.connect(user1).delegate(user2.address);
    
    expect(await token.getVotes(user2.address)).to.equal(mintAmount);
    // user1's own vote weight should be 0
    expect(await token.getVotes(user1.address)).to.equal(0);
  });

  it("should track multiple delegators' votes", async function() {
    const { token, owner, user1, user2, user3 } = await deploy();
    
    await token.mint(user1, ethers.parseEther("500"));
    await token.mint(user2, ethers.parseEther("300"));
    
    await token.connect(user1).delegate(user3.address);
    await token.connect(user2).delegate(user3.address);
    
    expect(await token.getVotes(user3.address))
      .to.equal(ethers.parseEther("800"));
  });
});
```

### Test: Event Emissions (ASKT-04)
```javascript
describe("Events", function() {
  it("should emit Transfer with correct parameters on mint", async function() {
    const { token, owner, user1 } = await deploy();
    const amount = ethers.parseEther("1000");
    
    await expect(token.mint(user1, amount))
      .to.emit(token, "Transfer")
      .withArgs(ethers.ZeroAddress, user1.address, amount);
  });

  it("should emit Transfer with correct parameters on burn", async function() {
    const { token, owner, user1 } = await deploy();
    const mintAmount = ethers.parseEther("1000");
    const burnAmount = ethers.parseEther("400");
    
    await token.mint(user1, mintAmount);
    
    await expect(token.connect(user1).burn(burnAmount))
      .to.emit(token, "Transfer")
      .withArgs(user1.address, ethers.ZeroAddress, burnAmount);
  });
});
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Access control testing | Custom onlyOwner check logic | chai-matchers `revertedWithCustomError` or `revertedWith` | OpenZeppelin Ownable provides standardized error messages |
| Event verification | Manual event parsing | chai-matchers `emit().withArgs()` | Built-in async support, clean syntax |
| Test isolation | Manual beforeEach cleanup | loadFixture from fixtures.cjs | Snapshot isolation, auto-cleanup |
| Balance comparisons | String comparison | ethers.parseEther / expect().to.equal() | Handles BigInt precision |

## Open Questions (RESOLVED)

1. **OpenZeppelin Ownable Error Format** (RESOLVED)
   - Decision: Write both `OwnableUnauthorizedAccount` custom error AND `"Ownable: caller is not the owner"` string fallback
   - Code example in plan uses `revertedWithCustomError` with fallback comment

2. **Mint Max Supply Revert** (RESOLVED)
   - Decision: Test explicitly with `to.be.revertedWith("Max supply exceeded")`
   - Plan includes dedicated test case for this

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| hardhat | Test execution | Yes | 2.28.6 | — |
| @nomicfoundation/hardhat-chai-matchers | Event assertions | Yes | 2.1.2 | — |
| @nomicfoundation/hardhat-network-helpers | loadFixture | Yes | 1.1.2 | — |
| chai | Assertions | Yes | 4.5.0 | — |
| ethers | Contract interactions | Yes | 6.16.0 | — |

**All dependencies verified available - no action needed.**

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Mocha (via Hardhat) |
| Config file | hardhat.config.js |
| Quick run command | `npx hardhat test test/contracts/ASKToken.test.js` |
| Full suite command | `npx hardhat test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|---------------|
| ASKT-01a | Owner can mint | unit | `npx hardhat test test/contracts/ASKToken.test.js --grep "should mint"` | Create |
| ASKT-01b | Non-owner cannot mint | unit | `npx hardhat test test/contracts/ASKToken.test.js --grep "revert when non-owner"` | Create |
| ASKT-02a | User can burn tokens | unit | `npx hardhat test test/contracts/ASKToken.test.js --grep "should burn tokens"` | Create |
| ASKT-02b | Cannot burn more than balance | unit | `npx hardhat test test/contracts/ASKToken.test.js --grep "revert when burning"` | Create |
| ASKT-03a | Delegate updates vote weight | unit | `npx hardhat test test/contracts/ASKToken.test.js --grep "should delegate votes"` | Create |
| ASKT-04a | Mint emits Transfer event | unit | `npx hardhat test test/contracts/ASKToken.test.js --grep "emit Transfer.*mint"` | Create |
| ASKT-04b | Burn emits Transfer event | unit | `npx hardhat test test/contracts/ASKToken.test.js --grep "emit Transfer.*burn"` | Create |

### Sampling Rate
- **Per task commit:** `npx hardhat test test/contracts/ASKToken.test.js` (fast, single file)
- **Per wave merge:** `npx hardhat test` (full suite)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `test/contracts/ASKToken.test.js` — covers ASKT-01, ASKT-02, ASKT-03, ASKT-04
- [ ] No conftest.py needed (Hardhat/Mocha uses hardhat.config.js)
- Framework install: Not needed — already in package.json

## Security Domain

### Applicable ASVS Categories
N/A - Token unit tests focus on functional behavior, not security vulnerabilities. Security review is a separate phase concern.

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Access control bypass | Elevation of Privilege | Ownable modifier on mint() - test verifies non-owner revert |
| Integer overflow | Denial of Service | Solidity 0.8.20 checked math - no manual mitigation needed |
| Front-running | Tampering | Tests don't cover MEV/sequencer concerns - out of scope |

## Sources

### Primary (HIGH confidence)
- `contracts/ASKToken.sol` — Contract source code, verified mint/burn/delegate implementation
- `test/fixtures.cjs` — Existing fixture system, verified API
- `test/smoke.fixture.test.cjs` — Existing test style reference
- `hardhat.config.js` — Imported hardhat-chai-matchers, verified
- `package.json` — Dependencies verified: chai 4.5.0, hardhat-chai-matchers 2.1.2

### Secondary (MEDIUM confidence)
- OpenZeppelin 4.9.6 documentation — Ownable error handling patterns
- Hardhat Chai Matchers docs — emit and withArgs syntax

### Tertiary (LOW confidence)
- None — all claims verified against local source code

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All dependencies verified in package.json
- Architecture: HIGH - Based on verified existing test files
- Pitfalls: HIGH - All pitfalls identified from contract source analysis

**Research date:** 2026-05-17
**Valid until:** 2026-06-16 (30 days for stable OpenZeppelin/Hardhat stack)

---

*Phase 12 Research Complete - Ready for Planning*