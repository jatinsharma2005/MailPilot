import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore.js';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, demoLogin, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    try {
      const user = await login(email, password);
      if (user.role === 'CLIENT') {
        navigate('/client/dashboard');
      } else {
        navigate('/assistant/dashboard');
      }
    } catch {
      // error handled in store
    }
  };

  const handleDemoLogin = async (role: 'ASSISTANT' | 'CLIENT') => {
    try {
      const user = await demoLogin(role);
      if (user.role === 'CLIENT') {
        navigate('/client/dashboard');
      } else {
        navigate('/assistant/dashboard');
      }
    } catch {
      // error handled in store
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col justify-center items-center p-4">
      {/* Container */}
      <div className="w-full max-w-md bg-surface-main rounded-card border border-border-main shadow-card p-8">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <div className="w-9 h-9 rounded-lg bg-forest flex items-center justify-center text-white font-bold text-base shadow-subtle">
            M
          </div>
          <span className="font-semibold text-xl tracking-tight text-text-primary">MailPilot</span>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-lg font-semibold text-text-primary">Sign in to your workspace</h2>
          <p className="text-xs text-text-secondary mt-1">AI-powered executive email management</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-card bg-[#FBEBE9] border border-[#F5D5D1] text-xs text-[#B75C52] flex items-center justify-between">
            <span>{error}</span>
            <button onClick={clearError} className="font-bold ml-2">×</button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-primary mb-1">Email address</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-9 pr-3 py-2 rounded-card bg-bg-primary border border-border-main text-xs outline-none focus:border-forest transition-colors"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-text-primary">Password</label>
              <Link to="/forgot-password" className="text-[11px] text-forest hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2 rounded-card bg-bg-primary border border-border-main text-xs outline-none focus:border-forest transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-card bg-forest text-white font-medium text-xs hover:bg-forest-hover transition-colors shadow-subtle flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
            <ArrowRight size={14} />
          </button>
        </form>

        {/* 1-Click Demo Login Panel */}
        <div className="mt-8 pt-6 border-t border-border-main">
          <div className="flex items-center gap-1.5 mb-3 text-xs font-medium text-text-primary">
            <Sparkles size={14} className="text-forest" />
            <span>Interactive Demo Sign In</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => handleDemoLogin('ASSISTANT')}
              disabled={isLoading}
              className="p-3 rounded-card border border-border-main bg-bg-primary hover:border-forest/40 hover:bg-forest-soft/30 transition-all text-left"
            >
              <p className="text-xs font-semibold text-text-primary">Assistant View</p>
              <p className="text-[10px] text-text-secondary mt-0.5">Sarah Jenkins</p>
              <span className="mt-2 inline-block text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-bg-secondary text-forest font-semibold">
                Assistant Role
              </span>
            </button>

            <button
              onClick={() => handleDemoLogin('CLIENT')}
              disabled={isLoading}
              className="p-3 rounded-card border border-border-main bg-bg-primary hover:border-forest/40 hover:bg-forest-soft/30 transition-all text-left"
            >
              <p className="text-xs font-semibold text-text-primary">Client View</p>
              <p className="text-[10px] text-text-secondary mt-0.5">Alexander Wright</p>
              <span className="mt-2 inline-block text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#FDF6EC] text-[#B7833D] font-semibold">
                Client Role
              </span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-text-secondary">
          Don't have an account?{' '}
          <Link to="/signup" className="text-forest font-medium hover:underline">
            Create account
          </Link>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2 text-[11px] text-text-secondary">
        <ShieldCheck size={14} className="text-forest" />
        <span>Enterprise JWT session handling & workspace data isolation</span>
      </div>
    </div>
  );
};
