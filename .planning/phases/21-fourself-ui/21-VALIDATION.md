---
phase: 21
slug: fourself-ui
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-19
---

# Phase 21 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `vitest.config.js` |
| **Quick run command** | `npm run test:unit -- --run` |
| **Full suite command** | `npm run test:all` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:unit -- --run`
- **After every plan wave:** Run `npm run test:all`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 21-01-00 | 01 | 1 | OPS-04,05,06,07 | — | N/A | unit | `grep -q "recharts" package.json` | ✅ | ⬜ pending |
| 21-01-01 | 01 | 1 | OPS-06,07 | — | N/A | unit | `test -f src/abi/Governance.json && test -f src/abi/HealthReporter.json` | ✅ | ⬜ pending |
| 21-01-02 | 01 | 1 | OPS-05 | T-21-01 | N/A | unit | `grep -q "getLeaderboard" src/services/ContractService.jsx` | ✅ | ⬜ pending |
| 21-01-03 | 01 | 1 | D-03 | T-21-02 | N/A | unit | `grep -q "visibilitychange" src/hooks/usePolling.js` | ❌ W0 | ⬜ pending |
| 21-01-04 | 01 | 1 | OPS-04,05,06,07 | — | N/A | unit | `test -f src/components/ChartContainer.jsx && test -f src/components/EmptyState.jsx` | ❌ W0 | ⬜ pending |
| 21-02-01 | 02 | 2 | OPS-04 | — | N/A | unit | `test -f src/components/charts/RevenueChart.jsx && grep -q "LineChart" src/components/charts/RevenueChart.jsx` | ❌ W0 | ⬜ pending |
| 21-02-02 | 02 | 2 | OPS-05 | — | N/A | unit | `test -f src/components/charts/PromotionBarChart.jsx && grep -q "BarChart" src/components/charts/PromotionBarChart.jsx` | ❌ W0 | ⬜ pending |
| 21-02-03 | 02 | 2 | OPS-05 | — | N/A | unit | `test -f src/components/leaderboard/Leaderboard.jsx && grep -q "rank" src/components/leaderboard/Leaderboard.jsx` | ❌ W0 | ⬜ pending |
| 21-02-04 | 02 | 2 | OPS-04,05 | — | N/A | integration | `grep -q "RevenueChart" src/pages/SelfOpsPanel.jsx && grep -q "Leaderboard" src/pages/SelfOpsPanel.jsx` | ✅ | ⬜ pending |
| 21-02-05 | 02 | 2 | OPS-06,07 | — | N/A | integration | `grep -q "Governance" src/pages/SelfOpsPanel.jsx && grep -q "Health" src/pages/SelfOpsPanel.jsx` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.js` — Test runner setup
- [ ] `src/hooks/usePolling.test.js` — Wave 0 for Task 21-01-03
- [ ] `src/components/ChartContainer.jsx` — Wave 0 for Task 21-01-04
- [ ] `src/components/EmptyState.jsx` — Wave 0 for Task 21-01-04
- [ ] `npm install -D vitest @testing-library/react` — Framework install

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Chart animations render correctly | OPS-04,05,06,07 | Visual verification | Manual browser test |
| Visibility API pauses polling | D-03 | Browser-specific API | Manual test in browser DevTools |
| Rank badges display correctly | OPS-05 | Visual verification | Manual browser test |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending / approved YYYY-MM-DD