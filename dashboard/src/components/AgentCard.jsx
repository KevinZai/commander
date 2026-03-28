import React from 'react';
import { formatCost, formatDuration, timeAgo } from '../hooks/usePolling.js';

const STATUS_CONFIG = {
  idle: { label: 'IDLE', badgeClass: '', cardClass: '' },
  working: { label: 'WORKING', badgeClass: 'card__badge--active', cardClass: 'agent-card--working' },
  complete: { label: 'COMPLETE', badgeClass: 'card__badge--active', cardClass: 'agent-card--complete' },
  failed: { label: 'FAILED', badgeClass: 'card__badge--error', cardClass: 'agent-card--failed' },
};

export function AgentCard({ agent }) {
  const {
    name = 'Unknown Agent',
    model = 'unknown',
    task = 'No active task',
    status = 'idle',
    cost = 0,
    startedAt = null,
    elapsed = 0,
  } = agent;

  const config = STATUS_CONFIG[status] || STATUS_CONFIG.idle;

  return (
    <div className={`card agent-card ${config.cardClass}`}>
      <div className="card__header">
        <div>
          <div className="agent-card__name">{name}</div>
          <div className="agent-card__model">{model}</div>
        </div>
        <span className={`card__badge ${config.badgeClass}`}>
          {config.label}
        </span>
      </div>

      <div className="agent-card__task">{task}</div>

      <div className="agent-card__meta">
        <span>
          {startedAt ? timeAgo(startedAt) : 'not started'}
        </span>
        <span>{formatDuration(elapsed)}</span>
        <span className="agent-card__cost">{formatCost(cost)}</span>
      </div>
    </div>
  );
}

export function AgentCardGrid({ agents }) {
  if (!agents || agents.length === 0) {
    return (
      <div className="card">
        <div className="card__header">
          <span className="card__title">Agents</span>
          <span className="card__badge">0</span>
        </div>
        <div className="empty-state">
          <div className="empty-state__icon">~</div>
          <div className="empty-state__text">No active agents</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="dashboard-grid">
        {agents.map((agent, i) => (
          <AgentCard key={agent.id || i} agent={agent} />
        ))}
      </div>
    </div>
  );
}
