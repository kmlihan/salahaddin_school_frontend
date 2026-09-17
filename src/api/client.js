import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    // Auto-logout on 401 (except for the login call itself)
    if (err.response?.status === 401 && !err.config?.url?.endsWith('/auth/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      // Soft reload the route so AuthContext clears
      if (location.pathname !== '/login') location.assign('/login');
    }
    return Promise.reject(err);
  }
);

export default api;
