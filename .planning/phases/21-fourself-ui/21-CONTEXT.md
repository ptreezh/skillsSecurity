# Phase 21: 四自系统 UI 完善 - Context

**Gathered:** 2026-05-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Enhance SelfOpsPanel with data visualization for the four-self system:
1. 自运营面板（收益图表、分红历史）- Revenue panel with charts
2. 自推广面板（推广效果追踪、排名）- Promotion panel with rankings
3. 自进化面板（提案列表、投票历史）- Governance panel
4. 自运维面板（报告记录、奖励统计）- Health panel

</domain>

<decisions>
## Implementation Decisions

### Charts Library
- **D-01:** Use `recharts` for all data visualization
  - Components: LineChart (trends), BarChart (comparisons), PieChart (distribution)
  - Rationale: Lightweight, React-native, composable API

### Layout
- **D-02:** Keep tabs in SelfOpsPanel (single page)
  - Tabs: revenue, promotion, governance, health
  - Rationale: Single panel for better UX, easier navigation

### Data Refresh
- **D-03:** Auto-polling every 30 seconds when panel is visible
  - Use visibility API to pause polling when tab hidden
  - Add manual refresh button for user-triggered updates
  - Rationale: Balance between real-time data and reduced API calls

### Ranking Display
- **D-04:** Leaderboard with badges for promotion panel
  - Show Top 10 with rank badges (gold/silver/bronze)
  - Include trend indicators (up/down arrows)
  - Paginated view for more entries
  - Rationale: Gamification encourages competition

### Claude's Discretion
- Exact chart colors and styling
- Empty state designs per tab
- Animation/transitions between tabs
- Error state handling and retry logic

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Components
- `src/pages/SelfOpsPanel.jsx` — Main four-self panel with tabs
- `src/components/DividendCalculator.jsx` — Existing dividend calculator (Phase 20)
- `src/components/DistributionHistory.jsx` — Existing history component (Phase 20)
- `src/services/ContractService.jsx` — Contract interaction layer

### Contract ABIs
- `src/abi/RevenueDistributor.json` — Revenue distribution functions
- `src/abi/DeployerRewards.json` — Promotion/referral tracking

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- SelfOpsPanel: Existing tab structure with feature config
- DividendCalculator: Template for calculator-style components
- DistributionHistory: Template for history/event list components
- ContractService: getDeployerStats, getCumulativeDividends, etc.

### Established Patterns
- Tab-based navigation with feature config
- Promise.all for parallel data fetching
- Loading states with conditional rendering
- CSS module styling

### Integration Points
- Add chart components to each tab
- Extend ContractService with ranking functions
- Hook into existing data fetching patterns

</code_context>

<specifics>
## Specific Ideas

- Revenue chart: Show 30-day dividend history as line chart
- Promotion leaderboard: Top 10 deployers by referral count
- Governance: List of active proposals with vote counts
- Health: Bug report submissions and reward history

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 21-fourself-ui*
*Context gathered: 2026-05-19*
