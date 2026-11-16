import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) setSubmitted(true);
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

        {submitted ? (
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-forest-soft text-forest flex items-center justify-center mx-auto">
              <CheckCircle2 size={24} />
            </div>
            <h2 className="text-base font-semibold text-text-primary">Reset instructions sent</h2>
            <p className="text-xs text-text-secondary leading-relaxed">
              If an account exists for <span className="font-medium text-text-primary">{email}</span>, we have dispatched recovery instructions.
            </p>
            <div className="pt-4">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs text-forest font-medium hover:underline"
              >
                <ArrowLeft size={14} /> Back to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <div className="text-center mb-6">
              <h2 className="text-lg font-semibold text-text-primary">Reset your password</h2>
              <p className="text-xs text-text-secondary mt-1">Enter your registered email address</p>
            </div>

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

              <button
                type="submit"
                className="w-full py-2.5 rounded-card bg-forest text-white font-medium text-xs hover:bg-forest-hover transition-colors shadow-subtle"
              >
                Send Password Reset Link
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link to="/login" className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary">
                <ArrowLeft size={13} /> Back to Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
