# User Onboarding Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Setting Up Your Wallet](#setting-up-your-wallet)
3. [Understanding Reputation](#understanding-reputation)
4. [Registering a Skill](#registering-a-skill)
5. [Contributing to Skills](#contributing-to-skills)
6. [Understanding Rewards](#understanding-rewards)

---

## Getting Started

AgentSkills is a decentralized skill marketplace for AI agent developers. It enables:

- **Register skills** for proper attribution
- **Earn reputation** through verified contributions
- **Receive rewards** for quality work

### Prerequisites

- MetaMask or WalletConnect compatible wallet
- MATIC for gas fees on Polygon network
- Basic understanding of blockchain wallets

---

## Setting Up Your Wallet

### MetaMask Setup

1. Install [MetaMask browser extension](https://metamask.io/download/)
2. Create or import your wallet
3. Add Polygon network:

| Setting | Value |
|---------|-------|
| Network Name | Polygon Mainnet |
| RPC URL | https://polygon-rpc.com |
| Chain ID | 137 |
| Symbol | MATIC |
| Block Explorer | https://polygonscan.com |

4. Get MATIC for gas fees:
   - Buy from exchange (Binance, Coinbase, etc.)
   - Withdraw to your MetaMask address
   - Or use [Polygon Bridge](https://wallet.polygon.technology/bridge) to transfer from Ethereum

### WalletConnect Setup

For mobile wallets, use WalletConnect:
1. Click "Connect Wallet"
2. Select "WalletConnect"
3. Scan QR code with your mobile wallet

---

## Understanding Reputation

Reputation is the core currency in AgentSkills.

### How to Earn Reputation

| Action | Reputation |
|--------|------------|
| Verify LOW risk skill | +10 |
| Verify MEDIUM risk skill | +50 |
| Verify HIGH risk skill | +100 |
| Bug report (correct) | +5 to +50 |
| Like a skill | +2 |
| Positive contribution | +varies |

### Reputation Levels

| Level | Required | Abilities |
|-------|----------|-----------|
| Bronze | 0 | Register LOW risk skills |
| Silver | 500 | Verify skills, MEDIUM risk |
| Gold | 2000 | HIGH risk skills |
| Platinum | 5000 | CRITICAL risk skills |

### Effective Reputation

```
Effective = Total - Locked
```

When you stake reputation on a skill, that amount is **locked** and not available for use until you unstake.

---

## Registering a Skill

### Step 1: Check Requirements

Different risk levels require minimum reputation:

| Risk Level | Min Reputation | Use Case |
|------------|----------------|----------|
| LOW | 0 | Simple skills |
| MEDIUM | 500+ | Moderate complexity |
| HIGH | 2000+ | Complex skills |
| CRITICAL | 5000+ | Mission-critical |

### Step 2: Prepare Metadata

Create a JSON file with your skill information:

```json
{
  "name": "my-skill",
  "description": "What this skill does",
  "trigger": "/trigger or event",
  "version": "1.0.0",
  "author": "your-name",
  "tags": ["ai", "automation"]
}
```

### Step 3: Upload to IPFS

1. Use Pinata, NFT.storage, or web3.storage
2. Upload your metadata JSON
3. Copy the CID (Content Identifier)

### Step 4: Register on Chain

1. Connect your wallet
2. Fill in skill details
3. Enter IPFS CID
4. Select risk level
5. Confirm transaction

---

## Contributing to Skills

### Types of Contributions

| Type | Description | Reward |
|------|-------------|--------|
| Test Report | Quality assurance | +5 to +50 rep |
| Bug Report | Issue identification | +10 to +100 rep |
| Enhancement | Feature improvements | +varies |
| Verification | Confirm skill quality | +10 to +100 rep |

### How to Submit a Contribution

1. Find a skill you want to help with
2. Click "Add Contribution"
3. Select contribution type
4. Upload evidence (IPFS recommended)
5. Set your share percentage
6. Submit transaction

---

## Understanding Rewards

### Revenue Distribution

When a skill earns revenue, it distributes to:

1. **Skill Owner** - Base share
2. **Contributors** - Proportional to shares
3. **Verification Pool** - Incentivizes quality

### Claiming Rewards

1. Navigate to your dashboard
2. View pending rewards
3. Claim when available

### Anti-Slash Protection

If you're slashed incorrectly:
- 5% recovery per month
- Requires positive contributions
- 30-day wait between claims

---

## Troubleshooting

### Transaction Failed

1. **Rejected**: User cancelled in wallet
2. **Insufficient funds**: Not enough MATIC for gas
3. **Wrong network**: Switch to Polygon
4. **Insufficient reputation**: Check requirements

### Can't See My Skill

1. Check transaction was confirmed on [Polygonscan](https://polygonscan.com)
2. Verify you're on correct network
3. Try refreshing the page

### Reputation Not Updating

1. Wait for transaction confirmation
2. Refresh page
3. Check if reputation is locked (staked)

---

## Getting Help

- Documentation: `/docs`
- Discord: [Link]
- Email: support@agentskills.xyz

---

*Last Updated: 2026-05-23*