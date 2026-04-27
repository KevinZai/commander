import React from 'react';
import { timeAgo } from '../hooks/usePolling.js';

export function ProjectList({ projects }) {
  if (!projects || projects.length === 0) {
    return (
      <div className="card">
        <div className="card__header">
          <span className="card__title">Projects</span>
          <span className="card__badge">0</span>
        </div>
        <div className="empty-state">
          <div className="empty-state__icon">~</div>
          <div className="empty-state__text">No active projects</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card__header">
        <span className="card__title">Projects</span>
        <span className="card__badge card__badge--active">{projects.length}</span>
      </div>
      <ul className="project-list">
        {projects.map((project, i) => (
          <ProjectItem key={project.id || i} project={project} />
        ))}
      </ul>
    </div>
  );
}

function ProjectItem({ project }) {
  const {
    name = 'Unnamed Project',
    agentCount = 0,
    lastActivity = null,
    status = 'active',
  } = project;

  return (
    <li className="project-item">
      <div>
        <div className="project-item__name">{name}</div>
        <div className="project-item__agents">
          {agentCount} agent{agentCount !== 1 ? 's' : ''} active
        </div>
      </div>
      <div className="project-item__time">
        {lastActivity ? timeAgo(lastActivity) : 'no activity'}
      </div>
    </li>
  );
}
