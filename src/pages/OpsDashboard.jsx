/**
 * OpsDashboard - Operations monitoring dashboard
 * Phase 25: Product Completion
 */

import React, { useState, useEffect } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const OpsDashboard = () => {
  const [networkStats, setNetworkStats] = useState({
    blockNumber: 0,
    gasPrice: 0,
    connectedUsers: 0
  });
  const [gasHistory, setGasHistory] = useState([]);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [alertStats, setAlertStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Poll for updates
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch gas data
      const gasRes = await fetch(`${API_BASE}/api/gas`);
      const gasData = await gasRes.json();

      if (gasData.current) {
        setGasHistory(prev => {
          const updated = [...prev, gasData.current];
          return updated.slice(-50); // Keep last 50 readings
        });
      }

      // Fetch alert stats
      const alertRes = await fetch(`${API_BASE}/api/alerts?hours=24`);
      const alertData = await alertRes.json();
      setRecentAlerts(alertData.alerts || []);
      setAlertStats(alertData.stats);

      setNetworkStats(prev => ({
        ...prev,
        gasPrice: gasData.current?.fast || 0
      }));

      setLoading(false);
    } catch (err) {
      console.warn('Dashboard fetch failed:', err.message);
      setError('Monitoring server not connected');
      setLoading(false);
    }
  };

  const sendTestAlert = async (severity) => {
    try {
      await fetch(`${API_BASE}/api/alerts/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'TEST',
          message: `Test ${severity} alert`,
          severity
        })
      });
      fetchDashboardData();
    } catch (err) {
      console.error('Failed to send test alert:', err);
    }
  };

  if (loading) {
    return (
      <div className="ops-dashboard loading">
        <div className="spinner" />
        <p>Connecting to monitoring server...</p>
      </div>
    );
  }

  return (
    <div className="ops-dashboard">
      <div className="dashboard-header">
        <h1>Operations Dashboard</h1>
        <span className="status-badge">
          {error ? 'Disconnected' : 'Connected'}
        </span>
      </div>

      {error && (
        <div className="error-banner">
          {error} - Make sure monitoring server is running
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Gas Price (Fast)</h3>
          <p className="value">{networkStats.gasPrice} <span className="unit">Gwei</span></p>
          <span className={`indicator ${networkStats.gasPrice > 80 ? 'high' : networkStats.gasPrice > 50 ? 'medium' : 'low'}`}>
            {networkStats.gasPrice > 80 ? 'High' : networkStats.gasPrice > 50 ? 'Medium' : 'Normal'}
          </span>
        </div>

        <div className="stat-card">
          <h3>Alerts (24h)</h3>
          <p className="value">{alertStats?.last24h || 0}</p>
          <span className="sub-text">{alertStats?.last1h || 0} in last hour</span>
        </div>

        <div className="stat-card">
          <h3>Critical Alerts</h3>
          <p className="value critical">{alertStats?.bySeverity?.CRITICAL || 0}</p>
          <span className="sub-text">{alertStats?.bySeverity?.HIGH || 0} high priority</span>
        </div>

        <div className="stat-card">
          <h3>System Uptime</h3>
          <p className="value">{loading ? '--' : 'Operational'}</p>
        </div>
      </div>

      <div className="chart-section">
        <h2>Gas Price History</h2>
        <div className="gas-chart">
          {gasHistory.length > 0 ? (
            <div className="chart-container">
              <svg viewBox="0 0 400 150" className="gas-chart-svg">
                {gasHistory.map((point, i) => {
                  const x = (i / (gasHistory.length - 1)) * 400;
                  const y = 150 - Math.min(point.fast / 2, 150);
                  return (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r={3}
                      fill={point.fast > 80 ? '#ef4444' : point.fast > 50 ? '#f59e0b' : '#10b981'}
                    />
                  );
                })}
              </svg>
              <div className="chart-legend">
                <span className="dot high"></span> High
                <span className="dot medium"></span> Medium
                <span className="dot low"></span> Normal
              </div>
            </div>
          ) : (
            <p className="no-data">No gas data available</p>
          )}
        </div>
      </div>

      <div className="alerts-section">
        <div className="section-header">
          <h2>Recent Alerts</h2>
          <div className="test-buttons">
            <button onClick={() => sendTestAlert('INFO')} className="test-btn info">Test INFO</button>
            <button onClick={() => sendTestAlert('HIGH')} className="test-btn high">Test HIGH</button>
            <button onClick={() => sendTestAlert('CRITICAL')} className="test-btn critical">Test CRITICAL</button>
          </div>
        </div>

        {recentAlerts.length > 0 ? (
          <table className="alerts-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Type</th>
                <th>Severity</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {recentAlerts.slice(-20).reverse().map(alert => (
                <tr key={alert.id} className={`severity-${alert.severity.toLowerCase()}`}>
                  <td>{new Date(alert.timestamp).toLocaleString()}</td>
                  <td><code>{alert.type}</code></td>
                  <td>
                    <span className={`severity-badge ${alert.severity.toLowerCase()}`}>
                      {alert.severity}
                    </span>
                  </td>
                  <td>{alert.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="no-data">No alerts in the last 24 hours</p>
        )}
      </div>

      <style>{`
        .ops-dashboard {
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .dashboard-header h1 {
          margin: 0;
          font-size: 24px;
        }

        .status-badge {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          background: #10b981;
          color: white;
        }

        .status-badge:not([class*="disconnect"]) {
          background: #10b981;
        }

        .error-banner {
          background: #fef2f2;
          border: 1px solid #ef4444;
          color: #991b1b;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 16px;
        }

        .stat-card h3 {
          margin: 0 0 8px;
          font-size: 12px;
          text-transform: uppercase;
          color: #6b7280;
        }

        .stat-card .value {
          font-size: 32px;
          font-weight: 600;
          margin: 0;
        }

        .stat-card .value.critical {
          color: #ef4444;
        }

        .stat-card .unit {
          font-size: 16px;
          color: #6b7280;
        }

        .stat-card .sub-text {
          font-size: 12px;
          color: #9ca3af;
        }

        .indicator {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
          margin-top: 8px;
        }

        .indicator.high { background: #fef2f2; color: #991b1b; }
        .indicator.medium { background: #fffbeb; color: #92400e; }
        .indicator.low { background: #ecfdf5; color: #065f46; }

        .chart-section {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 24px;
        }

        .chart-section h2 {
          margin: 0 0 16px;
          font-size: 16px;
        }

        .gas-chart-svg {
          width: 100%;
          height: 150px;
          background: #f9fafb;
          border-radius: 8px;
        }

        .chart-legend {
          display: flex;
          gap: 16px;
          margin-top: 8px;
          font-size: 12px;
          color: #6b7280;
        }

        .chart-legend .dot {
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          margin-right: 4px;
        }

        .chart-legend .dot.high { background: #ef4444; }
        .chart-legend .dot.medium { background: #f59e0b; }
        .chart-legend .dot.low { background: #10b981; }

        .alerts-section {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 16px;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .section-header h2 {
          margin: 0;
          font-size: 16px;
        }

        .test-buttons {
          display: flex;
          gap: 8px;
        }

        .test-btn {
          padding: 4px 12px;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
        }

        .test-btn.info { background: #ecfdf5; color: #065f46; }
        .test-btn.high { background: #fffbeb; color: #92400e; }
        .test-btn.critical { background: #fef2f2; color: #991b1b; }

        .alerts-table {
          width: 100%;
          border-collapse: collapse;
        }

        .alerts-table th,
        .alerts-table td {
          padding: 8px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }

        .alerts-table th {
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
          color: #6b7280;
        }

        .severity-badge {
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
        }

        .severity-badge.info { background: #ecfdf5; color: #065f46; }
        .severity-badge.high { background: #fffbeb; color: #92400e; }
        .severity-badge.critical { background: #fef2f2; color: #991b1b; }
        .severity-badge.medium { background: #eff6ff; color: #1e40af; }

        code {
          background: #f3f4f6;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 12px;
        }

        .no-data {
          color: #9ca3af;
          text-align: center;
          padding: 24px;
        }

        .ops-dashboard.loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e5e7eb;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default OpsDashboard;