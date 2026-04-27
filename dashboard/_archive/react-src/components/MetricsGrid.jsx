import React, { useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { Activity, DollarSign, Cpu, Zap, Clock, Layers } from 'lucide-react';

const ICON_MAP = {
  Activity,
  DollarSign,
  Cpu,
  Zap,
  Clock,
  Layers,
};

function generateSparkline(length = 12, trend = 'up') {
  const points = [];
  let value = 30 + Math.random() * 20;
  for (let i = 0; i < length; i++) {
    const drift = trend === 'up' ? 1.5 : trend === 'down' ? -1.5 : 0;
    value += drift + (Math.random() - 0.5) * 8;
    value = Math.max(5, Math.min(95, value));
    points.push({ v: Math.round(value) });
  }
  return points;
}

const DEFAULT_METRICS = [
  {
    label: 'Total Sessions',
    value: '24',
    unit: '',
    trend: 'up',
    trendValue: '+12%',
    icon: 'Activity',
    sparkline: generateSparkline(12, 'up'),
    color: '#D97706',
  },
  {
    label: 'Active Agents',
    value: '4',
    unit: '',
    trend: 'up',
    trendValue: '+2',
    icon: 'Cpu',
    sparkline: generateSparkline(12, 'up'),
    color: '#6366F1',
  },
  {
    label: 'Cost Today',
    value: '$2.47',
    unit: '',
    trend: 'down',
    trendValue: '-8%',
    icon: 'DollarSign',
    sparkline: generateSparkline(12, 'down'),
    color: '#10B981',
  },
  {
    label: 'Token Usage',
    value: '142K',
    unit: '',
    trend: 'up',
    trendValue: '+18%',
    icon: 'Zap',
    sparkline: generateSparkline(12, 'up'),
    color: '#F59E0B',
  },
  {
    label: 'Avg Duration',
    value: '14m',
    unit: '',
    trend: 'neutral',
    trendValue: '~',
    icon: 'Clock',
    sparkline: generateSparkline(12, 'neutral'),
    color: '#A3A3A3',
  },
  {
    label: 'Skills Used',
    value: '38',
    unit: '',
    trend: 'up',
    trendValue: '+5',
    icon: 'Layers',
    sparkline: generateSparkline(12, 'up'),
    color: '#6366F1',
  },
];

function TrendIndicator({ trend, value }) {
  const isUp = trend === 'up';
  const isDown = trend === 'down';
  const color = isUp ? '#10B981' : isDown ? '#EF4444' : '#525252';
  const arrow = isUp ? '\u2191' : isDown ? '\u2193' : '\u2022';

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '2px',
      fontSize: '0.65rem',
      fontWeight: 600,
      color,
    }}>
      {arrow} {value}
    </span>
  );
}

function SparklineChart({ data = [], color = '#D97706' }) {
  if (!data || data.length === 0) return null;

  return (
    <div style={{ width: 60, height: 28, flexShrink: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            animationDuration={600}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function MetricCard({ metric }) {
  const IconComponent = ICON_MAP[metric.icon] || Activity;

  return (
    <div style={{
      background: '#16213E',
      border: '1px solid #2A2A4A',
      borderRadius: '8px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      transition: 'border-color 250ms ease, box-shadow 250ms ease',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = '#6366F1';
      e.currentTarget.style.boxShadow = '0 0 10px rgba(99, 102, 241, 0.15)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = '#2A2A4A';
      e.currentTarget.style.boxShadow = 'none';
    }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <IconComponent
            size={14}
            style={{ color: metric.color || '#D97706', opacity: 0.8 }}
          />
          <span style={{
            fontSize: '0.7rem',
            color: '#525252',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            {metric.label}
          </span>
        </div>
        <TrendIndicator trend={metric.trend} value={metric.trendValue} />
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
      }}>
        <div>
          <span style={{
            fontSize: '1.4rem',
            fontWeight: 700,
            color: '#F5F5F5',
            lineHeight: 1,
          }}>
            {metric.value}
          </span>
          {metric.unit && (
            <span style={{
              fontSize: '0.7rem',
              color: '#525252',
              marginLeft: '4px',
            }}>
              {metric.unit}
            </span>
          )}
        </div>
        <SparklineChart data={metric.sparkline} color={metric.color} />
      </div>
    </div>
  );
}

export function MetricsGrid({ metrics = [] }) {
  const displayMetrics = useMemo(() => {
    if (metrics.length > 0) return metrics;
    return DEFAULT_METRICS;
  }, [metrics]);

  if (displayMetrics.length === 0) {
    return (
      <div className="card">
        <div className="card__header">
          <span className="card__title">Metrics</span>
        </div>
        <div className="empty-state">
          <div className="empty-state__icon">~</div>
          <div className="empty-state__text">No metrics available</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '12px' }}>
        <h2 style={{
          fontSize: '1.1rem',
          color: '#F5F5F5',
          fontWeight: 600,
        }}>
          Metrics
        </h2>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '14px',
      }}>
        {displayMetrics.map((metric, i) => (
          <MetricCard key={metric.label || i} metric={metric} />
        ))}
      </div>
    </div>
  );
}
