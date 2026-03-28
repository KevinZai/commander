import React, { useState } from 'react'
import AgentCard from './components/AgentCard'
import ProjectList from './components/ProjectList'
import CostTracker from './components/CostTracker'
import TaskProgress from './components/TaskProgress'
import ContextGauge from './components/ContextGauge'
import SpawnTree from './components/SpawnTree'
import LogStream from './components/LogStream'
import { usePeers, useLogs } from './hooks/usePolling'

export default function App() {
  const { data: peerData } = usePeers(3000)
  const { data: logData } = useLogs(2000)
  const [activeTab, setActiveTab] = useState('agents')

  const peers = peerData?.peers || []
  const logs = logData?.entries || []
  const totalCost = peerData?.totalCost || 0
  const sessionDuration = peerData?.sessionDuration || '0m'

  const workingCount = peers.filter(p => p.status === 'working').length
  const completeCount = peers.filter(p => p.status === 'complete').length
  const failedCount = peers.filter(p => p.status === 'failed').length

  return (
    <div>
      {/* Header */}
      <header className="header">
        <div className="header-brand">
          <h1>CLAUDE CODE BIBLE</h1>
          <span className="version">v1.2</span>
          <span style={{ color: '#555', fontSize: 11 }}>AGENT DASHBOARD</span>
        </div>
        <div className="header-status">
          <span>
            <span className={`status-dot ${workingCount > 0 ? 'live' : 'idle'}`} />
            {workingCount} active
          </span>
          <span style={{ color: '#00aa00' }}>{completeCount} done</span>
          {failedCount > 0 && <span style={{ color: '#ff3333' }}>{failedCount} failed</span>}
          <span style={{ color: '#555' }}>|</span>
          <span style={{ color: '#ffaa00' }}>${totalCost.toFixed(2)}</span>
          <span style={{ color: '#555' }}>|</span>
          <span style={{ color: '#555' }}>{sessionDuration}</span>
        </div>
      </header>

      {/* Tab Nav */}
      <nav style={{
        display: 'flex', gap: 0, padding: '0 24px',
        borderBottom: '1px solid #1a3a1a', background: '#0f0f0f'
      }}>
        {['agents', 'spawn-tree', 'logs'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '10px 20px', fontSize: 11, fontFamily: 'inherit',
              textTransform: 'uppercase', letterSpacing: 1.5,
              color: activeTab === tab ? '#00ff00' : '#555',
              borderBottom: activeTab === tab ? '2px solid #00ff00' : '2px solid transparent',
              transition: 'all 0.2s'
            }}
          >
            {tab.replace('-', ' ')}
          </button>
        ))}
      </nav>

      {/* Dashboard Grid */}
      <div className="dashboard-grid">
        {/* Left Column: Main Content */}
        {activeTab === 'agents' && (
          <>
            {/* Active Agents */}
            <div className="card" style={{ gridRow: 'span 2' }}>
              <div className="card-header">
                <h2>Active Agents</h2>
                <span className="count">{peers.length} total</span>
              </div>
              <div className="agent-list">
                {/* Main agent first */}
                {peers.filter(p => p.isMain).map(peer => (
                  <AgentCard key={peer.id} agent={peer} />
                ))}
                {/* Then spawned agents */}
                {peers.filter(p => !p.isMain).map(peer => (
                  <AgentCard key={peer.id} agent={peer} />
                ))}
              </div>
            </div>

            {/* Right Column: Stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Cost */}
              <div className="card">
                <div className="card-header">
                  <h2>Cost Tracker</h2>
                </div>
                <CostTracker totalCost={totalCost} ceiling={10} peers={peers} />
              </div>

              {/* Task Progress */}
              <div className="card">
                <div className="card-header">
                  <h2>Build Progress</h2>
                </div>
                <TaskProgress />
              </div>

              {/* Projects */}
              <div className="card">
                <div className="card-header">
                  <h2>Projects</h2>
                </div>
                <ProjectList peers={peers} />
              </div>
            </div>
          </>
        )}

        {activeTab === 'spawn-tree' && (
          <>
            {/* Spawn Tree */}
            <div className="card">
              <div className="card-header">
                <h2>Spawn Tree</h2>
                <span className="count">who spawned whom</span>
              </div>
              <SpawnTree peers={peers} />
            </div>

            {/* Agent Details */}
            <div className="card">
              <div className="card-header">
                <h2>Agent Summary</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {peers.map(peer => (
                  <div key={peer.id} style={{
                    padding: '10px 12px', background: '#111',
                    border: '1px solid #1a3a1a', borderRadius: 6
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: peer.isMain ? '#00ffff' : '#00ff00', fontWeight: 600, fontSize: 12 }}>
                        {peer.id}
                      </span>
                      <span style={{
                        fontSize: 10, padding: '1px 8px', borderRadius: 3,
                        background: peer.status === 'working' ? '#0a1a0a' : '#1a1a1a',
                        color: peer.status === 'working' ? '#00ff00' :
                               peer.status === 'complete' ? '#00aa00' :
                               peer.status === 'failed' ? '#ff3333' : '#ffaa00'
                      }}>
                        {peer.status}
                      </span>
                    </div>
                    <div style={{ color: '#aaa', fontSize: 11 }}>{peer.summary}</div>
                    <div style={{ color: '#555', fontSize: 10, marginTop: 4 }}>{peer.cwd}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'logs' && (
          <div className="card full-width" style={{ maxHeight: 'calc(100vh - 120px)' }}>
            <div className="card-header">
              <h2>Live Log Stream</h2>
              <span className="count">{logs.length} entries</span>
            </div>
            <LogStream entries={logs} />
          </div>
        )}
      </div>
    </div>
  )
}
