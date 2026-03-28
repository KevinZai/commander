import React from 'react'

export default function ContextGauge({ percentage = 0, label }) {
  const zone =
    percentage >= 90 ? 'red' :
    percentage >= 70 ? 'orange' :
    percentage >= 50 ? 'yellow' : 'green'

  const zoneColor =
    zone === 'red' ? '#ff3333' :
    zone === 'orange' ? '#ffaa00' :
    zone === 'yellow' ? '#ffaa00' : '#00ff00'

  return (
    <div className="gauge-container">
      {label && <span style={{ color: '#555', fontSize: 11, minWidth: 80 }}>{label}</span>}
      <div className="gauge-bar">
        <div
          className={`gauge-fill ${zone}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <span className="gauge-label" style={{ color: zoneColor }}>
        {Math.round(percentage)}%
      </span>
    </div>
  )
}
