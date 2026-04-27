import React, { useMemo, useState, useCallback } from 'react';

const CELL_SIZE = 12;
const CELL_GAP = 2;
const CELL_STEP = CELL_SIZE + CELL_GAP;
const DAY_LABEL_WIDTH = 28;
const MONTH_LABEL_HEIGHT = 18;
const LEGEND_HEIGHT = 28;

const INTENSITY_COLORS = [
  'var(--bg-secondary)',
  '#78350F',
  '#B45309',
  '#D97706',
  '#F59E0B',
];

const DAY_LABELS = [
  { index: 1, label: 'Mon' },
  { index: 3, label: 'Wed' },
  { index: 5, label: 'Fri' },
];

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getIntensityLevel(count, max) {
  if (count === 0) return 0;
  if (max === 0) return 0;
  const ratio = count / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

function buildGrid(data, weeks) {
  const days = weeks * 7;
  const now = new Date();
  const todayDow = now.getDay();

  const grid = [];
  let maxCount = 0;

  const dataMap = new Map();
  for (const entry of data) {
    dataMap.set(entry.date, entry);
  }

  for (let i = 0; i < days; i++) {
    const offset = days - 1 - i + todayDow;
    const date = new Date(now);
    date.setDate(date.getDate() - offset);
    const key = date.toISOString().slice(0, 10);
    const entry = dataMap.get(key) || { date: key, sessions: 0, toolCalls: 0, cost: 0 };

    if (entry.sessions > maxCount) {
      maxCount = entry.sessions;
    }

    const week = Math.floor(i / 7);
    const day = i % 7;

    grid.push({ ...entry, week, day });
  }

  return { grid, maxCount };
}

function getMonthLabels(weeks) {
  const now = new Date();
  const todayDow = now.getDay();
  const totalDays = weeks * 7;
  const labels = [];
  let lastMonth = -1;

  for (let w = 0; w < weeks; w++) {
    const dayIndex = w * 7;
    const offset = totalDays - 1 - dayIndex + todayDow;
    const date = new Date(now);
    date.setDate(date.getDate() - offset);
    const month = date.getMonth();

    if (month !== lastMonth) {
      labels.push({ week: w, label: MONTH_NAMES[month] });
      lastMonth = month;
    }
  }

  return labels;
}

function formatCost(cost) {
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  if (cost < 1) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(2)}`;
}

/**
 * GitHub-style activity heatmap showing agent activity over time.
 * Renders a 52-week x 7-day SVG grid with amber intensity colors.
 *
 * @param {{ data: Array<{date: string, sessions: number, toolCalls: number, cost: number}>, weeks?: number }} props
 */
export function ActivityHeatmap({ data = [], weeks = 26 }) {
  const [tooltip, setTooltip] = useState(null);

  const { grid, maxCount } = useMemo(() => buildGrid(data, weeks), [data, weeks]);
  const monthLabels = useMemo(() => getMonthLabels(weeks), [weeks]);

  const svgWidth = DAY_LABEL_WIDTH + weeks * CELL_STEP;
  const svgHeight = MONTH_LABEL_HEIGHT + 7 * CELL_STEP;

  const handleMouseEnter = useCallback((e, cell) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      x: rect.left + rect.width / 2,
      y: rect.top,
      cell,
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  return (
    <div className="card" style={{ position: 'relative' }}>
      <div className="card__header">
        <span className="card__title">Activity</span>
        <span className="card__badge card__badge--active">
          {data.reduce((sum, d) => sum + d.sessions, 0)} sessions
        </span>
      </div>

      <div style={{ overflowX: 'auto', paddingBottom: '4px' }}>
        <svg
          width={svgWidth}
          height={svgHeight}
          style={{ display: 'block' }}
          role="img"
          aria-label="Activity heatmap"
        >
          {/* Month labels */}
          {monthLabels.map(({ week, label }) => (
            <text
              key={`month-${week}`}
              x={DAY_LABEL_WIDTH + week * CELL_STEP}
              y={12}
              fill="var(--text-dim)"
              fontSize="9"
              fontFamily="var(--font-mono)"
            >
              {label}
            </text>
          ))}

          {/* Day labels */}
          {DAY_LABELS.map(({ index, label }) => (
            <text
              key={`day-${index}`}
              x={0}
              y={MONTH_LABEL_HEIGHT + index * CELL_STEP + CELL_SIZE - 2}
              fill="var(--text-dim)"
              fontSize="9"
              fontFamily="var(--font-mono)"
            >
              {label}
            </text>
          ))}

          {/* Grid cells */}
          {grid.map((cell, i) => {
            const level = getIntensityLevel(cell.sessions, maxCount);
            const x = DAY_LABEL_WIDTH + cell.week * CELL_STEP;
            const y = MONTH_LABEL_HEIGHT + cell.day * CELL_STEP;

            return (
              <rect
                key={i}
                x={x}
                y={y}
                width={CELL_SIZE}
                height={CELL_SIZE}
                rx={2}
                ry={2}
                fill={INTENSITY_COLORS[level]}
                stroke="var(--bg-primary)"
                strokeWidth={1}
                style={{ cursor: 'pointer', transition: 'fill 150ms ease' }}
                onMouseEnter={(e) => handleMouseEnter(e, cell)}
                onMouseLeave={handleMouseLeave}
              />
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: '4px',
        marginTop: '8px',
        fontSize: 'var(--font-size-xs)',
        color: 'var(--text-dim)',
      }}>
        <span>Less</span>
        {INTENSITY_COLORS.map((color, i) => (
          <div
            key={i}
            style={{
              width: CELL_SIZE,
              height: CELL_SIZE,
              borderRadius: 2,
              background: color,
              border: '1px solid var(--bg-primary)',
            }}
          />
        ))}
        <span>More</span>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y - 8,
            transform: 'translate(-50%, -100%)',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 10px',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--text-white)',
            fontFamily: 'var(--font-mono)',
            zIndex: 1000,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            boxShadow: 'var(--shadow-glow-primary)',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '2px' }}>{tooltip.cell.date}</div>
          <div style={{ color: 'var(--text-secondary)' }}>
            {tooltip.cell.sessions} sessions
            {' / '}
            {tooltip.cell.toolCalls} tool calls
            {' / '}
            {formatCost(tooltip.cell.cost)}
          </div>
        </div>
      )}
    </div>
  );
}
