import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(localStorage.getItem('role') || null);
  const [loading, setLoading] = useState(true);

  // Apply / clear the gender-accent class on <html> based on the active user.
  // Only students have a gender-driven theme; everyone else uses the default.
  useEffect(() => {
    const html = document.documentElement;
    if (role === 'student' && user?.gender === 'female') {
      html.classList.add('theme-female');
    } else {
      html.classList.remove('theme-female');
    }
  }, [role, user]);

  const refresh = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null); setRole(null); setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      setRole(data.role);
      localStorage.setItem('role', data.role);
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      setUser(null); setRole(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('role', data.role);
    setUser(data.user);
    setRole(data.role);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setUser(null); setRole(null);
  }, []);

  const updateUser = useCallback((u) => setUser(u), []);

  return (
    <AuthContext.Provider value={{ user, role, loading, login, logout, refresh, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}
