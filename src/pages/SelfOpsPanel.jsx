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
import {
  getCumulativeDividends,
  getPendingDividends,
  getLeaderboard,
  getActiveProposalCount,
  getProposal,
  getReporterStats,
  getUserVotingPower,
  submitHealthReport
} from "../services/ContractService";

const SELF_OPS_CONFIG = {
  features: [
    { id: "revenue", label: "收益", icon: "💰" },
    { id: "promotion", label: "推广", icon: "📣" },
    { id: "governance", label: "治理", icon: "🏛️" },
    { id: "health", label: "健康", icon: "🧬" }
  ]
};

const TIER_LABEL = { 0: "青铜", 1: "白银", 2: "黄金" };

export default function SelfOpsPanel({ user, deployerStats }) {
  const [activeTab, setActiveTab] = useState("revenue");
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [votingPower, setVotingPower] = useState(0);
  const [revenueData, setRevenueData] = useState(null);
  const [promotionData, setPromotionData] = useState({ leaderboard: [] });
  const [governanceData, setGovernanceData] = useState({ proposals: [], activeProposal: null });
  const [healthData, setHealthData] = useState({ stats: null });

  const { data: revenueResult, loading: revenueLoading } = usePolling(
    async () => {
      if (!user?.address) return {};
      return {
        cumulative: await getCumulativeDividends(user.address),
        pending: await getPendingDividends()
      };
    },
    30000
  );

  const { data: promotionResult, loading: promotionLoading } = usePolling(
    async () => ({ leaderboard: await getLeaderboard(10) }),
    30000
  );

  const { data: governanceResult, loading: governanceLoading } = usePolling(
    async () => {
      const count = await getActiveProposalCount();
      const proposals = [];
      for (let i = 1; i <= Math.min(count, 5); i++) {
        const p = await getProposal(i);
        if (p && !p.canceled) proposals.push({ id: i, ...p });
      }
      return { proposals };
    },
    30000
  );

  const { data: healthResult, loading: healthLoading } = usePolling(
    async () => (user?.address ? await getReporterStats(user.address) : {}),
    30000
  );

  useEffect(() => {
    if (revenueResult)
      setRevenueData({
        totalDividends: parseFloat(revenueResult.cumulative || 0).toFixed(2),
        pendingDividends: parseFloat(revenueResult.pending || 0).toFixed(2)
      });
  }, [revenueResult]);

  useEffect(() => {
    if (promotionResult)
      setPromotionData(p => ({ ...p, leaderboard: promotionResult.leaderboard || [] }));
  }, [promotionResult]);

  useEffect(() => {
    if (governanceResult?.proposals)
      setGovernanceData(p => ({ ...p, proposals: governanceResult.proposals || [] }));
  }, [governanceResult]);

  useEffect(() => {
    if (user?.address) getUserVotingPower(user.address).then(setVotingPower);
  }, [user]);

  useEffect(() => {
    if (healthResult) setHealthData(p => ({ ...p, stats: healthResult }));
  }, [healthResult]);

  const tierLabel = TIER_LABEL[deployerStats?.tier] ?? TIER_LABEL[0];

  return (
    <div className="self-ops-panel animate-fade-in">
      <div className="self-ops-header">
        <h2 className="self-ops-title">四自运营面板</h2>
        <span className="self-ops-badge">{tierLabel}</span>
      </div>

      <div className="self-ops-tabs" role="tablist">
        {SELF_OPS_CONFIG.features.map(f => (
          <button
            key={f.id}
            role="tab"
            aria-selected={activeTab === f.id}
            onClick={() => setActiveTab(f.id)}
            className={`self-ops-tab ${activeTab === f.id ? "active" : ""}`}
          >
            <span className="self-ops-tab-icon">{f.icon}</span>
            {f.label}
          </button>
        ))}
      </div>

      <div className="self-ops-content">
        {activeTab === "revenue" && (
          <section className="animate-fade-in">
            <h3 className="self-ops-section-title">收益概览</h3>
            <RevenueChart history={[]} loading={revenueLoading} error={null} />
          </section>
        )}

        {activeTab === "promotion" && (
          <section className="animate-fade-in">
            <h3 className="self-ops-section-title">推广排行榜</h3>
            <PromotionBarChart
              data={promotionData.leaderboard}
              loading={promotionLoading}
              error={null}
            />
            <div style={{ marginTop: "var(--space-4)" }}>
              <Leaderboard
                entries={promotionData.leaderboard}
                loading={promotionLoading}
                error={null}
              />
            </div>
          </section>
        )}

        {activeTab === "governance" && (
          <section className="animate-fade-in">
            <div className="voting-power">
              <span className="label">我的投票权</span>
              <span className="value">{votingPower}</span>
            </div>
            <GovernancePieChart
              proposal={selectedProposal || governanceData.proposals[0] || { forVotes: 0, againstVotes: 0 }}
              loading={governanceLoading}
              error={null}
            />
            <ul className="proposal-list">
              {governanceData.proposals.length === 0 ? (
                <li className="proposal-empty">暂无活跃提案</li>
              ) : (
                governanceData.proposals.map(proposal => (
                  <li
                    key={proposal.id}
                    className={`proposal-item ${selectedProposal?.id === proposal.id ? "selected" : ""}`}
                    onClick={() => setSelectedProposal(proposal)}
                  >
                    <span className="proposal-id">#{proposal.id}</span>
                    <span className="proposal-votes">
                      支持 {Number(proposal.forVotes || 0)} / 反对 {Number(proposal.againstVotes || 0)}
                    </span>
                    <div className="proposal-actions">
                      <button className="btn btn-sm btn-secondary" disabled={!user}>
                        支持
                      </button>
                      <button className="btn btn-sm btn-danger" disabled={!user}>
                        反对
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </section>
        )}

        {activeTab === "health" && (
          <section className="animate-fade-in">
            <div className="health-actions">
              <button
                className="health-action-card health-action-bug"
                onClick={() => submitHealthReport(0, "漏洞报告描述")}
                disabled={!user}
              >
                <span className="health-action-icon">🐛</span>
                <span className="health-action-name">漏洞报告</span>
                <span className="health-action-reward">+50 ASK</span>
              </button>
              <button
                className="health-action-card health-action-status"
                onClick={() => submitHealthReport(1, "状态报告描述")}
                disabled={!user}
              >
                <span className="health-action-icon">📊</span>
                <span className="health-action-name">状态报告</span>
                <span className="health-action-reward">+10 ASK</span>
              </button>
              <button
                className="health-action-card health-action-stress"
                onClick={() => submitHealthReport(2, "压力测试描述")}
                disabled={!user}
              >
                <span className="health-action-icon">⚡</span>
                <span className="health-action-name">压力测试</span>
                <span className="health-action-reward">+100 ASK</span>
              </button>
            </div>
            <div className="health-stats">
              <span className="health-stats-label">本月剩余提交次数：</span>
              <span className="health-stats-value">
                {Math.max(0, (healthData.stats?.maxMonthly || 10) - (healthData.stats?.monthlyCount || 0))} / {healthData.stats?.maxMonthly || 10}
              </span>
            </div>
            <HealthReportChart
              stats={{
                bugCount: 0,
                statusCount: 0,
                stressCount: 0,
                monthlyTotal: healthData.stats?.monthlyCount || 0,
                maxMonthly: healthData.stats?.maxMonthly || 10
              }}
              loading={healthLoading}
              error={null}
            />
          </section>
        )}
      </div>
    </div>
  );
}
