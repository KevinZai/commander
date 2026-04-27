import React, { useRef, useEffect } from 'react'

function formatTime(ts) {
  const d = new Date(ts)
  return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function LogStream({ entries = [] }) {
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [entries.length])

  return (
    <div className="log-stream" ref={scrollRef}>
      {entries.length === 0 ? (
        <div style={{ color: '#555', fontSize: 11, textAlign: 'center', padding: 12 }}>
          Waiting for log entries...
        </div>
      ) : (
        entries.map((entry, i) => (
          <div key={i} className={`log-entry ${entry.type || ''}`}>
            <span className="timestamp">{formatTime(entry.ts)}</span>
            <span className="agent-tag">[{entry.agent}]</span>
            <span className="message">{entry.message}</span>
          </div>
        ))
      )}
    </div>
  )
}
