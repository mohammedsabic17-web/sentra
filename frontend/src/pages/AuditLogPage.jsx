import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const PAGE_SIZE = 6;

// Color scheme for different action types
const ACTION_COLORS = {
  'user.created':  { bg: '#d1fae5', color: '#065f46' },
  'user.updated':  { bg: '#dbeafe', color: '#1e40af' },
  'user.update':   { bg: '#dbeafe', color: '#1e40af' },
  'user.deleted':  { bg: '#fee2e2', color: '#991b1b' },
  'user.deactivated': { bg: '#fee2e2', color: '#991b1b' },
  'user.activated':   { bg: '#d1fae5', color: '#065f46' },
  'role.created':  { bg: '#ede9fe', color: '#5b21b6' },
  'role.updated':  { bg: '#ede9fe', color: '#5b21b6' },
  'role.update':   { bg: '#ede9fe', color: '#5b21b6' },
  'role.deleted':  { bg: '#fee2e2', color: '#991b1b' },
  'auth.login':    { bg: '#e0e7ff', color: '#3730a3' },
  'auth.logout':   { bg: '#f3f4f6', color: '#374151' },
  'default':       { bg: '#f3f4f6', color: '#374151' },
};

const getActionStyle = (action) => ACTION_COLORS[action] || ACTION_COLORS.default;

// Format ISO timestamp → "2026-07-09 16:05"
const formatTimestamp = (ts) => {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts;
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return ts;
  }
};

// Build a human-readable description from the raw detail
const humanizeDetail = (log) => {
  // If backend already provides a message
  if (log.message) return log.message;
  if (log.description) return log.description;

  const detail = log.detail || log.details || log.data || log.payload;
  const action = log.action || '';

  if (!detail) return '—';

  // Try to parse if it's a string
  let obj = detail;
  if (typeof detail === 'string') {
    try {
      obj = JSON.parse(detail.replace(/'/g, '"'));
    } catch {
      return detail; // Show raw string if not JSON
    }
  }

  if (typeof obj !== 'object') return String(obj);

  // Common patterns
  const email = obj.email || obj.user_email || obj.target_email;
  const name  = obj.full_name || obj.name || obj.username;
  const roles = obj.roles_input || obj.roles || obj.groups;
  const rolesStr = Array.isArray(roles) ? roles.join(', ') : roles;

  if (action.includes('user.created') || action.includes('user_created')) {
    return `Created user ${name || email || ''}${rolesStr ? ` with role ${rolesStr}` : ''}`;
  }
  if (action.includes('user.updated') || action.includes('user_updated') || action.includes('user.update')) {
    return `Updated user ${name || email || ''}${rolesStr ? ` (roles: ${rolesStr})` : ''}`;
  }
  if (action.includes('user.deactivated')) return `Deactivated user ${email || name || ''}`;
  if (action.includes('user.activated'))   return `Activated user ${email || name || ''}`;
  if (action.includes('role.'))            return `Role change: ${obj.role_name || obj.name || ''}`;
  if (action.includes('auth.login'))       return `Signed in${obj.ip ? ` from ${obj.ip}` : ''}`;

  // Fallback: show key=value pairs
  return Object.entries(obj)
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
    .join(' · ');
};

// Get a readable actor label
const getActor = (log) => {
  return (
    log.actor_email ||
    log.actor?.email ||
    log.user_email ||
    log.user?.email ||
    log.actor ||
    log.performed_by ||
    log.created_by ||
    '—'
  );
};

const AuditPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getAuditLog();
      const payload = res?.data ?? res;
      const items = Array.isArray(payload) ? payload : payload?.results ?? [];
      setLogs(items);
    } catch (err) {
      console.error('Failed to load audit log:', err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  // Extract all unique actions for the filter dropdown
  const allActions = useMemo(() => {
    const set = new Set();
    logs.forEach((l) => l.action && set.add(l.action));
    return Array.from(set).sort();
  }, [logs]);

  // Sort newest-first + apply filter
  const filtered = useMemo(() => {
    const sorted = [...logs].sort((a, b) => {
      const ta = new Date(a.timestamp || a.created_at || 0).getTime();
      const tb = new Date(b.timestamp || b.created_at || 0).getTime();
      return tb - ta;
    });
    if (!actionFilter) return sorted;
    return sorted.filter((l) => l.action === actionFilter);
  }, [logs, actionFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const displayed = filtered.slice(startIdx, startIdx + PAGE_SIZE);

  useEffect(() => { setPage(1); }, [actionFilter]);

  const handleExport = () => {
    const rows = [['Timestamp', 'Actor', 'Action', 'Detail']];
    filtered.forEach((l) => {
      rows.push([
        formatTimestamp(l.timestamp || l.created_at),
        getActor(l),
        l.action || '',
        humanizeDetail(l),
      ]);
    });
    const csv = rows.map((r) =>
      r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_log_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Audit Log</h2>
          <div className="muted small">Append-only record of every sensitive action</div>
        </div>
        <div className="controls-right">
          <select
            className="select"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="">All actions</option>
            {allActions.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <button className="ghost-btn" onClick={handleExport}>
            ⬇ Export to Excel
          </button>
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 180 }}>TIMESTAMP ↓</th>
              <th style={{ width: 220 }}>ACTOR</th>
              <th style={{ width: 160 }}>ACTION</th>
              <th>DETAIL</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={4} className="muted" style={{ padding: 20, textAlign: 'center' }}>Loading...</td></tr>
            )}

            {!loading && displayed.map((log, i) => {
              const style = getActionStyle(log.action);
              return (
                <tr key={log.id || `${log.timestamp}-${i}`}>
                  <td style={{ fontFamily: 'monospace', fontSize: 13, color: '#374151' }}>
                    {formatTimestamp(log.timestamp || log.created_at)}
                  </td>
                  <td style={{ fontWeight: 500, color: '#111827' }}>
                    {getActor(log)}
                  </td>
                  <td>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: 999,
                        background: style.bg,
                        color: style.color,
                        fontFamily: 'monospace',
                        fontSize: 12,
                        fontWeight: 500,
                      }}
                    >
                      {log.action || 'unknown'}
                    </span>
                  </td>
                  <td style={{ color: '#374151' }}>
                    {humanizeDetail(log)}
                  </td>
                </tr>
              );
            })}

            {!loading && displayed.length === 0 && (
              <tr>
                <td colSpan={4} className="muted" style={{ padding: 20, textAlign: 'center' }}>
                  No audit entries found
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="table-footer muted">
          Showing{' '}
          {filtered.length > 0
            ? `${startIdx + 1}–${startIdx + displayed.length} of ${filtered.length}`
            : '0'}{' '}
          · server-side · page_size={PAGE_SIZE}

          <div className="pagination">
            <button
              className="page-btn"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >← Prev</button>
            <div className="page-indicator">{currentPage} / {totalPages}</div>
            <button
              className="page-btn"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >Next →</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditPage;