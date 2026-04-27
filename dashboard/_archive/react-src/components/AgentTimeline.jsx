import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';

const AGENT_COLORS = [
  '#D97706',
  '#6366F1',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
];

function buildAgentColorMap(data) {
  const seen = new Set();
  for (const period of data) {
    for (const agent of (period.agents || [])) {
      seen.add(agent.name);
    }
  }
  const names = Array.from(seen);
  const map = {};
  names.forEach((name, i) => {
    map[name] = AGENT_COLORS[i % AGENT_COLORS.length];
  });
  return { map, names };
}

function transformData(data, agentNames) {
  return data.map((period) => {
    const row = { period: period.period };
    for (const name of agentNames) {
      row[name] = 0;
    }
    for (const agent of (period.agents || [])) {
      row[agent.name] = Math.round(agent.duration / 60);
    }
    return row;
  });
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;

  const entries = payload.filter((p) => p.value > 0);
  if (entries.length === 0) return null;

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-sm)',
      padding: '10px 14px',
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--font-size-xs)',
      boxShadow: 'var(--shadow-glow-primary)',
    }}>
      <div style={{
        fontWeight: 600,
        color: 'var(--text-white)',
        marginBottom: '6px',
        fontSize: 'var(--font-size-sm)',
      }}>
        {label}
      </div>
      {entries.map((entry) => (
        <div
          key={entry.dataKey}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '3px',
          }}
        >
          <div style={{
            width: 8,
            height: 8,
            borderRadius: 2,
            background: entry.color,
            flexShrink: 0,
          }} />
          <span style={{ color: 'var(--text-secondary)' }}>{entry.dataKey}</span>
          <span style={{ color: 'var(--text-white)', fontWeight: 500, marginLeft: 'auto' }}>
            {entry.value}m
          </span>
        </div>
      ))}
    </div>
  );
}

function CustomLegend({ payload }) {
  if (!payload) return null;
  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '12px',
      justifyContent: 'center',
      marginTop: '8px',
      fontSize: 'var(--font-size-xs)',
    }}>
      {payload.map((entry) => (
        <div
          key={entry.value}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            color: 'var(--text-secondary)',
          }}
        >
          <div style={{
            width: 8,
            height: 8,
            borderRadius: 2,
            background: entry.color,
          }} />
          {entry.value}
        </div>
      ))}
    </div>
  );
}

/**
 * Horizontal stacked bar chart showing agent activity duration over time periods.
 *
 * @param {{ data: Array<{period: string, agents: Array<{name: string, duration: number, cost: number}>}> }} props
 */
export function AgentTimeline({ data = [] }) {
  const { map: colorMap, names: agentNames } = useMemo(() => buildAgentColorMap(data), [data]);
  const chartData = useMemo(() => transformData(data, agentNames), [data, agentNames]);

  if (data.length === 0) {
    return (
      <div className="card">
        <div className="card__header">
          <span className="card__title">Agent Timeline</span>
        </div>
        <div className="empty-state">
          <div className="empty-state__icon">---</div>
          <div className="empty-state__text">No timeline data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card__header">
        <span className="card__title">Agent Timeline</span>
        <span className="card__badge card__badge--active">
          {agentNames.length} agents
        </span>
      </div>

      <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 40 + 60)}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 20, bottom: 4, left: 10 }}
          barCategoryGap="20%"
        >
          <XAxis
            type="number"
            tick={{ fill: 'var(--text-dim)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
            axisLine={{ stroke: 'var(--border-color)' }}
            tickLine={false}
            unit="m"
          />
          <YAxis
            type="category"
            dataKey="period"
            tick={{ fill: 'var(--text-secondary)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
            axisLine={{ stroke: 'var(--border-color)' }}
            tickLine={false}
            width={70}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }} />
          <Legend content={<CustomLegend />} />
          {agentNames.map((name) => (
            <Bar
              key={name}
              dataKey={name}
              stackId="agents"
              fill={colorMap[name]}
              radius={[0, 0, 0, 0]}
              maxBarSize={24}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
