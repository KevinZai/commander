import React from 'react';
import { formatCost } from '../hooks/usePolling.js';

export function CostTracker({ costs }) {
  const {
    totalSession = 0,
    perAgent = [],
    budgetLimit = 10,
    budgetUsed = 0,
  } = costs || {};

  const budgetPercent = budgetLimit > 0
    ? Math.min((budgetUsed / budgetLimit) * 100, 100)
    : 0;

  const budgetFillClass = budgetPercent > 90
    ? 'cost-bar__fill--danger'
    : budgetPercent > 70
      ? 'cost-bar__fill--warning'
      : '';

  const maxAgentCost = perAgent.reduce((max, a) => Math.max(max, a.cost || 0), 0.01);

  return (
    <div className="card">
      <div className="card__header">
        <span className="card__title">Cost Tracking</span>
        {budgetPercent > 80 && (
          <span className="card__badge card__badge--warning">ALERT</span>
        )}
      </div>

      <div className="cost-total">
        {formatCost(totalSession)}
        <div className="cost-total__label">Session total</div>
      </div>

      {perAgent.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          {perAgent.map((agent, i) => {
            const percent = maxAgentCost > 0
              ? (agent.cost / maxAgentCost) * 100
              : 0;
            const fillClass = agent.cost > budgetLimit * 0.3
              ? 'cost-bar__fill--warning'
              : '';

            return (
              <div key={agent.name || i} className="cost-bar">
                <span className="cost-bar__label">{agent.name || `Agent ${i + 1}`}</span>
                <div className="cost-bar__track">
                  <div
                    className={`cost-bar__fill ${fillClass}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <span className="cost-bar__value">{formatCost(agent.cost || 0)}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="budget-gauge">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
            Budget
          </span>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-dim)' }}>
            {formatCost(budgetUsed)} / {formatCost(budgetLimit)}
          </span>
        </div>
        <div className="budget-gauge__bar">
          <div
            className={`budget-gauge__fill ${budgetFillClass || 'cost-bar__fill'}`}
            style={{ width: `${budgetPercent}%` }}
          />
        </div>
        <div className="budget-gauge__labels">
          <span>$0</span>
          <span>{budgetPercent.toFixed(0)}% used</span>
          <span>{formatCost(budgetLimit)}</span>
        </div>
      </div>
    </div>
  );
}
