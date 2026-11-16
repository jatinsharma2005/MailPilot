import axios from 'axios';

// Determine backend API origin
// 1. Explicit VITE_API_URL or API_URL from environment
// 2. Production fallback: https://mailpilot-jewd.onrender.com
// 3. Local dev fallback: '' (uses local Vite proxy /api -> http://localhost:5000)
const envApiUrl = import.meta.env.VITE_API_URL || import.meta.env.API_URL;
const isDev = import.meta.env.DEV;

const defaultOrigin = isDev ? '' : 'https://mailpilot-jewd.onrender.com';
const apiOrigin = (envApiUrl || defaultOrigin).trim().replace(/\/+$/, '');

export const API_BASE_URL = apiOrigin ? `${apiOrigin}/api` : '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mailpilot_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't redirect if we're already on login/signup
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/signup')) {
        localStorage.removeItem('mailpilot_token');
        localStorage.removeItem('mailpilot_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
