import { create } from 'zustand';
import { User } from '../types/index.js';
import { api } from '../services/api.js';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<User>;
  demoLogin: (role: 'ASSISTANT' | 'CLIENT') => Promise<User>;
  register: (name: string, email: string, password: string, role?: string, workspaceName?: string) => Promise<User>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  updateUser: (updatedUser: Partial<User>) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: JSON.parse(localStorage.getItem('mailpilot_user') || 'null'),
  token: localStorage.getItem('mailpilot_token'),
  isAuthenticated: !!localStorage.getItem('mailpilot_token'),
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/auth/login', { email, password });
      const { user, token } = res.data;
      localStorage.setItem('mailpilot_token', token);
      localStorage.setItem('mailpilot_user', JSON.stringify(user));
      set({ user, token, isAuthenticated: true, isLoading: false });
      return user;
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to sign in. Please check credentials.';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  demoLogin: async (role) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/auth/demo-login', { role });
      const { user, token } = res.data;
      localStorage.setItem('mailpilot_token', token);
      localStorage.setItem('mailpilot_user', JSON.stringify(user));
      set({ user, token, isAuthenticated: true, isLoading: false });
      return user;
    } catch (err: any) {
      const msg = err.response?.data?.message || `Failed to sign in as ${role}.`;
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  register: async (name, email, password, role = 'ASSISTANT', workspaceName) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/auth/register', { name, email, password, role, workspaceName });
      const { user, token } = res.data;
      localStorage.setItem('mailpilot_token', token);
      localStorage.setItem('mailpilot_user', JSON.stringify(user));
      set({ user, token, isAuthenticated: true, isLoading: false });
      return user;
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Registration failed.';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  logout: () => {
    const token = localStorage.getItem('mailpilot_token');
    if (token) {
      void api
        .post('/auth/logout', undefined, { headers: { Authorization: `Bearer ${token}` } })
        .catch(() => {
          console.warn('Server session could not be invalidated; the local session was cleared.');
        });
    }

    localStorage.removeItem('mailpilot_token');
    localStorage.removeItem('mailpilot_user');
    set({ user: null, token: null, isAuthenticated: false, error: null });
    window.location.href = '/login';
  },

  checkAuth: async () => {
    const token = localStorage.getItem('mailpilot_token');
    if (!token) {
      set({ isAuthenticated: false, user: null });
      return;
    }
    try {
      const res = await api.get('/auth/me');
      set({ user: res.data.user, isAuthenticated: true });
      localStorage.setItem('mailpilot_user', JSON.stringify(res.data.user));
    } catch {
      localStorage.removeItem('mailpilot_token');
      localStorage.removeItem('mailpilot_user');
      set({ user: null, token: null, isAuthenticated: false });
    }
  },

  updateUser: (updatedUser: Partial<User>) => {
    set((state) => {
      if (!state.user) return state;
      const merged = { ...state.user, ...updatedUser };
      localStorage.setItem('mailpilot_user', JSON.stringify(merged));
      return { user: merged };
    });
  },

  clearError: () => set({ error: null }),
}));
