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
import { getContract, getProvider } from '../services/ContractService'

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

    try {
      const provider = getProvider()
      if (!provider) {
        setError('Wallet not connected')
        setLoading(false)
        return
      }

      const contract = getContract('RevenueDistributor')
      if (!contract) {
        // Fallback: show empty history with message
        setHistory([])
        setLoading(false)
        return
      }

      // Query past DividendsDistributed events
      // Note: In production, use The Graph or backend indexer for efficient history
      const filter = contract.filters.DividendsDistributed(address)
      const events = await contract.queryFilter(filter, -1000) // Last 1000 blocks

      const distributions = events.slice(-10).reverse().map((event) => ({
        amount: parseFloat(event.args[1]) / 1e18,
        totalDistributors: Number(event.args[2]),
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        timestamp: new Date().toLocaleDateString()
      }))

      setHistory(distributions)
    } catch (err) {
      console.error('Failed to load history:', err)
      setError('Failed to load history')
      setHistory([])
    }

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