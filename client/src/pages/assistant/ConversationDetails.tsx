import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Star,
  Archive,
  CheckCircle2,
  Paperclip,
  Sparkles,
  Send,
  Copy,
  RefreshCw,
  User,
  ShieldAlert,
  ChevronDown,
  Clock,
  Download,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { Email, Conversation, ClassificationType } from '../../types/index.js';
import { ClassificationBadge } from '../../components/common/ClassificationBadge.js';
import { PriorityBadge } from '../../components/common/PriorityBadge.js';
import { Modal } from '../../components/common/Modal.js';

export const ConversationDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [email, setEmail] = useState<Email | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [threadMessages, setThreadMessages] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);

  // Reply Composer State
  const [replyBody, setReplyBody] = useState('');
  const [replyTone, setReplyTone] = useState<'professional' | 'friendly' | 'concise' | 'formal'>('professional');
  const [generatingAI, setGeneratingAI] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [reclassifying, setReclassifying] = useState(false);
  const [customReason, setCustomReason] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchEmailDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/emails/${id}`);
      const data = res.data.data;
      setEmail(data.email);
      setConversation(data.conversation);
      setThreadMessages(data.threadMessages || [data.email]);

      // Pre-fill reply draft if suggested reply exists
      if (data.email.suggestedReply && !replyBody) {
        setReplyBody(data.email.suggestedReply);
      }
    } catch (err) {
      console.error('Failed to load email details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmailDetails();
  }, [id]);

  const handleGenerateAIReply = async () => {
    if (!email) return;
    setGeneratingAI(true);
    try {
      const res = await api.post(`/ai/generate-reply/${email.conversationId}`, {
        tone: replyTone,
      });
      setReplyBody(res.data.data.reply);
    } catch (err) {
      console.error('Failed to generate AI reply:', err);
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleReclassify = async (newClassification: ClassificationType) => {
    if (!email) return;
    setReclassifying(true);
    try {
      const res = await api.patch(`/emails/${email._id}/classification`, {
        classification: newClassification,
        reason: customReason || 'Manual adjustment by assistant',
      });
      setEmail(res.data.data);
      setCustomReason('');
    } catch (err) {
      console.error('Failed to update classification:', err);
    } finally {
      setReclassifying(false);
    }
  };

  const handleSendReply = async () => {
    if (!email || !replyBody.trim()) return;
    setSending(true);
    try {
      await api.post(`/emails/${email._id}/reply`, {
        to: email.sender.email,
        subject: email.subject,
        body: replyBody,
        tone: replyTone,
        isSimulated: true,
        isApproved: true,
      });
      setSendModalOpen(false);
      setReplyBody('');
      // Refresh thread
      await fetchEmailDetails();
    } catch (err) {
      console.error('Failed to send reply:', err);
    } finally {
      setSending(false);
    }
  };

  const handleCopyDraft = () => {
    navigator.clipboard.writeText(replyBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-xs text-text-secondary flex flex-col items-center justify-center gap-2">
        <div className="w-5 h-5 border-2 border-forest border-t-transparent rounded-full animate-spin"></div>
        <span>Opening conversation thread...</span>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="p-12 text-center text-xs text-text-secondary">
        <p className="text-base font-semibold text-text-primary">Conversation not found</p>
        <button
          onClick={() => navigate('/assistant/emails')}
          className="mt-3 text-forest hover:underline flex items-center gap-1 mx-auto"
        >
          <ArrowLeft size={14} /> Back to Inbox
        </button>
      </div>
    );
  }

  return (
    <div className="mailpilot-conversation-page space-y-6 max-w-6xl mx-auto animate-fadeIn pb-12">
      {/* Top Action Toolbar */}
      <div className="flex items-center justify-between pb-3 border-b border-border-main flex-wrap gap-2">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-card text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Reclassify quick dropdown */}
          <div className="relative inline-block text-left">
            <select
              value={email.classification}
              onChange={(e) => handleReclassify(e.target.value as ClassificationType)}
              disabled={reclassifying}
              className="text-xs bg-surface-main border border-border-main rounded-card px-2.5 py-1.5 text-text-primary outline-none focus:border-forest shadow-subtle cursor-pointer"
            >
              <option value="ASSISTANT_TO_REPLY">Assign: Assistant to Reply</option>
              <option value="CLIENT_TO_REPLY">Assign: Client Attention</option>
              <option value="NEEDS_REVIEW">Assign: Needs Review</option>
              <option value="NO_REPLY_NEEDED">Assign: No Reply Needed</option>
            </select>
          </div>

          <button
            onClick={async () => {
              await api.patch(`/emails/${email._id}/important`);
              setEmail((e) => (e ? { ...e, isImportant: !e.isImportant } : null));
            }}
            title="Mark as Important"
            className="p-1.5 rounded-card border border-border-main bg-surface-main text-text-secondary hover:text-[#B7833D] transition-colors"
          >
            <Star
              size={15}
              className={email.isImportant ? 'fill-[#B7833D] text-[#B7833D]' : 'text-text-secondary'}
            />
          </button>

          <button
            onClick={async () => {
              await api.patch(`/emails/${email._id}/archive`);
              navigate('/assistant/emails');
            }}
            title="Archive Conversation"
            className="p-1.5 rounded-card border border-border-main bg-surface-main text-text-secondary hover:text-text-primary transition-colors"
          >
            <Archive size={15} />
          </button>
        </div>
      </div>

      {/* Main Subject & Metadata with Zero Inbox style channel pill */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-3xl border border-border-main shadow-card">
        <div>
          <div className="mailpilot-conversation-badges flex items-center gap-2 mb-1.5">
            <span className="font-mono text-xs font-bold text-[#234E39] bg-[#EAF2EC] px-2.5 py-0.5 rounded-full">
              #{email.subject.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32)}
            </span>
            <ClassificationBadge
              classification={email.classification}
              emailId={email._id}
              interactive={true}
              onClassificationChange={(newClass) => {
                setEmail((e) => (e ? { ...e, classification: newClass } : null));
              }}
            />
            <PriorityBadge priority={email.priority} />
          </div>
          <h1 className="mailpilot-conversation-subject text-xl font-extrabold tracking-tight text-text-primary">{email.subject}</h1>
          <p className="text-xs text-text-secondary mt-1">
            Synchronized via {email.accountId?.displayName || 'Google Workspace'} • Account: {email.accountId?.emailAddress}
          </p>
        </div>

        <button
          onClick={() => {
            const composer = document.getElementById('reply-composer-textarea');
            composer?.focus();
          }}
          className="px-4 py-2 rounded-full bg-[#234E39] text-white text-xs font-semibold hover:bg-[#1C412F] transition-all shadow-subtle flex items-center gap-1.5 self-start sm:self-center shrink-0"
        >
          <Sparkles size={14} />
          <span>+ Compose Reply</span>
        </button>
      </div>

      {/* Split Layout: Conversation Messages on Left / AI Explanation Panel on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Message History & Composer */}
        <div className="lg:col-span-2 space-y-6">
          {/* Thread messages formatted like Zero Inbox timeline */}
          <div className="space-y-4">
            {threadMessages.map((msg, index) => {
              const isOutboundMsg =
                msg.direction === 'OUTBOUND' ||
                msg.isSent === true ||
                /assistant@mailpilot\.io/i.test(msg.sender?.email || '');

              return (
                <React.Fragment key={msg._id}>
                  {/* System activity timeline event if first message */}
                  {index === 0 && (
                    <div className="flex items-center justify-center my-2">
                      <span className="text-[11px] font-medium text-text-secondary bg-[#FAF9F5] border border-border-main/80 px-3.5 py-1 rounded-full shadow-2xs">
                        AI Classified as <strong className="text-[#234E39] font-semibold">{email.classification.replace(/_/g, ' ')}</strong> ({Math.round(email.confidence * 100)}% confidence)
                      </span>
                    </div>
                  )}

                  <div
                    className={`mailpilot-thread-message rounded-3xl border shadow-card p-6 space-y-4 transition-all ${
                      isOutboundMsg
                        ? 'bg-[#FAF9F5] border-[#E5E4DE]'
                        : 'bg-white border-border-main hover:border-[#234E39]/30'
                    }`}
                  >
                    {/* Message Header */}
                    <div className="mailpilot-thread-message-header flex items-start justify-between gap-4 pb-3 border-b border-border-main/60">
                      <div className="mailpilot-thread-sender flex items-center gap-3">
                        <img
                          src={msg.sender.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${msg.sender.name}`}
                          alt=""
                          className="w-10 h-10 rounded-full border border-border-main object-cover shadow-2xs"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-text-primary">{msg.sender.name}</span>
                            <span className="text-[11px] text-text-secondary">&lt;{msg.sender.email}&gt;</span>
                            {isOutboundMsg && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EAF2EC] text-[#234E39] border border-[#D0E2D5]">
                                Assistant Reply
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-text-secondary mt-0.5">
                            To: {msg.recipients.map((r) => r.name).join(', ')}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-medium text-text-secondary shrink-0">
                        {new Date(msg.receivedAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                  {/* Message Body */}
                  <div className="text-xs leading-relaxed text-text-primary whitespace-pre-wrap font-sans">
                    {msg.body}
                  </div>

                  {/* Attachments if any */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="pt-3 border-t border-border-main/60">
                      <p className="text-[11px] font-semibold text-text-secondary mb-2">Attachments ({msg.attachments.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {msg.attachments.map((att, attIdx) => (
                          <div
                            key={attIdx}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FAF9F5] border border-border-main text-xs text-text-primary shadow-2xs"
                          >
                            <Paperclip size={13} className="text-[#234E39]" />
                            <span className="font-medium truncate max-w-[200px]">{att.name}</span>
                            <span className="text-[10px] text-text-secondary">({(att.size / 1024).toFixed(0)} KB)</span>
                            <button
                              title="Download attachment"
                              className="text-text-secondary hover:text-[#234E39] transition-colors ml-1"
                            >
                              <Download size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })}
          </div>

          {/* Working Reply Composer with Zero Inbox Quick Reply Pills */}
          <div className="mailpilot-reply-composer bg-white rounded-3xl border border-border-main shadow-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border-main">
              <h3 className="text-sm font-bold text-text-primary">Reply Composer</h3>

              {/* Tone Selection */}
              <div className="mailpilot-reply-tones flex items-center gap-1.5 text-xs">
                <span className="text-text-secondary text-[11px]">Tone:</span>
                {(['professional', 'friendly', 'concise', 'formal'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setReplyTone(t)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium capitalize transition-all ${
                      replyTone === t
                        ? 'bg-[#234E39] text-white font-semibold shadow-2xs'
                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Reply Pills matching Zero Inbox Reference */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider shrink-0">Quick Reply:</span>
              {[
                "Sounds good!",
                "I'll review and get back shortly.",
                "Approved, please proceed.",
                "Let's schedule a call on this.",
              ].map((pill, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setReplyBody((prev) => (prev ? `${prev}\n\n${pill}` : pill))}
                  className="px-3 py-1 rounded-full bg-[#FAF9F5] hover:bg-[#EAF2EC] text-[#234E39] border border-border-main text-[11px] font-medium whitespace-nowrap transition-all shadow-2xs"
                >
                  {pill}
                </button>
              ))}
            </div>

            {/* To & Subject */}
            <div className="space-y-1.5 text-xs bg-[#FAF9F5] p-3 rounded-2xl border border-border-main">
              <div className="flex items-center gap-2">
                <span className="text-text-secondary w-14 font-medium">To:</span>
                <span className="text-text-primary font-semibold">{email.sender.name} &lt;{email.sender.email}&gt;</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-text-secondary w-14 font-medium">Subject:</span>
                <span className="text-text-primary font-medium">{email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`}</span>
              </div>
            </div>

            {/* Textarea */}
            <textarea
              id="reply-composer-textarea"
              rows={6}
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="Say something or draft your reply here..."
              className="mailpilot-reply-input w-full p-4 rounded-2xl bg-[#FAF9F5] border border-border-main text-xs outline-none focus:border-[#234E39] focus:bg-white transition-all leading-relaxed text-text-primary resize-y"
            />

            {/* Controls Toolbar */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerateAIReply}
                  disabled={generatingAI}
                  className="px-3.5 py-2 rounded-full bg-[#EAF2EC] text-[#234E39] hover:bg-[#234E39] hover:text-white text-xs font-semibold border border-[#D0E2D5] flex items-center gap-1.5 transition-all shadow-2xs"
                >
                  <Sparkles size={13} className={generatingAI ? 'animate-spin' : ''} />
                  <span>{generatingAI ? 'Drafting with AI...' : 'Generate with AI'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyDraft}
                  disabled={!replyBody.trim()}
                  className="px-3.5 py-2 rounded-full bg-white text-text-secondary hover:text-text-primary border border-border-main text-xs font-medium flex items-center gap-1.5 transition-all disabled:opacity-40 shadow-2xs"
                >
                  <Copy size={13} />
                  <span>{copied ? 'Copied!' : 'Copy Draft'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSendModalOpen(true)}
                disabled={!replyBody.trim()}
                className="px-5 py-2 rounded-full bg-[#234E39] text-white hover:bg-[#1C412F] text-xs font-semibold flex items-center gap-2 transition-all shadow-subtle disabled:opacity-40"
              >
                <Send size={13} />
                <span>Send</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Col: AI Explanation & Intelligence Panel */}
        <div className="space-y-6">
          <div className="bg-surface-main rounded-card border border-border-main shadow-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border-main">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-forest-soft text-forest flex items-center justify-center">
                  <Sparkles size={14} />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">AI Explanation Panel</h3>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-bg-secondary text-text-secondary font-semibold">
                {(email.confidence * 100).toFixed(0)}% Confidence
              </span>
            </div>

            {/* Why this classification was chosen */}
            <div>
              <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-1">
                Classification Reasoning
              </p>
              <p className="text-xs text-text-primary leading-relaxed bg-bg-primary p-3 rounded-card border border-border-main">
                {email.classificationReason || 'Analyzed intent, sender role, and decision requirements.'}
              </p>
            </div>

            {/* AI Summary */}
            <div>
              <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-1">
                Executive Summary
              </p>
              <p className="text-xs text-text-primary leading-relaxed">
                {email.aiSummary || email.body.slice(0, 160)}
              </p>
            </div>

            {/* Suggested Action */}
            {email.suggestedAction && (
              <div>
                <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-1">
                  Suggested Action
                </p>
                <div className="p-3 rounded-card bg-forest-soft/40 border border-forest/20 text-xs text-forest leading-relaxed">
                  {email.suggestedAction}
                </div>
              </div>
            )}

            {/* Key Points */}
            {email.keyPoints && email.keyPoints.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Extracted Key Points
                </p>
                <ul className="space-y-1 text-xs text-text-primary">
                  {email.keyPoints.map((pt, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-forest mt-1.5 shrink-0"></span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Extracted Dates */}
            {email.extractedDates && email.extractedDates.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Important Dates Mentioned
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {email.extractedDates.map((dt, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded text-[11px] bg-warm-beige/50 text-text-primary border border-border-main flex items-center gap-1"
                    >
                      <Clock size={11} className="text-text-secondary" />
                      {dt}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Manual Override audit information if applicable */}
            {email.manualOverride?.isOverridden && (
              <div className="p-3 bg-[#FDF6EC] rounded-card border border-[#F3E2C8] text-[11px] text-[#B7833D] space-y-1">
                <p className="font-semibold flex items-center gap-1">
                  <AlertTriangle size={13} />
                  Manual User Override Recorded
                </p>
                <p>
                  Originally classified as <span className="font-mono">{email.manualOverride.previousClassification}</span>.
                </p>
                {email.manualOverride.reason && <p>Reason: {email.manualOverride.reason}</p>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Sending Email */}
      <Modal
        isOpen={sendModalOpen}
        onClose={() => setSendModalOpen(false)}
        title="Approve & Send Email Reply"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-bg-primary rounded-card border border-border-main space-y-1.5">
            <div className="flex justify-between">
              <span className="text-text-secondary">Recipient:</span>
              <span className="font-medium text-text-primary">{email.sender.name} &lt;{email.sender.email}&gt;</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Subject:</span>
              <span className="font-medium text-text-primary">{email.subject}</span>
            </div>
          </div>

          <div>
            <p className="font-semibold text-text-primary mb-1">Message Preview:</p>
            <div className="p-3 bg-bg-primary rounded-card border border-border-main text-xs text-text-primary whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
              {replyBody}
            </div>
          </div>

          <div className="p-3 bg-forest-soft rounded-card border border-forest/20 text-forest text-[11px] flex items-start gap-2">
            <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
            <p>
              Explicit human approval granted. Dispatch will be executed via simulated integration and recorded to audit activity logs.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => setSendModalOpen(false)}
              className="px-3.5 py-2 rounded-card border border-border-main text-text-secondary hover:text-text-primary text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleSendReply}
              disabled={sending}
              className="px-4 py-2 rounded-card bg-forest text-white hover:bg-forest-hover font-medium text-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send size={13} />
              <span>{sending ? 'Dispatching...' : 'Confirm & Send'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
