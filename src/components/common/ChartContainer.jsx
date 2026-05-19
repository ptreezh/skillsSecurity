import React from 'react';
import './ChartContainer.css';

/**
 * ChartContainer - Wrapper for chart components with loading/error states
 * @param {string} title - Chart title
 * @param {boolean} loading - Show loading state
 * @param {string} error - Error message
 * @param {number} height - Chart height in px (default: 300)
 * @param {React.ReactNode} children - Chart components
 */
export default function ChartContainer({ title, loading, error, height = 300, children }) {
  return (
    <div className="chart-container">
      {title && <h4 className="chart-title">{title}</h4>}
      {loading && (
        <div className="chart-loading" style={{ height }}>
          <span className="loading-spinner"></span>
          <span>Loading...</span>
        </div>
      )}
      {error && (
        <div className="chart-error" style={{ height }}>
          <span className="error-icon">!</span>
          <span>{error}</span>
        </div>
      )}
      {!loading && !error && children}
    </div>
  );
}