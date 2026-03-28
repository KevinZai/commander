import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Poll a local file or API endpoint at a configurable interval.
 * Returns parsed JSON data, loading state, and error.
 * No database — reads live from filesystem via fetch or injected data.
 */
export function usePolling(fetchFn, intervalMs = 5000) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const timerRef = useRef(null)

  const poll = useCallback(async () => {
    try {
      const result = await fetchFn()
      setData(result)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [fetchFn])

  useEffect(() => {
    poll()
    timerRef.current = setInterval(poll, intervalMs)
    return () => clearInterval(timerRef.current)
  }, [poll, intervalMs])

  return { data, error, loading }
}

/**
 * Read Claude Code peers via the claude-peers MCP protocol.
 * Falls back to mock data if MCP not available.
 */
export function usePeers(intervalMs = 3000) {
  const fetchPeers = useCallback(async () => {
    // In production, this reads from claude-peers MCP or a local socket
    // For the dashboard, we read from a known log file
    try {
      const res = await fetch('/api/peers')
      if (res.ok) return await res.json()
    } catch {
      // Fallback: read from localStorage or return demo data
    }

    // Demo data for when no live source is available
    return {
      peers: [
        {
          id: 'main-coordinator',
          summary: 'Coordinator: managing 5 peers for v1.2 build',
          cwd: '~/clawd/shared/refs/claude-code-kit',
          status: 'working',
          isMain: true,
          spawnedBy: null,
          children: ['peer-frontend', 'peer-backend', 'peer-testing', 'peer-docs', 'peer-research']
        },
        {
          id: 'peer-frontend',
          summary: 'Building dashboard React app with Matrix theme',
          cwd: '~/clawd/shared/refs/claude-code-kit/dashboard',
          status: 'working',
          isMain: false,
          spawnedBy: 'main-coordinator',
          children: []
        },
        {
          id: 'peer-backend',
          summary: 'Creating integration skills (OpenClaw, Paperclip bridges)',
          cwd: '~/clawd/shared/refs/claude-code-kit/skills',
          status: 'working',
          isMain: false,
          spawnedBy: 'main-coordinator',
          children: []
        },
        {
          id: 'peer-testing',
          summary: 'Running verification suite on all new hooks',
          cwd: '~/clawd/shared/refs/claude-code-kit/tests',
          status: 'complete',
          isMain: false,
          spawnedBy: 'main-coordinator',
          children: []
        },
        {
          id: 'peer-docs',
          summary: 'Updating SKILLS-INDEX, CHEATSHEET, CHANGELOG',
          cwd: '~/clawd/shared/refs/claude-code-kit',
          status: 'working',
          isMain: false,
          spawnedBy: 'main-coordinator',
          children: []
        },
        {
          id: 'peer-research',
          summary: 'Scanning GitHub for Claude Code tools to integrate',
          cwd: '~/clawd/shared/refs/claude-code-kit',
          status: 'idle',
          isMain: false,
          spawnedBy: 'main-coordinator',
          children: []
        }
      ],
      totalCost: 2.47,
      sessionDuration: '1h 23m',
      lastUpdate: new Date().toISOString()
    }
  }, [])

  return usePolling(fetchPeers, intervalMs)
}

/**
 * Read live log entries from agent output files.
 */
export function useLogs(intervalMs = 2000) {
  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/logs')
      if (res.ok) return await res.json()
    } catch {
      // Fallback demo logs
    }

    const now = Date.now()
    return {
      entries: [
        { ts: now - 120000, agent: 'coordinator', message: 'Spawned 5 peers for v1.2 mega build', type: 'spawn' },
        { ts: now - 110000, agent: 'peer-frontend', message: 'Created dashboard/package.json, vite.config.js', type: 'success' },
        { ts: now - 95000, agent: 'peer-backend', message: 'Writing skills/cowork-bible/SKILL.md (395 lines)', type: 'info' },
        { ts: now - 80000, agent: 'peer-backend', message: 'Writing skills/dispatch-bible/SKILL.md', type: 'info' },
        { ts: now - 65000, agent: 'peer-testing', message: 'All 61 hook tests passing', type: 'success' },
        { ts: now - 50000, agent: 'peer-docs', message: 'Updating SKILLS-INDEX.md with 14 new skills', type: 'info' },
        { ts: now - 35000, agent: 'peer-research', message: 'Found smtg-ai/claude-squad (4.2K stars) — multi-session manager', type: 'info' },
        { ts: now - 20000, agent: 'coordinator', message: 'peer-testing complete — collecting results', type: 'success' },
        { ts: now - 10000, agent: 'peer-frontend', message: 'Dashboard components: AgentCard, CostTracker, ContextGauge done', type: 'success' },
        { ts: now - 5000, agent: 'coordinator', message: 'Cost: $2.47 / $10.00 ceiling — 75% budget remaining', type: 'info' },
      ]
    }
  }, [])

  return usePolling(fetchLogs, intervalMs)
}
