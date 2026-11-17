import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Search,
  Star,
  Mail,
  Archive,
  CheckCircle2,
  Paperclip,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  Send,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Copy,
  AlertCircle,
  Inbox,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  User,
  Users,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { Email, ClassificationType } from '../../types/index.js';
import { ClassificationBadge } from '../../components/common/ClassificationBadge.js';
import { PriorityBadge } from '../../components/common/PriorityBadge.js';
import { Modal } from '../../components/common/Modal.js';

export const EmailManagement: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Selected email state synchronized with URL where available
  const urlSelectedId = searchParams.get('id');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(urlSelectedId);
  const [threadMessages, setThreadMessages] = useState<Email[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);
  const readingPaneRef = useRef<HTMLDivElement>(null);

  // Mobile detail view toggle
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const activeFilter = searchParams.get('filter') || 'all';
  const activeSearch = searchParams.get('search') || '';
  const normalizedActiveFilter = activeFilter === 'archive' ? 'archived' : activeFilter;
  const [searchInput, setSearchInput] = useState(activeSearch);

  // Reply Composer State inside split pane
  const [replyBody, setReplyBody] = useState('');
  const [replyTone, setReplyTone] = useState<'professional' | 'friendly' | 'concise' | 'formal'>('professional');
  const [generatingAI, setGeneratingAI] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  // Filter tabs specified in assignment requirements including Sent
  const filterTabs = [
    { id: 'all', label: 'All Inbox' },
    { id: 'unread', label: 'Unread' },
    { id: 'important', label: 'Important' },
    { id: 'assistant', label: 'Assistant to Reply' },
    { id: 'client', label: 'Client to Reply' },
    { id: 'needs_review', label: 'Needs Review' },
    { id: 'no_reply', label: 'No Reply Needed' },
    { id: 'sent', label: 'Sent' },
    { id: 'action', label: 'Action Required' },
    { id: 'waiting', label: 'Waiting for Response' },
    { id: 'meetings', label: 'Meetings' },
    { id: 'general', label: 'General' },
    { id: 'archived', label: 'Archived' },
  ];

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {
        page: page.toString(),
        limit: '20',
      };
      if (normalizedActiveFilter === 'archived') {
        params.filter = 'archived';
      } else if (normalizedActiveFilter !== 'all') {
        params.filter = normalizedActiveFilter;
      }
      if (activeSearch) params.search = activeSearch;

      const res = await api.get('/emails', { params });
      const fetched: Email[] = res.data?.data || [];
      setEmails(fetched);
      setTotalPages(res.data?.pagination?.totalPages || 1);
      setTotalCount(res.data?.pagination?.total || 0);

      // Default select the first email or keep existing valid selection
      if (fetched.length > 0) {
        if (!selectedEmailId || !fetched.some((e) => e._id === selectedEmailId || e.conversationId === selectedEmailId)) {
          setSelectedEmailId(fetched[0]._id);
        }
      } else {
        setSelectedEmailId(null);
      }
    } catch (err: any) {
      console.error('Error fetching emails:', err);
      setError(err?.response?.data?.message || 'Unable to load emails. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [normalizedActiveFilter, activeSearch, page]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  // Selected conversation scroll position management
  const prevSelectedIdRef = useRef<string | null>(null);
  const scrolledOnLoadRef = useRef<string | null>(null);

  // 1. Immediately reset detail panel scroll to top when user selects a different conversation
  useEffect(() => {
    if (selectedEmailId && selectedEmailId !== prevSelectedIdRef.current) {
      prevSelectedIdRef.current = selectedEmailId;
      if (readingPaneRef.current) {
        readingPaneRef.current.scrollTo({
          top: 0,
          behavior: 'instant' as ScrollBehavior,
        });
      }
    }
  }, [selectedEmailId]);

  // 2. When newly selected conversation finishes fetching thread messages, ensure it stays at top: 0
  useEffect(() => {
    if (selectedEmailId && !threadLoading && scrolledOnLoadRef.current !== selectedEmailId) {
      scrolledOnLoadRef.current = selectedEmailId;
      if (readingPaneRef.current) {
        readingPaneRef.current.scrollTo({
          top: 0,
          behavior: 'instant' as ScrollBehavior,
        });
      }
    }
  }, [selectedEmailId, threadLoading]);

  useEffect(() => {
    if (!selectedEmailId) {
      setThreadMessages([]);
      return;
    }

    let isMounted = true;
    setThreadLoading(true);
    api
      .get(`/emails/${selectedEmailId}`)
      .then((res) => {
        if (!isMounted) return;
        const messages: Email[] = res.data?.data?.threadMessages || [];
        setThreadMessages(messages);
        if (messages.length > 0) {
          // Default expand the latest message in thread
          setExpandedMessageId(messages[messages.length - 1]._id);
        }
      })
      .catch((err) => {
        console.error('Error loading thread messages:', err);
      })
      .finally(() => {
        if (isMounted) setThreadLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedEmailId]);

  // Debounced search input handler
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchInput !== activeSearch) {
        setSearchParams((prev) => {
          if (searchInput.trim()) {
            prev.set('search', searchInput.trim());
          } else {
            prev.delete('search');
          }
          prev.set('page', '1');
          return prev;
        });
        setPage(1);
      }
    }, 350);

    return () => clearTimeout(handler);
  }, [searchInput, activeSearch, setSearchParams]);

  const handleFilterClick = (filterId: string) => {
    setSearchParams((prev) => {
      if (filterId === 'all') {
        prev.delete('filter');
      } else {
        prev.set('filter', filterId === 'archived' ? 'archived' : filterId);
      }
      prev.set('page', '1');
      return prev;
    });
    setPage(1);
  };

  const handleSelectEmail = (email: Email) => {
    setSelectedEmailId(email._id);
    setMobileDetailOpen(true);
    if (email.suggestedReply) {
      setReplyBody(email.suggestedReply);
    } else {
      setReplyBody('');
    }
  };

  const handleToggleStar = async (e: React.MouseEvent, email: Email) => {
    e.stopPropagation();
    setEmails((prev) =>
      prev.map((item) => (item._id === email._id ? { ...item, isImportant: !item.isImportant } : item))
    );
    try {
      await api.patch(`/emails/${email._id}/important`);
    } catch {
      setEmails((prev) =>
        prev.map((item) => (item._id === email._id ? { ...item, isImportant: email.isImportant } : item))
      );
    }
  };

  const handleToggleRead = async (e: React.MouseEvent, email: Email) => {
    e.stopPropagation();
    setEmails((prev) =>
      prev.map((item) => (item._id === email._id ? { ...item, isRead: !item.isRead } : item))
    );
    try {
      await api.patch(`/emails/${email._id}/read`);
    } catch {
      setEmails((prev) =>
        prev.map((item) => (item._id === email._id ? { ...item, isRead: email.isRead } : item))
      );
    }
  };

  const handleArchive = async (e: React.MouseEvent, emailId: string) => {
    e.stopPropagation();
    setEmails((prev) => prev.filter((item) => item._id !== emailId));
    try {
      await api.patch(`/emails/${emailId}/archive`);
    } catch {
      fetchEmails();
    }
  };

  const handleGenerateAIReply = async () => {
    if (!selectedEmail) return;
    setGeneratingAI(true);
    try {
      const res = await api.post(`/ai/generate-reply/${selectedEmail.conversationId}`, {
        tone: replyTone,
      });
      setReplyBody(res.data.data.reply);
    } catch (err) {
      console.error('Failed to generate AI reply:', err);
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleCopyDraft = () => {
    if (!replyBody) return;
    navigator.clipboard.writeText(replyBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmSendReply = async () => {
    if (!selectedEmail || !replyBody.trim()) return;
    setSending(true);
    try {
      const res = await api.post(`/emails/${selectedEmail._id}/reply`, {
        to: selectedEmail.sender?.email || 'client@mailpilot.io',
        subject: selectedEmail.subject,
        body: replyBody,
        tone: replyTone,
        isSimulated: true,
        isApproved: true,
      });

      const newOutboundEmail: Email = res.data.data;
      setSendModalOpen(false);
      setReplyBody('');

      // Append new message to local thread
      setThreadMessages((prev) => [...prev, newOutboundEmail]);
      setExpandedMessageId(newOutboundEmail._id);

      // Update email row in list (update snippet to "You: ...", increment messageCount, keep conversation intact)
      setEmails((prev) =>
        prev.map((item) => {
          if (item._id === selectedEmail._id || item.conversationId === selectedEmail.conversationId) {
            return {
              ...item,
              snippet: `You: ${replyBody.slice(0, 100)}`,
              messageCount: (item.messageCount || 1) + 1,
              lastMessageAt: new Date().toISOString(),
              receivedAt: new Date().toISOString(),
              direction: 'OUTBOUND',
              hasOutbound: true,
            };
          }
          return item;
        })
      );
    } catch (err) {
      console.error('Failed to send reply:', err);
    } finally {
      setSending(false);
    }
  };

  const selectedEmail = emails.find(
    (e) => e._id === selectedEmailId || e.conversationId === selectedEmailId
  );

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="mailpilot-inbox-page space-y-5 animate-fadeIn max-w-7xl mx-auto pb-12">
      {/* Top Header & Search Bar matching Visual Reference 2 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border-main/70">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-text-primary">Inbox</h1>
          <p className="text-xs text-text-secondary mt-0.5">
            {totalCount} conversation{totalCount === 1 ? '' : 's'} • Grouped by communication thread
          </p>
        </div>

        {/* Search mail bar with "/" keyboard shortcut */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary/70"
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search mail, sender, or subject..."
              className="w-full pl-9 pr-8 py-2 rounded-full bg-white border border-border-main text-xs outline-none focus:border-[#234E39] focus:ring-1 focus:ring-[#234E39]/30 transition-all shadow-subtle text-text-primary placeholder:text-text-secondary/60"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-bg-secondary text-[10px] text-text-secondary font-mono border border-border-main/50 pointer-events-none">
              /
            </span>
          </div>

          <button
            onClick={fetchEmails}
            title="Refresh conversations"
            className="p-2 rounded-full bg-white border border-border-main text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors shadow-subtle"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Pill Filter Tabs matching Zero Inbox Visual Reference */}
      <div className="mailpilot-filter-tabs flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-b border-border-main/70 text-xs">
        {filterTabs.map((tab) => {
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleFilterClick(tab.id)}
              className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                isActive
                  ? 'bg-[#234E39] text-white font-semibold shadow-subtle'
                  : 'bg-white text-text-secondary hover:text-text-primary border border-border-main'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Error State with Retry Button */}
      {error && (
        <div className="p-4 bg-[#FBEBE9] border border-[#F5D5D1] rounded-2xl flex items-center justify-between text-xs text-[#B75C52]">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchEmails}
            className="px-3 py-1 bg-white text-[#B75C52] border border-[#F5D5D1] rounded-full font-semibold hover:bg-[#FAF9F5] transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Dual-Pane Layout (Conversation List + Thread Reading Pane) */}
      <div className="mailpilot-inbox-layout grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch h-full min-h-0 flex-1 overflow-hidden">
        {/* Left Column (5 Cols on LG): Gmail-Style Conversation Rows */}
        <div
          className={`mailpilot-conversation-list lg:col-span-5 h-full min-h-0 min-w-0 bg-white rounded-3xl border border-border-main shadow-card divide-y divide-border-main/60 overflow-y-auto overflow-x-hidden overscroll-y-contain ${
            mobileDetailOpen ? 'hidden lg:block' : 'block'
          }`}
          tabIndex={0}
          aria-label="Conversation list"
        >
          {loading ? (
            // Skeleton Loading Rows
            <div className="divide-y divide-border-main/50 p-2 space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="p-3.5 flex items-start gap-3 animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-bg-secondary shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between">
                      <div className="h-3 w-28 bg-bg-secondary rounded" />
                      <div className="h-2.5 w-12 bg-bg-secondary rounded" />
                    </div>
                    <div className="h-3 w-44 bg-bg-secondary rounded" />
                    <div className="h-2.5 w-56 bg-bg-secondary rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : emails.length === 0 ? (
            // Empty State
            <div className="p-12 text-center text-xs text-text-secondary space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#EAF2EC] text-[#234E39] flex items-center justify-center mx-auto shadow-subtle">
                <Inbox size={22} />
              </div>
              <p className="font-semibold text-text-primary text-sm">No conversations found</p>
              <p className="text-[11px] max-w-xs mx-auto">
                No conversation threads match your current filter or search criteria.
              </p>
              {activeFilter !== 'all' && (
                <button
                  onClick={() => handleFilterClick('all')}
                  className="px-3.5 py-1.5 rounded-full bg-[#234E39] text-white font-semibold text-xs hover:bg-[#1B3D2D] transition-all"
                >
                  View All Inbox
                </button>
              )}
            </div>
          ) : (
            emails.map((email) => {
              const isSelected =
                selectedEmail?._id === email._id || selectedEmail?.conversationId === email.conversationId;
              const senderName = email.sender?.name || 'Unknown Sender';
              const avatarUrl =
                email.sender?.avatar ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(senderName)}`;

              // Format participant list: e.g. "Marcus Vance, You" or "Marcus Vance, Sarah Jenkins"
              const displayParticipants =
                email.participants && email.participants.length > 0
                  ? email.participants.slice(0, 3).join(', ') +
                    (email.participants.length > 3 ? ` +${email.participants.length - 3}` : '')
                  : senderName;

              const isOutbound =
                email.direction === 'OUTBOUND' || (email.snippet && email.snippet.startsWith('You:'));

              return (
                <div
                  key={email._id}
                  onClick={() => handleSelectEmail(email)}
                  onDoubleClick={() => navigate(`/assistant/emails/${email._id}`)}
                  className={`mailpilot-conversation-row group p-4 hover:bg-[#FAF9F5] transition-all cursor-pointer flex items-start gap-3 text-xs relative ${
                    isSelected ? 'bg-[#FAF9F5] border-l-4 border-[#234E39]' : ''
                  } ${!email.isRead ? 'font-semibold' : ''}`}
                >
                  {/* Sender Avatar */}
                  <img
                    src={avatarUrl}
                    alt=""
                    className="w-9 h-9 rounded-full border border-border-main shrink-0 object-cover mt-0.5 shadow-2xs"
                  />

                  {/* Conversation Row Content */}
                  <div className="min-w-0 flex-1">
                    {/* Row 1: Participants + Message Count + Timestamp */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs font-bold text-text-primary truncate">
                          {displayParticipants}
                        </span>
                        {email.messageCount && email.messageCount > 1 && (
                          <span className="px-1.5 py-0.2 rounded-full bg-[#EAF2EC] text-[#234E39] text-[10px] font-bold border border-[#D0E2D5] shrink-0">
                            {email.messageCount}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-text-secondary shrink-0 font-normal">
                        {formatTime(email.receivedAt)}
                      </span>
                    </div>

                    {/* Row 2: Subject */}
                    <p className="text-xs font-bold text-text-primary truncate mt-0.5">
                      {email.subject || '(No Subject)'}
                    </p>

                    {/* Row 3: Snippet with "You: " prefix for outbound replies */}
                    <p className="text-[11px] text-text-secondary line-clamp-1 mt-0.5 font-normal">
                      {isOutbound ? (
                        <span>
                          <strong className="text-text-primary font-semibold">You: </strong>
                          {(email.snippet || email.body || '').replace(/^You:\s*/, '').slice(0, 80)}
                        </span>
                      ) : (
                        email.snippet || email.aiSummary || (email.body || '').slice(0, 80)
                      )}
                    </p>

                    {/* Row 4: Interactive Classification Badge + Badges */}
                    <div className="flex items-center gap-2 mt-2">
                      <ClassificationBadge
                        classification={email.classification}
                        emailId={email._id}
                        interactive={true}
                        onClassificationChange={(newClass) => {
                          setEmails((prev) =>
                            prev.map((item) =>
                              item._id === email._id || item.conversationId === email.conversationId
                                ? { ...item, classification: newClass }
                                : item
                            )
                          );
                        }}
                      />
                      {email.isImportant && (
                        <Star size={12} className="fill-[#C28A35] text-[#C28A35] shrink-0" />
                      )}
                      {!email.isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#234E39] shrink-0" />
                      )}
                    </div>
                  </div>

                  {/* Quick actions on hover */}
                  <div className="flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleToggleStar(e, email)}
                      title="Star email"
                      className="p-1 text-text-secondary hover:text-[#C28A35]"
                    >
                      <Star
                        size={13}
                        className={email.isImportant ? 'fill-[#C28A35] text-[#C28A35]' : ''}
                      />
                    </button>
                    <button
                      onClick={(e) => handleArchive(e, email._id)}
                      title="Archive"
                      className="p-1 text-text-secondary hover:text-text-primary"
                    >
                      <Archive size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-3 text-xs text-text-secondary border-t border-border-main">
              <span>
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  className="p-1 rounded-full border border-border-main bg-white disabled:opacity-40 hover:bg-bg-secondary"
                >
                  <ChevronLeft size={13} />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page === totalPages}
                  className="p-1 rounded-full border border-border-main bg-white disabled:opacity-40 hover:bg-bg-secondary"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (7 Cols on LG): Reading Pane matching Email Management Reference */}
        <div
          className={`mailpilot-reading-pane lg:col-span-7 flex-col min-h-0 min-w-0 bg-white rounded-3xl border border-border-main shadow-card overflow-hidden ${
            mobileDetailOpen ? 'flex' : 'hidden lg:flex'
          }`}
          tabIndex={0}
          aria-label="Selected conversation details"
        >
          {/* Fixed Header / Action Toolbar */}
          <div className="mailpilot-reading-header flex-shrink-0 px-6 sm:px-7 py-3.5 border-b border-border-main/70 bg-white z-10">
            {/* Mobile Back Button */}
            <div className="lg:hidden pb-2.5 border-b border-border-main/50 mb-2.5">
              <button
                onClick={() => setMobileDetailOpen(false)}
                className="mailpilot-back-btn flex items-center gap-1.5 text-xs font-semibold text-[#234E39]"
              >
                <ArrowLeft size={14} />
                <span>Back to Inbox</span>
              </button>
            </div>

            {selectedEmail ? (
              <div className="mailpilot-reading-toolbar flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    onClick={() => navigate(`/assistant/emails/${selectedEmail._id}`)}
                    title="Open full conversation thread"
                    className="p-2 rounded-full hover:bg-bg-secondary text-text-secondary hover:text-text-primary transition-colors border border-border-main/60"
                  >
                    <ExternalLink size={14} />
                  </button>
                  <button
                    onClick={(e) => handleArchive(e, selectedEmail._id)}
                    title="Archive"
                    className="p-2 rounded-full hover:bg-bg-secondary text-text-secondary hover:text-text-primary transition-colors border border-border-main/60"
                  >
                    <Archive size={14} />
                  </button>
                  <button
                    onClick={(e) => handleToggleStar(e, selectedEmail)}
                    title="Star"
                    className="p-2 rounded-full hover:bg-bg-secondary text-text-secondary hover:text-[#C28A35] transition-colors border border-border-main/60"
                  >
                    <Star
                      size={14}
                      className={selectedEmail.isImportant ? 'fill-[#C28A35] text-[#C28A35]' : ''}
                    />
                  </button>
                  <button
                    onClick={(e) => handleToggleRead(e, selectedEmail)}
                    title="Mark unread"
                    className="p-2 rounded-full hover:bg-bg-secondary text-text-secondary hover:text-text-primary transition-colors border border-border-main/60"
                  >
                    <Mail size={14} />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {/* Interactive Classification Dropdown in Reading Pane */}
                  <ClassificationBadge
                    classification={selectedEmail.classification}
                    emailId={selectedEmail._id}
                    interactive={true}
                    dropdownAlign="right"
                    onClassificationChange={(newClass) => {
                      setEmails((prev) =>
                        prev.map((item) =>
                          item._id === selectedEmail._id || item.conversationId === selectedEmail.conversationId
                            ? { ...item, classification: newClass }
                            : item
                        )
                      );
                    }}
                  />
                  <PriorityBadge priority={selectedEmail.priority} />
                </div>
              </div>
            ) : (
              <div className="text-xs text-text-secondary font-medium">
                No conversation selected
              </div>
            )}
          </div>

          {/* Independently Scrollable Content */}
          <div
            ref={readingPaneRef}
            className="mailpilot-reading-scroll flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden overscroll-y-contain p-6 sm:p-7 space-y-6"
          >
            {selectedEmail ? (
              <>
                {/* Large Subject Title with Star */}
                <div>
                  <h2 className="mailpilot-reading-subject text-xl font-extrabold text-text-primary flex items-center gap-2">
                    <span>{selectedEmail.subject || '(No Subject)'}</span>
                    {selectedEmail.isImportant && (
                      <span className="text-[#C28A35] text-lg">★</span>
                    )}
                  </h2>
                  {threadMessages.length > 1 && (
                    <p className="text-[11px] text-text-secondary mt-1">
                      {threadMessages.length} messages in this thread
                    </p>
                  )}
                </div>
              {/* Chronological Message History in Thread */}
              <div className="space-y-3">
                {threadLoading ? (
                  <div className="p-6 text-center text-xs text-text-secondary animate-pulse">
                    Loading conversation messages...
                  </div>
                ) : threadMessages.length > 0 ? (
                  threadMessages.map((msg, idx) => {
                    const isLatest = idx === threadMessages.length - 1;
                    const isExpanded = expandedMessageId === msg._id || isLatest;
                    const isOutboundMsg =
                      msg.direction === 'OUTBOUND' || msg.isSent === true || /assistant@mailpilot\.io/i.test(msg.sender?.email || '');

                    return (
                      <div
                        key={msg._id}
                        className={`rounded-2xl border transition-all ${
                          isOutboundMsg
                            ? 'bg-[#FAF9F5] border-[#E5E4DE]'
                            : 'bg-white border-border-main'
                        } ${isLatest ? 'ring-1 ring-[#234E39]/20 shadow-2xs' : ''}`}
                      >
                        {/* Collapsible Header */}
                        <div
                          onClick={() => setExpandedMessageId(isExpanded ? null : msg._id)}
                          className="mailpilot-inbox-message-header flex items-center justify-between p-3.5 cursor-pointer hover:bg-black/[0.02] rounded-2xl transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={
                                msg.sender?.avatar ||
                                `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                                  msg.sender?.name || 'Sender'
                                )}`
                              }
                              alt=""
                              className="w-8 h-8 rounded-full border border-border-main object-cover shadow-2xs shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-text-primary truncate">
                                  {msg.sender?.name || 'Unknown'}
                                </span>
                                {isOutboundMsg && (
                                  <span className="px-2 py-0.2 rounded-full text-[10px] font-semibold bg-[#EAF2EC] text-[#234E39] border border-[#D0E2D5]">
                                    Assistant Reply
                                  </span>
                                )}
                              </div>
                              {!isExpanded && (
                                <p className="text-[11px] text-text-secondary truncate mt-0.5">
                                  {(msg.body || '').slice(0, 60)}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] text-text-secondary font-medium">
                              {formatDate(msg.receivedAt)} {formatTime(msg.receivedAt)}
                            </span>
                            {isExpanded ? (
                              <ChevronUp size={14} className="text-text-secondary" />
                            ) : (
                              <ChevronDown size={14} className="text-text-secondary" />
                            )}
                          </div>
                        </div>

                        {/* Expanded Message Body */}
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-1 border-t border-border-main/50 text-xs text-text-primary leading-relaxed whitespace-pre-wrap font-sans">
                            {msg.body || '(Empty body)'}

                            {/* Attachments if any */}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-border-main/50 flex flex-wrap gap-2">
                                {msg.attachments.map((att, aIdx) => (
                                  <div
                                    key={aIdx}
                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-border-main text-[11px]"
                                  >
                                    <Paperclip size={11} className="text-[#234E39]" />
                                    <span>{att.name}</span>
                                    <span className="text-text-secondary">
                                      ({(att.size / 1024).toFixed(0)} KB)
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  // Single Message Fallback
                  <div className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap font-sans bg-[#FAF9F5] p-5 rounded-2xl border border-border-main/70">
                    {selectedEmail.body || '(Empty body)'}
                  </div>
                )}
              </div>

              {/* AI Summary Card */}
              <div className="p-4 rounded-2xl bg-[#EAF2EC] border border-[#D0E2D5] space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[#234E39] font-bold text-[11px] uppercase tracking-wider">
                    <Sparkles size={13} />
                    <span>AI Executive Summary</span>
                  </div>
                  {selectedEmail.confidence !== undefined && (
                    <span className="text-[10px] font-mono text-[#234E39] font-semibold bg-white px-2 py-0.5 rounded-full border border-[#D0E2D5]">
                      {Math.round(selectedEmail.confidence * 100)}% Confidence
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-primary leading-relaxed">
                  {selectedEmail.aiSummary || (selectedEmail.body || '').slice(0, 150)}
                </p>
                {selectedEmail.classificationReason && (
                  <p className="text-[11px] text-[#234E39] pt-1 border-t border-[#D0E2D5]/70">
                    <strong>Reason: </strong> {selectedEmail.classificationReason}
                  </p>
                )}
                {selectedEmail.suggestedAction && (
                  <p className="text-[11px] text-[#234E39]">
                    <strong>Suggested Action: </strong> {selectedEmail.suggestedAction}
                  </p>
                )}
              </div>

              {/* Quick Reply Composer Section */}
              <div className="mailpilot-reply-composer p-4 rounded-2xl bg-white border border-border-main space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-text-primary">Draft a Quick Reply</h3>
                  <div className="mailpilot-reply-tones flex items-center gap-1">
                    {(['professional', 'friendly', 'concise', 'formal'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setReplyTone(t)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize transition-all ${
                          replyTone === t
                            ? 'bg-[#234E39] text-white font-semibold'
                            : 'text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  rows={3}
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder="Draft an email reply here or generate using AI..."
                  className="mailpilot-reply-input w-full p-3 rounded-xl bg-[#FAF9F5] border border-border-main text-xs outline-none focus:border-[#234E39] transition-all resize-y"
                />

                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleGenerateAIReply}
                      disabled={generatingAI}
                      className="px-3 py-1.5 rounded-full bg-[#EAF2EC] text-[#234E39] hover:bg-[#234E39] hover:text-white text-xs font-semibold border border-[#D0E2D5] flex items-center gap-1.5 transition-all shadow-2xs"
                    >
                      <Sparkles size={12} className={generatingAI ? 'animate-spin' : ''} />
                      <span>{generatingAI ? 'Drafting...' : 'AI Draft'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyDraft}
                      disabled={!replyBody.trim()}
                      className="px-3 py-1.5 rounded-full bg-white text-text-secondary hover:text-text-primary border border-border-main text-xs font-medium flex items-center gap-1 transition-all disabled:opacity-40"
                    >
                      <Copy size={12} />
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSendModalOpen(true)}
                      disabled={!replyBody.trim()}
                      className="px-4 py-1.5 rounded-full bg-[#234E39] text-white hover:bg-[#1B3D2D] text-xs font-semibold flex items-center gap-1.5 transition-all shadow-subtle disabled:opacity-40"
                    >
                      <Send size={12} />
                      <span>Send Reply</span>
                    </button>

                    <button
                      onClick={() => navigate(`/assistant/emails/${selectedEmail._id}`)}
                      className="px-3 py-1.5 rounded-full bg-bg-secondary text-text-primary hover:bg-[#FAF9F5] text-xs font-semibold border border-border-main flex items-center gap-1 transition-all"
                    >
                      <span>Full Thread</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="p-16 text-center text-xs text-text-secondary space-y-2">
              <Mail size={24} className="mx-auto text-text-secondary/50" />
              <p className="font-semibold text-text-primary">No email selected</p>
              <p className="text-[11px]">Select a conversation from the left to read and reply.</p>
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Sending Email (Human-in-the-Loop Validation) */}
      {selectedEmail && (
        <Modal
          isOpen={sendModalOpen}
          onClose={() => setSendModalOpen(false)}
          title="Approve & Send Email Reply"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-[#FAF9F5] rounded-2xl border border-border-main space-y-1.5">
              <p className="text-text-secondary">
                <strong>To:</strong> {selectedEmail.sender?.name} &lt;{selectedEmail.sender?.email}&gt;
              </p>
              <p className="text-text-secondary">
                <strong>Subject:</strong> {selectedEmail.subject.startsWith('Re:') ? selectedEmail.subject : `Re: ${selectedEmail.subject}`}
              </p>
              <p className="text-text-secondary">
                <strong>Tone:</strong> <span className="capitalize">{replyTone}</span>
              </p>
            </div>

            <div className="p-3.5 bg-white border border-border-main rounded-2xl font-mono text-[11px] leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
              {replyBody}
            </div>

            <div className="p-3 bg-[#EAF2EC] border border-[#D0E2D5] rounded-2xl flex items-start gap-2 text-[#234E39]">
              <ShieldAlert size={15} className="shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <strong>Human-in-the-Loop Verification:</strong>
                <p>
                  By approving, this message will be dispatched via your simulated provider and added to the conversation thread.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSendModalOpen(false)}
                className="px-4 py-2 rounded-full border border-border-main hover:bg-bg-secondary font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSendReply}
                disabled={sending}
                className="px-5 py-2 rounded-full bg-[#234E39] text-white font-semibold hover:bg-[#1B3D2D] transition-all flex items-center gap-1.5 shadow-subtle disabled:opacity-50"
              >
                {sending ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" />
                    <span>Dispatching...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={13} />
                    <span>Approve & Dispatch</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
