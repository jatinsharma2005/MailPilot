import axios from 'axios';

const isDev = import.meta.env.DEV;
const configuredApiUrl = import.meta.env.API_URL?.trim();

if (!isDev && !configuredApiUrl) {
  throw new Error('API_URL is not configured. Set it to the backend origin and rebuild the client.');
}

const apiOrigin = isDev ? '' : configuredApiUrl!.replace(/\/+$/, '');

export const API_BASE_URL = apiOrigin ? `${apiOrigin}/api` : '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
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
