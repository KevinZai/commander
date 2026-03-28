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

function TreeNode({ peer, level = 0, allPeers }) {
  const children = allPeers.filter(p => p.spawnedBy === peer.id)
  const color = statusColors[peer.status] || '#555'
  const icon = statusIcons[peer.status] || '?'

  const connectors = ['┌', '├', '│', '└']
  const prefix = level === 0 ? '' : '  '.repeat(level - 1) + '├── '

  return (
    <>
      <div className={`spawn-node level-${Math.min(level, 2)}`}>
        <span className="connector" style={{ color: '#1a3a1a' }}>
          {level === 0 ? '◆' : '├──'}
        </span>
        <span className="node-name" style={{
          color: peer.isMain ? '#00ffff' : color,
          textShadow: peer.status === 'working' ? `0 0 6px ${color}` : 'none'
        }}>
          {icon} {peer.id}
        </span>
        {peer.isMain && (
          <span style={{ color: '#00ffff', fontSize: 9, marginLeft: 6, background: '#0a2a2a', padding: '1px 6px', borderRadius: 3 }}>
            MAIN
          </span>
        )}
        <span className="node-status" style={{ color }}>
          {peer.status}
        </span>
      </div>
      {children.map(child => (
        <TreeNode key={child.id} peer={child} level={level + 1} allPeers={allPeers} />
      ))}
    </>
  )
}

export default function SpawnTree({ peers = [] }) {
  const roots = peers.filter(p => !p.spawnedBy || p.isMain)

  return (
    <div className="spawn-tree">
      {roots.length === 0 ? (
        <div style={{ color: '#555', fontSize: 11, textAlign: 'center', padding: 12 }}>
          No spawn tree available
        </div>
      ) : (
        roots.map(root => (
          <TreeNode key={root.id} peer={root} level={0} allPeers={peers} />
        ))
      )}
    </div>
  )
}
