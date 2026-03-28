import React from 'react'
import ContextGauge from './ContextGauge'

export default function CostTracker({ totalCost = 0, ceiling = 10, peers = [] }) {
  const percentage = (totalCost / ceiling) * 100
  const costClass = percentage >= 80 ? 'danger' : percentage >= 50 ? 'warn' : ''

  const peerCosts = peers.filter(p => p.cost).sort((a, b) => (b.cost || 0) - (a.cost || 0))

  return (
    <div>
      <div className="cost-grid">
        <div className="cost-item">
          <div className="label">Session Cost</div>
          <div className={`value ${costClass}`}>${totalCost.toFixed(2)}</div>
        </div>
        <div className="cost-item">
          <div className="label">Ceiling</div>
          <div className="value">${ceiling.toFixed(2)}</div>
        </div>
        <div className="cost-item">
          <div className="label">Remaining</div>
          <div className={`value ${costClass}`}>${(ceiling - totalCost).toFixed(2)}</div>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <ContextGauge percentage={percentage} label="Budget" />
      </div>

      {peerCosts.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 10, color: '#555', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
            Per-Agent Cost
          </div>
          {peerCosts.map(peer => (
            <div key={peer.id} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '3px 0', borderBottom: '1px solid #1a1a1a',
              fontSize: 11
            }}>
              <span style={{ color: '#00aa00' }}>{peer.id}</span>
              <span style={{ color: '#ffaa00' }}>${peer.cost.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
