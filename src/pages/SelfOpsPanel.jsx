/**
 * SelfOpsPanel - Four-Self System Integration Panel
 * Phase 19: Deployer Rewards Integration
 *
 * Integrates: 自运营 (Revenue) | 自推广 (Promotion) | 自进化 (Governance) | 自运维 (Health)
 */

import React, { useState, useEffect } from 'react';
import './SelfOpsPanel.css';

const SELF_OPS_CONFIG = {
  features: [
    {
      id: 'revenue',
      name: '自运营收益',
      icon: '💰',
      description: '自动获得协议收入分红',
      color: '#10b981'
    },
    {
      id: 'promotion',
      name: '自推广追踪',
      icon: '📣',
      description: '追踪你的推广效果',
      color: '#f59e0b'
    },
    {
      id: 'governance',
      name: '自进化治理',
      icon: '🏛️',
      description: '参与协议治理决策',
      color: '#8b5cf6'
    },
    {
      id: 'health',
      name: '自运维激励',
      icon: '🔧',
      description: '报告问题获得奖励',
      color: '#3b82f6'
    }
  ]
};

export default function SelfOpsPanel({ user, deployerStats }) {
  const [activeTab, setActiveTab] = useState('revenue');
  const [revenueData, setRevenueData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch revenue data when tab is active
  useEffect(() => {
    if (activeTab === 'revenue') {
      fetchRevenueData();
    }
  }, [activeTab, user]);

  async function fetchRevenueData() {
    setLoading(true);
    try {
      // TODO: Fetch from RevenueDistributor contract
      // Mock data for demo
      setRevenueData({
        totalDividends: 1250,
        pendingDividends: 450,
        lastDistribution: '2026-05-15',
        distributionCount: 12
      });
    } catch (error) {
      console.error('Failed to fetch revenue data:', error);
    }
    setLoading(false);
  }

  const currentFeature = SELF_OPS_CONFIG.features.find(f => f.id === activeTab);

  return (
    <div className="self-ops-panel">
      <div className="panel-header">
        <h2>四自运营系统</h2>
        <span className="deployer-badge">
          {deployerStats?.tier === 2 ? '🥇 黄金部署者' :
           deployerStats?.tier === 1 ? '🥈 白银部署者' : '🥉 青铜部署者'}
        </span>
      </div>

      <div className="tabs">
        {SELF_OPS_CONFIG.features.map(feature => (
          <button
            key={feature.id}
            className={`tab ${activeTab === feature.id ? 'active' : ''}`}
            onClick={() => setActiveTab(feature.id)}
            style={{
              '--tab-color': feature.color,
              borderColor: activeTab === feature.id ? feature.color : 'transparent'
            }}
          >
            <span className="tab-icon">{feature.icon}</span>
            <span className="tab-name">{feature.name}</span>
          </button>
        ))}
      </div>

      <div className="tab-content" style={{ borderColor: currentFeature?.color }}>
        {activeTab === 'revenue' && (
          <div className="revenue-tab">
            <div className="stats-row">
              <div className="stat-card">
                <div className="stat-label">累计分红</div>
                <div className="stat-value">{revenueData?.totalDividends || 0} ASK</div>
              </div>
              <div className="stat-card highlight">
                <div className="stat-label">待分红</div>
                <div className="stat-value">{revenueData?.pendingDividends || 0} ASK</div>
              </div>
            </div>

            <div className="distribution-info">
              <p>上次分红: {revenueData?.lastDistribution || '暂无'}</p>
              <p>累计分红次数: {revenueData?.distributionCount || 0}</p>
            </div>

            <div className="tier-benefits">
              <h3>等级特权</h3>
              <ul>
                <li className={deployerStats?.tier >= 0 ? 'active' : ''}>
                  🥉 青铜: 获得 40% 分红份额
                </li>
                <li className={deployerStats?.tier >= 1 ? 'active' : ''}>
                  🥈 白银: 获得 60% 分红份额 + 优先分配
                </li>
                <li className={deployerStats?.tier >= 2 ? 'active' : ''}>
                  🥇 黄金: 获得 80% 分红份额 + VIP 专项分红
                </li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'promotion' && (
          <div className="promotion-tab">
            <h3>推广追踪</h3>
            <div className="stats-row">
              <div className="stat-card">
                <div className="stat-label">有效推广</div>
                <div className="stat-value">{deployerStats?.totalUsers || 0}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">本月新增</div>
                <div className="stat-value">{deployerStats?.monthlyCount || 0}</div>
              </div>
            </div>

            <div className="promotion-tools">
              <h4>推广工具</h4>
              <div className="tool-card">
                <span className="tool-icon">🔗</span>
                <div className="tool-info">
                  <span className="tool-name">推荐链接</span>
                  <code className="tool-value">
                    {deployerStats?.referralLink || 'https://app.agentskills.io?ref=...'}
                  </code>
                </div>
                <button className="btn btn-sm" onClick={() => {
                  if (deployerStats?.referralLink) {
                    navigator.clipboard.writeText(deployerStats.referralLink);
                  }
                }}>
                  复制
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'governance' && (
          <div className="governance-tab">
            <h3>治理参与</h3>
            <div className="governance-info">
              <div className="voting-power">
                <span className="label">你的投票权重</span>
                <span className="value">{(deployerStats?.totalUsers || 0) * 1e18} 票</span>
              </div>

              {deployerStats?.tier === 2 && (
                <div className="gold-perk">
                  <span className="perk-icon">👑</span>
                  <span>黄金特权：可使用否决权（30% 反对票可暂停提案）</span>
                </div>
              )}

              <div className="proposals-preview">
                <h4>活跃提案</h4>
                <p className="no-proposals">暂无活跃提案</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'health' && (
          <div className="health-tab">
            <h3>运维贡献</h3>
            <div className="health-actions">
              <button className="action-card">
                <span className="action-icon">🐛</span>
                <span className="action-name">报告 Bug</span>
                <span className="action-reward">+50 ASK</span>
              </button>
              <button className="action-card">
                <span className="action-icon">📊</span>
                <span className="action-name">状态报告</span>
                <span className="action-reward">+10 ASK</span>
              </button>
              <button className="action-card">
                <span className="action-icon">⚡</span>
                <span className="action-name">压力测试</span>
                <span className="action-reward">+100 ASK</span>
              </button>
            </div>

            <div className="health-stats">
              <p>本月剩余报告次数: 10</p>
              <p>累计贡献: 0 次</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}