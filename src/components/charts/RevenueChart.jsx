import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import ChartContainer from '../common/ChartContainer';

/**
 * RevenueChart - 30-day dividend history line chart
 * OPS-04: Revenue panel with dividend history chart
 * @param {Array} history - Array of {date, amount} objects
 * @param {boolean} loading - Loading state
 * @param {string} error - Error message
 */
export default function RevenueChart({ history = [], loading, error }) {
  const chartData = useMemo(() => {
    return history.map((entry) => ({
      date: entry.date || entry.timestamp,
      dividend: parseFloat(entry.amount || 0),
      cumulative: 0
    })).reverse().reduce((acc, curr, idx, arr) => {
      curr.cumulative = curr.dividend + (arr[idx - 1]?.cumulative || 0);
      acc.push(curr);
      return acc;
    }, []);
  }, [history]);

  return (
    <ChartContainer title="30-Day Dividend History" loading={loading} error={error} height={280}>
      {chartData.length === 0 ? (
        <div className="chart-empty">No dividend history yet</div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(v) => v.substring(5)} />
            <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(v) => v + ' ASK'} width={80} />
            <Tooltip formatter={(v) => [v.toFixed(2) + ' ASK', 'Dividend']} contentStyle={{ borderRadius: '8px' }} />
            <Legend />
            <Line type="monotone" dataKey="dividend" name="Dividend" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="cumulative" name="Cumulative" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 5" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartContainer>
  );
}