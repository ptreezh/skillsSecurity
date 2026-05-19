import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import ChartContainer from "../common/ChartContainer";

const REPORT_TYPES = { 0: { name: "Bug Report", color: "#ef4444" }, 1: { name: "Status Report", color: "#f59e0b" }, 2: { name: "Stress Test", color: "#8b5cf6" } };

export default function HealthReportChart({ stats = {}, loading, error }) {
  const { bugCount = 0, statusCount = 0, stressCount = 0, monthlyTotal = 0, maxMonthly = 10 } = stats;
  const chartData = [{ name: "Monthly Reports", bugs: bugCount, status: statusCount, stress: stressCount }];
  const formatTooltip = (value, name) => [value + " reports", { bugs: "Bug Report", status: "Status Report", stress: "Stress Test" }[name] || name];
  const remaining = maxMonthly - monthlyTotal;

  return (
    <ChartContainer title="Your Monthly Contributions" loading={loading} error={error} height={280}>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6b7280" }} />
          <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} domain={[0, maxMonthly]} />
          <Tooltip formatter={formatTooltip} />
          <Legend />
          <Bar dataKey="bugs" stackId="a" fill={REPORT_TYPES[0].color} name={REPORT_TYPES[0].name} />
          <Bar dataKey="status" stackId="a" fill={REPORT_TYPES[1].color} name={REPORT_TYPES[1].name} />
          <Bar dataKey="stress" stackId="a" fill={REPORT_TYPES[2].color} name={REPORT_TYPES[2].name} />
        </BarChart>
      </ResponsiveContainer>
      <div className="health-summary">
        <span className="summary-label">Remaining this month: </span>
        <span className="summary-value">{remaining} / {maxMonthly}</span>
      </div>
    </ChartContainer>
  );
}
