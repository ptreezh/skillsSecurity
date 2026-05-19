# Phase 21: 四自系统 UI 完善 - Research
**Researched:** 2026-05-19
**Updated:** 2026-05-19 (Open questions resolved)
**Domain:** React Frontend / Data Visualization
**Confidence:** MEDIUM (codebase analysis, npm verification)

## Summary

Phase 21 enhances the SelfOpsPanel with data visualization for the four-self system. The current implementation has static placeholder content in each tab with no charts. Key gaps include missing Governance and HealthReporter ABIs, no chart library installed, and incomplete data fetching for leaderboards and proposal lists.

**Primary recommendation:** Install recharts 3.8.1, create missing ABIs for Governance and HealthReporter contracts, and add ContractService methods for all data needs before implementing chart components.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

1. **D-01:** Use `recharts` for all data visualization
   - Components: LineChart (trends), BarChart (comparisons), PieChart (distribution)
   - Rationale: Lightweight, React-native, composable API

2. **D-02:** Keep tabs in SelfOpsPanel (single page)
   - Tabs: revenue, promotion, governance, health
   - Rationale: Single panel for better UX, easier navigation

3. **D-03:** Auto-polling every 30 seconds when panel is visible
   - Use visibility API to pause polling when tab hidden
   - Add manual refresh button for user-triggered updates
   - Rationale: Balance between real-time data and reduced API calls

4. **D-04:** Leaderboard with badges for promotion panel
   - Show Top 10 with rank badges (gold/silver/bronze)
   - Include trend indicators (up/down arrows)
   - Paginated view for more entries
   - Rationale: Gamification encourages competition

### Claude's Discretion (Free to decide)
- Exact chart colors and styling
- Empty state designs per tab
- Animation/transitions between tabs
- Error state handling and retry logic

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| OPS-04 | 自运营面板（收益图表、分红历史） | SelfOpsPanel.jsx revenue tab exists; DividendCalculator and DistributionHistory components exist; RevenueDistributor ABI available |
| OPS-05 | 自推广面板（推广效果追踪、排名） | Promotion tab exists with placeholder content; DeployerRewards ABI available; leaderboard requires event indexing |
| OPS-06 | 自进化面板（提案列表、投票历史） | Governance tab exists; Governance.sol contract exists but ABI not in src/abi/; needs ContractService extension |
| OPS-07 | 自运维面板（报告记录、奖励统计） | Health tab exists; HealthReporter.sol exists but ABI not in src/abi/; needs ContractService extension |

**Note:** OPS-04 through OPS-07 from phase description, not from REQUIREMENTS.md (which focuses on contract testing).
</phase_requirements>

---

## Standard Stack

### Core Dependencies (need to install)

| Library | Version | Purpose | Source |
|---------|---------|---------|--------|
| recharts | 3.8.1 | Data visualization (LineChart, BarChart, PieChart) | [npm registry - VERIFIED] |
| ethers | 6.x | Blockchain interaction (may already be in dependencies) | [Check package.json] |

**Installation:**
```bash
npm install recharts@3.8.1
```

### Existing Components to Extend

| Component | Purpose | Location |
|-----------|---------|----------|
| SelfOpsPanel.jsx | Main four-self panel with 4 tabs | src/pages/ |
| DividendCalculator.jsx | Income estimation template | src/components/ |
| DistributionHistory.jsx | History/event list template | src/components/ |
| ContractService.jsx | Contract interaction layer | src/services/ |

### Missing ABIs (must create)

| Contract | Source | ABI Location |
|----------|--------|--------------|
| Governance.sol | contracts/DAO/Governance.sol | src/abi/Governance.json (MISSING) |
| HealthReporter.sol | contracts/HealthReporter.sol | src/abi/HealthReporter.json (MISSING) |

**Action required:** Copy ABI from compiled artifacts (contracts/artifacts/contracts/*.json) to src/abi/

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── components/
│   ├── charts/
│   │   ├── RevenueChart.jsx      # Line chart for dividend history
│   │   ├── PromotionBarChart.jsx # Bar chart for referral stats
│   │   ├── GovernancePieChart.jsx # Pie chart for vote distribution
│   │   └── HealthReportChart.jsx  # Stacked bar for report types
│   ├── leaderboard/
│   │   └── Leaderboard.jsx       # Top 10 with badges
│   └── common/
│       ├── ChartContainer.jsx     # Wrapper with loading/error states
│       └── EmptyState.jsx        # Reusable empty state component
├── hooks/
│   ├── usePolling.js             # Auto-refresh with visibility API
│   └── useDeployerData.js        # Data fetching hook per deployer
└── pages/
    └── SelfOpsPanel.jsx          # Enhanced with charts
```

### Pattern 1: Auto-Polling Hook (D-03 Implementation)

```javascript
// src/hooks/usePolling.js
import { useState, useEffect, useCallback, useRef } from 'react';

export function usePolling(fetchFn, interval = 30000) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const isVisible = useRef(true);

  // Visibility API to pause polling
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisible.current = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const fetch = useCallback(async () => {
    if (!isVisible.current) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    fetch(); // Initial fetch
    const id = setInterval(fetch, interval);
    return () => clearInterval(id);
  }, [fetch, interval]);

  return { data, loading, error, refetch: fetch };
}
```

### Pattern 2: Chart Container Wrapper

```javascript
// src/components/common/ChartContainer.jsx
export default function ChartContainer({ title, loading, error, children }) {
  return (
    <div className="chart-container">
      <h4>{title}</h4>
      {loading && <div className="chart-loading">Loading...</div>}
      {error && <div className="chart-error">{error}</div>}
      {!loading && !error && children}
    </div>
  );
}
```

### Pattern 3: Leaderboard with Badges (D-04 Implementation)

```javascript
// src/components/leaderboard/Leaderboard.jsx
const RANK_BADGES = {
  1: { emoji: '🥇', color: '#fbbf24', label: 'Gold' },
  2: { emoji: '🥈', color: '#94a3b8', label: 'Silver' },
  3: { emoji: '🥉', color: '#cd7f32', label: 'Bronze' },
};

function LeaderboardRow({ rank, deployer }) {
  const badge = RANK_BADGES[rank] || { emoji: `#${rank}`, color: '#6b7280' };
  return (
    <tr>
      <td><span style={{ color: badge.color }}>{badge.emoji}</span></td>
      <td>{deployer.domain}</td>
      <td>{deployer.totalUsers} users</td>
      <td>{deployer.tier === 2 ? '👑' : deployer.tier === 1 ? '🥈' : '🥉'}</td>
    </tr>
  );
}
```

### Anti-Patterns to Avoid

- **Don't block render with loading:** Show skeleton or cached data while loading
- **Don't poll when hidden:** Wasteful API calls; use visibilitychange event
- **Don't hardcode chart data:** Always fetch from contracts or use mock data in demo mode
- **Don't skip error boundaries:** Charts can throw on bad data

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chart library | Custom SVG/Canvas | recharts 3.8.1 | Battle-tested, composable, tree-shakeable |
| Auto-refresh | setInterval in component | usePolling hook | Clean lifecycle management, visibility API support |
| Empty states | Inline conditionals everywhere | EmptyState component | Consistent UX, reusable |
| Leaderboard pagination | Custom pagination | TanStack Table or similar | Handles edge cases, accessible |

---

## Common Pitfalls

### Pitfall 1: Event Query Performance
**What goes wrong:** Querying blockchain events with `queryFilter` for large block ranges causes timeouts.
**Why it happens:** Events grow unbounded; `-1000` blocks may not be enough, but more blocks slow down.
**How to avoid:** Use paginated queries, cache results, or use The Graph for production.
**Warning signs:** Console warnings about large queries, slow panel load.

### Pitfall 2: Leaderboard Data
**What goes wrong:** No `getLeaderboard()` function in DeployerRewards or ContractService.
**Why it happens:** Contract doesn't expose a leaderboard view; requires iterating `deployerList`.
**How to avoid:** Implement `getDeployerCount()` + `deployers(deployerList[i])` to build leaderboard client-side, or add contract view function.

### Pitfall 3: Missing ABIs
**What goes wrong:** Governance and HealthReporter have contracts but no ABIs in src/abi/.
**Why it happens:** ABIs were generated during compilation but not copied to frontend folder.
**How to avoid:** Copy from `contracts/artifacts/contracts/Governance.json` and `contracts/artifacts/contracts/HealthReporter.json`.

### Pitfall 4: Rank Badge for >3 Players
**What goes wrong:** Only ranks 1-3 have special badges; rank 4+ shows nothing.
**How to avoid:** Show rank number with subtle gray styling, or use pagination to limit to top 10.

---

## Code Examples

### Revenue Tab Enhancement (OPS-04)

```javascript
// In SelfOpsPanel.jsx - revenue tab
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import ChartContainer from '../components/common/ChartContainer';

// Inside revenue tab:
const dividendHistory = useMemo(() => {
  // Transform DistributionHistory data for LineChart
  return history.map(h => ({
    date: h.timestamp,
    amount: h.amount
  }));
}, [history]);

<ChartContainer title="30-Day Dividend History" loading={loading} error={error}>
  <ResponsiveContainer width="100%" height={300}>
    <LineChart data={dividendHistory}>
      <XAxis dataKey="date" />
      <YAxis />
      <Tooltip formatter={(value) => [`${value} ASK`, 'Dividend']} />
      <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} />
    </LineChart>
  </ResponsiveContainer>
</ChartContainer>
```

### Promotion Tab Enhancement (OPS-05)

```javascript
// Leaderboard component
import { BarChart, Bar, Cell } from 'recharts';

const TIER_COLORS = { 0: '#94a3b8', 1: '#60a5fa', 2: '#fbbf24' };

<BarChart data={leaderboardData} layout="vertical">
  <XAxis type="number" />
  <YAxis type="category" dataKey="domain" width={100} />
  <Tooltip />
  <Bar dataKey="totalUsers">
    {leaderboardData.map((entry, index) => (
      <Cell key={`cell-${index}`} fill={TIER_COLORS[entry.tier]} />
    ))}
  </Bar>
</BarChart>
```

### Governance Tab Enhancement (OPS-06)

```javascript
import { PieChart, Pie, Cell, Legend } from 'recharts';

const proposalVotes = {
  for: proposal.forVotes,
  against: proposal.againstVotes
};

<PieChart>
  <Pie
    data={[
      { name: 'For', value: proposalVotes.for },
      { name: 'Against', value: proposalVotes.against }
    ]}
    cx="50%"
    cy="50%"
    innerRadius={60}
    outerRadius={80}
  >
    <Cell fill="#10b981" />
    <Cell fill="#ef4444" />
  </Pie>
  <Legend />
</PieChart>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Static stat cards | Real-time charts | Phase 21 | Better data visualization |
| Manual refresh only | Auto-polling + visibility API | Phase 21 | Reduced API load, better UX |
| No leaderboard | Top 10 with badges | Phase 21 | Gamification |

**Deprecated/outdated:**
- Hardcoded mock data in tabs (being replaced with contract data)
- No loading states for chart components

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Governance ABI can be generated from contracts/DAO/Governance.sol | ABIs | ABI must exist or be generated |
| A2 | HealthReporter ABI can be generated from contracts/HealthReporter.sol | ABIs | ABI must exist or be generated |
| A3 | recharts works with React 18.2.0 | Dependencies | Verified: recharts 3.x supports React 18 |
| A4 | getLeaderboard can be implemented with deployerList iteration | Leaderboard | Implemented with Promise.all parallel fetching |

**If this table is non-empty:** Planners should verify assumptions before finalizing plan.

---

## Open Questions (RESOLVED)

1. **How to implement leaderboard efficiently?** (RESOLVED)
   - Solution: Use `getDeployerCount()` + `deployers(i)` with Promise.all for parallel fetching
   - Cap at 100 deployers for performance, sort by totalUsers, return Top N

2. **Should we use The Graph instead of direct contract queries?** (RESOLVED)
   - Decision: Use direct queries for MVP, plan migration to The Graph later if needed
   - Direct queries are simpler and sufficient for MVP scale

3. **What mock data should show when contracts aren't deployed?** (RESOLVED)
   - Solution: Provide `getMockLeaderboard()` in ContractService with seeded realistic data
   - Use realistic domain names (alice.eth, bob.io, etc.) and varied user counts

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build, npm | Yes | 20.x+ | — |
| npm | Package install | Yes | 10.x+ | — |
| React 18 | Frontend | Yes | 18.2.0 | — |
| recharts | Charts | No | — | Install: `npm install recharts@3.8.1` |
| ethers | Blockchain | Check pkg | — | Install if missing |
| Governance ABI | Governance tab | No | — | Generate from artifacts |
| HealthReporter ABI | Health tab | No | — | Generate from artifacts |

**Missing dependencies with no fallback:**
- recharts: Must install
- Governance ABI: Must copy from artifacts
- HealthReporter ABI: Must copy from artifacts

**Missing dependencies with fallback:**
- None identified — all missing items can be resolved by installation or file copy

---

## Validation Architecture

**Skip condition:** `.planning/config.json` has `workflow.nyquist_validation: false`

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (recommended for React) or Jest |
| Config file | `vitest.config.js` or `jest.config.js` |
| Quick run command | `npm run test:unit` |
| Full suite command | `npm run test:all` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Command | File Exists? |
|--------|----------|-----------|---------|--------------|
| OPS-04 | Revenue chart renders with data | Unit | `vitest src/components/charts/RevenueChart.test.jsx` | No — Wave 0 |
| OPS-04 | Dividend history loads | Integration | `vitest src/components/DistributionHistory.test.jsx` | No — Wave 0 |
| OPS-05 | Leaderboard shows Top 10 | Unit | `vitest src/components/leaderboard/Leaderboard.test.jsx` | No — Wave 0 |
| OPS-06 | Governance proposals list | Integration | `vitest src/components/GovernanceList.test.jsx` | No — Wave 0 |
| OPS-07 | Health reports chart | Unit | `vitest src/components/charts/HealthChart.test.jsx` | No — Wave 0 |
| D-03 | Auto-polling respects visibility | Unit | `vitest src/hooks/usePolling.test.js` | No — Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test:unit -- --run`
- **Per wave merge:** `npm run test:all`
- **Phase gate:** All tests green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/components/charts/RevenueChart.test.jsx` — REQ OPS-04
- [ ] `src/components/leaderboard/Leaderboard.test.jsx` — REQ OPS-05
- [ ] `src/components/GovernanceList.test.jsx` — REQ OPS-06
- [ ] `src/components/charts/HealthChart.test.jsx` — REQ OPS-07
- [ ] `src/hooks/usePolling.test.js` — REQ D-03
- [ ] `vitest.config.js` — Test runner setup
- [ ] Framework install: `npm install -D vitest @testing-library/react`

---

## Security Domain

> Required when security_enforcement is enabled. Project has no explicit security_enforcement config — treat as enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | — |
| V3 Session Management | No | — |
| V4 Access Control | No | Contract-level only |
| V5 Input Validation | Yes | Validate all data before rendering charts |
| V6 Cryptography | No | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS in chart data | Injection | Sanitize data before passing to recharts |
| ReDoS in chart animations | Denial | Use simple chart types, limit data points |
| Sensitive data in localStorage | Information Disclosure | Charts only store non-sensitive aggregated data |

---

## Sources

### Primary (HIGH confidence)
- SelfOpsPanel.jsx — Current implementation analysis
- DividendCalculator.jsx — Component pattern analysis
- DistributionHistory.jsx — Data fetching pattern analysis
- ContractService.jsx — Contract interaction patterns
- contracts/DAO/Governance.sol — Governance contract source
- contracts/HealthReporter.sol — Health contract source

### Secondary (MEDIUM confidence)
- recharts npm registry — Library verification (version 3.8.1)

### Tertiary (LOW confidence)
- None — all claims verified

---

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM — recharts verified, but new ABIs needed
- Architecture: MEDIUM — patterns from existing codebase, adapted for charts
- Pitfalls: MEDIUM — identified gaps based on code analysis

**Research date:** 2026-05-19
**Valid until:** 2026-06-19 (30 days for stable tech)

---

## RESEARCH COMPLETE