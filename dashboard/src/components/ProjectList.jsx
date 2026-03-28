import React from 'react'

export default function ProjectList({ peers = [] }) {
  // Group peers by their working directory to derive projects
  const projects = {}
  for (const peer of peers) {
    const dir = peer.cwd || 'unknown'
    if (!projects[dir]) {
      projects[dir] = { cwd: dir, agents: [], lastActivity: null }
    }
    projects[dir].agents.push(peer)
    if (peer.lastActivity) {
      const ts = new Date(peer.lastActivity)
      if (!projects[dir].lastActivity || ts > projects[dir].lastActivity) {
        projects[dir].lastActivity = ts
      }
    }
  }

  const projectList = Object.values(projects)

  return (
    <div>
      {projectList.length === 0 ? (
        <div style={{ color: '#555', fontSize: 11, padding: 12, textAlign: 'center' }}>
          No active projects detected
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {projectList.map(proj => {
            const workingCount = proj.agents.filter(a => a.status === 'working').length
            const name = proj.cwd.split('/').pop() || proj.cwd

            return (
              <div key={proj.cwd} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', background: '#111',
                border: '1px solid #1a3a1a', borderRadius: 6
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: workingCount > 0 ? '#00ff00' : '#555',
                  boxShadow: workingCount > 0 ? '0 0 8px #00ff00' : 'none'
                }} />

                <div style={{ flex: 1 }}>
                  <div style={{ color: '#00ffff', fontSize: 12, fontWeight: 600 }}>{name}</div>
                  <div style={{ color: '#555', fontSize: 10 }}>{proj.cwd}</div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: '#00aa00' }}>
                    {proj.agents.length} agent{proj.agents.length !== 1 ? 's' : ''}
                  </div>
                  {workingCount > 0 && (
                    <div style={{ fontSize: 10, color: '#00ff00' }}>
                      {workingCount} active
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
