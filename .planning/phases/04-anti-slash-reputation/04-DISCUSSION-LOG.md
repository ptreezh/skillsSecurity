# Phase 4: 反噬与声望系统 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-08
**Phase:** 04-anti-slash-reputation
**Areas discussed:** Slash Evidence & Recovery, Reputation Dynamics, Privilege Unlocks, Token Migration

---

## Slash Evidence & Recovery

| Option | Description | Selected |
|--------|-------------|----------|
| Multi-layer evidence | Code review + scan + attestation + harm docs | ✓ |
| Code review only | Detailed code review with vulnerability citations | |
| Security scan only | Automated scan results only | |

**User's choice:** Multi-layer evidence

**Notes:** Evidence must include code review, security scan, signed attestation, and harm documentation

---

| Option | Description | Selected |
|--------|-------------|----------|
| Time-based + Activity | Gradual recovery over time through positive activity | |
| Full recovery | Full recovery after appeal if successful | |
| No automatic recovery | Must earn back reputation through new contributions only | |

**User's choice:** Time-based + Activity

---

| Option | Description | Selected |
|--------|-------------|----------|
| 30-day lockout + earning rate | Frozen 30 days, then 10% per month | |
| Partial immediate + slow earning | 20% immediate, 5% per month | |
| Slow earning only | No lockout, 5% per month cap | ✓ |

**User's choice:** Slow earning only

---

## Reputation Dynamics

| Option | Description | Selected |
|--------|-------------|----------|
| No cap | Reputation can grow indefinitely | ✓ |
| Soft cap | Soft cap at 10,000 with diminishing returns | |
| Hard cap | Hard cap at 10,000 | |

**User's choice:** No cap

---

| Option | Description | Selected |
|--------|-------------|----------|
| No decay | Reputation stays stable regardless of activity | ✓ |
| Mild decay | 5% per year after 6 months inactivity | |
| Moderate decay | 10% per year after 3 months inactivity | |

**User's choice:** No decay

---

## Privilege Unlocks

| Option | Description | Selected |
|--------|-------------|----------|
| Tiered thresholds | L1(0+), L2(100+), L3(500+), L4(2000+), L5(5000+) | ✓ |
| Cumulative points | Points accumulate to unlock permissions | |
| Skill-based unlocks | Each ability has its own reputation requirement | |

**User's choice:** Tiered thresholds

---

| Option | Description | Selected |
|--------|-------------|----------|
| Expanded tier system | Clear thresholds with distinct privileges | ✓ |
| Conservative approach | Minimal unlock differences | |
| Aggressive approach | Major privileges only at high tiers | |

**User's choice:** Expanded tier system

---

## Token Migration

| Option | Description | Selected |
|--------|-------------|----------|
| 1:1 conversion | 1 reputation = 1 token | ✓ |
| Vesting schedule | Converted tokens vest over 12 months | |
| Bonus for early migrators | Early migrators get 10% bonus | |

**User's choice:** 1:1 conversion

---

| Option | Description | Selected |
|--------|-------------|----------|
| No restrictions | Free conversion at token launch | ✓ |
| Lock reputation during migration | Reputation frozen during migration window | |
| Gradual unlock | Reputation unlocks over 12 months | |

**User's choice:** No restrictions

---

## Summary

All 4 selected areas were discussed and decisions made:
- Slash: Multi-layer evidence + Slow earning recovery (5%/month, no lockout)
- Reputation: No cap, no decay, tiered thresholds (L1-L5)
- Privileges: Expanded tier system with clear privilege differences
- Token: 1:1 conversion, no restrictions
