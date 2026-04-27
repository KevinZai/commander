import React, { useState, useMemo, useCallback } from 'react';
import { Search, Filter, Calendar, ChevronDown, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 20;

function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function formatCost(cost) {
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  if (cost < 1) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(2)}`;
}

function formatDate(isoString) {
  const d = new Date(isoString);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day} ${hours}:${minutes}`;
}

function getUniqueValues(sessions, key) {
  const values = new Set();
  for (const s of sessions) {
    if (s[key]) values.add(s[key]);
  }
  return Array.from(values).sort();
}

const STATUS_STYLES = {
  complete: { background: 'var(--primary-faint)', color: 'var(--primary)', border: '1px solid var(--primary-dim)' },
  failed: { background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid rgba(239, 68, 68, 0.3)' },
  cancelled: { background: 'var(--bg-secondary)', color: 'var(--text-dim)', border: '1px solid var(--border-color)' },
};

const iconStyle = {
  width: 14,
  height: 14,
  color: 'var(--text-dim)',
  flexShrink: 0,
};

const inputStyle = {
  background: 'var(--bg-input)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-white)',
  fontFamily: 'var(--font-mono)',
  fontSize: 'var(--font-size-xs)',
  padding: '6px 10px',
  outline: 'none',
  transition: 'border-color var(--transition-fast)',
};

const selectStyle = {
  ...inputStyle,
  appearance: 'none',
  paddingRight: '24px',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23525252' fill='none' stroke-width='1.5'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 8px center',
  cursor: 'pointer',
};

const thStyle = {
  padding: '8px 12px',
  textAlign: 'left',
  fontSize: 'var(--font-size-xs)',
  color: 'var(--text-dim)',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  fontWeight: 600,
  borderBottom: '1px solid var(--border-color)',
  cursor: 'pointer',
  userSelect: 'none',
  whiteSpace: 'nowrap',
};

const tdStyle = {
  padding: '8px 12px',
  fontSize: 'var(--font-size-xs)',
  color: 'var(--text-secondary)',
  borderBottom: '1px solid var(--border-color)',
  verticalAlign: 'top',
};

/**
 * Full session history search and filter panel.
 * Includes search bar, filter dropdowns, sortable table, expandable rows, and pagination.
 *
 * @param {{ sessions: Array<{id: string, date: string, agent: string, model: string, status: string, cost: number, duration: number, toolCalls: number, task: string, skills?: string[]}> }} props
 */
export function HistorySearch({ sessions = [] }) {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ agent: '', status: '', model: '' });
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState(null);

  const agents = useMemo(() => getUniqueValues(sessions, 'agent'), [sessions]);
  const models = useMemo(() => getUniqueValues(sessions, 'model'), [sessions]);
  const statuses = useMemo(() => getUniqueValues(sessions, 'status'), [sessions]);

  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(0);
  }, []);

  const handleSort = useCallback((column) => {
    setSortBy((prev) => {
      if (prev === column) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return column;
      }
      setSortDir('desc');
      return column;
    });
    setPage(0);
  }, []);

  const filtered = useMemo(() => {
    let result = sessions;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          (s.task && s.task.toLowerCase().includes(q)) ||
          (s.agent && s.agent.toLowerCase().includes(q)) ||
          (s.id && s.id.toLowerCase().includes(q))
      );
    }

    if (filters.agent) {
      result = result.filter((s) => s.agent === filters.agent);
    }
    if (filters.status) {
      result = result.filter((s) => s.status === filters.status);
    }
    if (filters.model) {
      result = result.filter((s) => s.model === filters.model);
    }

    const dir = sortDir === 'asc' ? 1 : -1;
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'date': return dir * (new Date(a.date).getTime() - new Date(b.date).getTime());
        case 'agent': return dir * a.agent.localeCompare(b.agent);
        case 'task': return dir * (a.task || '').localeCompare(b.task || '');
        case 'duration': return dir * ((a.duration || 0) - (b.duration || 0));
        case 'cost': return dir * ((a.cost || 0) - (b.cost || 0));
        case 'status': return dir * a.status.localeCompare(b.status);
        default: return 0;
      }
    });

    return result;
  }, [sessions, search, filters, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = useMemo(
    () => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [filtered, page]
  );

  const sortIndicator = (column) => {
    if (sortBy !== column) return '';
    return sortDir === 'asc' ? ' ^' : ' v';
  };

  return (
    <div className="card" style={{ padding: '16px' }}>
      <div className="card__header">
        <span className="card__title">Session History</span>
        <span className="card__badge card__badge--active">
          {filtered.length} / {sessions.length}
        </span>
      </div>

      {/* Search Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px',
        background: 'var(--bg-input)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-sm)',
        padding: '4px 10px',
      }}>
        <Search style={iconStyle} />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          placeholder="Search tasks, agents, session IDs..."
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            color: 'var(--text-white)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--font-size-sm)',
            outline: 'none',
            padding: '4px 0',
          }}
        />
      </div>

      {/* Filter Row */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '16px',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <Filter style={iconStyle} />

        <select
          value={filters.agent}
          onChange={(e) => updateFilter('agent', e.target.value)}
          style={selectStyle}
        >
          <option value="">All Agents</option>
          {agents.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>

        <select
          value={filters.status}
          onChange={(e) => updateFilter('status', e.target.value)}
          style={selectStyle}
        >
          <option value="">All Statuses</option>
          {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          value={filters.model}
          onChange={(e) => updateFilter('model', e.target.value)}
          style={selectStyle}
        >
          <option value="">All Models</option>
          {models.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>

        {(filters.agent || filters.status || filters.model || search) && (
          <button
            onClick={() => { setFilters({ agent: '', status: '', model: '' }); setSearch(''); setPage(0); }}
            style={{
              ...inputStyle,
              cursor: 'pointer',
              color: 'var(--red)',
              border: '1px solid var(--red-dim)',
              background: 'var(--red-dim)',
              padding: '4px 10px',
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Results Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '24px', cursor: 'default' }} />
              <th style={thStyle} onClick={() => handleSort('date')}>
                Date{sortIndicator('date')}
              </th>
              <th style={thStyle} onClick={() => handleSort('agent')}>
                Agent{sortIndicator('agent')}
              </th>
              <th style={thStyle} onClick={() => handleSort('task')}>
                Task{sortIndicator('task')}
              </th>
              <th style={thStyle} onClick={() => handleSort('duration')}>
                Duration{sortIndicator('duration')}
              </th>
              <th style={thStyle} onClick={() => handleSort('cost')}>
                Cost{sortIndicator('cost')}
              </th>
              <th style={thStyle} onClick={() => handleSort('status')}>
                Status{sortIndicator('status')}
              </th>
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 && (
              <tr>
                <td colSpan={7} style={{ ...tdStyle, textAlign: 'center', padding: '32px', color: 'var(--text-dim)' }}>
                  No sessions match your search criteria
                </td>
              </tr>
            )}
            {pageData.map((session) => {
              const isExpanded = expandedId === session.id;
              const statusStyle = STATUS_STYLES[session.status] || STATUS_STYLES.complete;

              return (
                <React.Fragment key={session.id}>
                  <tr
                    style={{
                      cursor: 'pointer',
                      transition: 'background var(--transition-fast)',
                    }}
                    onClick={() => setExpandedId(isExpanded ? null : session.id)}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-card-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td style={tdStyle}>
                      {isExpanded
                        ? <ChevronDown style={{ width: 12, height: 12, color: 'var(--primary)' }} />
                        : <ChevronRight style={{ width: 12, height: 12, color: 'var(--text-dim)' }} />
                      }
                    </td>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap', color: 'var(--text-dim)' }}>
                      {formatDate(session.date)}
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--primary)', fontWeight: 500 }}>
                      {session.agent}
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--text-white)', maxWidth: '280px' }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {session.task}
                      </div>
                    </td>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                      {formatDuration(session.duration)}
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--amber)', whiteSpace: 'nowrap' }}>
                      {formatCost(session.cost)}
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        ...statusStyle,
                        fontSize: 'var(--font-size-xs)',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-sm)',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        fontWeight: 600,
                        display: 'inline-block',
                      }}>
                        {session.status}
                      </span>
                    </td>
                  </tr>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={7} style={{
                        padding: '12px 24px 16px 36px',
                        background: 'var(--bg-secondary)',
                        borderBottom: '1px solid var(--border-color)',
                      }}>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                          gap: '12px',
                          fontSize: 'var(--font-size-xs)',
                        }}>
                          <div>
                            <div style={{ color: 'var(--text-dim)', marginBottom: '2px' }}>Session ID</div>
                            <div style={{ color: 'var(--text-white)', fontWeight: 500 }}>{session.id}</div>
                          </div>
                          <div>
                            <div style={{ color: 'var(--text-dim)', marginBottom: '2px' }}>Model</div>
                            <div style={{ color: 'var(--accent)', fontWeight: 500 }}>{session.model}</div>
                          </div>
                          <div>
                            <div style={{ color: 'var(--text-dim)', marginBottom: '2px' }}>Tool Calls</div>
                            <div style={{ color: 'var(--text-white)', fontWeight: 500 }}>{session.toolCalls}</div>
                          </div>
                          <div>
                            <div style={{ color: 'var(--text-dim)', marginBottom: '2px' }}>Full Task</div>
                            <div style={{ color: 'var(--text-white)', fontWeight: 500 }}>{session.task}</div>
                          </div>
                          {session.skills && session.skills.length > 0 && (
                            <div style={{ gridColumn: '1 / -1' }}>
                              <div style={{ color: 'var(--text-dim)', marginBottom: '4px' }}>Skills Used</div>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {session.skills.map((skill) => (
                                  <span
                                    key={skill}
                                    style={{
                                      background: 'var(--accent-dim)',
                                      color: 'var(--accent)',
                                      border: '1px solid rgba(99, 102, 241, 0.3)',
                                      padding: '2px 8px',
                                      borderRadius: 'var(--radius-sm)',
                                      fontSize: 'var(--font-size-xs)',
                                      fontWeight: 500,
                                    }}
                                  >
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: '1px solid var(--border-color)',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--text-dim)',
        }}>
          <span>
            Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              style={{
                ...inputStyle,
                cursor: page === 0 ? 'not-allowed' : 'pointer',
                opacity: page === 0 ? 0.4 : 1,
                padding: '4px 10px',
              }}
            >
              Prev
            </button>
            <span style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0 8px',
              color: 'var(--text-secondary)',
            }}>
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              style={{
                ...inputStyle,
                cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
                opacity: page >= totalPages - 1 ? 0.4 : 1,
                padding: '4px 10px',
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
