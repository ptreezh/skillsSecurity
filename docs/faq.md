# Frequently Asked Questions

## General

### What is AgentSkills?

AgentSkills is a decentralized marketplace for AI agent skills. It enables developers to register their skills, receive attribution for contributions, and earn rewards based on reputation.

### Why no token?

We chose a token-free architecture for:
- Regulatory compliance in all jurisdictions
- No speculative trading
- Focus on real utility and reputation
- Simplified user experience

### What network is it on?

**Polygon Mainnet** (Chain ID: 137)
Testnet: Polygon Amoy (80002)

---

## Reputation

### How do I earn reputation?

- Verify skills (+10 to +100 based on risk level)
- Submit bug reports (+5 to +50 based on severity)
- Like skills (+2)
- Quality contributions (varies)

### What happens if my reputation goes negative?

You can recover through:
- 5% per month recovery (based on original slash amount)
- Requires positive contributions to unlock recovery
- Must wait at least 30 days between claims

### How is effective reputation calculated?

```
Effective Reputation = Total Reputation - Locked Reputation
```

### How long does recovery take?

Recovery rate: 5% per month of original slash amount. Claim once per 30-day period.

---

## Skills

### What are skill risk levels?

| Level | Reputation Required | Example |
|-------|---------------------|---------|
| LOW | 0 | Simple utilities |
| MEDIUM | 500+ | Data processing |
| HIGH | 2000+ | Financial tools |
| CRITICAL | 5000+ | Security critical |

### Can I update my skill?

Yes, skill owners can update:
- Description
- Metadata
- Version

### How long do stakes lock?

90 days from staking. After that, you can unstake anytime.

---

## Technical

### What wallet do I need?

Any EVM-compatible wallet:
- MetaMask
- WalletConnect
- Coinbase Wallet
- Rabby
- Frame

### How long does a transaction take?

Polygon typically confirms in 2-3 seconds. Complex transactions may take longer.

### What's the gas cost?

Gas costs on Polygon are very low (~$0.01-0.10 per transaction).

---

## Troubleshooting

### Transaction failed

**Common causes:**
1. User rejected in wallet
2. Insufficient MATIC for gas
3. Wrong network (switch to Polygon)
4. Insufficient reputation for action

### Can't connect wallet

1. Check MetaMask is unlocked
2. Ensure you're on Polygon network
3. Try refreshing the page
4. Clear browser cache if issues persist

### Reputation not updating

1. Wait for transaction confirmation (2-3 seconds)
2. Refresh the page
3. Check if reputation is locked (staked on a skill)

---

## Security

### Is my reputation safe?

Reputation is stored on-chain with:
- ReentrancyGuard protection
- CEI pattern (Checks-Effects-Interactions)
- Emergency pause mechanism
- Governance oversight

### What if I'm slashed incorrectly?

The anti-slash mechanism allows recovery:
- 5% per month of original slash
- Requires positive contributions
- 30-day minimum between claims

### Can the protocol pause operations?

Yes, the Owner can pause contracts in emergencies. This is a safety feature, not an admin control mechanism.

---

*Last Updated: 2026-05-23*