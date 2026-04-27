import React, { useState, useMemo } from 'react';
import { usePolling, timeAgo } from './hooks/usePolling.js';
import { AgentCardGrid } from './components/AgentCard.jsx';
import { ProjectList } from './components/ProjectList.jsx';
import { CostTracker } from './components/CostTracker.jsx';
import { TaskProgress } from './components/TaskProgress.jsx';
import { ContextGauge } from './components/ContextGauge.jsx';
import { ActivityHeatmap } from './components/ActivityHeatmap.jsx';
import { AgentTimeline } from './components/AgentTimeline.jsx';
import { CostChart } from './components/CostChart.jsx';
import { TokenGauge } from './components/TokenGauge.jsx';
import { SkillRadar } from './components/SkillRadar.jsx';
import { HistorySearch } from './components/HistorySearch.jsx';
import { MetricsGrid } from './components/MetricsGrid.jsx';
import { StatusBar } from './components/StatusBar.jsx';
import { generateDemoHistory } from './data/demo-history.js';
import { applyTheme, getThemeList, getCurrentTheme } from './styles/themes/theme-loader.js';

function generateDemoData() {
  const now = Date.now();
  const statuses = ['idle', 'working', 'complete', 'failed'];
  const models = ['sonnet', 'opus', 'haiku', 'flash'];
  const agentNames = ['Alfred', 'Morpheus', 'Neo', 'Codex', 'Forge', 'Flare'];
  const tasks = [
    'Implementing auth middleware',
    'Running E2E test suite',
    'Reviewing PR #142 — schema migration',
    'Optimizing database queries',
    'Building landing page hero section',
    'Idle — awaiting dispatch',
  ];

  const agents = agentNames.map((name, i) => ({
    id: `agent-${i}`,
    name,
    model: models[i % models.length],
    task: tasks[i],
    status: i === 5 ? 'idle' : i === 3 ? 'failed' : i === 2 ? 'complete' : 'working',
    cost: Math.random() * 0.8 + 0.01,
    startedAt: new Date(now - Math.random() * 3600000),
    elapsed: Math.floor(Math.random() * 1200),
  }));

  const projects = [
    { id: 'p1', name: 'mywifi-redesign', agentCount: 2, lastActivity: new Date(now - 120000) },
    { id: 'p2', name: 'cc-commander', agentCount: 1, lastActivity: new Date(now - 300000) },
    { id: 'p3', name: 'dmhub-platform', agentCount: 3, lastActivity: new Date(now - 600000) },
    { id: 'p4', name: 'guestnetworks-mcp', agentCount: 0, lastActivity: new Date(now - 7200000) },
  ];

  const costs = {
    totalSession: agents.reduce((sum, a) => sum + a.cost, 0),
    perAgent: agents.filter((a) => a.status !== 'idle').map((a) => ({ name: a.name, cost: a.cost })),
    budgetLimit: 10,
    budgetUsed: agents.reduce((sum, a) => sum + a.cost, 0),
  };

  const phases = [
    { id: 1, name: 'Schema Design', status: 'complete', detail: 'Completed 2m ago' },
    { id: 2, name: 'Auth Setup', status: 'complete', detail: 'Completed 5m ago' },
    { id: 3, name: 'API Endpoints', status: 'active', detail: '3/8 routes complete' },
    { id: 4, name: 'Frontend Layout', status: 'pending', detail: 'Waiting on API' },
    { id: 5, name: 'Integration Tests', status: 'pending', detail: '' },
    { id: 6, name: 'Deploy Pipeline', status: 'pending', detail: '' },
  ];

  const completedPhases = phases.filter((p) => p.status === 'complete').length;
  const totalPhases = phases.length;

  const taskData = {
    phases,
    completionPercent: Math.round((completedPhases / totalPhases) * 100),
    currentPhase: 'API Endpoints',
  };

  const contextUsed = 45000 + Math.floor(Math.random() * 5000);
  const contextMax = 200000;

  const context = {
    usedTokens: contextUsed,
    maxTokens: contextMax,
    usedPercent: (contextUsed / contextMax) * 100,
    model: 'sonnet',
    sessionCost: costs.totalSession,
  };

  return { agents, projects, costs, tasks: taskData, context };
}

function ThemePicker() {
  const [current, setCurrent] = useState(getCurrentTheme());
  const themes = getThemeList();

  const handleChange = (e) => {
    const name = e.target.value;
    const result = applyTheme(name);
    setCurrent(name === 'random' ? 'random' : result);
  };

  return (
    <select
      value={current}
      onChange={handleChange}
      className="theme-picker"
      title="Switch theme"
    >
      {themes.map((t) => (
        <option key={t.id} value={t.id}>{t.name}</option>
      ))}
    </select>
  );
}

export function App() {
  const [activeTab, setActiveTab] = useState('live');

  const { data, loading, lastUpdated } = usePolling(
    () => Promise.resolve(generateDemoData()),
    { interval: 5000, initialData: generateDemoData() }
  );

  const historyData = useMemo(() => generateDemoHistory(), []);

  const { agents, projects, costs, tasks, context } = data || {};

  const tabs = [
    { id: 'live', label: 'Live' },
    { id: 'history', label: 'History' },
    { id: 'analytics', label: 'Analytics' },
  ];

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-header__brand">
          <div>
            <div className="app-header__title">COMMAND CENTER</div>
            <div className="app-header__subtitle">Claude Code Kit Dashboard v1.3</div>
          </div>
        </div>
        <div className="app-header__status">
          <ThemePicker />
          <div className="status-dot" />
          <span>Live</span>
          {lastUpdated && (
            <span className="refresh-indicator">
              <span className="refresh-indicator__spinner" />
              {timeAgo(lastUpdated)}
            </span>
          )}
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="cc-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`cc-tab ${activeTab === tab.id ? 'cc-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── LIVE TAB ─── */}
      {activeTab === 'live' && (
        <>
          <StatusBar
            agents={agents}
            costs={costs}
            context={context}
          />

          <MetricsGrid
            metrics={[
              { label: 'Active Agents', value: agents ? agents.filter((a) => a.status === 'working').length : 0, trend: 'up' },
              { label: 'Session Cost', value: costs ? `$${costs.totalSession.toFixed(2)}` : '$0.00', trend: 'neutral' },
              { label: 'Context Used', value: context ? `${context.usedPercent.toFixed(0)}%` : '0%', trend: context && context.usedPercent > 70 ? 'up' : 'neutral' },
              { label: 'Tasks Done', value: tasks ? `${tasks.completionPercent}%` : '0%', trend: 'up' },
            ]}
          />

          <div className="dashboard-grid--wide dashboard-grid" style={{ marginTop: '20px' }}>
            <ContextGauge context={context} />
            <CostTracker costs={costs} />
          </div>

          <div className="section-gap">
            <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--text-white)', fontWeight: 600 }}>
                Active Agents
              </h2>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-dim)' }}>
                {agents ? agents.filter((a) => a.status === 'working').length : 0} working
              </span>
            </div>
            <AgentCardGrid agents={agents} />
          </div>

          <div className="section-gap">
            <div className="dashboard-grid--wide dashboard-grid">
              <ProjectList projects={projects} />
              <TaskProgress tasks={tasks} />
            </div>
          </div>
        </>
      )}

      {/* ─── HISTORY TAB ─── */}
      {activeTab === 'history' && (
        <>
          <div className="section-gap">
            <ActivityHeatmap data={historyData.daily} />
          </div>

          <div className="section-gap">
            <AgentTimeline data={historyData.agentActivity} />
          </div>

          <div className="section-gap">
            <HistorySearch sessions={historyData.sessions} />
          </div>
        </>
      )}

      {/* ─── ANALYTICS TAB ─── */}
      {activeTab === 'analytics' && (
        <>
          <div className="dashboard-grid--wide dashboard-grid section-gap">
            <CostChart data={historyData.costOverTime} />
            <TokenGauge context={context} />
          </div>

          <div className="dashboard-grid--wide dashboard-grid section-gap">
            <SkillRadar data={historyData.skillUsage} />
            <MetricsGrid
              metrics={[
                { label: 'Total Sessions', value: historyData.sessions ? historyData.sessions.length : 0, trend: 'up' },
                { label: 'Avg Duration', value: '42m', trend: 'neutral' },
                { label: 'Total Cost', value: '$12.45', trend: 'down' },
                { label: 'Skills Used', value: 47, trend: 'up' },
              ]}
            />
          </div>
        </>
      )}

      <footer style={{
        marginTop: '40px',
        paddingTop: '16px',
        borderTop: '1px solid var(--border-color)',
        textAlign: 'center',
        fontSize: 'var(--font-size-xs)',
        color: 'var(--text-dim)',
      }}>
        Claude Code Kit v1.3 — by Kevin Z — Refreshes every 5s
      </footer>
    </div>
  );
}
