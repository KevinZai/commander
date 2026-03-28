import React from 'react'

const phaseStatus = {
  complete: { color: '#00aa00', icon: '█' },
  active: { color: '#00ff00', icon: '▓' },
  pending: { color: '#333', icon: '░' },
  failed: { color: '#ff3333', icon: '▒' },
}

export default function TaskProgress({ phases = [] }) {
  if (phases.length === 0) {
    // Default demo phases
    phases = [
      { name: 'Plan', status: 'complete' },
      { name: 'Skills (core)', status: 'complete' },
      { name: 'Skills (integration)', status: 'active' },
      { name: 'Claude Peers', status: 'active' },
      { name: 'Guides', status: 'active' },
      { name: 'Dashboard', status: 'active' },
      { name: 'Docs Update', status: 'pending' },
      { name: 'Verification', status: 'pending' },
      { name: 'Git Commit', status: 'pending' },
    ]
  }

  const completedCount = phases.filter(p => p.status === 'complete').length
  const percentage = Math.round((completedCount / phases.length) * 100)

  return (
    <div>
      {/* Progress bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{
          flex: 1, height: 6, background: '#111',
          borderRadius: 3, overflow: 'hidden', border: '1px solid #1a3a1a'
        }}>
          <div style={{
            width: `${percentage}%`, height: '100%',
            background: 'linear-gradient(90deg, #005500, #00ff00)',
            borderRadius: 3, transition: 'width 0.5s'
          }} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#00ff00', minWidth: 40 }}>
          {percentage}%
        </span>
      </div>

      {/* DAG Visualization */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {phases.map((phase, i) => {
          const { color, icon } = phaseStatus[phase.status] || phaseStatus.pending
          const isActive = phase.status === 'active'
          return (
            <div key={phase.name} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 10px', borderRadius: 4,
              background: isActive ? '#0a1a0a' : 'transparent',
              border: isActive ? '1px solid #1a3a1a' : '1px solid transparent',
              animation: isActive ? 'borderPulse 3s infinite' : 'none'
            }}>
              {/* Connector line */}
              <span style={{ color: '#1a3a1a', fontSize: 10, width: 20, textAlign: 'center' }}>
                {i === 0 ? '┌' : i === phases.length - 1 ? '└' : '├'}─
              </span>

              {/* Phase block */}
              <span style={{ color, fontSize: 12, width: 14 }}>{icon}</span>
              <span style={{ color: isActive ? '#00ff00' : color, fontSize: 12, fontWeight: isActive ? 600 : 400 }}>
                {phase.name}
              </span>

              {/* Status badge */}
              <span style={{
                marginLeft: 'auto', fontSize: 9,
                color: color, textTransform: 'uppercase',
                letterSpacing: 1
              }}>
                {phase.status}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
