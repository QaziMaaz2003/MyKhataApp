import React from 'react';
import '../styles/BreakdownChart.css';

function BreakdownChart({ pendingCount, completedCount, title }) {
  const total = pendingCount + completedCount;
  const pendingPercent = total > 0 ? (pendingCount / total) * 100 : 0;
  const completedPercent = total > 0 ? (completedCount / total) * 100 : 0;

  return (
    <div className="breakdown-chart">
      <h3 className="chart-title">{title}</h3>
      <div className="chart-bar">
        <div className="bar-segment pending" style={{ width: `${pendingPercent}%` }}>
          {pendingPercent > 10 && <span className="bar-label">{Math.round(pendingPercent)}%</span>}
        </div>
        <div className="bar-segment completed" style={{ width: `${completedPercent}%` }}>
          {completedPercent > 10 && <span className="bar-label">{Math.round(completedPercent)}%</span>}
        </div>
      </div>
      <div className="chart-legend">
        <div className="legend-item">
          <span className="legend-dot pending"></span>
          <span className="legend-label">Pending ({pendingCount})</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot completed"></span>
          <span className="legend-label">Completed ({completedCount})</span>
        </div>
      </div>
    </div>
  );
}

export default BreakdownChart;
