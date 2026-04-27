import React from 'react';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

const DEFAULT_CATEGORIES = [
  { category: 'Coding', usage: 85, max: 100 },
  { category: 'Testing', usage: 60, max: 100 },
  { category: 'Security', usage: 45, max: 100 },
  { category: 'DevOps', usage: 30, max: 100 },
  { category: 'Design', usage: 55, max: 100 },
  { category: 'Marketing', usage: 20, max: 100 },
  { category: 'Research', usage: 70, max: 100 },
  { category: 'Planning', usage: 75, max: 100 },
];

const CHART_COLORS = {
  grid: '#2A2A4A',
  axisText: '#A3A3A3',
  radarStroke: '#6366F1',
  radarFill: '#6366F1',
  tooltipBg: '#16213E',
  tooltipBorder: '#2A2A4A',
};

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;

  const { category, usage, max } = payload[0].payload;

  return (
    <div style={{
      background: CHART_COLORS.tooltipBg,
      border: `1px solid ${CHART_COLORS.tooltipBorder}`,
      borderRadius: '6px',
      padding: '10px 14px',
      fontFamily: 'inherit',
      fontSize: '0.75rem',
      lineHeight: 1.6,
    }}>
      <div style={{ color: '#F5F5F5', fontWeight: 600 }}>{category}</div>
      <div style={{ color: '#6366F1' }}>
        {usage}/{max} usage
      </div>
    </div>
  );
}

function CustomAxisTick({ payload, x, y, cx, cy }) {
  const angle = Math.atan2(y - cy, x - cx);
  const offsetX = Math.cos(angle) * 14;
  const offsetY = Math.sin(angle) * 14;

  let textAnchor = 'middle';
  if (offsetX > 5) textAnchor = 'start';
  if (offsetX < -5) textAnchor = 'end';

  return (
    <text
      x={x + offsetX}
      y={y + offsetY}
      textAnchor={textAnchor}
      dominantBaseline="central"
      fill={CHART_COLORS.axisText}
      fontSize={10}
      fontFamily="inherit"
    >
      {payload.value}
    </text>
  );
}

export function SkillRadar({ data = DEFAULT_CATEGORIES }) {
  if (!data || data.length === 0) {
    return (
      <div className="card">
        <div className="card__header">
          <span className="card__title">Skill Distribution</span>
        </div>
        <div className="empty-state">
          <div className="empty-state__icon">{'\u2B50'}</div>
          <div className="empty-state__text">No skill data available</div>
        </div>
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.max || 100));
  const avgUsage = Math.round(data.reduce((sum, d) => sum + d.usage, 0) / data.length);

  return (
    <div className="card">
      <div className="card__header">
        <span className="card__title">Skill Distribution</span>
        <span className="card__badge card__badge--active" style={{
          background: '#312E8133',
          color: '#6366F1',
          border: '1px solid #6366F144',
        }}>
          AVG {avgUsage}%
        </span>
      </div>

      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart
            cx="50%"
            cy="50%"
            outerRadius="72%"
            data={data}
          >
            <PolarGrid
              stroke={CHART_COLORS.grid}
              strokeDasharray="3 3"
            />
            <PolarAngleAxis
              dataKey="category"
              tick={<CustomAxisTick />}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, maxVal]}
              tick={false}
              axisLine={false}
            />
            <Radar
              name="Usage"
              dataKey="usage"
              stroke={CHART_COLORS.radarStroke}
              strokeWidth={2}
              fill={CHART_COLORS.radarFill}
              fillOpacity={0.2}
              dot={{
                r: 3,
                fill: CHART_COLORS.radarStroke,
                stroke: '#0F0F1A',
                strokeWidth: 1.5,
              }}
              activeDot={{
                r: 5,
                fill: CHART_COLORS.radarStroke,
                stroke: '#F5F5F5',
                strokeWidth: 2,
              }}
              animationDuration={800}
              animationEasing="ease-out"
            />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px 12px',
        justifyContent: 'center',
        marginTop: '4px',
        paddingTop: '10px',
        borderTop: '1px solid #2A2A4A',
      }}>
        {data.map((d) => {
          const intensity = d.usage / (d.max || 100);
          const barColor = intensity > 0.7 ? '#6366F1' : intensity > 0.4 ? '#6366F188' : '#6366F144';

          return (
            <div key={d.category} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.65rem',
              color: '#525252',
              minWidth: '80px',
            }}>
              <div style={{
                width: '24px',
                height: '4px',
                borderRadius: '2px',
                background: '#1A1A2E',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${(d.usage / (d.max || 100)) * 100}%`,
                  height: '100%',
                  background: barColor,
                  borderRadius: '2px',
                }} />
              </div>
              {d.category}
            </div>
          );
        })}
      </div>
    </div>
  );
}
