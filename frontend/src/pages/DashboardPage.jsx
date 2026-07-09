import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const MetricCard = ({ title, value, onClick }) => (
  <div className="metric-card" role={onClick ? 'button' : undefined} onClick={onClick} style={onClick ? {cursor:'pointer'}: {}}>
    <div className="metric-label">{title.toUpperCase()}</div>
    <div className="metric-value">{value}</div>
  </div>
);

const DashboardPage = () => {
  const { user, logout } = useAuth();
  const [summary, setSummary] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.getDashboardSummary();
        setSummary(res.data || res);
      } catch (err) {
        setSummary(null);
      }
    };

    load();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const mapActionToRoute = (action) => {
    if (!action) return '/audit';
    if (action.startsWith('user')) return '/users';
    if (action.startsWith('role')) return '/roles';
    if (action.startsWith('auth')) return '/audit';
    return '/audit';
  };

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p className="muted">Signed in as Admin — {summary?.permissions?.length || 8} of 8 permissions granted</p>
        </div>
        <div className="header-actions">
          <button className="secondary-btn" onClick={handleLogout}>Sign out</button>
        </div>
      </div>

      <div className="metrics-row">
        <MetricCard title="Total users" value={summary?.total_users ?? '—'} onClick={() => navigate('/users')} />
        <MetricCard title="Active" value={summary?.active ?? '—'} onClick={() => navigate('/users')} />
        <MetricCard title="Roles" value={summary?.roles ?? '—'} onClick={() => navigate('/roles')} />
        <MetricCard title="Audit events" value={summary?.audit_events ?? '—'} onClick={() => navigate('/audit')} />
      </div>

      <div className="card recent-card">
        <div className="recent-header">
          <h3>Recent activity</h3>
          <button className="text-link" onClick={() => navigate('/audit')}>View audit log →</button>
        </div>

        <ul className="activity-list">
          {(summary?.recent || []).map((item) => (
            <li key={item.id} onClick={() => navigate(mapActionToRoute(item.action))} style={{cursor:'pointer'}}>
              <div className="activity-row">
                <div className="activity-time">{item.time}</div>
                <div className="activity-meta">
                  <span className="activity-badge">{item.action}</span>
                  <span className="activity-msg">{item.message}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default DashboardPage;
