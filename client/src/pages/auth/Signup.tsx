import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, User, Building, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore.js';

export const Signup: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ASSISTANT' | 'CLIENT'>('ASSISTANT');
  const [workspaceName, setWorkspaceName] = useState('');
  const { register, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register(name, email, password, role, workspaceName);
      navigate('/onboarding');
    } catch {
      // error handled in store
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-surface-main rounded-card border border-border-main shadow-card p-8">
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <div className="w-9 h-9 rounded-lg bg-forest flex items-center justify-center text-white font-bold text-base shadow-subtle">
            M
          </div>
          <span className="font-semibold text-xl tracking-tight text-text-primary">MailPilot</span>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-lg font-semibold text-text-primary">Create your workspace</h2>
          <p className="text-xs text-text-secondary mt-1">Start managing executive communications</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-card bg-[#FBEBE9] border border-[#F5D5D1] text-xs text-[#B75C52] flex items-center justify-between">
            <span>{error}</span>
            <button onClick={clearError} className="font-bold ml-2">×</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-primary mb-1">Full name</label>
            <div className="relative">
              <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sarah Jenkins"
                className="w-full pl-9 pr-3 py-2 rounded-card bg-bg-primary border border-border-main text-xs outline-none focus:border-forest transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-primary mb-1">Email address</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sarah@example.com"
                className="w-full pl-9 pr-3 py-2 rounded-card bg-bg-primary border border-border-main text-xs outline-none focus:border-forest transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-primary mb-1">Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full pl-9 pr-3 py-2 rounded-card bg-bg-primary border border-border-main text-xs outline-none focus:border-forest transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-primary mb-1">Select your primary role</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('ASSISTANT')}
                className={`py-2 px-3 rounded-card text-xs font-medium border text-center transition-all ${
                  role === 'ASSISTANT'
                    ? 'bg-forest-soft text-forest border-forest'
                    : 'bg-bg-primary text-text-secondary border-border-main'
                }`}
              >
                Executive Assistant
              </button>
              <button
                type="button"
                onClick={() => setRole('CLIENT')}
                className={`py-2 px-3 rounded-card text-xs font-medium border text-center transition-all ${
                  role === 'CLIENT'
                    ? 'bg-forest-soft text-forest border-forest'
                    : 'bg-bg-primary text-text-secondary border-border-main'
                }`}
              >
                Client / Executive
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-primary mb-1">Workspace or Company Name</label>
            <div className="relative">
              <Building size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="Acme Partners"
                className="w-full pl-9 pr-3 py-2 rounded-card bg-bg-primary border border-border-main text-xs outline-none focus:border-forest transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-card bg-forest text-white font-medium text-xs hover:bg-forest-hover transition-colors shadow-subtle flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isLoading ? 'Creating workspace...' : 'Continue to Onboarding'}
            <ArrowRight size={14} />
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-text-secondary">
          Already have an account?{' '}
          <Link to="/login" className="text-forest font-medium hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};
