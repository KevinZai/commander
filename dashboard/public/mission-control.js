const POLL_MS = 2000;
const SVG_NS = 'http://www.w3.org/2000/svg';

const els = {
  summary: document.getElementById('summary'),
  permissionBanner: document.getElementById('permission-banner'),
  permissionItems: document.getElementById('permission-items'),
  generatedAt: document.getElementById('generated-at'),
  refreshDot: document.getElementById('refresh-dot'),
  agents: document.getElementById('agents'),
  flow: document.getElementById('flow'),
  feed: document.getElementById('feed'),
  filterAgent: document.getElementById('filter-agent'),
  filterType: document.getElementById('filter-type'),
  filterSource: document.getElementById('filter-source'),
  filterChip: document.getElementById('filter-chip'),
  filterChipText: document.getElementById('filter-chip-text'),
  suggestions: document.getElementById('suggestions'),
  suggestionFilters: document.querySelectorAll('.mc-chip-toggle'),
  columns: {
    waiting: document.getElementById('col-waiting'),
    inProgress: document.getElementById('col-inProgress'),
    done: document.getElementById('col-done'),
  },
};

const SUGGESTION_STATUSES = ['new', 'promoted', 'dismissed'];

const state = {
  lastAgents: '',
  lastTasks: '',
  lastFlow: '',
  lastEvents: '',
  lastPermissions: '',
  lastFilterOptions: '',
  lastSuggestions: '',
  agentCards: new Map(),
  permissionAges: [],
  latestAgents: [],
  latestTasks: [],
  latestEdges: [],
  latestEvents: [],
  latestSuggestions: [],
  filters: { agent: '', session: '', type: '', source: '' },
  suggestionStatuses: new Set(SUGGESTION_STATUSES),
  polling: false,
};

function sourceSlug(value) {
  const trimmed = String(value || 'claude-code').trim().toLowerCase();
  const slug = trimmed.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || 'claude-code';
}

function taskBucket(status) {
  const value = String(status || '').toLowerCase();
  if (/(progress|active|started|running|working|doing)/.test(value)) return 'inProgress';
  if (/(done|complete|closed|resolved|finished|shipped|merged)/.test(value)) return 'done';
  return 'waiting';
}

function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return '0s';
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${Math.max(seconds, 1)}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
}

function formatTokens(count) {
  if (!Number.isFinite(count) || count <= 0) return '0';
  if (count < 1000) return String(count);
  if (count < 1000000) return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return `${(count / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
}

function formatClock(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function shortLabel(value, max) {
  const str = String(value == null ? '' : value);
  return str.length > max ? `${str.slice(0, max - 1)}…` : str;
}

function emptyState(text) {
  const div = document.createElement('div');
  div.className = 'mc-empty';
  div.textContent = text;
  return div;
}

function agentKey(agent) {
  // sourceApp leads: two apps can run a same-named agent in the same session,
  // and without it their cards collide in the DOM even though the model keys them apart.
  return `${agent.sourceApp || 'claude-code'}|${agent.name}|${agent.sessionId || ''}|${agent.startedAt || ''}`;
}

function agentStateLabel(status) {
  if (status === 'awaiting_permission') return '⚠ waiting for your approval';
  if (status === 'running') return 'Working';
  if (status === 'failed') return 'Hit a problem';
  if (status === 'done') return 'Finished';
  if (status === 'stale') return 'stale (no end recorded)';
  return 'Unknown status';
}

function buildGauge(kind) {
  const gauge = document.createElement('span');
  gauge.className = `mc-gauge ${kind}`;
  const value = document.createElement('span');
  value.className = 'mc-gauge-value';
  const track = document.createElement('span');
  track.className = 'mc-gauge-track';
  const fill = document.createElement('span');
  fill.className = 'mc-gauge-fill';
  track.append(fill);
  gauge.append(value, track);
  return { gauge, value, fill };
}

function buildAgentCard() {
  const card = document.createElement('button');
  card.className = 'mc-agent';
  card.type = 'button';

  const dot = document.createElement('span');
  dot.className = 'mc-dot';

  const mid = document.createElement('div');
  const name = document.createElement('div');
  name.className = 'mc-agent-name';
  const sub = document.createElement('div');
  sub.className = 'mc-agent-sub';
  const sourcePill = document.createElement('span');
  sourcePill.className = 'mc-src';
  mid.append(name, sub, sourcePill);

  const right = document.createElement('div');
  right.className = 'mc-agent-right';
  const stateBadge = document.createElement('span');
  stateBadge.className = 'mc-agent-state';
  right.append(stateBadge);

  const gauges = document.createElement('div');
  gauges.className = 'mc-agent-gauges';
  const duration = buildGauge('duration');
  const tokens = buildGauge('tokens');
  const cost = buildGauge('cost');
  gauges.append(duration.gauge, tokens.gauge, cost.gauge);

  card.append(dot, mid, right, gauges);
  card.addEventListener('click', () => {
    toggleAgentFilter(card.dataset.agent || '', card.dataset.session || '');
  });
  return { card, dot, name, sub, sourcePill, stateBadge, duration, tokens, cost, agent: null };
}

function durationForAgent(agent) {
  if (agent.status === 'running' || agent.status === 'awaiting_permission') {
    const startMs = Date.parse(agent.startedAt || '');
    if (!Number.isNaN(startMs)) return Math.max(0, Date.now() - startMs);
  }
  return Number.isFinite(agent.durationMs) ? agent.durationMs : 0;
}

function rosterMaxima(agents) {
  return agents.reduce(
    (maxima, agent) => ({
      duration: Math.max(maxima.duration, durationForAgent(agent)),
      tokens: Math.max(maxima.tokens, (agent.inputTokens || 0) + (agent.outputTokens || 0)),
      cost: Math.max(maxima.cost, Number(agent.estCostUsd) || 0),
    }),
    { duration: 0, tokens: 0, cost: 0 }
  );
}

function setGauge(ref, text, value, max) {
  ref.value.textContent = text;
  const percent = value > 0 && max > 0 ? Math.max(5, (value / max) * 100) : 0;
  ref.fill.style.width = `${Math.min(percent, 100)}%`;
}

function updateAgentCard(refs, agent, maxima) {
  refs.agent = agent;
  refs.card.dataset.status = agent.status;
  refs.card.dataset.startedAt = agent.startedAt || '';
  refs.card.dataset.agent = agent.name || '';
  refs.card.dataset.session = agent.sessionId || '';
  refs.card.classList.toggle('is-filtered', matchesActiveAgent(agent));
  refs.card.setAttribute('aria-pressed', matchesActiveAgent(agent) ? 'true' : 'false');
  refs.name.textContent = `${agent.emoji || '🤖'} ${agent.name || 'unknown agent'}`;
  const detail = agent.currentTask || agent.model || 'No current task details';
  const completed = `${agent.tasksCompleted || 0} completed`;
  refs.sub.textContent = `${agent.role || 'Agent'} · ${shortLabel(detail, 54)} · ${completed}`;
  const sourceApp = agent.sourceApp || 'claude-code';
  refs.sourcePill.className = `mc-src mc-src-${sourceSlug(sourceApp)}`;
  refs.sourcePill.textContent = sourceApp;
  refs.stateBadge.textContent = agentStateLabel(agent.status);
  const stale = agent.status === 'stale';
  refs.card.style.opacity = stale ? '0.68' : '';
  refs.dot.style.background = stale ? 'var(--idle)' : '';
  refs.stateBadge.style.background = stale ? 'var(--panel-strong)' : '';
  refs.stateBadge.style.color = stale ? 'var(--muted)' : '';

  const tokens = (agent.inputTokens || 0) + (agent.outputTokens || 0);
  const duration = durationForAgent(agent);
  const cost = Number(agent.estCostUsd) || 0;
  setGauge(refs.duration, formatDuration(duration), duration, maxima.duration);
  setGauge(refs.tokens, `${formatTokens(tokens)} tokens`, tokens, maxima.tokens);
  setGauge(refs.cost, `$${cost.toFixed(4)} est`, cost, maxima.cost);
}

function renderAgents(agents) {
  if (agents.length === 0) {
    state.agentCards.clear();
    els.agents.replaceChildren(
      emptyState(
        'No agents yet. When Claude hands work to a specialist agent, a card appears here.'
      )
    );
    return;
  }

  const seen = new Set();
  const ordered = [];
  const maxima = rosterMaxima(agents);
  for (const agent of agents) {
    const key = agentKey(agent);
    seen.add(key);
    let refs = state.agentCards.get(key);
    if (!refs) {
      refs = buildAgentCard();
      state.agentCards.set(key, refs);
    }
    updateAgentCard(refs, agent, maxima);
    ordered.push(refs.card);
  }

  for (const key of [...state.agentCards.keys()]) {
    if (!seen.has(key)) state.agentCards.delete(key);
  }

  els.agents.replaceChildren(...ordered);
}

function tickRunningDurations() {
  const maxima = rosterMaxima(state.latestAgents);
  for (const refs of state.agentCards.values()) {
    if (!refs.agent) continue;
    const duration = durationForAgent(refs.agent);
    setGauge(refs.duration, formatDuration(duration), duration, maxima.duration);
  }
}

function renderBoard(tasks, awaitingPermission) {
  const awaitingSessions = new Set(
    awaitingPermission.map((item) => String(item.session_id || ''))
  );
  const buckets = { waiting: [], inProgress: [], done: [] };
  for (const task of tasks) buckets[taskBucket(task.status)].push(task);

  for (const [bucket, list] of Object.entries(buckets)) {
    const column = els.columns[bucket];
    if (list.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'mc-column-empty';
      empty.textContent = 'Nothing here';
      column.replaceChildren(empty);
      continue;
    }
    const cards = list.map((task) => {
      const card = document.createElement('div');
      card.className = 'mc-task';
      const awaiting =
        task.status === 'awaiting_permission' ||
        (task.sessionId && awaitingSessions.has(String(task.sessionId)));
      if (awaiting) card.dataset.status = 'awaiting_permission';
      card.textContent = shortLabel(task.title || task.task_id, 90);
      const meta = document.createElement('span');
      meta.className = 'mc-task-meta';
      meta.textContent = awaiting
        ? `⚠ waiting for your approval · ${formatClock(task.ts)}`
        : `${task.status || 'unknown'} · ${formatClock(task.ts)}`;
      card.append(meta);
      return card;
    });
    column.replaceChildren(...cards);
  }
}

function svgEl(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  return el;
}

function flowNode(svg, node) {
  const group = svgEl('g', { class: `mc-flow-group ${node.kind}` });
  if (node.kind === 'agent') {
    group.classList.toggle('is-filtered', matchesAgentValues(node.id, node.sessionId));
    group.setAttribute('role', 'button');
    group.setAttribute('tabindex', '0');
    group.setAttribute('aria-label', `Filter Live Feed to ${node.id}`);
    const activate = () => toggleAgentFilter(node.id, node.sessionId || '');
    group.addEventListener('click', activate);
    group.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      activate();
    });
  }
  const rect = svgEl('rect', {
    x: node.x,
    y: node.y,
    width: node.w,
    height: 34,
    rx: 7,
    class: `mc-flow-node ${node.kind}`,
  });
  const kicker = svgEl('text', { x: node.x + 9, y: node.y + 13, class: 'mc-flow-kicker' });
  kicker.textContent = node.kicker;
  const label = svgEl('text', { x: node.x + 9, y: node.y + 27, class: 'mc-flow-label' });
  label.textContent = node.label;
  group.append(rect, kicker, label);
  svg.append(group);
}

function flowEdge(svg, from, to, type) {
  const x1 = from.x + from.w;
  const y1 = from.y + 17;
  const x2 = to.x;
  const y2 = to.y + 17;
  const bend = (x2 - x1) / 2;
  const path = svgEl('path', {
    d: `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`,
    class: `mc-flow-edge ${type}`,
  });
  svg.append(path);
}

function layoutColumn(items, x, w, kind, kickerFor, labelFor) {
  return items.map((item, index) => ({
    id: typeof item === 'string' ? item : item.task_id,
    x,
    y: 12 + index * 48,
    w,
    kind,
    kicker: kickerFor(item),
    label: labelFor(item),
    item,
  }));
}

function renderFlow(edges, tasks) {
  const deduped = [];
  const seen = new Set();
  for (const edge of edges) {
    const key = `${edge.from}|${edge.to}|${edge.type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(edge);
  }

  const sessions = [...new Set(deduped.map((edge) => edge.from))].slice(0, 5);
  const sessionSet = new Set(sessions);
  const agents = [
    ...new Set(deduped.filter((edge) => sessionSet.has(edge.from)).map((edge) => edge.to)),
  ].slice(0, 8);
  const agentSet = new Set(agents);
  const linkedTasks = tasks
    .filter((task) => task.sessionId && sessionSet.has(task.sessionId))
    .slice(0, 6);

  if (sessions.length === 0) {
    els.flow.replaceChildren(
      emptyState(
        'No delegations recorded yet. When your session hands work to agents, the flow map appears here.'
      )
    );
    return;
  }

  const sessionNodes = layoutColumn(
    sessions,
    10,
    150,
    'session',
    () => 'session',
    (id) => shortLabel(id, 16)
  );
  const agentNodes = layoutColumn(
    agents,
    250,
    150,
    'agent',
    () => 'agent',
    (id) => shortLabel(id, 16)
  );
  for (const node of agentNodes) {
    node.sessionId = deduped.find((edge) => edge.to === node.id)?.from || '';
  }
  const taskNodes = layoutColumn(
    linkedTasks,
    490,
    150,
    'task',
    (task) => `task · ${taskBucket(task.status) === 'inProgress' ? 'active' : taskBucket(task.status)}`,
    (task) => shortLabel(task.title || task.task_id, 16)
  );

  const rows = Math.max(sessionNodes.length, agentNodes.length, taskNodes.length, 1);
  const height = rows * 48 + 20;
  const svg = svgEl('svg', {
    viewBox: `0 0 650 ${height}`,
    role: 'img',
    'aria-label': 'Delegation flow between your session, agents, and tasks',
  });

  const byId = new Map();
  for (const node of [...sessionNodes, ...agentNodes]) byId.set(node.id, node);

  for (const edge of deduped) {
    const from = byId.get(edge.from);
    const to = agentNodes.find((node) => node.id === edge.to);
    if (from && to && agentSet.has(edge.to)) flowEdge(svg, from, to, edge.type);
  }

  for (const node of taskNodes) {
    const from = byId.get(node.item.sessionId);
    if (from) flowEdge(svg, from, node, 'task');
  }

  for (const node of [...sessionNodes, ...agentNodes, ...taskNodes]) flowNode(svg, node);

  const legend = document.createElement('div');
  legend.className = 'mc-legend';
  for (const [cls, text] of [
    ['delegation', 'delegated'],
    ['message', 'messaged'],
    ['workflow', 'workflow step'],
    ['task', 'task (dashed)'],
  ]) {
    const item = document.createElement('span');
    item.className = cls;
    item.textContent = text;
    legend.append(item);
  }

  els.flow.replaceChildren(svg, legend);
}

function eventSession(event) {
  return String(event.sessionId || event.session_id || '');
}

function eventMatchesSession(event, session) {
  if (!session) return false;
  if (eventSession(event) === session || event.actor === session) return true;
  return state.latestTasks.some(
    (task) =>
      String(task.sessionId || '') === session && String(task.task_id || '') === event.actor
  );
}

function eventMatchesFilters(event) {
  if (state.filters.type && event.type !== state.filters.type) return false;
  if (state.filters.source && (event.sourceApp || 'claude-code') !== state.filters.source) {
    return false;
  }
  if (!state.filters.agent && !state.filters.session) return true;
  const actorMatch = state.filters.agent && event.actor === state.filters.agent;
  const sessionMatch = eventMatchesSession(event, state.filters.session);
  return Boolean(actorMatch || sessionMatch);
}

function renderFeed(events) {
  const filtered = events.filter(eventMatchesFilters);
  if (filtered.length === 0) {
    els.feed.replaceChildren(
      emptyState(
        events.length === 0
          ? 'Quiet so far. Agent starts, finishes, and task updates stream in here.'
          : 'No activity matches these filters. Clear a filter to see the full feed.'
      )
    );
    return;
  }

  const rows = filtered.map((event) => {
    const row = document.createElement('li');
    row.className = 'mc-event';

    const time = document.createElement('span');
    time.className = 'mc-event-time';
    time.textContent = formatClock(event.ts);

    const text = document.createElement('span');
    text.className = 'mc-event-text';
    text.textContent = event.text || `${event.type} · ${event.actor}`;

    const sourceApp = event.sourceApp || 'claude-code';
    const appSource = document.createElement('span');
    appSource.className = `mc-src mc-src-${sourceSlug(sourceApp)}`;
    appSource.textContent = sourceApp;

    const logSource = document.createElement('span');
    logSource.className = 'mc-event-source';
    logSource.textContent = event.source || 'log';

    row.append(time, text, appSource, logSource);
    return row;
  });

  els.feed.replaceChildren(...rows);
}

function matchesAgentValues(agent, session) {
  if (!state.filters.agent) return false;
  if (state.filters.agent !== agent) return false;
  return !state.filters.session || state.filters.session === String(session || '');
}

function matchesActiveAgent(agent) {
  return matchesAgentValues(agent.name || '', agent.sessionId || '');
}

function syncFilterControls() {
  els.filterAgent.value = state.filters.agent;
  els.filterType.value = state.filters.type;
  els.filterSource.value = state.filters.source;
  const hasAgent = Boolean(state.filters.agent);
  els.filterChip.hidden = !hasAgent;
  if (hasAgent) {
    const session = state.filters.session ? ` · ${shortLabel(state.filters.session, 12)}` : '';
    els.filterChipText.textContent = `${state.filters.agent}${session}`;
  }
}

function refreshInteractiveViews() {
  renderAgents(state.latestAgents);
  renderFlow(state.latestEdges, state.latestTasks);
  state.lastEvents = '';
  refreshFeed();
}

function toggleAgentFilter(agent, session) {
  const isSame = matchesAgentValues(agent, session);
  state.filters.agent = isSame ? '' : agent;
  state.filters.session = isSame ? '' : session;
  syncFilterControls();
  refreshInteractiveViews();
}

function refreshFeed() {
  const taskSessions = state.latestTasks.map((task) => [task.task_id, task.sessionId]);
  const signature = JSON.stringify([state.latestEvents, taskSessions, state.filters]);
  if (signature === state.lastEvents) return;
  state.lastEvents = signature;
  renderFeed(state.latestEvents);
}

function labelEventType(type) {
  return String(type).replaceAll('_', ' ');
}

function setSelectOptions(select, values, allLabel, labelFor = String) {
  const selected = select.value;
  const options = [new Option(allLabel, '')];
  for (const value of values) options.push(new Option(labelFor(value), value));
  select.replaceChildren(...options);
  select.value = values.includes(selected) ? selected : '';
}

function applyFilterOptions(options) {
  const normalized = {
    agents: Array.isArray(options.agents) ? options.agents : [],
    types: Array.isArray(options.types) ? options.types : [],
    sourceApps: Array.isArray(options.sourceApps) ? options.sourceApps : [],
  };
  const signature = JSON.stringify(normalized);
  if (signature === state.lastFilterOptions) return;
  state.lastFilterOptions = signature;
  setSelectOptions(els.filterAgent, normalized.agents, 'All agents');
  setSelectOptions(els.filterType, normalized.types, 'All activity', labelEventType);
  setSelectOptions(els.filterSource, normalized.sourceApps, 'All sources');
  syncFilterControls();
}

function updatePermissionAges() {
  for (const item of state.permissionAges) {
    const started = Date.parse(item.ts || '');
    item.el.textContent = Number.isNaN(started)
      ? 'waiting now'
      : `waiting ${formatDuration(Date.now() - started)}`;
  }
}

function renderPermissionBanner(items) {
  els.permissionBanner.hidden = items.length === 0;
  state.permissionAges = [];
  if (items.length === 0) {
    els.permissionItems.replaceChildren();
    return;
  }
  const rows = items.map((item) => {
    const row = document.createElement('li');
    const subject = document.createElement('span');
    subject.textContent = item.subject || `Session ${shortLabel(item.session_id, 12)}`;
    const age = document.createElement('span');
    age.className = 'mc-permission-age';
    state.permissionAges.push({ el: age, ts: item.ts });
    row.append(subject, age);
    return row;
  });
  els.permissionItems.replaceChildren(...rows);
  updatePermissionAges();
}

function syncSuggestionFilterControls() {
  for (const button of els.suggestionFilters) {
    const pressed = state.suggestionStatuses.has(button.dataset.status);
    button.setAttribute('aria-pressed', pressed ? 'true' : 'false');
  }
}

function toggleSuggestionStatus(status) {
  const isolated = state.suggestionStatuses.size === 1 && state.suggestionStatuses.has(status);
  state.suggestionStatuses = isolated ? new Set(SUGGESTION_STATUSES) : new Set([status]);
  syncSuggestionFilterControls();
  refreshSuggestions();
}

function renderSuggestions(suggestions) {
  const filtered = suggestions.filter((suggestion) => state.suggestionStatuses.has(suggestion.status));
  if (filtered.length === 0) {
    els.suggestions.replaceChildren(
      emptyState(
        suggestions.length === 0
          ? 'No suggestions yet — agents surface ideas here as they notice them.'
          : 'No suggestions match this filter.'
      )
    );
    return;
  }

  const rows = filtered.map((suggestion) => {
    const row = document.createElement('div');
    row.className = 'mc-suggestion';
    row.dataset.status = suggestion.status || 'new';

    const head = document.createElement('div');
    head.className = 'mc-suggestion-head';
    const statusBadge = document.createElement('span');
    statusBadge.className = 'mc-suggestion-status';
    statusBadge.textContent = suggestion.status || 'new';
    const from = document.createElement('span');
    from.className = 'mc-suggestion-from';
    from.textContent = suggestion.from || 'unknown';
    head.append(statusBadge, from);

    const idea = document.createElement('p');
    idea.className = 'mc-suggestion-idea';
    idea.textContent = suggestion.idea || 'No idea text.';

    row.append(head, idea);

    if (suggestion.evidence) {
      const evidence = document.createElement('p');
      evidence.className = 'mc-suggestion-evidence';
      evidence.textContent = suggestion.evidence;
      row.append(evidence);
    }

    if (suggestion.proposed_ticket && suggestion.proposed_ticket.title) {
      const proposed = document.createElement('p');
      proposed.className = 'mc-suggestion-proposed';
      proposed.textContent = `Proposed: ${suggestion.proposed_ticket.title}`;
      row.append(proposed);
    }

    if (suggestion.status === 'promoted' && suggestion.promoted_ticket) {
      const ticket = suggestion.promoted_ticket;
      const promoted = document.createElement('p');
      promoted.className = 'mc-suggestion-promoted';
      promoted.textContent = `Tracked as: ${ticket.title || ticket.id || ticket.url || 'ticket'}`;
      row.append(promoted);
    }

    return row;
  });

  els.suggestions.replaceChildren(...rows);
}

function refreshSuggestions() {
  const signature = JSON.stringify([state.latestSuggestions, [...state.suggestionStatuses].sort()]);
  if (signature === state.lastSuggestions) return;
  state.lastSuggestions = signature;
  renderSuggestions(state.latestSuggestions);
}

function applySuggestions(suggestions) {
  state.latestSuggestions = Array.isArray(suggestions) ? suggestions : [];
  refreshSuggestions();
}

function applyModel(model) {
  if (typeof model.summary === 'string') els.summary.textContent = model.summary;
  els.generatedAt.textContent = `Updated ${formatClock(model.generatedAt)}`;

  const agents = Array.isArray(model.agents) ? model.agents : [];
  const tasks = Array.isArray(model.tasks) ? model.tasks : [];
  const edges = Array.isArray(model.edges) ? model.edges : [];
  const events = Array.isArray(model.events) ? model.events : [];
  const awaitingPermission = Array.isArray(model.awaitingPermission)
    ? model.awaitingPermission
    : [];
  state.latestAgents = agents;
  state.latestTasks = tasks;
  state.latestEdges = edges;
  state.latestEvents = events;

  const permissionsJson = JSON.stringify(awaitingPermission);
  if (permissionsJson !== state.lastPermissions) {
    state.lastPermissions = permissionsJson;
    renderPermissionBanner(awaitingPermission);
  } else {
    updatePermissionAges();
  }

  const agentsJson = JSON.stringify(agents);
  if (agentsJson !== state.lastAgents) {
    state.lastAgents = agentsJson;
    renderAgents(agents);
  } else {
    tickRunningDurations();
  }

  const tasksJson = JSON.stringify([tasks, awaitingPermission]);
  if (tasksJson !== state.lastTasks) {
    state.lastTasks = tasksJson;
    renderBoard(tasks, awaitingPermission);
  }

  const flowJson = JSON.stringify([edges, tasks.map((task) => [task.task_id, task.sessionId, task.status])]);
  if (flowJson !== state.lastFlow) {
    state.lastFlow = flowJson;
    renderFlow(edges, tasks);
  }

  refreshFeed();
}

async function poll() {
  if (state.polling) return;
  state.polling = true;
  try {
    const [missionResponse, optionsResponse, suggestionsResponse] = await Promise.all([
      fetch('/api/mission', { cache: 'no-store' }),
      fetch('/api/mission/filter-options', { cache: 'no-store' }),
      fetch('/api/suggestions', { cache: 'no-store' }),
    ]);
    if (!missionResponse.ok) throw new Error(`Mission API returned ${missionResponse.status}`);
    if (!optionsResponse.ok) throw new Error(`Filter API returned ${optionsResponse.status}`);
    if (!suggestionsResponse.ok) {
      throw new Error(`Suggestions API returned ${suggestionsResponse.status}`);
    }
    const [model, options, suggestionsPayload] = await Promise.all([
      missionResponse.json(),
      optionsResponse.json(),
      suggestionsResponse.json(),
    ]);
    applyFilterOptions(options);
    applyModel(model);
    applySuggestions(suggestionsPayload.suggestions);
    els.refreshDot.className = 'mc-refresh-dot ok';
  } catch {
    els.refreshDot.className = 'mc-refresh-dot err';
    els.generatedAt.textContent = 'Offline — retrying…';
  } finally {
    state.polling = false;
  }
}

els.filterAgent.addEventListener('change', () => {
  state.filters.agent = els.filterAgent.value;
  state.filters.session = '';
  syncFilterControls();
  refreshInteractiveViews();
});

els.filterType.addEventListener('change', () => {
  state.filters.type = els.filterType.value;
  syncFilterControls();
  refreshFeed();
});

els.filterSource.addEventListener('change', () => {
  state.filters.source = els.filterSource.value;
  syncFilterControls();
  refreshFeed();
});

els.filterChip.addEventListener('click', () => toggleAgentFilter('', ''));

for (const button of els.suggestionFilters) {
  button.addEventListener('click', () => toggleSuggestionStatus(button.dataset.status));
}
syncSuggestionFilterControls();

poll();
window.setInterval(poll, POLL_MS);
