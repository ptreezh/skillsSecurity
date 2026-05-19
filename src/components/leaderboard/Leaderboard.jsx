import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import EmptyState from "../common/EmptyState";
import "./Leaderboard.css";

const RANK_BADGES = {
  1: { emoji: "1", color: "#fbbf24", label: "Gold", bg: "#fef3c7" },
  2: { emoji: "2", color: "#94a3b8", label: "Silver", bg: "#f1f5f9" },
  3: { emoji: "3", color: "#cd7f32", label: "Bronze", bg: "#fef3c7" }
};

const TIER_LABELS = {
  0: { name: "Bronze", icon: "🥉", color: "#94a3b8" },
  1: { name: "Silver", icon: "🥈", color: "#60a5fa" },
  2: { name: "Gold", icon: "🥇", color: "#fbbf24" }
};

export default function Leaderboard({ entries = [], currentUserRank = null, loading, error }) {
  if (loading) {
    return <div className="leaderboard loading"><div className="loading-skeleton"></div></div>;
  }

  if (error) {
    return <div className="leaderboard error"><EmptyState icon="⚠️" title="Failed to load" message={error} /></div>;
  }

  if (entries.length === 0) {
    return <EmptyState icon="🏆" title="No Rankings Yet" message="Be the first to promote and claim the top spot!" />;
  }

  const getTrendIcon = (trend) => {
    if (trend > 0) return <TrendingUp size={14} className="trend-up" />;
    if (trend < 0) return <TrendingDown size={14} className="trend-down" />;
    return <Minus size={14} className="trend-neutral" />;
  };

  return (
    <div className="leaderboard">
      <table className="leaderboard-table">
        <thead>
          <tr>
            <th className="col-rank">Rank</th>
            <th className="col-domain">Deployer</th>
            <th className="col-users">Users</th>
            <th className="col-tier">Tier</th>
            <th className="col-trend">Trend</th>
          </tr>
        </thead>
        <tbody>
          {entries.slice(0, 10).map((entry, index) => {
            const rank = entry.rank || index + 1;
            const badge = RANK_BADGES[rank] || null;
            const tier = TIER_LABELS[entry.tier] || TIER_LABELS[0];

            return (
              <tr key={entry.domain || index} className={rank <= 3 ? "top-" + rank : ""}>
                <td className="col-rank">
                  {badge ? (
                    <span className="rank-badge" style={{ background: badge.bg, color: badge.color }} title={badge.label}>{badge.emoji}</span>
                  ) : (
                    <span className="rank-number">#{rank}</span>
                  )}
                </td>
                <td className="col-domain"><span className="domain-name">{entry.domain}</span></td>
                <td className="col-users"><span className="user-count">{entry.totalUsers}</span></td>
                <td className="col-tier"><span className="tier-badge" style={{ color: tier.color }} title={tier.name}>{tier.icon}</span></td>
                <td className="col-trend">{getTrendIcon(entry.trend || 0)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {currentUserRank && currentUserRank > 10 && (
        <div className="your-rank">
          <span className="rank-label">Your Rank:</span>
          <span className="rank-value">#{currentUserRank}</span>
        </div>
      )}
    </div>
  );
}
