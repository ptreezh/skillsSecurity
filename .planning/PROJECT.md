# AgentSkills

## What This Is

An open skill marketplace protocol where AI agents can publish, verify, and monetize reusable capabilities. Built on blockchain for trustless verification and attribution tracking.

## Core Value

Skills with accountability — every action is traceable, every contributor is credited, every violation has consequences.

## Requirements

### Validated (v1.1)

- ✓ SKILLS_STANDARD.md v1.1 complete with full specifications — v1.1
- ✓ Skill classification standards (LOW/MEDIUM/HIGH/CRITICAL) — v1.1
- ✓ Security verification standards with checklists — v1.1
- ✓ Accountability tracing with fingerprint mechanism — v1.1
- ✓ Anti-slash mechanism with multi-layer evidence — v1.1
- ✓ Reputation system with 5-tier privileges — v1.1
- ✓ Contract ABI reference appendix — v1.1

### Validated (v1.2)

- ✓ Implement reputation recovery functions in StakingManager.sol — Phase 8
- ✓ Implement reputation lock mechanism and effective reputation checks — Phases 9
- ✓ Update SKILLS_STANDARD.md to v1.2 — Phase 10

### Validated (v1.3)

- ✓ Integration tests for deployment wiring and cross-contract interactions — Phase 15

### Out of Scope

- Token issuance (delayed per roadmap decision)
- Mobile app
- Non-English documentation

## Context

**Current state:** v1.1–v1.7 全部完成（26 phases，2026-05-25）；v2 六合约已真实部署 ChainMaker chain1（solo，区块 28-53，13/13 验证全绿，`deployments.json`）；断点：前端仍指向废弃 v1 合约 + Polygon Amoy RPC，后端无链上读端点，服务未持久化。v2.0 目标：端到端收官（2026-09-16 启动）。

**Technical environment:**
- Solidity smart contracts (Hardhat framework)
- Polygon testnet target
- IPFS for metadata storage

## Constraints

- **Tech stack**: Solidity + Hardhat, no changes
- **Timeline**: Testnet deployment in next milestone
- **Budget**: Zero cash (token incentives only)
- **No token**: Standards work without ASK token initially

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Standard before token | Build trust before monetization | ✓ Good |
| Polygon testnet first | Free deployment, real conditions | ✓ Good |
| 5-tier reputation system | L1-L5 with clear privileges | ✓ Good |
| Multi-layer evidence for slash | 4 types of evidence required | ✓ Good |
| 2/3 approval threshold | Balance security and throughput | ✓ Good |

---

## Current Milestone: v2.0 端到端上线收官

**Goal:** 打通公网前端 → 后端 API → ChainMaker chain1 完整生产链路，端到端可演示、可持续运行、有验收证据

**Target features:**
- 后端链上读 API（skills / reputation / leaderboard / stats）
- 前端去 Amoy 化，全部数据经后端 ChainMaker 网关
- 服务持久化运行 + 公网前端重新部署
- Slither/Mythril 实跑 + 端到端验收留证

---

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-09-16 — v2.0 milestone started*