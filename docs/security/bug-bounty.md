# AgentSkills Bug Bounty Program

**Effective Date:** TBD (post-audit)
**Last Updated:** 2026-05-22

## Overview

AgentSkills is offering a bug bounty program to encourage responsible disclosure of security vulnerabilities in our smart contracts. We value the security community's expertise and want to work together to keep our users safe.

## Scope

### In Scope

The following contracts are eligible for bug bounties:

| Contract | Severity Weight |
|----------|---------------|
| StakingManager.sol | 1.5x |
| SkillRegistry.sol | 1.0x |
| Attribution.sol | 1.0x |
| GovernanceTimelock.sol | 2.0x |
| AgentPausable.sol | 1.5x |

### Out of Scope

- Frontend vulnerabilities
- Third-party integrations
- Deprecated contracts
- Known issues documented in audit reports

## Severity Classification

### Critical (P1)

**Reward:** $10,000 - $50,000

Vulnerabilities that result in:
- Permanent loss of funds ( > 1 ETH equivalent)
- Theft of user reputation
- Complete contract takeover
- Permanent freezing of funds

### High (P2)

**Reward:** $2,500 - $10,000

Vulnerabilities that result in:
- Temporary loss of funds
- Unauthorized access to governance functions
- Bypass of pause mechanism
- Reentrancy attacks

### Medium (P3)

**Reward:** $500 - $2,500

Vulnerabilities that result in:
- Logic errors allowing incorrect state changes
- Denial of service (temporary)
- Access control bypass (non-critical functions)

### Low (P4)

**Reward:** $100 - $500

- Informational findings
- Minor gas optimization opportunities
- Frontend UX issues

## Rewards Multipliers

| Condition | Multiplier |
|-----------|------------|
| PoC with working exploit | 1.5x |
| StakingManager contract | 1.5x |
| GovernanceTimelock contract | 2.0x |
| Novel attack vector | 1.25x |
| Multiple vulnerabilities in single report | 1.2x |

## Disclosure Guidelines

### How to Report

1. **Email:** security@agentskills.xyz
2. **PGP Key:** [To be provided]
3. **Response Time:** Within 48 hours
4. **Preferred Language:** English

### Required Information

- Description of the vulnerability
- Steps to reproduce
- Proof of concept (code, transaction, etc.)
- Potential impact assessment
- Suggested fix (optional)

### Disclosure Timeline

| Phase | Duration |
|-------|----------|
| Initial Report | Within 48 hours |
| Severity Assessment | Within 7 days |
| Reward Determination | Within 14 days |
| Fix Deployment | Within 30 days (Critical) |
| Public Disclosure | After fix deployed |

## Rules

1. **No Public Disclosure:** Do not disclose vulnerabilities publicly until we have fixed them
2. **Test Environment Only:** Do not attempt to exploit vulnerabilities on mainnet
3. **No Social Engineering:** Do not attack our team members or infrastructure
4. **Good Faith:** Act in good faith and do not attempt to increase reward through pressure
5. **Privacy:** Keep all communication confidential

## Exclusions

The following are NOT eligible:

- Vulnerabilities in contracts not listed in scope
- Vulnerabilities in third-party contracts
- Attacks that require phishing or social engineering
- Findings from automated tools without proof of exploitability
- Denial of service from gas limit issues
- Previously known issues

## Safe Harbor

We consider activities conducted under this program to be authorized security research. We will not pursue legal action against good-faith researchers following these guidelines.

## Contact

**Security Email:** security@agentskills.xyz

*For general security inquiries, please use our contact form on the website.*

---

**By submitting a report, you agree to these terms.**
