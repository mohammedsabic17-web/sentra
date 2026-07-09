import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }

    return Promise.reject(error);
  },
);

export const authApi = {
  login: async (credentials) => {
    try {
      // send both email and username to support backends expecting either field
      const payload = { ...credentials };
      if (credentials.email && !credentials.username) payload.username = credentials.email;
      return await api.post('/api/v1/auth/login/', payload);
    } catch (error) {
      if (error.response?.status === 404) {
        return api.post('/api/token/', credentials);
      }

      throw error;
    }
  },
  getMe: async () => api.get('/api/v1/auth/me/'),
  refreshToken: async (refresh) => api.post('/api/v1/auth/refresh/', { refresh }),
};

export default api;

// ============================================================
// Convenience wrappers for pages to call live backend endpoints.
// ============================================================

// --- READ ---
api.getUsers = async () => api.get('/api/v1/users/');
api.getRoles = async () => api.get('/api/v1/roles/');
api.getAuditLog = async () => api.get('/api/v1/audit-logs/');
api.getDashboardSummary = async () => api.get('/api/v1/dashboard/summary/');

// --- USER MANAGEMENT ---
api.createUser = async (data) =>
  api.post('/api/v1/users/', data);

api.updateUser = async (id, data) =>
  api.patch(`/api/v1/users/${id}/`, data);

api.deleteUser = async (id) =>
  api.delete(`/api/v1/users/${id}/`);

// Try dedicated deactivate endpoint first; fall back to PATCH is_active=false
api.deactivateUser = async (id) => {
  try {
    return await api.post(`/api/v1/users/${id}/deactivate/`);
  } catch (error) {
    if (error.response?.status === 404 || error.response?.status === 405) {
      return api.patch(`/api/v1/users/${id}/`, { is_active: false });
    }
    throw error;
  }
};

// Try dedicated activate endpoint first; fall back to PATCH is_active=true
api.activateUser = async (id) => {
  try {
    return await api.post(`/api/v1/users/${id}/activate/`);
  } catch (error) {
    if (error.response?.status === 404 || error.response?.status === 405) {
      return api.patch(`/api/v1/users/${id}/`, { is_active: true });
    }
    throw error;
    // --- ROLES MANAGEMENT ---
api.createRole = async (data) =>
  api.post('/api/v1/roles/', data);

api.updateRole = async (id, data) =>
  api.patch(`/api/v1/roles/${id}/`, data);

api.deleteRole = async (id) =>
  api.delete(`/api/v1/roles/${id}/`);
  }
};