import React, { useEffect, useState } from 'react';
import { KeyRound, RefreshCw, CheckCircle2, Shield, Plus, Trash2, ExternalLink } from 'lucide-react';
import { api } from '../../services/api.js';
import { EmailAccount } from '../../types/index.js';
import { Modal } from '../../components/common/Modal.js';

export const AccountsPage: React.FC = () => {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [provider, setProvider] = useState<'gmail' | 'outlook'>('gmail');
  const [emailAddress, setEmailAddress] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [connecting, setConnecting] = useState(false);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/accounts');
      setAccounts(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleSyncAccount = async (id: string) => {
    setSyncingId(id);
    try {
      await api.post(`/accounts/${id}/sync`);
      await fetchAccounts();
    } catch (err) {
      console.error(err);
    } finally {
      setSyncingId(null);
    }
  };

  const handleDisconnect = async (id: string) => {
    if (!confirm('Are you sure you want to disconnect this email inbox?')) return;
    try {
      await api.delete(`/accounts/${id}`);
      await fetchAccounts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailAddress) return;
    setConnecting(true);
    try {
      await api.post('/accounts/connect', {
        provider,
        emailAddress,
        displayName: displayName || emailAddress,
      });
      setConnectModalOpen(false);
      setEmailAddress('');
      setDisplayName('');
      await fetchAccounts();
    } catch (err) {
      console.error(err);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="mailpilot-accounts-page space-y-6 max-w-4xl mx-auto animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border-main">
        <div className="mailpilot-account-details">
          <h1 className="text-xl font-bold tracking-tight text-text-primary">Connected Email Inboxes</h1>
          <p className="text-xs text-text-secondary mt-0.5">Manage executive Google Workspace & Microsoft 365 connections</p>
        </div>

        <button
          onClick={() => setConnectModalOpen(true)}
          className="px-3.5 py-2 rounded-card bg-forest text-white text-xs font-medium hover:bg-forest-hover transition-colors shadow-subtle flex items-center gap-1.5"
        >
          <Plus size={14} />
          <span>Connect Email Account</span>
        </button>
      </div>

      {/* Security notice */}
      <div className="p-4 bg-surface-main rounded-card border border-border-main shadow-card flex items-start gap-3 text-xs">
        <Shield size={18} className="text-forest shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-text-primary">Enterprise OAuth 2.0 Security</p>
          <p className="text-text-secondary leading-relaxed">
            Provider tokens are encrypted at rest using authenticated encryption. Real OAuth endpoints are abstracted so production credentials can be configured seamlessly without altering the core pipeline.
          </p>
        </div>
      </div>

      {/* Account Cards */}
      <div className="space-y-3.5">
        {loading ? (
          <div className="p-12 text-center text-xs text-text-secondary flex flex-col items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-forest border-t-transparent rounded-full animate-spin"></div>
            <span>Checking connected accounts...</span>
          </div>
        ) : accounts.length === 0 ? (
          <div className="p-12 bg-surface-main rounded-card border border-border-main text-center text-xs text-text-secondary">
            No accounts currently connected.
          </div>
        ) : (
          accounts.map((acc) => (
            <div
              key={acc._id}
              className="p-5 bg-surface-main rounded-card border border-border-main shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shadow-subtle shrink-0 ${
                    acc.provider === 'gmail'
                      ? 'bg-red-50 text-red-600 border border-red-200'
                      : 'bg-blue-50 text-blue-600 border border-blue-200'
                  }`}
                >
                  {acc.provider === 'gmail' ? 'G' : 'O'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-text-primary">{acc.displayName}</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-forest-soft text-forest font-semibold uppercase">
                      {acc.connectionStatus}
                    </span>
                    {acc.isSimulated && (
                      <span className="text-[10px] text-text-secondary font-mono bg-bg-secondary px-1.5 py-0.5 rounded">
                        Simulated
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">{acc.emailAddress}</p>
                  <p className="text-[11px] text-text-secondary/70 mt-1">
                    Last synchronized:{' '}
                    {acc.lastSyncedAt
                      ? new Date(acc.lastSyncedAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Just now'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  onClick={() => handleSyncAccount(acc._id)}
                  disabled={syncingId === acc._id}
                  className="px-3 py-1.5 rounded-card border border-border-main text-xs font-medium text-text-primary hover:bg-bg-secondary flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={13} className={syncingId === acc._id ? 'animate-spin text-forest' : ''} />
                  <span>{syncingId === acc._id ? 'Syncing...' : 'Sync Now'}</span>
                </button>

                <button
                  onClick={() => handleDisconnect(acc._id)}
                  className="px-3 py-1.5 rounded-card border border-[#F5D5D1] text-[#B75C52] text-xs font-medium hover:bg-[#FBEBE9] transition-colors"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Connect Modal */}
      <Modal isOpen={connectModalOpen} onClose={() => setConnectModalOpen(false)} title="Connect Email Inbox">
        <form onSubmit={handleConnect} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-text-primary mb-1">Select Email Provider</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setProvider('gmail')}
                className={`p-3 rounded-card border text-left font-medium transition-all ${
                  provider === 'gmail' ? 'border-forest bg-forest-soft/30 text-forest' : 'border-border-main'
                }`}
              >
                Google Workspace (Gmail)
              </button>
              <button
                type="button"
                onClick={() => setProvider('outlook')}
                className={`p-3 rounded-card border text-left font-medium transition-all ${
                  provider === 'outlook' ? 'border-forest bg-forest-soft/30 text-forest' : 'border-border-main'
                }`}
              >
                Microsoft 365 (Outlook)
              </button>
            </div>
          </div>

          <div>
            <label className="block font-medium text-text-primary mb-1">Email Address</label>
            <input
              type="email"
              required
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              placeholder="executive@company.com"
              className="w-full p-2.5 rounded-card bg-bg-primary border border-border-main text-xs outline-none focus:border-forest"
            />
          </div>

          <div>
            <label className="block font-medium text-text-primary mb-1">Display Label</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g., Alexander Wright (Board Inquiries)"
              className="w-full p-2.5 rounded-card bg-bg-primary border border-border-main text-xs outline-none focus:border-forest"
            />
          </div>

          <div className="p-3 bg-bg-primary rounded-card border border-border-main text-[11px] text-text-secondary leading-relaxed">
            Note: This activates a sandbox simulated inbox synchronization with automatic AI message classification.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setConnectModalOpen(false)}
              className="px-3.5 py-1.5 rounded-card border"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={connecting}
              className="px-4 py-1.5 rounded-card bg-forest text-white font-medium hover:bg-forest-hover"
            >
              {connecting ? 'Connecting...' : 'Authorize & Connect'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
