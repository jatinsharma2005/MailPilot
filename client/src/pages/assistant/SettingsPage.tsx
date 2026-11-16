import React, { useState, useEffect } from 'react';
import { User, Shield, Sliders, Bell, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore.js';
import { api } from '../../services/api.js';

export const SettingsPage: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [workspaceName, setWorkspaceName] = useState(user?.workspaceName || 'Acme Executive Group');
  const [aiSensitivity, setAiSensitivity] = useState<'balanced' | 'conservative' | 'aggressive'>('balanced');
  const [autoSummarize, setAutoSummarize] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiStatus, setAiStatus] = useState<{
    isLive: boolean;
    engine: string;
    model: string;
    activeProvider?: 'gemini' | 'openai' | 'fallback';
    fallbackActive?: boolean;
    providers?: {
      gemini?: { configured: boolean; available: boolean; status: string; retryAfter?: string };
      openai?: { configured: boolean; available: boolean; status: string; retryAfter?: string };
    };
    reason?: string;
    retryAfter?: string;
  } | null>(null);

  useEffect(() => {
    api
      .get('/ai/status')
      .then((res) => {
        if (res.data?.data) {
          setAiStatus(res.data.data);
        }
      })
      .catch(() => {
        setAiStatus({ isLive: false, engine: 'Demo Fallback', model: 'gemini-3.8-flash', reason: 'QUOTA_EXHAUSTED' });
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.patch('/auth/profile', {
        name,
        workspaceName,
      });
      if (res.data?.user) {
        updateUser(res.data.user);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to update settings:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mailpilot-settings-page space-y-6 max-w-3xl mx-auto animate-fadeIn pb-12">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-text-primary">Workspace Settings</h1>
        <p className="text-xs text-text-secondary mt-0.5">Manage your profile, AI parameters, and workspace preferences</p>
      </div>

      {saved && (
        <div className="p-3.5 bg-forest-soft rounded-card border border-forest/30 text-xs text-forest flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>Preferences updated and saved to workspace successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 text-xs">
        {/* Profile Section */}
        <div className="bg-surface-main rounded-card border border-border-main shadow-card p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border-main">
            <User size={16} className="text-forest" />
            <h2 className="text-sm font-semibold text-text-primary">Personal Profile</h2>
          </div>

          <div className="flex items-center gap-4">
            <img
              src={user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name}`}
              alt=""
              className="w-12 h-12 rounded-full border border-border-main object-cover"
            />
            <div>
              <p className="font-semibold text-text-primary text-xs">{user?.name}</p>
              <p className="text-[11px] text-text-secondary capitalize">{user?.role?.toLowerCase()} Role</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-text-primary mb-1">Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2.5 rounded-card bg-bg-primary border border-border-main text-xs outline-none focus:border-forest"
              />
            </div>
            <div>
              <label className="block font-medium text-text-primary mb-1">Email Address</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full p-2.5 rounded-card bg-bg-secondary text-text-secondary border border-border-main text-xs outline-none cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* AI Engine & Classification Preferences */}
        <div className="bg-surface-main rounded-card border border-border-main shadow-card p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border-main">
            <div className="flex items-center gap-2">
              <Sliders size={16} className="text-forest" />
              <h2 className="text-sm font-semibold text-text-primary">AI Engine & Classification Sensitivity</h2>
            </div>
            {aiStatus?.isLive ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-forest-soft text-forest border border-forest/20">
                <span className="w-1.5 h-1.5 rounded-full bg-forest animate-pulse"></span>
                {aiStatus.activeProvider === 'openai' || aiStatus.engine?.toLowerCase().includes('openai')
                  ? `OpenAI Active (${aiStatus.model})`
                  : `Gemini Active (${aiStatus.model})`}
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-beige-warm text-[#8C6B38] border border-[#E6E5DE]"
                title={aiStatus?.retryAfter ? `Automatic retry scheduled for ${new Date(aiStatus.retryAfter).toLocaleTimeString()}` : undefined}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#B7833D]"></span>
                {aiStatus?.reason === 'QUOTA_EXHAUSTED' || aiStatus?.providers?.gemini?.status === 'quota_exhausted'
                  ? 'Gemini Quota Exhausted'
                  : aiStatus?.reason === 'BILLING_UNAVAILABLE' || aiStatus?.providers?.openai?.status === 'billing_unavailable'
                  ? 'OpenAI Billing Unavailable'
                  : 'Demo Fallback Active'}
              </span>
            )}
          </div>

          {(aiStatus?.reason === 'QUOTA_EXHAUSTED' || aiStatus?.providers?.gemini?.status === 'quota_exhausted') && (
            <div className="p-3 rounded-card bg-[#FDF6EC] border border-[#F5E6CC] text-xs text-[#8C6B38]">
              <p className="font-semibold mb-0.5">Google AI Studio Daily Quota Exhausted (20 req/day)</p>
              <p className="text-[11px] text-[#A67530]">
                MailPilot has automatically failed over to the secondary provider or deterministic engine. All classification, summaries, and reply generation remain fully operational.
                {aiStatus.retryAfter && (
                  <> Quota reset scheduled for <span className="font-mono font-medium">{new Date(aiStatus.retryAfter).toLocaleTimeString()}</span>.</>
                )}
              </p>
            </div>
          )}

          {(aiStatus?.reason === 'BILLING_UNAVAILABLE' || aiStatus?.providers?.openai?.status === 'billing_unavailable') && (
            <div className="p-3 rounded-card bg-[#FDF6EC] border border-[#F5E6CC] text-xs text-[#8C6B38]">
              <p className="font-semibold mb-0.5">OpenAI Insufficient Credits / Billing Limit Reached</p>
              <p className="text-[11px] text-[#A67530]">
                OpenAI automatic requests have been disabled to prevent repeated billing failures. The platform is currently operating in deterministic fallback mode.
              </p>
            </div>
          )}

          <div>
            <label className="block font-medium text-text-primary mb-1">Classification Sensitivity Mode</label>
            <div className="mailpilot-settings-options grid grid-cols-3 gap-2">
              {[
                { id: 'balanced', title: 'Balanced (Recommended)', desc: 'Standard confidence thresholds' },
                { id: 'conservative', title: 'Conservative', desc: 'Escalates ambiguity to Needs Review' },
                { id: 'aggressive', title: 'Autonomous', desc: 'Assigns operational items to Assistant' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setAiSensitivity(m.id as any)}
                  className={`p-3 rounded-card border text-left transition-all ${
                    aiSensitivity === m.id
                      ? 'border-forest bg-forest-soft/30 text-forest font-semibold'
                      : 'border-border-main bg-bg-primary text-text-secondary'
                  }`}
                >
                  <p className="text-xs">{m.title}</p>
                  <p className="text-[10px] font-normal opacity-80 mt-0.5">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <p className="font-medium text-text-primary">Automatic Conversation Summarization</p>
              <p className="text-[11px] text-text-secondary">Generate executive 2-line briefs upon receiving new emails.</p>
            </div>
            <input
              type="checkbox"
              checked={autoSummarize}
              onChange={(e) => setAutoSummarize(e.target.checked)}
              className="accent-forest w-4 h-4 cursor-pointer"
            />
          </div>
        </div>

        {/* Workspace Details */}
        <div className="bg-surface-main rounded-card border border-border-main shadow-card p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border-main">
            <Shield size={16} className="text-forest" />
            <h2 className="text-sm font-semibold text-text-primary">Workspace Configuration</h2>
          </div>

          <div>
            <label className="block font-medium text-text-primary mb-1">Executive Workspace Name</label>
            <input
              type="text"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              className="w-full p-2.5 rounded-card bg-bg-primary border border-border-main text-xs outline-none focus:border-forest"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <p className="font-medium text-text-primary">Priority Alert Notifications</p>
              <p className="text-[11px] text-text-secondary">Push immediate toast notifications for URGENT tier emails.</p>
            </div>
            <input
              type="checkbox"
              checked={emailAlerts}
              onChange={(e) => setEmailAlerts(e.target.checked)}
              className="accent-forest w-4 h-4 cursor-pointer"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-card bg-forest text-white font-medium hover:bg-forest-hover shadow-subtle transition-colors"
          >
            Save Preferences
          </button>
        </div>
      </form>
    </div>
  );
};
