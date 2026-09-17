import React, { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next'
import "./SelfOpsPanel.css";
import DividendCalculator from "../components/DividendCalculator";
import DistributionHistory from "../components/DistributionHistory";
import { usePolling } from "../hooks/usePolling";
import RevenueChart from "../components/charts/RevenueChart";
import PromotionBarChart from "../components/charts/PromotionBarChart";
import GovernancePieChart from "../components/charts/GovernancePieChart";
import HealthReportChart from "../components/charts/HealthReportChart";
import Leaderboard from "../components/leaderboard/Leaderboard";
import ChainDataService from "../services/ChainDataService.js";

// Phase 28 / v2.0：v1 代币经济功能（分红/治理提案/健康报告）已依无代币宪法下线；
// 晋升榜改接 chain1 真链排行（经后端网关），其余 tab 以空态+标注呈现

export default function SelfOpsPanel({ user, deployerStats }) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState("revenue");
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [votingPower, setVotingPower] = useState(0);
  const [revenueData, setRevenueData] = useState(null);
  const [promotionData, setPromotionData] = useState({ leaderboard: [] });
  const [governanceData, setGovernanceData] = useState({ proposals: [], activeProposal: null });
  const [healthData, setHealthData] = useState({ stats: null });

  const features = [
    { id: "revenue", label: t('selfOps.features.revenue'), icon: "💰" },
    { id: "promotion", label: t('selfOps.features.promotion'), icon: "📣" },
    { id: "governance", label: t('selfOps.features.governance'), icon: "🏛️" },
    { id: "health", label: t('selfOps.features.health'), icon: "🧬" }
  ]

  const tierLabel = t(`deployerDashboard.tiers.${['bronze', 'silver', 'gold'][deployerStats?.tier ?? 0]}.name`)

  const { data: revenueResult, loading: revenueLoading } = usePolling(
    // v1 分红已下线（无代币宪法）：恒为 0，保留 UI 结构
    async () => {
      if (!user?.address) return {};
      return { cumulative: 0, pending: 0 };
    },
    30000
  );

  const { data: promotionResult, loading: promotionLoading } = usePolling(
    // 晋升榜：chain1 真链声誉排行（v2）
    async () => {
      try {
        const { users } = await ChainDataService.fetchLeaderboard(10);
        return { leaderboard: users };
      } catch (_) {
        return { leaderboard: [] };
      }
    },
    30000
  );

  const { data: governanceResult, loading: governanceLoading } = usePolling(
    // v1 治理提案已下线：空提案列表
    async () => ({ proposals: [] }),
    30000
  );

  const { data: healthResult, loading: healthLoading } = usePolling(
    // v1 健康报告合约已下线：空统计
    async () => ({}),
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
    // v1 链上投票权已下线（无代币宪法）：投票权恒为 0
  }, [user]);

  useEffect(() => {
    if (healthResult) setHealthData(p => ({ ...p, stats: healthResult }));
  }, [healthResult]);

  const handleHealthReport = (type) => {
    // v1 健康报告上链已下线：仅本地记录
    const descriptions = {
      0: t('selfOps.healthReports.bug'),
      1: t('selfOps.healthReports.status'),
      2: t('selfOps.healthReports.stress')
    }
    console.log('[HealthReport] local only:', type, descriptions[type])
  }

  return (
    <div className="self-ops-panel animate-fade-in">
      <div className="self-ops-header">
        <h2 className="self-ops-title">{t('selfOps.title')}</h2>
        <span className="self-ops-badge">{tierLabel}</span>
      </div>

      <div className="alert alert-warning" style={{ marginBottom: 'var(--space-4)' }}>
        {t('selfOps.v1Retired')}
      </div>

      <div className="self-ops-tabs" role="tablist">
        {features.map(f => (
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
            <h3 className="self-ops-section-title">{t('selfOps.revenueOverview')}</h3>
            <RevenueChart history={[]} loading={revenueLoading} error={null} />
          </section>
        )}

        {activeTab === "promotion" && (
          <section className="animate-fade-in">
            <h3 className="self-ops-section-title">{t('selfOps.promotionLeaderboard')}</h3>
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
              <span className="label">{t('selfOps.myVotingPower')}</span>
              <span className="value">{votingPower}</span>
            </div>
            <GovernancePieChart
              proposal={selectedProposal || governanceData.proposals[0] || { forVotes: 0, againstVotes: 0 }}
              loading={governanceLoading}
              error={null}
            />
            <ul className="proposal-list">
              {governanceData.proposals.length === 0 ? (
                <li className="proposal-empty">{t('selfOps.noActiveProposals')}</li>
              ) : (
                governanceData.proposals.map(proposal => (
                  <li
                    key={proposal.id}
                    className={`proposal-item ${selectedProposal?.id === proposal.id ? "selected" : ""}`}
                    onClick={() => setSelectedProposal(proposal)}
                  >
                    <span className="proposal-id">#{proposal.id}</span>
                    <span className="proposal-votes">
                      {t('selfOps.votesFor', { count: Number(proposal.forVotes || 0) })} / {t('selfOps.votesAgainst', { count: Number(proposal.againstVotes || 0) })}
                    </span>
                    <div className="proposal-actions">
                      <button className="btn btn-sm btn-secondary" disabled={!user}>
                        {t('selfOps.voteFor')}
                      </button>
                      <button className="btn btn-sm btn-danger" disabled={!user}>
                        {t('selfOps.voteAgainst')}
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
                onClick={() => handleHealthReport(0)}
                disabled={!user}
              >
                <span className="health-action-icon">🐛</span>
                <span className="health-action-name">{t('selfOps.healthReports.bug')}</span>
                <span className="health-action-reward">+50 ASK</span>
              </button>
              <button
                className="health-action-card health-action-status"
                onClick={() => handleHealthReport(1)}
                disabled={!user}
              >
                <span className="health-action-icon">📊</span>
                <span className="health-action-name">{t('selfOps.healthReports.status')}</span>
                <span className="health-action-reward">+10 ASK</span>
              </button>
              <button
                className="health-action-card health-action-stress"
                onClick={() => handleHealthReport(2)}
                disabled={!user}
              >
                <span className="health-action-icon">⚡</span>
                <span className="health-action-name">{t('selfOps.healthReports.stress')}</span>
                <span className="health-action-reward">+100 ASK</span>
              </button>
            </div>
            <div className="health-stats">
              <span className="health-stats-label">{t('selfOps.monthlyRemaining')}</span>
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
