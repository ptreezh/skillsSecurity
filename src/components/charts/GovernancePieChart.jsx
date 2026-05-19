import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import ChartContainer from '../common/ChartContainer';

const COLORS = {
  for: '#10b981',
  against: '#ef4444',
  neutral: '#94a3b8'
};

/**
 * GovernancePieChart - Pie chart showing vote distribution
 * OPS-06: Governance panel with voting visualization
 * @param {Object} proposal - {forVotes, againstVotes, hasVoted}
 * @param {boolean} loading - Loading state
 * @param {string} error - Error message
 */
export default function GovernancePieChart({ proposal, loading, error }) {
  if (!proposal) {
    return (
      <ChartContainer title="Vote Distribution" loading={loading} error={error}>
        <div className="chart-empty">Select a proposal to view votes</div>
      </ChartContainer>
    );
  }

  const data = [
    { name: 'For', value: Number(proposal.forVotes || 0) },
    { name: 'Against', value: Number(proposal.againstVotes || 0) }
  ].filter(d => d.value > 0);

  if (data.length === 0) {
    data.push({ name: 'No Votes', value: 1 });
  }

  const totalVotes = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <ChartContainer title="Vote Distribution" loading={loading} error={error} height={260}>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            label={({ name, percent }) => name + ' ' + (percent * 100).toFixed(0) + '%'}
            labelLine={false}
          >
            <Cell fill={COLORS.for} />
            <Cell fill={COLORS.against} />
          </Pie>
          <Tooltip formatter={(v, name) => {
            const pct = totalVotes > 0 ? ((v / totalVotes) * 100).toFixed(1) : 0;
            return [v.toLocaleString() + ' (' + pct + '%)', name];
          }} />
          <Legend verticalAlign="bottom" height={36} />
        </PieChart>
      </ResponsiveContainer>
      {proposal.hasVoted && <div className="vote-badge voted">You have voted</div>}
    </ChartContainer>
  );
}