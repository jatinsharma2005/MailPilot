import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Share2,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertCircle,
  Sparkles,
  CreditCard,
  FileSignature,
  ArrowRight,
  Bookmark,
  Menu,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { Email } from '../../types/index.js';
import { PriorityBadge } from '../../components/common/PriorityBadge.js';
import { Modal } from '../../components/common/Modal.js';
import { useAuthStore } from '../../store/useAuthStore.js';

export const ClientDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [attentionEmails, setAttentionEmails] = useState<Email[]>([]);
  const [historyEmails, setHistoryEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Modal actions
  const [delegateModalOpen, setDelegateModalOpen] = useState(false);
  const [handleModalOpen, setHandleModalOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [delegateNote, setDelegateNote] = useState('');
  const [handleNote, setHandleNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchClientData = async () => {
    setLoading(true);
    try {
      const [attRes, histRes] = await Promise.all([
        api.get('/client/attention'),
        api.get('/client/history'),
      ]);
      setAttentionEmails(attRes.data.data.emails || []);
      setHistoryEmails(histRes.data.data || []);
    } catch (err) {
      console.error('Failed to load client data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientData();
  }, []);

  const openHandleModal = (email: Email) => {
    setSelectedEmail(email);
    setHandleNote('');
    setHandleModalOpen(true);
  };

  const openDelegateModal = (email: Email) => {
    setSelectedEmail(email);
    setDelegateNote('');
    setDelegateModalOpen(true);
  };

  const confirmHandle = async () => {
    if (!selectedEmail || actionLoading) return;
    setActionLoading(true);
    try {
      await api.patch(`/client/emails/${selectedEmail._id}/handle`, {
        clientNotes: handleNote || 'Handled directly by client.',
      });
      const subj = selectedEmail.subject;
      setHandleModalOpen(false);
      setSuccessMsg(`"${subj}" has been marked as handled.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      await fetchClientData();
    } catch (err) {
      console.error('Error handling email:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDelegate = async () => {
    if (!selectedEmail || actionLoading) return;
    setActionLoading(true);
    try {
      await api.patch(`/client/emails/${selectedEmail._id}/delegate`, {
        delegationReason: delegateNote || 'Please handle this on my behalf.',
      });
      const subj = selectedEmail.subject;
      setDelegateModalOpen(false);
      setSuccessMsg(`"${subj}" has been delegated to your assistant.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      await fetchClientData();
    } catch (err) {
      console.error('Error delegating email:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const invoiceCount = attentionEmails.filter((e) =>
    /invoice|billing|payment|pricing|fee/i.test(e.subject + ' ' + (e.aiSummary || '') + ' ' + (e.body || ''))
  ).length;

  const contractCount = attentionEmails.filter((e) =>
    /contract|agreement|nda|terms|sign/i.test(e.subject + ' ' + (e.aiSummary || '') + ' ' + (e.body || ''))
  ).length;

  return (
    <div className="mailpilot-client-dashboard space-y-6 animate-fadeIn max-w-4xl mx-auto pb-12">
      {/* Top Header Bar matching Reference Image 3 */}
      <div className="flex items-center justify-between pb-3 border-b border-border-main/60">
        <div className="flex items-center gap-2.5 text-text-secondary font-medium text-xs">
          <Menu size={16} className="text-text-primary" />
          <span className="font-semibold text-text-primary text-sm">Home</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-surface-main border border-border-main flex items-center justify-center text-text-secondary shadow-subtle cursor-pointer hover:text-text-primary">
          <Bookmark size={15} />
        </div>
      </div>

      {/* Client Welcome Hero matching Reference Image 3 */}
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">
          Good Morning, {user?.name?.split(' ')[0] || 'Ana'}
        </h1>
        <p className="text-sm text-text-secondary">
          Here's what needs your attention today
        </p>
        {user?.role === 'ASSISTANT' && (
          <p className="text-xs text-text-secondary">Read-only client preview</p>
        )}
      </div>

      {successMsg && (
        <div className="p-4 bg-[#EAF2EC] border border-[#D0E2D5] text-[#234E39] rounded-2xl flex items-center gap-2.5 text-xs font-semibold shadow-2xs animate-fadeIn">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* "Your actions" Card Grid matching Reference Image 3 */}
      <div className="p-6 rounded-3xl bg-white border border-border-main shadow-card space-y-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary">Your actions</h2>
          <p className="text-xs text-text-secondary mt-0.5">
            You have <span className="font-semibold text-[#234E39]">{attentionEmails.length || 4} pending items</span>
          </p>
        </div>

        <div className="mailpilot-client-metrics grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1: Invoices */}
          <div className="p-5 rounded-2xl bg-[#FAF9F5] border border-border-main hover:border-[#234E39]/40 transition-all group flex flex-col justify-between min-h-[140px]">
            <div className="flex items-center gap-2.5 text-text-primary font-semibold text-sm">
              <div className="w-8 h-8 rounded-xl bg-white border border-border-main flex items-center justify-center text-[#234E39] shadow-subtle">
                <CreditCard size={16} />
              </div>
              <span>Invoices</span>
            </div>
            <div className="my-2">
              <span className="text-xs text-text-secondary">{invoiceCount} invoices</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary group-hover:text-[#234E39] transition-colors cursor-pointer">
              <span>View all</span>
              <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Card 2: Contracts */}
          <div className="p-5 rounded-2xl bg-[#FAF9F5] border border-border-main hover:border-[#234E39]/40 transition-all group flex flex-col justify-between min-h-[140px]">
            <div className="flex items-center gap-2.5 text-text-primary font-semibold text-sm">
              <div className="w-8 h-8 rounded-xl bg-white border border-border-main flex items-center justify-center text-[#234E39] shadow-subtle">
                <FileSignature size={16} />
              </div>
              <span>Contracts</span>
            </div>
            <div className="my-2">
              <span className="text-xs text-text-secondary">{contractCount} contract</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary group-hover:text-[#234E39] transition-colors cursor-pointer">
              <span>View all</span>
              <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* Attention Email Cards */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-xs text-text-secondary flex flex-col items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-forest border-t-transparent rounded-full animate-spin"></div>
            <span>Loading attention items...</span>
          </div>
        ) : attentionEmails.length === 0 ? (
          <div className="p-12 bg-surface-main rounded-card border border-border-main text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-forest-soft text-forest flex items-center justify-center mx-auto">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-base font-semibold text-text-primary">All caught up!</h3>
            <p className="text-xs text-text-secondary max-w-sm mx-auto">
              No emails currently require your direct decision. Your assistant is actively managing operational communications.
            </p>
          </div>
        ) : (
          attentionEmails.map((email) => (
            <div
              key={email._id}
              className="bg-white rounded-3xl border border-border-main shadow-card p-6 sm:p-7 space-y-5 hover:border-[#234E39]/40 transition-all"
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src={email.sender.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${email.sender.name}`}
                    alt=""
                    className="w-10 h-10 rounded-full border border-border-main object-cover shadow-2xs"
                  />
                  <div>
                    <h3 className="text-sm font-bold text-text-primary">{email.sender.name}</h3>
                    <p className="text-xs text-text-secondary">{email.sender.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <PriorityBadge priority={email.priority} />
                  <span className="text-[11px] font-medium text-text-secondary">
                    {new Date(email.receivedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>

              {/* Subject */}
              <h4 className="text-base font-bold text-text-primary">{email.subject}</h4>

              {/* AI Summary Card */}
              <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-border-main space-y-2 text-xs">
                <div className="flex items-center gap-1.5 text-[#234E39] font-bold text-[11px] uppercase tracking-wider">
                  <Sparkles size={13} />
                  <span>AI Executive Summary</span>
                </div>
                <p className="text-xs text-text-primary leading-relaxed">
                  {email.aiSummary || email.body.slice(0, 180)}
                </p>

                {/* Why response is needed */}
                <div className="pt-2 border-t border-border-main/60">
                  <span className="font-semibold text-text-primary">Why your response is needed: </span>
                  <span className="text-text-secondary">
                    {email.classificationReason || 'Sender requires executive-level approval or decision.'}
                  </span>
                </div>
              </div>

              {/* Key Points if available */}
              {email.keyPoints && email.keyPoints.length > 0 && (
                <div className="flex flex-wrap gap-2 text-xs">
                  {email.keyPoints.map((pt, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-full bg-white text-text-primary text-[11px] border border-border-main font-medium shadow-2xs"
                    >
                      • {pt}
                    </span>
                  ))}
                </div>
              )}

              {/* Actions Toolbar */}
              <div className="pt-2 border-t border-border-main flex items-center justify-between flex-wrap gap-3">
                <button
                  onClick={() => navigate(`/client/emails/${email._id}`)}
                  className="text-xs font-semibold text-text-secondary hover:text-[#234E39] flex items-center gap-1.5 transition-colors"
                >
                  <FileText size={14} />
                  <span>View Full Conversation</span>
                </button>

                {user?.role !== 'ASSISTANT' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openDelegateModal(email)}
                      className="px-4 py-2 rounded-full bg-bg-secondary text-text-primary hover:bg-[#FAF9F5] text-xs font-semibold border border-border-main flex items-center gap-1.5 transition-all"
                    >
                      <Share2 size={13} />
                      <span>Delegate to Assistant</span>
                    </button>

                    <button
                      onClick={() => openHandleModal(email)}
                      className="px-4 py-2 rounded-full bg-[#234E39] text-white hover:bg-[#1B382B] text-xs font-semibold flex items-center gap-1.5 transition-all shadow-subtle"
                    >
                      <CheckCircle2 size={13} />
                      <span>I'll Handle This</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Previously Handled History Accordion */}
      <div className="pt-4">
        <button
          onClick={() => setHistoryOpen(!historyOpen)}
          className="w-full p-4 rounded-card bg-surface-main border border-border-main flex items-center justify-between text-xs font-semibold text-text-primary hover:bg-bg-primary transition-colors shadow-subtle"
        >
          <span>Previously Resolved Decisions ({historyEmails.length})</span>
          {historyOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {historyOpen && (
          <div className="mt-3 bg-surface-main rounded-card border border-border-main shadow-card divide-y divide-border-main overflow-hidden text-xs">
            {historyEmails.length === 0 ? (
              <p className="p-4 text-center text-text-secondary">No previously handled items recorded.</p>
            ) : (
              historyEmails.map((item) => (
                <div key={item._id} className="p-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-text-primary truncate">{item.subject}</p>
                    <p className="text-[11px] text-text-secondary mt-0.5">
                      From: {item.sender.name} • Status: <span className="font-medium text-forest">{item.status}</span>
                      {item.clientNotes && ` • Note: ${item.clientNotes}`}
                      {item.delegationReason && ` • Delegated: ${item.delegationReason}`}
                    </p>
                  </div>
                  <span className="text-[10px] text-text-secondary shrink-0">
                    {new Date(item.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Handle Modal */}
      <Modal
        isOpen={handleModalOpen}
        onClose={() => setHandleModalOpen(false)}
        title="Mark Matter as Handled"
      >
        <div className="space-y-4 text-xs">
          <p className="text-text-secondary">
            Marking <span className="font-semibold text-text-primary">"{selectedEmail?.subject}"</span> as resolved directly by you. This will update your assistant's workspace immediately.
          </p>

          <div>
            <label className="block font-medium text-text-primary mb-1">Optional Notes for Assistant</label>
            <textarea
              rows={3}
              value={handleNote}
              onChange={(e) => setHandleNote(e.target.value)}
              placeholder="e.g., Called Marcus directly and signed via DocuSign..."
              className="w-full p-2.5 rounded-card bg-bg-primary border border-border-main text-xs outline-none focus:border-forest"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setHandleModalOpen(false)}
              className="px-3 py-1.5 rounded-card border border-border-main text-text-secondary"
            >
              Cancel
            </button>
            <button
              onClick={confirmHandle}
              disabled={actionLoading}
              className="px-4 py-1.5 rounded-card bg-forest text-white font-medium hover:bg-forest-hover"
            >
              {actionLoading ? 'Updating...' : 'Confirm Handled'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delegate Modal */}
      <Modal
        isOpen={delegateModalOpen}
        onClose={() => setDelegateModalOpen(false)}
        title="Delegate to Assistant"
      >
        <div className="space-y-4 text-xs">
          <p className="text-text-secondary">
            Delegate <span className="font-semibold text-text-primary">"{selectedEmail?.subject}"</span> to your assistant. This will shift the classification to Assistant to Reply and place it on their priority queue.
          </p>

          <div>
            <label className="block font-medium text-text-primary mb-1">Instructions for Assistant</label>
            <textarea
              rows={3}
              value={delegateNote}
              onChange={(e) => setDelegateNote(e.target.value)}
              placeholder="e.g., Please coordinate with legal and propose next Tuesday..."
              className="w-full p-2.5 rounded-card bg-bg-primary border border-border-main text-xs outline-none focus:border-forest"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setDelegateModalOpen(false)}
              className="px-3 py-1.5 rounded-card border border-border-main text-text-secondary"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelegate}
              disabled={actionLoading}
              className="px-4 py-1.5 rounded-card bg-[#B7833D] text-white font-medium hover:opacity-90"
            >
              {actionLoading ? 'Delegating...' : 'Delegate to Assistant'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
