import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, getToken, setToken } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.me();
      setAdmin(res.admin);
    } catch (_) {
      setToken('');
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
    const onUnauthorized = () => setAdmin(null);
    window.addEventListener('qlai:unauthorized', onUnauthorized);
    return () => window.removeEventListener('qlai:unauthorized', onUnauthorized);
  }, [loadMe]);

  const login = async (username, password) => {
    const res = await api.login(username, password);
    setToken(res.token);
    setAdmin(res.admin);
    return res.admin;
  };

  const logout = () => {
    setToken('');
    setAdmin(null);
  };

  return (
    <AuthContext.Provider value={{ admin, setAdmin, loading, login, logout, isSuperAdmin: admin?.role === 'super_admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
