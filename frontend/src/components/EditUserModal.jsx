import { useState, useEffect } from 'react';
import api from '../services/api';

const AVAILABLE_ROLES = ['Admin', 'Viewer', 'Editor', 'User', 'Super Admin'];

const EditUserModal = ({ user, isNew, onClose, onSave }) => {
  const [fullName, setFullName] = useState(user.full_name || '');
  const [email, setEmail] = useState(user.email || '');
  const [selectedRoles, setSelectedRoles] = useState(user.roles || []);
  const [availableRoles, setAvailableRoles] = useState(AVAILABLE_ROLES);
  const [saving, setSaving] = useState(false);

  // Try to load actual roles from backend
  useEffect(() => {
    const loadRoles = async () => {
      try {
        const res = await api.getRoles();
        const payload = res?.data ?? res;
        const items = Array.isArray(payload) ? payload : payload?.results ?? [];
        const names = items
          .map((r) => (typeof r === 'string' ? r : r.name || r.title))
          .filter(Boolean);
        if (names.length > 0) setAvailableRoles(names);
      } catch (err) {
        // Keep default AVAILABLE_ROLES
      }
    };
    loadRoles();
  }, []);

  const toggleRole = (role) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        full_name: fullName,
        email,
        roles: selectedRoles,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
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
          width: 460,
          maxWidth: '90vw',
          boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: 20, fontSize: 20 }}>
          {isNew ? 'Add User' : 'Edit User'}
        </h3>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: '#374151', fontWeight: 500 }}>
              Full name
            </label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
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

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: '#374151', fontWeight: 500 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
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
            <label style={{ display: 'block', fontSize: 13, marginBottom: 8, color: '#374151', fontWeight: 500 }}>
              Roles (click to toggle)
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {availableRoles.map((role) => {
                const active = selectedRoles.includes(role);
                return (
                  <button
                    type="button"
                    key={role}
                    onClick={() => toggleRole(role)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 999,
                      border: active ? '1px solid #0d9488' : '1px solid #d1d5db',
                      background: active ? '#d1fae5' : '#fff',
                      color: active ? '#065f46' : '#374151',
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    {active ? '✓ ' : ''}{role}
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
              Selected: {selectedRoles.length > 0 ? selectedRoles.join(', ') : 'None'}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button type="button" className="ghost-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-btn" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUserModal;