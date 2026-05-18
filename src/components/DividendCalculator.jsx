/**
 * DividendCalculator - Estimates monthly income for deployers
 * Phase 20-02: SelfOpsPanel Revenue Integration
 *
 * Calculates projected dividends based on:
 * - Historical dividend data from contract
 * - User's governance weight
 * - Current tier (Bronze/Silver/Gold)
 */

import React, { useState, useEffect } from 'react'
import { getDeployerStats, getCumulativeDividends } from '../services/ContractService'

/**
 * DividendCalculator component
 * @param {string} address - Deployer wallet address
 * @param {number} tier - Current tier (0=Bronze, 1=Silver, 2=Gold)
 */
export default function DividendCalculator({ address, tier }) {
  const [monthlyEstimate, setMonthlyEstimate] = useState(0)
  const [historicalAvg, setHistoricalAvg] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!address) return
    calculateEstimate()
  }, [address, tier])

  async function calculateEstimate() {
    setLoading(true)
    try {
      // Get historical data from cumulative dividends
      const cumulative = await getCumulativeDividends(address)
      const deployerStats = await getDeployerStats(address)

      // Simple estimation: historical total / months active
      const totalDays = deployerStats?.registeredAt
        ? Math.max(1, (Date.now() / 1000 - Number(deployerStats.registeredAt)) / (30 * 24 * 60 * 60))
        : 1
      const monthlyAvg = parseFloat(cumulative || 0) / totalDays

      // Tier-based projection
      const tierMultiplier = {
        0: 1.0,  // Bronze: base rate
        1: 1.5,  // Silver: +50%
        2: 2.0   // Gold: +100%
      }

      setHistoricalAvg(monthlyAvg)
      setMonthlyEstimate(monthlyAvg * (tierMultiplier[tier] || 1.0))
    } catch (error) {
      console.error('Calculation error:', error)
      setMonthlyEstimate(0)
      setHistoricalAvg(0)
    }
    setLoading(false)
  }

  const tierNames = { 0: 'Bronze', 1: 'Silver', 2: 'Gold' }
  const tierColors = { 0: '#94a3b8', 1: '#60a5fa', 2: '#fbbf24' }

  return (
    <div className="dividend-calculator">
      <h4>Income Estimator</h4>

      {loading ? (
        <div className="calculating">Calculating...</div>
      ) : (
        <div className="estimate-results">
          <div className="estimate-row">
            <span className="label">Historical Monthly Avg:</span>
            <span className="value">{historicalAvg.toFixed(2)} ASK</span>
          </div>

          <div
            className="estimate-row highlight"
            style={{ borderLeftColor: tierColors[tier] || tierColors[0] }}
          >
            <span className="label">Projected ({tierNames[tier] || 'Bronze'}):</span>
            <span className="value">{monthlyEstimate.toFixed(2)} ASK</span>
          </div>

          <p className="estimate-note">
            Based on your {tierNames[tier] || 'Bronze'} tier and current promotion performance.
            Actual income may vary based on protocol revenue.
          </p>

          <button
            className="btn btn-sm"
            onClick={calculateEstimate}
            disabled={loading}
          >
            Recalculate
          </button>
        </div>
      )}
    </div>
  )
}