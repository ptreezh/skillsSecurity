import React, { useState, useEffect } from "react";
import "./SelfOpsPanel.css";
import DividendCalculator from "../components/DividendCalculator";
import DistributionHistory from "../components/DistributionHistory";
import { usePolling } from "../hooks/usePolling";
import RevenueChart from "../components/charts/RevenueChart";
import PromotionBarChart from "../components/charts/PromotionBarChart";
import GovernancePieChart from "../components/charts/GovernancePieChart";
import HealthReportChart from "../components/charts/HealthReportChart";
import Leaderboard from "../components/leaderboard/Leaderboard";
import { getCumulativeDividends, getPendingDividends, getLeaderboard, getActiveProposalCount, getProposal, getReporterStats } from "../services/ContractService";

const SELF_OPS_CONFIG = { features: [
  { id: "revenue", name: "REVENUE", icon: "💰", color: "#10b981" },
  { id: "promotion", name: "PROMO", icon: "📣", color: "#f59e0b" },
  { id: "governance", name: "GOV", icon: "🏛️", color: "#8b5cf6" },
  { id: "health", name: "HEALTH", icon: "🔧", color: "#3b82f6" }
]};

export default function SelfOpsPanel({ user, deployerStats }) {
  const [activeTab, setActiveTab] = useState("revenue");
  const [revenueData, setRevenueData] = useState(null);
  const [promotionData, setPromotionData] = useState({ leaderboard: [] });
  const [governanceData, setGovernanceData] = useState({ proposals: [], activeProposal: null });
  const [healthData, setHealthData] = useState({ stats: null });
  const { data: revenueResult, loading: revenueLoading } = usePolling(async () => { if (!user?.address) return {}; return { cumulative: await getCumulativeDividends(user.address), pending: await getPendingDividends() }; }, 30000);
  const { data: promotionResult, loading: promotionLoading } = usePolling(async () => ({ leaderboard: await getLeaderboard(10) }), 30000);
  const { data: governanceResult, loading: governanceLoading } = usePolling(async () => { const count = await getActiveProposalCount(); const proposals = []; for (let i = 1; i <= Math.min(count, 5); i++) { const p = await getProposal(i); if (p && !p.canceled) proposals.push({ id: i, ...p }); } return { proposals }; }, 30000);
  const { data: healthResult, loading: healthLoading } = usePolling(async () => user?.address ? await getReporterStats(user.address) : {}, 30000);

  useEffect(() => { if (revenueResult) setRevenueData({ totalDividends: parseFloat(revenueResult.cumulative || 0).toFixed(2), pendingDividends: parseFloat(revenueResult.pending || 0).toFixed(2) }); }, [revenueResult]);
  useEffect(() => { if (promotionResult) setPromotionData(p => ({ ...p, leaderboard: promotionResult.leaderboard || [] })); }, [promotionResult]);
  useEffect(() => { if (governanceResult) setGovernanceData(p => ({ ...p, proposals: governanceResult.proposals || [] })); }, [governanceResult]);
  useEffect(() => { if (healthResult) setHealthData(p => ({ ...p, stats: healthResult })); }, [healthResult]);

  return (
    <div className="self-ops-panel">
      <div className="panel-header">
        <h2>Four-Self Ops</h2>
        <span className="deployer-badge">{deployerStats?.tier === 2 ? "Gold" : deployerStats?.tier === 1 ? "Silver" : "Bronze"}</span>
      </div>
      <div className="tabs">{SELF_OPS_CONFIG.features.map(f => (<button key={f.id}>{f.icon}{f.name}</button>))}</div><div className="tab-content">{activeTab === "revenue" && <RevenueChart history={[]} loading={revenueLoading} error={null} />}{activeTab === "promotion" && <Leaderboard entries={promotionData.leaderboard} loading={promotionLoading} error={null} />}{activeTab === "governance" && <GovernancePieChart proposal={governanceData.activeProposal || {forVotes:0,againstVotes:0}} loading={governanceLoading} error={null} />}{activeTab === "health" && <HealthReportChart stats={{bugCount:0,statusCount:0,stressCount:0,monthlyTotal:healthData.stats?.monthlyCount||0,maxMonthly:healthData.stats?.maxMonthly||10}} loading={healthLoading} error={null} />}</div></div>  );
}