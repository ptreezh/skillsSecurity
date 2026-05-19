import React from 'react';
import './EmptyState.css';

/**
 * EmptyState - Reusable empty state component
 * @param {string} icon - Emoji or icon (default: empty box)
 * @param {string} title - Empty state title
 * @param {string} message - Description message
 * @param {React.ReactNode} action - Optional action button
 */
export default function EmptyState({ icon = '📦', title = 'No Data', message, action }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">{icon}</span>
      <h4 className="empty-title">{title}</h4>
      {message && <p className="empty-message">{message}</p>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}