# Requirements: AgentSkills

**Defined:** 2026-05-16
**Core Value:** Skills with accountability — every action is traceable, every contributor is credited, every violation has consequences.

## v1.3 Requirements

Requirements for test infrastructure and testnet deployment. Each maps to roadmap phases.

### Test Infrastructure

- [ ] **TEST-01**: Install Hardhat test toolbox (chai-matchers, network-helpers, verify)
- [ ] **TEST-02**: Create test fixture system with correct deployment order (ASKToken → StakingManager → SkillRegistry → Attribution)
- [ ] **TEST-03**: Configure Mocha test runner with coverage reporting

### ASKToken Unit Tests

- [ ] **ASKT-01**: Test token minting with proper access control
- [ ] **ASKT-02**: Test token burning
- [ ] **ASKT-03**: Test delegation and vote weight tracking
- [ ] **ASKT-04**: Test event emissions

### SkillRegistry Unit Tests

- [ ] **SKIL-01**: Test reputation tier gates (L1-L5 thresholds)
- [ ] **SKIL-02**: Test fingerprint generation for skill verification
- [ ] **SKIL-03**: Test skill verification request and approval flow
- [ ] **SKIL-04**: Test effective reputation checks

### StakingManager Unit Tests

- [ ] **STAK-01**: Test stake and unstake with proper lock period
- [ ] **STAK-02**: Test slash mechanism with evidence validation
- [ ] **STAK-03**: Test reputation lock and recovery mechanism
- [ ] **STAK-04**: Test getRecoverableReputation() and claimRecoverableReputation()
- [ ] **STAK-05**: Test time-based unlock (90-day period) with evm_increaseTime + evm_mine

### Attribution Unit Tests

- [ ] **ATTR-01**: Test contribution creation and tracking
- [ ] **ATTR-02**: Test like mechanism with double-like prevention
- [ ] **ATTR-03**: Test cross-contract notification to StakingManager
- [ ] **ATTR-04**: Test positive contribution marking via setPositiveContribution()

### Integration Tests

- [ ] **INTG-01**: Test full contract deployment with correct dependency wiring
- [ ] **INTG-02**: Test reputation flow (register → verify → positive contribution → recovery)
- [ ] **INTG-03**: Test anti-slash flow (like → slash → lock → recover)
- [ ] **INTG-04**: Test cross-contract state synchronization

### Deployment

- [ ] **DEPL-01**: Update hardhat.config.js for Polygon Amoy (chainId 80002, remove deprecated Mumbai)
- [ ] **DEPL-02**: Create deploy-all.js deployment script
- [ ] **DEPL-03**: Deploy contracts to Polygon Amoy testnet
- [ ] **DEPL-04**: Verify contracts on Polygonscan using hardhat-verify

### Coverage Target

- [ ] **COVR-01**: Achieve 80%+ line coverage for all contracts
- [ ] **COVR-02**: 100% coverage on critical functions (stake, slash, lock, recover)

## v2 Requirements

Deferred to future release.

### Testnet Operations
- **DEPL-05**: Monitor deployed contracts on Amoy
- **DEPL-06**: Set up alerting for contract events

### Mainnet Preparation
- **DEPL-07**: Mainnet deployment plan
- **DEPL-08**: Audit engagement for production contracts

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Frontend E2E tests | Defer until frontend exists |
| Mainnet deployment | Testnet first, audit required before mainnet |
| Token sale/ICO | Token economics not finalized |
| Upgradeable proxies | Current contracts are not upgradeable |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TEST-01 | Phase 11 | Pending |
| TEST-02 | Phase 11 | Pending |
| TEST-03 | Phase 11 | Pending |
| ASKT-01 | Phase 12 | Pending |
| ASKT-02 | Phase 12 | Pending |
| ASKT-03 | Phase 12 | Pending |
| ASKT-04 | Phase 12 | Pending |
| STAK-01 | Phase 13 | Pending |
| STAK-02 | Phase 13 | Pending |
| STAK-03 | Phase 13 | Pending |
| STAK-04 | Phase 13 | Pending |
| STAK-05 | Phase 13 | Pending |
| SKIL-01 | Phase 14 | Pending |
| SKIL-02 | Phase 14 | Pending |
| SKIL-03 | Phase 14 | Pending |
| SKIL-04 | Phase 14 | Pending |
| ATTR-01 | Phase 14 | Pending |
| ATTR-02 | Phase 14 | Pending |
| ATTR-03 | Phase 14 | Pending |
| ATTR-04 | Phase 14 | Pending |
| INTG-01 | Phase 15 | Pending |
| INTG-02 | Phase 15 | Pending |
| INTG-03 | Phase 15 | Pending |
| INTG-04 | Phase 15 | Pending |
| DEPL-01 | Phase 16 | Pending |
| DEPL-02 | Phase 16 | Pending |
| DEPL-03 | Phase 16 | Pending |
| DEPL-04 | Phase 16 | Pending |
| COVR-01 | All phases | Pending |
| COVR-02 | Phase 13 | Pending |

**Coverage:**
- v1.3 requirements: 28 total
- Mapped to phases: 28
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-16*
*Last updated: 2026-05-16 after initial definition*