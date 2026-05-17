# Phase 16: Polygon Amoy Deploy - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-17
**Phase:** 16-polygon-amoy-deploy
**Mode:** discuss
**Areas discussed:** Deployment script structure, Deployer wallet management, Contract verification flow, Polygonscan verification approach

---

## Deployment Script Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Single deploy-all script | One script deploys all contracts with auto-wiring | ✓ |
| Separate scripts per contract | Individual scripts with manual wiring via arguments | |
| Script per contract + master orchestrator | Separate scripts + one master to call them | |

**User's choice:** Single deploy-all script
**Notes:** Simplest approach — one command to deploy everything

---

## Deployer Wallet Management

| Option | Description | Selected |
|--------|-------------|----------|
| Environment file (.env) | Load from .env file — standard practice | |
| CLI prompt for private key | Prompt for private key on CLI — interactive | |
| Hybrid (.env + CLI prompt) | .env if exists, CLI prompt fallback | ✓ |
| Multiple wallet support | Support for different environments | |

**User's choice:** Hybrid (.env + CLI prompt)
**Notes:** Best of both worlds — easy for normal use, works when .env is missing

---

## Contract Verification Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Verify immediately after deploy | Verify after each contract deploys — one command | ✓ |
| Separate deploy and verify | Deploy first, verify later with separate command | |
| Verify with graceful fallback | Default auto-verify, skip if API key missing | |

**User's choice:** Verify immediately after deploy
**Notes:** Part of deploy script — single command deploys + verifies

---

## Polygonscan Verification Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Constructor args only | Pass constructor arguments encoded | ✓ |
| Constructor args + license | Constructor args + license type (MIT) | |
| Auto-detect compiler version | Auto-detect Solidity version from config | |

**User's choice:** Constructor args only
**Notes:** Standard approach

---

## Deferred Ideas

None — all discussion stayed within Phase 16 scope