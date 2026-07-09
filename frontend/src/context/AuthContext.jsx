import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadUser = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const response = await authApi.getMe();
      setUser(response.data);
      setError('');
    } catch (err) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
      setError('Your session has expired. Please sign in again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const login = async (email, password) => {
    setError('');

    try {
      const response = await authApi.login({ email, password });
      const accessToken = response.data.access || response.data.access_token || response.data.token;
      const refreshToken = response.data.refresh || response.data.refresh_token;

      if (accessToken) {
        localStorage.setItem('access_token', accessToken);
      }

      if (refreshToken) {
        localStorage.setItem('refresh_token', refreshToken);
      }

      const profileResponse = await authApi.getMe();
      setUser(profileResponse.data);
      return profileResponse.data;
    } catch (err) {
      const message = err.response?.data?.detail || err.response?.data?.message || 'Unable to sign in. Please check your credentials.';
      setError(message);
      throw new Error(message);
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    setError('');
  };

  const value = useMemo(() => ({
    user,
    loading,
    error,
    login,
    logout,
    isAuthenticated: Boolean(user),
    isAdmin: Boolean(user?.roles?.some((role) => /admin|super/i.test(role))),
  }), [user, loading, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
