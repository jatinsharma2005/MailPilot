import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Share2, Paperclip, Download, Sparkles } from 'lucide-react';
import { api } from '../../services/api.js';
import { Email } from '../../types/index.js';
import { PriorityBadge } from '../../components/common/PriorityBadge.js';
import { Modal } from '../../components/common/Modal.js';
import { useAuthStore } from '../../store/useAuthStore.js';

export const ClientEmailDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [email, setEmail] = useState<Email | null>(null);
  const [thread, setThread] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);

  const [handleModalOpen, setHandleModalOpen] = useState(false);
  const [delegateModalOpen, setDelegateModalOpen] = useState(false);
  const [note, setNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchEmail = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/emails/${id}`);
      setEmail(res.data.data.email);
      setThread(res.data.data.threadMessages || [res.data.data.email]);
    } catch (err) {
      console.error('Failed to load email:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmail();
  }, [id]);

  const confirmHandle = async () => {
    if (!email) return;
    setActionLoading(true);
    try {
      await api.patch(`/client/emails/${email._id}/handle`, {
        clientNotes: note || 'Handled directly by client.',
      });
      navigate('/client/dashboard');
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDelegate = async () => {
    if (!email) return;
    setActionLoading(true);
    try {
      await api.patch(`/client/emails/${email._id}/delegate`, {
        delegationReason: note || 'Delegated to assistant for handling.',
      });
      navigate('/client/dashboard');
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-xs text-text-secondary flex flex-col items-center justify-center gap-2">
        <div className="w-5 h-5 border-2 border-forest border-t-transparent rounded-full animate-spin"></div>
        <span>Loading conversation...</span>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="p-12 text-center text-xs text-text-secondary">
        <p className="text-base font-semibold text-text-primary">Conversation not found</p>
        <button onClick={() => navigate('/client/dashboard')} className="mt-3 text-forest hover:underline">
          Back to Client Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="mailpilot-client-conversation space-y-6 max-w-3xl mx-auto animate-fadeIn pb-12">
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-border-main">
        <button
          onClick={() => navigate('/client/dashboard')}
          className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft size={14} /> Back to Decisions
        </button>

        {user?.role !== 'ASSISTANT' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setNote('');
                setDelegateModalOpen(true);
              }}
              className="px-3.5 py-1.5 rounded-card bg-bg-secondary text-text-primary text-xs font-medium border border-border-main flex items-center gap-1.5 hover:bg-warm-beige/60"
            >
              <Share2 size={13} />
              <span>Delegate</span>
            </button>

            <button
              onClick={() => {
                setNote('');
                setHandleModalOpen(true);
              }}
              className="px-3.5 py-1.5 rounded-card bg-forest text-white text-xs font-medium flex items-center gap-1.5 hover:bg-forest-hover shadow-subtle"
            >
              <CheckCircle2 size={13} />
              <span>I'll Handle This</span>
            </button>
          </div>
        )}
      </div>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="mailpilot-conversation-subject text-xl font-bold tracking-tight text-text-primary">{email.subject}</h1>
          <PriorityBadge priority={email.priority} />
        </div>
        <p className="text-xs text-text-secondary mt-1">From {email.sender.name} &lt;{email.sender.email}&gt;</p>
      </div>

      {/* AI Decision Brief */}
      <div className="p-4 bg-bg-primary rounded-card border border-border-main space-y-2 text-xs">
        <div className="flex items-center gap-1.5 text-forest font-semibold text-[11px] uppercase tracking-wider">
          <Sparkles size={13} />
          <span>Decision Brief</span>
        </div>
        <p className="text-xs text-text-primary leading-relaxed font-medium">
          {email.aiSummary || email.body.slice(0, 160)}
        </p>
        <p className="text-[11px] text-text-secondary pt-1 border-t border-border-main/60">
          <span className="font-semibold text-text-primary">Why needed: </span>
          {email.classificationReason}
        </p>
      </div>

      {/* Message Thread */}
      <div className="space-y-4">
        {thread.map((msg) => (
          <div key={msg._id} className="mailpilot-client-thread-message p-6 bg-surface-main rounded-card border border-border-main shadow-card space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border-main/60 text-xs">
              <span className="font-semibold text-text-primary">{msg.sender.name}</span>
              <span className="text-text-secondary">{new Date(msg.receivedAt).toLocaleString()}</span>
            </div>
            <div className="text-xs leading-relaxed text-text-primary whitespace-pre-wrap">{msg.body}</div>

            {msg.attachments && msg.attachments.length > 0 && (
              <div className="pt-3 border-t border-border-main/60 flex flex-wrap gap-2">
                {msg.attachments.map((att, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-card bg-bg-primary border border-border-main text-xs">
                    <Paperclip size={13} className="text-forest" />
                    <span className="font-medium">{att.name}</span>
                    <button className="text-text-secondary hover:text-forest">
                      <Download size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Handle Modal */}
      <Modal isOpen={handleModalOpen} onClose={() => setHandleModalOpen(false)} title="Confirm Handled">
        <div className="space-y-3 text-xs">
          <p className="text-text-secondary">Mark this item as resolved. Your assistant will see this immediately.</p>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional resolution notes..."
            className="w-full p-2.5 rounded-card bg-bg-primary border border-border-main text-xs outline-none focus:border-forest"
          />
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setHandleModalOpen(false)} className="px-3 py-1.5 rounded-card border">
              Cancel
            </button>
            <button onClick={confirmHandle} disabled={actionLoading} className="px-4 py-1.5 rounded-card bg-forest text-white">
              {actionLoading ? 'Saving...' : 'Confirm'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delegate Modal */}
      <Modal isOpen={delegateModalOpen} onClose={() => setDelegateModalOpen(false)} title="Delegate to Assistant">
        <div className="space-y-3 text-xs">
          <p className="text-text-secondary">Provide instructions for your assistant:</p>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g., Please decline politely or reschedule..."
            className="w-full p-2.5 rounded-card bg-bg-primary border border-border-main text-xs outline-none focus:border-forest"
          />
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setDelegateModalOpen(false)} className="px-3 py-1.5 rounded-card border">
              Cancel
            </button>
            <button onClick={confirmDelegate} disabled={actionLoading} className="px-4 py-1.5 rounded-card bg-[#B7833D] text-white">
              {actionLoading ? 'Delegating...' : 'Delegate'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
