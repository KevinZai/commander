import React from 'react';

const PHASE_STATUS = {
  pending: { nodeClass: 'task-phase__node--pending', nameClass: 'task-phase__name--dim' },
  active: { nodeClass: 'task-phase__node--active', nameClass: 'task-phase__name--active' },
  complete: { nodeClass: 'task-phase__node--complete', nameClass: '' },
  failed: { nodeClass: 'task-phase__node--failed', nameClass: '' },
};

export function TaskProgress({ tasks }) {
  const {
    phases = [],
    completionPercent = 0,
    currentPhase = '',
  } = tasks || {};

  if (phases.length === 0) {
    return (
      <div className="card">
        <div className="card__header">
          <span className="card__title">Task Progress</span>
          <span className="card__badge">0%</span>
        </div>
        <div className="empty-state">
          <div className="empty-state__icon">~</div>
          <div className="empty-state__text">No active tasks</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card__header">
        <span className="card__title">Task Progress</span>
        <span className={`card__badge ${completionPercent === 100 ? 'card__badge--active' : 'card__badge--warning'}`}>
          {completionPercent}%
        </span>
      </div>

      <div className="task-dag">
        {phases.map((phase, i) => {
          const config = PHASE_STATUS[phase.status] || PHASE_STATUS.pending;
          const connectorActive = phase.status === 'complete' || phase.status === 'active';

          return (
            <React.Fragment key={phase.id || i}>
              {i > 0 && (
                <div className={`task-phase__connector ${connectorActive ? 'task-phase__connector--active' : ''}`} />
              )}
              <div className="task-phase">
                <div className={`task-phase__node ${config.nodeClass}`}>
                  {phase.status === 'complete' ? '\u2713' : i + 1}
                </div>
                <div className="task-phase__info">
                  <div className={`task-phase__name ${config.nameClass}`}>
                    {phase.name}
                  </div>
                  {phase.detail && (
                    <div className="task-phase__status">{phase.detail}</div>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      <div className="task-progress-bar">
        <div className="task-progress-bar__label">
          <span>Overall Progress</span>
          <span>{completionPercent}%</span>
        </div>
        <div className="task-progress-bar__track">
          <div
            className="task-progress-bar__fill"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
