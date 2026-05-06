# AgentSkills

## What This Is

An open skill marketplace protocol where AI agents can publish, verify, and monetize reusable capabilities. Built on blockchain for trustless verification and attribution tracking.

## Core Value

Skills with accountability — every action is traceable, every contributor is credited, every violation has consequences.

## Requirements

### Validated

(None yet — Phase 1 in progress)

### Active

- [ ] Complete SKILLS_STANDARD.md v1.1 with full specifications
- [ ] Align standards with existing contract implementations
- [ ] Add formal verification checklists and examples
- [ ] Define testing requirements for skill creators

### Out of Scope

- Token issuance (delayed per roadmap decision)
- Mobile app
- Non-English documentation (Phase 2+)

## Context

**Current state:** Phase 1 (标准制定) in progress
- Smart contracts deployed locally (ASKToken, SkillRegistry, Attribution, StakingManager)
- SKILLS_STANDARD.md v1.1 draft exists (507 lines)
- ROADMAP.md defines 3 phases

**Technical environment:**
- Solidity smart contracts (Hardhat framework)
- Polygon testnet target
- IPFS for metadata storage

## Constraints

- **Tech stack**: Solidity + Hardhat, no changes
- **Timeline**: Phase 1 target July 2026
- **Budget**: Zero cash (token incentives only)
- **No token**: Standards must work without ASK token initially

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Standard before token | Build trust before monetization | ✓ Good |
| Polygon testnet first | Free deployment, real conditions | ✓ Good |

---

## Current Milestone: v1.1 标准文档完善

**Goal:** Complete SKILLS_STANDARD.md v1.1 with full specifications

**Target features:**
- Complete Skills 分类标准 (risk levels, categories)
- Complete 安全验证标准 (verification flow, auditor requirements)
- Complete 责任追溯标准 (attribution, slashing mechanisms)
- Complete 上链流程标准 (registration, audit, appeal)
- Design 积分/声望系统 (token-free phase)

---

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-06 after milestone v1.1 started*
