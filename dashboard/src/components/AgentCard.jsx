import React from 'react'

const statusColors = {
  working: '#00ff00',
  complete: '#00aa00',
  failed: '#ff3333',
  idle: '#ffaa00',
}

const statusIcons = {
  working: '⚡',
  complete: '✓',
  failed: '✗',
  idle: '◯',
}

export default function AgentCard({ agent }) {
  const statusClass = agent.status || 'idle'
  const isMain = agent.isMain

  return (
    <div className={`agent-item ${statusClass} ${isMain ? 'main-agent' : ''}`}>
      <span className="status-dot" style={{
        background: statusColors[statusClass],
        boxShadow: statusClass === 'working' ? `0 0 8px ${statusColors[statusClass]}` : 'none'
      }} />

      <div>
        <div className="agent-name">
          {statusIcons[statusClass]} {agent.id}
          {isMain && <span className="role" style={{ color: '#00ffff' }}> [MAIN]</span>}
          {agent.spawnedBy && (
            <span className="role"> ← {agent.spawnedBy}</span>
          )}
        </div>
        <div className="agent-task">{agent.summary}</div>
      </div>

      <div className="agent-meta">
        <div style={{ color: '#555', fontSize: 10 }}>{agent.cwd}</div>
        {agent.children && agent.children.length > 0 && (
          <div style={{ color: '#00ffff', fontSize: 10 }}>
            spawned: {agent.children.length}
          </div>
        )}
      </div>

      {agent.cost !== undefined && (
        <span className="agent-cost">${agent.cost?.toFixed(2)}</span>
      )}
    </div>
  )
}
