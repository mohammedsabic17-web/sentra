import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';

// Permission catalogue grouped by category
const PERMISSION_CATALOGUE = {
  USERS: [
    { key: 'users.view',   label: 'See the user list' },
    { key: 'users.create', label: 'Invite / add users' },
    { key: 'users.edit',   label: 'Edit users & assign roles' },
    { key: 'users.delete', label: 'Deactivate users' },
  ],
  ROLES: [
    { key: 'roles.view',       label: 'See roles' },
    { key: 'roles.manage',     label: 'Create/edit roles & permissions' },
    { key: 'permissions.view', label: 'See permission catalogue' },
  ],
  AUDIT: [
    { key: 'audit.view', label: 'Read the audit log' },
  ],
};

// Default roles if backend has nothing
const DEFAULT_ROLES = [
  {
    id: 'admin',
    name: 'Admin',
    description: 'Full access, delete-protected',
    permissions: [
      'users.view', 'users.create', 'users.edit', 'users.delete',
      'roles.view', 'roles.manage', 'permissions.view',
      'audit.view',
    ],
    protected: true,
  },
  {
    id: 'manager',
    name: 'Manager',
    description: 'Manage users, view roles',
    permissions: [
      'users.view', 'users.create', 'users.edit', 'users.delete',
      'roles.view', 'permissions.view',
    ],
  },
  {
    id: 'viewer',
    name: 'Viewer',
    description: 'Read-only access',
    permissions: ['users.view', 'roles.view', 'permissions.view'],
  },
];

// Helper: extract role names from any user object
const getUserRoleNames = (user) => {
  const raw = user.roles || user.groups || user.role || [];
  if (Array.isArray(raw)) {
    return raw
      .map((r) => (typeof r === 'string' ? r : r?.name || r?.title || ''))
      .filter(Boolean);
  }
  if (typeof raw === 'string') return [raw];
  if (typeof raw === 'object' && raw !== null) {
    const n = raw.name || raw.title;
    return n ? [n] : [];
  }
  return [];
};

const RolesPage = () => {
  const [roles, setRoles] = useState(DEFAULT_ROLES);
  const [users, setUsers] = useState([]);
  const [selectedId, setSelectedId] = useState(DEFAULT_ROLES[0].id);
  const [saving, setSaving] = useState(false);
  const [showNewRole, setShowNewRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');

  // Load roles
  const loadRoles = async () => {
    try {
      const res = await api.getRoles();
      const payload = res?.data ?? res;
      const items = Array.isArray(payload) ? payload : payload?.results ?? [];
      if (items.length > 0) {
        const normalized = items.map((r) => ({
          id: r.id ?? r.name,
          name: r.name || r.title || 'Unnamed',
          description: r.description || '',
          permissions: Array.isArray(r.permissions)
            ? r.permissions.map((p) => (typeof p === 'string' ? p : p.codename || p.key || p.name))
            : [],
          protected: r.protected || r.is_protected || false,
        }));
        setRoles(normalized);
        setSelectedId(normalized[0].id);
      }
    } catch (err) {
      // keep defaults
    }
  };

  // Load users to count them per role
  const loadUsers = async () => {
    try {
      const res = await api.getUsers();
      const payload = res?.data ?? res;
      const items = Array.isArray(payload) ? payload : payload?.results ?? [];
      setUsers(items);
    } catch (err) {
      setUsers([]);
    }
  };

  useEffect(() => {
    loadRoles();
    loadUsers();
  }, []);

  // Count users per role name (case-insensitive)
  const userCountByRole = useMemo(() => {
    const map = {};
    users.forEach((u) => {
      getUserRoleNames(u).forEach((roleName) => {
        const key = roleName.toLowerCase();
        map[key] = (map[key] || 0) + 1;
      });
    });
    return map;
  }, [users]);

  const getRoleUserCount = (role) => {
    return userCountByRole[role.name.toLowerCase()] || 0;
  };

  const selectedRole = useMemo(
    () => roles.find((r) => r.id === selectedId) || roles[0],
    [roles, selectedId]
  );

  const togglePermission = async (permKey) => {
    if (!selectedRole) return;
    const hasPerm = selectedRole.permissions.includes(permKey);
    const updatedPerms = hasPerm
      ? selectedRole.permissions.filter((p) => p !== permKey)
      : [...selectedRole.permissions, permKey];

    setRoles((prev) =>
      prev.map((r) =>
        r.id === selectedRole.id ? { ...r, permissions: updatedPerms } : r
      )
    );

    setSaving(true);
    try {
      if (api.updateRole) {
        await api.updateRole(selectedRole.id, { permissions: updatedPerms });
      }
    } catch (err) {
      console.error('Failed to save permission change', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;
    const newRole = {
      id: newRoleName.toLowerCase().replace(/\s+/g, '-'),
      name: newRoleName.trim(),
      description: newRoleDesc.trim() || 'No description',
      permissions: [],
    };

    try {
      if (api.createRole) {
        const res = await api.createRole({
          name: newRole.name,
          description: newRole.description,
          permissions: [],
        });
        const created = res?.data ?? res;
        if (created?.id) newRole.id = created.id;
      }
    } catch (err) {
      console.error('Failed to create role', err);
    }

    setRoles((prev) => [...prev, newRole]);
    setSelectedId(newRole.id);
    setNewRoleName('');
    setNewRoleDesc('');
    setShowNewRole(false);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Roles &amp; Permissions</h2>
          <div className="muted small">
            Changes apply immediately and are written to the audit log
            {saving && <span style={{ marginLeft: 8, color: '#0d9488' }}>· Saving...</span>}
          </div>
        </div>
        <div className="controls-right">
          <button className="primary-btn" onClick={() => setShowNewRole(true)}>
            + New role
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* LEFT: Role list */}
        <div className="card" style={{ width: 280, padding: 8, flexShrink: 0 }}>
          {roles.map((role) => {
            const active = role.id === selectedId;
            const count = getRoleUserCount(role);
            return (
              <div
                key={role.id}
                onClick={() => setSelectedId(role.id)}
                style={{
                  padding: '12px 14px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: active ? '#f3f4f6' : 'transparent',
                  marginBottom: 4,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = 'transparent';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontWeight: 600, color: '#111827' }}>{role.name}</div>
                  <div
                    style={{
                      fontSize: 12,
                      color: '#6b7280',
                      fontFamily: 'monospace',
                      background: '#f3f4f6',
                      padding: '2px 8px',
                      borderRadius: 999,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {count} {count === 1 ? 'user' : 'users'}
                  </div>
                </div>
                <div className="muted small" style={{ marginTop: 4 }}>
                  {role.description}
                </div>
              </div>
            );
          })}
        </div>

        {/* RIGHT: Permission editor */}
        <div className="card" style={{ flex: 1, padding: 28 }}>
          {selectedRole && (
            <>
              <h3 style={{ margin: 0, marginBottom: 4, fontSize: 22 }}>{selectedRole.name}</h3>
              <div className="muted" style={{ marginBottom: 24 }}>{selectedRole.description}</div>

              {Object.entries(PERMISSION_CATALOGUE).map(([category, perms]) => (
                <div key={category} style={{ marginBottom: 24 }}>
                  <div
                    className="muted small"
                    style={{
                      fontWeight: 600,
                      letterSpacing: 1,
                      marginBottom: 10,
                      color: '#6b7280',
                    }}
                  >
                    {category}
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: 12,
                    }}
                  >
                    {perms.map((perm) => {
                      const checked = selectedRole.permissions.includes(perm.key);
                      return (
                        <div
                          key={perm.key}
                          onClick={() => togglePermission(perm.key)}
                          style={{
                            padding: '12px 16px',
                            border: checked ? '1px solid #0d9488' : '1px solid #e5e7eb',
                            borderRadius: 8,
                            background: checked ? '#ecfdf5' : '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            transition: 'all 0.15s',
                          }}
                        >
                          <div
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 4,
                              background: checked ? '#0d9488' : '#fff',
                              border: checked ? '1px solid #0d9488' : '1px solid #d1d5db',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              fontSize: 14,
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {checked && '✓'}
                          </div>
                          <div>
                            <div
                              style={{
                                fontFamily: 'monospace',
                                fontWeight: 600,
                                fontSize: 14,
                                color: '#111827',
                              }}
                            >
                              {perm.key}
                            </div>
                            <div className="muted small">{perm.label}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* New Role Modal */}
      {showNewRole && (
        <div
          onClick={() => setShowNewRole(false)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              padding: 28,
              borderRadius: 12,
              width: 440,
              maxWidth: '90vw',
              boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: 20, fontSize: 20 }}>New Role</h3>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: '#374151', fontWeight: 500 }}>
                Role name
              </label>
              <input
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="e.g. Editor"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: '#374151', fontWeight: 500 }}>
                Description
              </label>
              <input
                value={newRoleDesc}
                onChange={(e) => setNewRoleDesc(e.target.value)}
                placeholder="What this role can do"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="ghost-btn" onClick={() => setShowNewRole(false)}>
                Cancel
              </button>
              <button className="primary-btn" onClick={handleCreateRole}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RolesPage;