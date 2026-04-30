import React from 'react';
import '../styles/StatsCard.css';

function StatsCard({ title, value, icon, color = 'primary', trend = null, description = '', onClick = null }) {
  return (
    <div className={`stats-card stats-card-${color}`} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div className="card-icon">{icon}</div>
      <div className="card-content">
        <p className="card-title">{title}</p>
        <h3 className="card-value">{value}</h3>
        {description && <p className="card-description">{description}</p>}
      </div>
      {trend && (
        <div className={`card-trend ${trend.direction}`}>
          {trend.direction === 'up' ? '↑' : '↓'} {trend.value}
        </div>
      )}
    </div>
  );
}

export default StatsCard;
