import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import ChartContainer from '../common/ChartContainer';

const TIER_COLORS = {
  0: '#94a3b8',
  1: '#60a5fa',
  2: '#fbbf24'
};

/**
 * PromotionBarChart - Bar chart showing promotion statistics
 * @param {Array} data - Array of {domain, totalUsers, tier} objects
 * @param {boolean} loading - Loading state
 * @param {string} error - Error message
 */
export default function PromotionBarChart({ data = [], loading, error }) {
  return (
    <ChartContainer title="Your Promotion Performance" loading={loading} error={error} height={250}>
      {data.length === 0 ? (
        <div className="chart-empty">No promotion data yet</div>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis type="number" tick={{ fontSize: 12, fill: '#6b7280' }} />
            <YAxis type="category" dataKey="domain" width={100} tick={{ fontSize: 12, fill: '#6b7280' }} />
            <Tooltip formatter={(v) => [v + ' users', 'Total Users']} />
            <Bar dataKey="totalUsers" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={"cell-" + index} fill={TIER_COLORS[entry.tier] || TIER_COLORS[0]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartContainer>
  );
}