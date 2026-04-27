import { useState, useEffect, useCallback, useMemo } from 'react';
import { generateDemoHistory, generateDemoHeatmap } from '../data/demo-history.js';

/**
 * Aggregate sessions by calendar day.
 * @param {Array} sessions
 * @returns {Array<{date: string, sessions: number, toolCalls: number, cost: number, duration: number}>}
 */
export function aggregateByDay(sessions) {
  const map = new Map();

  for (const s of sessions) {
    const day = s.date.slice(0, 10);
    const existing = map.get(day) || { date: day, sessions: 0, toolCalls: 0, cost: 0, duration: 0 };
    map.set(day, {
      ...existing,
      sessions: existing.sessions + 1,
      toolCalls: existing.toolCalls + (s.toolCalls || 0),
      cost: existing.cost + (s.cost || 0),
      duration: existing.duration + (s.duration || 0),
    });
  }

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Aggregate sessions by agent name.
 * @param {Array} sessions
 * @returns {Array<{agent: string, sessions: number, totalCost: number, totalDuration: number, avgCost: number}>}
 */
export function aggregateByAgent(sessions) {
  const map = new Map();

  for (const s of sessions) {
    const existing = map.get(s.agent) || { agent: s.agent, sessions: 0, totalCost: 0, totalDuration: 0 };
    map.set(s.agent, {
      ...existing,
      sessions: existing.sessions + 1,
      totalCost: existing.totalCost + (s.cost || 0),
      totalDuration: existing.totalDuration + (s.duration || 0),
    });
  }

  return Array.from(map.values())
    .map((entry) => ({
      ...entry,
      avgCost: entry.sessions > 0 ? entry.totalCost / entry.sessions : 0,
    }))
    .sort((a, b) => b.sessions - a.sessions);
}

/**
 * Aggregate sessions by hour of day (0-23).
 * @param {Array} sessions
 * @returns {Array<{hour: number, sessions: number, cost: number}>}
 */
export function aggregateByHour(sessions) {
  const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, sessions: 0, cost: 0 }));

  for (const s of sessions) {
    const h = new Date(s.date).getHours();
    hours[h] = {
      ...hours[h],
      sessions: hours[h].sessions + 1,
      cost: hours[h].cost + (s.cost || 0),
    };
  }

  return hours;
}

/**
 * Generate heatmap grid data from session array.
 * @param {Array} sessions
 * @param {number} weeks - Number of weeks to include.
 * @returns {Array<{date: string, sessions: number, toolCalls: number, cost: number}>}
 */
export function generateHeatmapData(sessions, weeks = 26) {
  const days = weeks * 7;
  const map = new Map();

  for (const s of sessions) {
    const day = s.date.slice(0, 10);
    const existing = map.get(day) || { date: day, sessions: 0, toolCalls: 0, cost: 0 };
    map.set(day, {
      ...existing,
      sessions: existing.sessions + 1,
      toolCalls: existing.toolCalls + (s.toolCalls || 0),
      cost: existing.cost + (s.cost || 0),
    });
  }

  const now = new Date();
  const result = [];
  for (let d = 0; d < days; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    const key = date.toISOString().slice(0, 10);
    result.push(map.get(key) || { date: key, sessions: 0, toolCalls: 0, cost: 0 });
  }

  return result.reverse();
}

/**
 * Hook for managing session history data.
 * In production, this would read from ~/.claude/sessions/.
 * Currently uses deterministic demo data.
 *
 * @param {Object} options
 * @param {number} options.days - Days of history to generate (default: 90).
 * @returns {{ sessions: Array, stats: Object, loading: boolean, refresh: Function }}
 */
export function useHistory(options = {}) {
  const { days = 90 } = options;
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(() => {
    setLoading(true);
    const data = generateDemoHistory(days);
    setSessions(data);
    setLoading(false);
  }, [days]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = useMemo(() => {
    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        totalCost: 0,
        avgDuration: 0,
        topAgents: [],
        dailyActivity: [],
      };
    }

    const totalCost = sessions.reduce((sum, s) => sum + (s.cost || 0), 0);
    const totalDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const topAgents = aggregateByAgent(sessions).slice(0, 5);
    const dailyActivity = aggregateByDay(sessions);

    return {
      totalSessions: sessions.length,
      totalCost: Math.round(totalCost * 100) / 100,
      avgDuration: sessions.length > 0 ? Math.round(totalDuration / sessions.length) : 0,
      topAgents,
      dailyActivity,
    };
  }, [sessions]);

  return { sessions, stats, loading, refresh: loadData };
}
