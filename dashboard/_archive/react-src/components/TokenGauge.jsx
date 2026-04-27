import React, { useMemo } from 'react';
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  PolarAngleAxis,
} from 'recharts';

const ZONE_COLORS = {
  safe: '#10B981',
  moderate: '#F59E0B',
  high: '#F97316',
  critical: '#EF4444',
};

function getColor(percentage) {
  if (percentage < 50) return ZONE_COLORS.safe;
  if (percentage < 70) return ZONE_COLORS.moderate;
  if (percentage < 85) return ZONE_COLORS.high;
  return ZONE_COLORS.critical;
}

function getLabel(percentage) {
  if (percentage < 50) return 'Healthy';
  if (percentage < 70) return 'Moderate';
  if (percentage < 85) return 'High';
  return 'Critical';
}

function formatTokenCount(n) {
  if (n == null || isNaN(n)) return '--';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${n}`;
}

export function TokenGauge({ percentage = 0, model = 'Sonnet', tokens = {} }) {
  const color = getColor(percentage);
  const label = getLabel(percentage);
  const clampedPercent = Math.min(Math.max(percentage, 0), 100);

  const chartData = useMemo(() => [{
    name: 'context',
    value: clampedPercent,
    fill: color,
  }], [clampedPercent, color]);

  const { input = 0, output = 0 } = tokens;

  return (
    <div className="card">
      <div className="card__header">
        <span className="card__title">Context Usage</span>
        <span
          className="card__badge"
          style={{
            background: `${color}22`,
            color,
            border: `1px solid ${color}44`,
          }}
        >
          {label.toUpperCase()}
        </span>
      </div>

      <div style={{ position: 'relative', width: '100%', height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="70%"
            outerRadius="90%"
            barSize={14}
            data={chartData}
            startAngle={225}
            endAngle={-45}
          >
            <PolarAngleAxis
              type="number"
              domain={[0, 100]}
              angleAxisId={0}
              tick={false}
            />
            <RadialBar
              background={{ fill: '#1A1A2E' }}
              clockWise
              dataKey="value"
              cornerRadius={8}
              animationDuration={800}
              animationEasing="ease-out"
            />
          </RadialBarChart>
        </ResponsiveContainer>

        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{
            fontSize: '1.8rem',
            fontWeight: 700,
            color: '#F5F5F5',
            lineHeight: 1,
            letterSpacing: '-1px',
          }}>
            {clampedPercent.toFixed(0)}
            <span style={{ fontSize: '0.9rem', color: '#A3A3A3', fontWeight: 400 }}>%</span>
          </div>
          <div style={{
            fontSize: '0.7rem',
            color: '#525252',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginTop: '2px',
          }}>
            {model}
          </div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '8px',
        marginTop: '4px',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '0.7rem',
        }}>
          <span style={{ color: '#525252' }}>Input</span>
          <span style={{ color: '#A3A3A3', fontWeight: 500 }}>
            {formatTokenCount(input)}
          </span>
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '0.7rem',
        }}>
          <span style={{ color: '#525252' }}>Output</span>
          <span style={{ color: '#A3A3A3', fontWeight: 500 }}>
            {formatTokenCount(output)}
          </span>
        </div>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '16px',
        marginTop: '10px',
        paddingTop: '10px',
        borderTop: '1px solid #2A2A4A',
      }}>
        {Object.entries(ZONE_COLORS).map(([key, c]) => (
          <div key={key} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.65rem',
            color: '#525252',
          }}>
            <span style={{
              display: 'inline-block',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: c,
            }} />
            {key}
          </div>
        ))}
      </div>
    </div>
  );
}
