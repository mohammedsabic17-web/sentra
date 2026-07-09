import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import EditUserModal from '../components/EditUserModal';

const avatarColor = (seed = '') => {
  const colors = ['#fde68a', '#fca5a5', '#bbf7d0', '#bfdbfe', '#fbcfe8'];
  let h = 0;
  const text = String(seed || '');

  for (let i = 0; i < text.length; i++) {
    h = (h << 5) - h + text.charCodeAt(i);
  }

  return colors[Math.abs(h) % colors.length];
};

const initials = (name, email) => {
  if (name) {
    return name
      .split(' ')
      .map((s) => s[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  return (email || '').split('@')[0].slice(0, 2).toUpperCase();
};

// This function gets roles from different possible backend formats
const getUserRoles = (user) => {
  const rawRoles =
    user.roles ||
    user.groups ||
    user.user_roles ||
    user.role ||
    user.group ||
    [];

  let rolesArray = [];

  if (Array.isArray(rawRoles)) {
    rolesArray = rawRoles
      .map((role) => {
        if (typeof role === 'string') {
          return role;
        }

        if (typeof role === 'object' && role !== null) {
          return (
            role.name ||
            role.display_name ||
            role.title ||
            role.role ||
            role.label ||
            ''
          );
        }

        return '';
      })
      .filter(Boolean);
  } else if (typeof rawRoles === 'string' && rawRoles.trim()) {
    rolesArray = [rawRoles.trim()];
  } else if (typeof rawRoles === 'object' && rawRoles !== null) {
    const name =
      rawRoles.name ||
      rawRoles.display_name ||
      rawRoles.title ||
      rawRoles.role ||
      rawRoles.label;

    if (name) {
      rolesArray = [name];
    }
  }

  // Fallback if backend does not send role names
  if (rolesArray.length === 0) {
    if (user.is_superuser) return ['Super Admin'];
    if (user.is_staff) return ['Admin'];
    return ['User'];
  }

  return rolesArray;
};

const PAGE_SIZE = 4;

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [addingUser, setAddingUser] = useState(false);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const loadUsers = async () => {
    try {
      const res = await api.getUsers();
      const payload = res?.data ?? res;
      const items = Array.isArray(payload) ? payload : payload?.results ?? [];
      setUsers(items);
    } catch (err) {
      console.error('Failed to load users:', err);
      setUsers([]);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Collect all roles for dropdown
  const allRoles = useMemo(() => {
    const set = new Set();

    users.forEach((u) => {
      getUserRoles(u).forEach((role) => set.add(role));
    });

    return Array.from(set);
  }, [users]);

  // Filter + search
  const filtered = useMemo(() => {
    return users.filter((u) => {
      const s = search.trim().toLowerCase();
      const userRoles = getUserRoles(u);

      const matchSearch =
        !s ||
        (u.email || '').toLowerCase().includes(s) ||
        (u.full_name || '').toLowerCase().includes(s);

      const matchRole =
        !roleFilter || userRoles.includes(roleFilter);

      const matchStatus =
        !statusFilter ||
        (statusFilter === 'active' && u.is_active) ||
        (statusFilter === 'inactive' && !u.is_active);

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const displayed = filtered.slice(startIdx, startIdx + PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, statusFilter]);

  const handleEdit = (user) => {
    setAddingUser(false);

    setEditingUser({
      ...user,
      roles: getUserRoles(user),
    });

    setShowModal(true);
  };

  const handleAdd = () => {
    setAddingUser(true);

    setEditingUser({
      full_name: '',
      email: '',
      roles: [],
      is_active: true,
    });

    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setAddingUser(false);
  };

  const handleSaveUser = async (data) => {
    try {
      if (addingUser) {
        await api.createUser(data);
      } else {
        await api.updateUser(editingUser.id, data);
      }

      handleCloseModal();
      await loadUsers();
    } catch (err) {
      console.error(err);
      alert(`Failed to ${addingUser ? 'create' : 'update'} user`);
    }
  };

  const handleToggleActive = async (user) => {
    const action = user.is_active ? 'deactivate' : 'activate';

    if (!window.confirm(`Are you sure you want to ${action} ${user.email}?`)) {
      return;
    }

    try {
      if (user.is_active) {
        await api.deactivateUser(user.id);
      } else {
        await api.activateUser(user.id);
      }

      await loadUsers();
    } catch (err) {
      console.error(err);
      alert(`Failed to ${action} user`);
    }
  };

  const handleExport = () => {
    const rows = [['Full name', 'Email', 'Roles', 'Status', 'Last login']];

    filtered.forEach((u) => {
      rows.push([
        u.full_name || '',
        u.email || '',
        getUserRoles(u).join('; '),
        u.is_active ? 'Active' : 'Inactive',
        u.last_login || '',
      ]);
    });

    const csv = rows
      .map((r) =>
        r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      )
      .join('\n');

    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = `users_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Users</h2>
          <div className="muted small">
            {filtered.length} of {users.length} users match
          </div>
        </div>

        <div className="page-controls">
          <div className="controls-left">
            <input
              className="search"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              className="select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">All roles</option>
              {allRoles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <select
              className="select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="controls-right">
            <button className="ghost-btn" onClick={handleExport}>
              Export to Excel
            </button>

            <button className="primary-btn" onClick={handleAdd}>
              + Add user
            </button>
          </div>
        </div>
      </div>

      <div className="card users-card">
        <table className="table users-table">
          <thead>
            <tr>
              <th className="col-user">USER</th>
              <th className="col-roles">ROLES</th>
              <th className="col-status">STATUS</th>
              <th className="col-login">LAST LOGIN</th>
              <th className="col-actions">ACTIONS</th>
            </tr>
          </thead>

          <tbody>
            {displayed.map((u) => {
              const userRoles = getUserRoles(u);

              return (
                <tr key={u.id || u.email}>
                  <td>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                      }}
                    >
                      <div
                        className="avatar"
                        style={{ background: avatarColor(u.email) }}
                      >
                        {initials(u.full_name, u.email)}
                      </div>

                      <div>
                        <div className="user-name">{u.full_name}</div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          {u.email}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td>
                    {userRoles.map((role) => (
                      <span key={role} className="role-badge">
                        {role}
                      </span>
                    ))}
                  </td>

                  <td>
                    <span
                      className={`status ${
                        u.is_active ? 'active' : 'inactive'
                      }`}
                    >
                      <span className="dot" />{' '}
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>

                  <td className="muted">{u.last_login || '—'}</td>

                  <td>
                    <button
                      className="outline-btn"
                      style={{ marginRight: 8 }}
                      onClick={() => handleEdit(u)}
                    >
                      Edit
                    </button>

                    <button
                      className={u.is_active ? 'danger-btn' : 'success-btn'}
                      onClick={() => handleToggleActive(u)}
                    >
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              );
            })}

            {displayed.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="muted"
                  style={{ padding: 20, textAlign: 'center' }}
                >
                  No users match your filters
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="table-footer muted">
          Showing{' '}
          {filtered.length > 0
            ? `${startIdx + 1}–${startIdx + displayed.length}`
            : '0'}{' '}
          of {filtered.length} · server-side · page_size={PAGE_SIZE}

          <div className="pagination">
            <button
              className="page-btn"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >
              ← Prev
            </button>

            <div className="page-indicator">
              {currentPage} / {totalPages}
            </div>

            <button
              className="page-btn"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {showModal && editingUser && (
        <EditUserModal
          user={editingUser}
          isNew={addingUser}
          onClose={handleCloseModal}
          onSave={handleSaveUser}
        />
      )}
    </div>
  );
};

export default UsersPage;