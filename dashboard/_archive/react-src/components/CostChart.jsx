import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
  ReferenceArea,
} from 'recharts';
import { formatCost } from '../hooks/usePolling.js';

const CHART_COLORS = {
  grid: '#2A2A4A',
  axisText: '#A3A3A3',
  tooltipBg: '#16213E',
  tooltipBorder: '#2A2A4A',
  areaStroke: '#D97706',
  areaFillStart: '#D97706',
  areaFillEnd: 'transparent',
  budgetLine: '#EF4444',
  warningZone: 'rgba(245, 158, 11, 0.08)',
  dangerZone: 'rgba(239, 68, 68, 0.12)',
};

function CustomTooltip({ active, payload, budgetCeiling }) {
  if (!active || !payload || !payload.length) return null;

  const { time, cost } = payload[0].payload;
  const budgetPercent = budgetCeiling > 0
    ? ((cost / budgetCeiling) * 100).toFixed(1)
    : '0.0';

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
      <div style={{ color: '#A3A3A3', marginBottom: '4px' }}>{time}</div>
      <div style={{ color: '#F5F5F5', fontWeight: 600 }}>
        {formatCost(cost)}
      </div>
      <div style={{ color: '#D97706', fontSize: '0.7rem' }}>
        {budgetPercent}% of budget
      </div>
    </div>
  );
}

export function CostChart({ data = [], budgetCeiling = 5.0 }) {
  const warningThreshold = budgetCeiling * 0.7;
  const dangerThreshold = budgetCeiling * 0.9;

  const chartData = useMemo(() => {
    if (data.length > 0) return data;

    const points = [];
    let cumulative = 0;
    for (let i = 0; i <= 24; i++) {
      const increment = Math.random() * 0.15 + (i > 12 ? 0.08 : 0.03);
      cumulative += increment;
      points.push({
        time: `${String(i).padStart(2, '0')}:00`,
        cost: Math.round(cumulative * 1000) / 1000,
        budget: budgetCeiling,
      });
    }
    return points;
  }, [data, budgetCeiling]);

  const maxCost = Math.max(
    ...chartData.map((d) => d.cost),
    budgetCeiling * 1.1
  );

  const gradientId = 'costAreaGradient';

  if (chartData.length === 0) {
    return (
      <div className="card">
        <div className="card__header">
          <span className="card__title">Cost Over Time</span>
        </div>
        <div className="empty-state">
          <div className="empty-state__icon">$</div>
          <div className="empty-state__text">No cost data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card__header">
        <span className="card__title">Cost Over Time</span>
        <span className="card__badge card__badge--active">
          {formatCost(chartData[chartData.length - 1]?.cost || 0)}
        </span>
      </div>

      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 8, right: 8, left: -10, bottom: 0 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.areaFillStart} stopOpacity={0.4} />
                <stop offset="85%" stopColor={CHART_COLORS.areaFillEnd} stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke={CHART_COLORS.grid}
              vertical={false}
            />

            <ReferenceArea
              y1={warningThreshold}
              y2={dangerThreshold}
              fill={CHART_COLORS.warningZone}
              ifOverflow="extendDomain"
            />

            <ReferenceArea
              y1={dangerThreshold}
              y2={maxCost}
              fill={CHART_COLORS.dangerZone}
              ifOverflow="extendDomain"
            />

            <XAxis
              dataKey="time"
              tick={{ fill: CHART_COLORS.axisText, fontSize: 10 }}
              axisLine={{ stroke: CHART_COLORS.grid }}
              tickLine={{ stroke: CHART_COLORS.grid }}
              interval="preserveStartEnd"
            />

            <YAxis
              tick={{ fill: CHART_COLORS.axisText, fontSize: 10 }}
              axisLine={{ stroke: CHART_COLORS.grid }}
              tickLine={{ stroke: CHART_COLORS.grid }}
              tickFormatter={(v) => `$${v.toFixed(1)}`}
              domain={[0, maxCost]}
            />

            <Tooltip
              content={<CustomTooltip budgetCeiling={budgetCeiling} />}
              cursor={{ stroke: '#D97706', strokeDasharray: '4 4', strokeOpacity: 0.5 }}
            />

            <ReferenceLine
              y={budgetCeiling}
              stroke={CHART_COLORS.budgetLine}
              strokeDasharray="6 4"
              strokeWidth={1.5}
              label={{
                value: `Budget $${budgetCeiling.toFixed(2)}`,
                position: 'right',
                fill: CHART_COLORS.budgetLine,
                fontSize: 10,
              }}
            />

            <Area
              type="monotone"
              dataKey="cost"
              stroke={CHART_COLORS.areaStroke}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{
                r: 4,
                fill: '#D97706',
                stroke: '#0F0F1A',
                strokeWidth: 2,
              }}
              animationDuration={800}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '12px',
        paddingTop: '10px',
        borderTop: '1px solid #2A2A4A',
        fontSize: '0.7rem',
        color: '#525252',
      }}>
        <span>Budget: {formatCost(budgetCeiling)}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '2px',
              background: 'rgba(245, 158, 11, 0.3)',
            }} />
            70% warn
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '2px',
              background: 'rgba(239, 68, 68, 0.4)',
            }} />
            90% danger
          </span>
        </span>
      </div>
    </div>
  );
}
