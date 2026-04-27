import React from 'react';

const ZONES = [
  { max: 50, label: 'Good', color: '#10B981', fillClass: 'context-gauge__fill--green' },
  { max: 70, label: 'Caution', color: '#F59E0B', fillClass: 'context-gauge__fill--yellow' },
  { max: 85, label: 'Warning', color: '#F97316', fillClass: 'context-gauge__fill--orange' },
  { max: 100, label: 'Critical', color: '#EF4444', fillClass: 'context-gauge__fill--red' },
];

function getZone(percent) {
  for (const zone of ZONES) {
    if (percent <= zone.max) return zone;
  }
  return ZONES[ZONES.length - 1];
}

export function ContextGauge({ context }) {
  const {
    usedTokens = 0,
    maxTokens = 200000,
    usedPercent = 0,
    model = 'sonnet',
    sessionCost = 0,
  } = context || {};

  const percent = usedPercent || (maxTokens > 0 ? (usedTokens / maxTokens) * 100 : 0);
  const zone = getZone(percent);

  const formatTokens = (n) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return `${n}`;
  };

  return (
    <div className="card">
      <div className="card__header">
        <span className="card__title">Context Window</span>
        <span
          className="card__badge"
          style={{
            background: `${zone.color}22`,
            color: zone.color,
            border: `1px solid ${zone.color}44`,
          }}
        >
          {zone.label.toUpperCase()}
        </span>
      </div>

      <div className="context-gauge">
        <div className="context-gauge__visual">
          <span className="context-gauge__label">
            {percent.toFixed(1)}% used
          </span>
          <div
            className={`context-gauge__fill ${zone.fillClass}`}
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>

        <div className="context-gauge__zones">
          {ZONES.map((z) => (
            <div key={z.label} className="context-gauge__zone">
              <div
                className="context-gauge__zone-dot"
                style={{ background: z.color }}
              />
              <span>{z.label}</span>
              <span style={{ color: 'var(--text-dim)' }}>&lt;{z.max}%</span>
            </div>
          ))}
        </div>

        <div className="context-gauge__stats">
          <div className="context-stat">
            <span className="context-stat__label">Used</span>
            <span className="context-stat__value">{formatTokens(usedTokens)}</span>
          </div>
          <div className="context-stat">
            <span className="context-stat__label">Max</span>
            <span className="context-stat__value">{formatTokens(maxTokens)}</span>
          </div>
          <div className="context-stat">
            <span className="context-stat__label">Model</span>
            <span className="context-stat__value">{model}</span>
          </div>
          <div className="context-stat">
            <span className="context-stat__label">Cost</span>
            <span className="context-stat__value">${sessionCost.toFixed(3)}</span>
          </div>
        </div>

        {percent > 80 && (
          <div
            style={{
              marginTop: '8px',
              padding: '8px 12px',
              background: percent > 90 ? 'var(--red-dim)' : 'var(--amber-dim)',
              border: `1px solid ${percent > 90 ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--font-size-xs)',
              color: percent > 90 ? 'var(--red)' : 'var(--amber)',
            }}
          >
            {percent > 90
              ? 'Context nearly full. Run /save-session and start a new session.'
              : 'Context running low. Consider compacting or saving soon.'
            }
          </div>
        )}
      </div>
    </div>
  );
}
