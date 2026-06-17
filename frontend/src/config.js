import axios from 'axios';

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : 'http://localhost:5000');

export const AUTH_TOKEN_KEY = 'khakh_auth_token';
export const AUTH_USER_KEY = 'khakh_auth_user';

axios.defaults.withCredentials = true;

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/api/auth/login')) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
