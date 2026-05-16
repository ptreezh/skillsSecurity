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

### Out of Scope

- Token issuance (delayed per roadmap decision)
- Mobile app
- Non-English documentation

## Context

**Current state:** v1.1 milestone complete (2026-05-15)
- SKILLS_STANDARD.md v1.1 finalized with 32 requirements addressed
- Smart contracts: ASKToken, SkillRegistry, Attribution, StakingManager
- Full specification documented: classification, verification, tracing, anti-slash, reputation
- Testnet deployment pending

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

## Current Milestone: v1.3 测试与部署

**Goal:** 建立测试环境、编写合约测试、部署到 Polygon 测试网

**Target features:**
- 创建 hardhat.config.js 和测试环境
- 编写合约单元测试（ASKToken、SkillRegistry、Attribution、StakingManager）
- 编写跨合约集成测试
- 部署到 Polygon Amoy 测试网
- 验证合约交互和功能

---

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-16 after v1.2 complete*