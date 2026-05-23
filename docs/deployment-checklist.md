# Production Deployment Checklist

## Pre-Deployment

### Security Requirements
- [ ] Third-party audit completed
- [ ] All audit findings addressed or documented
- [ ] Bug bounty program configured
- [ ] Security contacts established (security@agentskills.xyz)

### Code Requirements
- [ ] All tests passing (27+ tests)
- [ ] Coverage > 80%
- [ ] No console.log statements in production code
- [ ] Environment variables configured
- [ ] ABIs up to date

### Infrastructure
- [ ] Monitoring server deployed
- [ ] Alert channels configured (Telegram, Email, Slack)
- [ ] Dashboard accessible
- [ ] Health checks passing

---

## Smart Contract Deployment

### Phase 1: Core Contracts (Deploy First)
- [ ] Deploy StakingManager
- [ ] Deploy SkillRegistry
- [ ] Deploy Attribution

### Phase 2: Governance (After Core)
- [ ] Deploy GovernanceTimelock (3-of-N multisig, 24h delay)
- [ ] Deploy AgentTimelock (48h delay)
- [ ] Deploy ReputationVotes
- [ ] Deploy AgentGovernor

### Post-Deployment
- [ ] Verify source code on Polygonscan
- [ ] Update contract addresses in frontend
- [ ] Update ABIs in src/abi/
- [ ] Update environment variables

---

## Configuration

### Environment Variables
```bash
# Required
STAKING_MANAGER_ADDRESS=0x...
SKILL_REGISTRY_ADDRESS=0x...
ATTRIBUTION_ADDRESS=0x...
GOVERNANCE_ADDRESS=0x...

# Optional
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
```

### Network Settings
- Polygon Mainnet: Chain ID 137
- RPC: https://polygon-rpc.com
- Explorer: https://polygonscan.com

---

## Post-Deployment Verification

### Functional Tests
1. [ ] Wallet connects successfully
2. [ ] Skill registration works
3. [ ] Reputation displays correctly
4. [ ] Staking/unstaking functional
5. [ ] Event monitoring active

### Monitoring Tests
1. [ ] Gas price monitoring active
2. [ ] Alert system working
3. [ ] Dashboard accessible at /ops-dashboard

---

## Ongoing Operations

### Daily Tasks
- Review monitoring dashboard
- Check alert history
- Verify gas prices

### Weekly Tasks
- Review governance proposals
- Update documentation
- Check for contract updates

### Incident Response
- [ ] Alert response procedures documented
- [ ] Backup verification
- [ ] Disaster recovery tested

---

*Checklist Version: 1.0.0*
*Last Updated: 2026-05-23*