import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCheck, User, ArrowRight, Mail, CheckCircle2, Shield } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore.js';
import { api } from '../../services/api.js';

export const OnboardingWizard: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedRole, setSelectedRole] = useState<'ASSISTANT' | 'CLIENT'>(
    user?.role === 'CLIENT' ? 'CLIENT' : 'ASSISTANT'
  );
  const [selectedProvider, setSelectedProvider] = useState<'gmail' | 'outlook'>('gmail');
  const [syncing, setSyncing] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const handleConnectProvider = async () => {
    setSyncing(true);
    setConnectError(null);
    try {
      await api.post('/accounts/connect', {
        provider: selectedProvider,
        emailAddress:
          selectedProvider === 'gmail'
            ? 'executive@acmepartners.com'
            : 'executive@wrightventures.io',
        displayName: user?.name || 'Executive Account',
      });
      setSyncing(false);
      setStep(3);
    } catch (err: any) {
      setSyncing(false);
      setConnectError(
        err.response?.data?.message ||
          'Connection timed out or failed. Please retry connecting your client email account.'
      );
    }
  };

  const handleFinish = () => {
    if (selectedRole === 'CLIENT') {
      navigate('/client/dashboard');
    } else {
      navigate('/assistant/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-lg bg-surface-main rounded-card border border-border-main shadow-card p-8">
        {/* Step indicator */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-border-main">
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                step >= 1 ? 'bg-forest text-white' : 'bg-bg-secondary text-text-secondary'
              }`}
            >
              1
            </span>
            <span className="text-xs font-medium text-text-primary">Role</span>
          </div>
          <div className="h-0.5 w-10 bg-border-main"></div>
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                step >= 2 ? 'bg-forest text-white' : 'bg-bg-secondary text-text-secondary'
              }`}
            >
              2
            </span>
            <span className="text-xs font-medium text-text-primary">Connect Email</span>
          </div>
          <div className="h-0.5 w-10 bg-border-main"></div>
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                step === 3 ? 'bg-forest text-white' : 'bg-bg-secondary text-text-secondary'
              }`}
            >
              3
            </span>
            <span className="text-xs font-medium text-text-primary">Ready</span>
          </div>
        </div>

        {/* STEP 1: Role Confirmation */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-text-primary tracking-tight">Welcome to MailPilot</h2>
              <p className="text-xs text-text-secondary mt-1">
                Configure your workspace experience to match your responsibilities.
              </p>
            </div>

            <div className="space-y-3">
              <div
                onClick={() => setSelectedRole('ASSISTANT')}
                className={`p-4 rounded-card border cursor-pointer transition-all ${
                  selectedRole === 'ASSISTANT'
                    ? 'border-forest bg-forest-soft/30 shadow-subtle'
                    : 'border-border-main hover:border-forest/40 bg-surface-main'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-forest-soft text-forest flex items-center justify-center shrink-0 mt-0.5">
                    <UserCheck size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">Executive Assistant Workspace</h3>
                    <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                      Manage client inboxes, review AI classifications, draft responses, track meetings, and prepare items for client decision.
                    </p>
                  </div>
                </div>
              </div>

              <div
                onClick={() => setSelectedRole('CLIENT')}
                className={`p-4 rounded-card border cursor-pointer transition-all ${
                  selectedRole === 'CLIENT'
                    ? 'border-[#B7833D] bg-[#FDF6EC]/40 shadow-subtle'
                    : 'border-border-main hover:border-[#B7833D]/40 bg-surface-main'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#FDF6EC] text-[#B7833D] flex items-center justify-center shrink-0 mt-0.5">
                    <User size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">Executive Client Workspace</h3>
                    <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                      Minimal, distraction-free view showing only high-stakes emails requiring your personal approval or decision.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full py-2.5 rounded-card bg-forest text-white font-medium text-xs hover:bg-forest-hover transition-colors shadow-subtle flex items-center justify-center gap-2"
            >
              <span>Next: Connect Email Account</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* STEP 2: Connect Email Account */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-text-primary tracking-tight">Connect Client Inbox</h2>
              <p className="text-xs text-text-secondary mt-1">
                MailPilot syncs emails and applies AI classification to incoming threads.
              </p>
            </div>

            <div className="space-y-3">
              <div
                onClick={() => setSelectedProvider('gmail')}
                className={`p-4 rounded-card border cursor-pointer flex items-center justify-between transition-all ${
                  selectedProvider === 'gmail'
                    ? 'border-forest bg-forest-soft/30'
                    : 'border-border-main hover:border-forest/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white border border-border-main flex items-center justify-center shadow-subtle text-red-600 font-bold text-sm">
                    G
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-text-primary">Google Workspace / Gmail</h4>
                    <p className="text-[11px] text-text-secondary">Simulated OAuth integration ready</p>
                  </div>
                </div>
                <input
                  type="radio"
                  checked={selectedProvider === 'gmail'}
                  onChange={() => setSelectedProvider('gmail')}
                  className="accent-forest"
                />
              </div>

              <div
                onClick={() => setSelectedProvider('outlook')}
                className={`p-4 rounded-card border cursor-pointer flex items-center justify-between transition-all ${
                  selectedProvider === 'outlook'
                    ? 'border-forest bg-forest-soft/30'
                    : 'border-border-main hover:border-forest/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white border border-border-main flex items-center justify-center shadow-subtle text-blue-600 font-bold text-sm">
                    O
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-text-primary">Microsoft 365 / Outlook</h4>
                    <p className="text-[11px] text-text-secondary">Simulated OAuth integration ready</p>
                  </div>
                </div>
                <input
                  type="radio"
                  checked={selectedProvider === 'outlook'}
                  onChange={() => setSelectedProvider('outlook')}
                  className="accent-forest"
                />
              </div>
            </div>

            <div className="p-3 bg-bg-primary rounded-card border border-border-main flex items-start gap-2.5 text-xs text-text-secondary">
              <Shield size={16} className="text-forest shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                OAuth connections run with least-privilege tokens. For evaluation purposes, simulated OAuth sync is active and pre-populated with realistic executive communications.
              </p>
            </div>

            {connectError && (
              <div className="p-3 bg-[#FBEBE9] border border-[#F3C4BF] rounded-card text-[#B75C52] text-xs flex items-center justify-between gap-3">
                <span className="flex-1 text-[11px] leading-tight">{connectError}</span>
                <button
                  type="button"
                  onClick={handleConnectProvider}
                  className="px-2.5 py-1 bg-[#B75C52] text-white rounded font-medium text-[11px] hover:opacity-90 shrink-0"
                >
                  Retry Connection
                </button>
              </div>
            )}

            <button
              onClick={handleConnectProvider}
              disabled={syncing}
              className="w-full py-2.5 rounded-card bg-forest text-white font-medium text-xs hover:bg-forest-hover transition-colors shadow-subtle flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {syncing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Connecting & Syncing Messages...</span>
                </>
              ) : (
                <>
                  <span>Connect & Synchronize Inbox</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        )}

        {/* STEP 3: Complete */}
        {step === 3 && (
          <div className="space-y-6 text-center">
            <div className="w-14 h-14 rounded-full bg-forest-soft text-forest flex items-center justify-center mx-auto shadow-subtle">
              <CheckCircle2 size={32} />
            </div>

            <div>
              <h2 className="text-xl font-bold text-text-primary tracking-tight">Workspace Ready</h2>
              <p className="text-xs text-text-secondary mt-1">
                Your client inbox is synchronized. AI classification has processed all incoming conversations.
              </p>
            </div>

            <div className="p-4 bg-bg-primary rounded-card border border-border-main text-left space-y-2 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-border-main">
                <span className="text-text-secondary">Connected Account</span>
                <span className="font-medium text-text-primary">
                  {selectedProvider === 'gmail' ? 'Google Workspace (Connected)' : 'Microsoft 365 (Connected)'}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-border-main">
                <span className="text-text-secondary">Analyzed Messages</span>
                <span className="font-medium text-text-primary">26 Conversations Processed</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">AI Model Active</span>
                <span className="font-medium text-forest">Gemini / MailPilot Hybrid Engine</span>
              </div>
            </div>

            <button
              onClick={handleFinish}
              className="w-full py-2.5 rounded-card bg-forest text-white font-medium text-xs hover:bg-forest-hover transition-colors shadow-subtle flex items-center justify-center gap-2"
            >
              <span>Enter {selectedRole === 'CLIENT' ? 'Client' : 'Assistant'} Workspace</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
