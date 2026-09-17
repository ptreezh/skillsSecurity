/**
 * DistributionHistory - Displays dividend distribution history
 * Phase 20-02: SelfOpsPanel Revenue Integration
 *
 * Shows past dividend distributions with:
 * - Timestamps (from events)
 * - Amounts received
 * - Pool size information
 */

import React, { useState, useEffect } from 'react'

// Phase 28 / v2.0：v1 RevenueDistributor 已依无代币宪法下线，
// 分红历史不再有链上事件来源，固定返回空历史

/**
 * DistributionHistory component
 * @param {string} address - Deployer wallet address
 */
export default function DistributionHistory({ address }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!address) return
    loadHistory()
  }, [address])

  async function loadHistory() {
    setLoading(true)
    setError(null)

    // v1 分红事件源已下线（无代币宪法）：无历史记录
    setHistory([])
    setLoading(false)
  }

  if (loading) {
    return <div className="distribution-history loading">Loading history...</div>
  }

  if (error) {
    return <div className="distribution-history error">{error}</div>
  }

  return (
    <div className="distribution-history">
      <h4>Dividend History</h4>

      {history.length === 0 ? (
        <div className="no-history">
          <p>No distributions yet. Keep promoting to earn dividends!</p>
        </div>
      ) : (
        <table className="history-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount</th>
              <th>Pool Size</th>
            </tr>
          </thead>
          <tbody>
            {history.map((entry, idx) => (
              <tr key={idx}>
                <td>{entry.timestamp}</td>
                <td>{entry.amount.toFixed(2)} ASK</td>
                <td>{entry.totalDistributors} deployers</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <button
        className="btn btn-sm"
        onClick={loadHistory}
        disabled={loading}
      >
        Refresh
      </button>
    </div>
  )
}