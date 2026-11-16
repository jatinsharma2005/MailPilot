import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  AlertCircle,
  UserX,
  CheckSquare,
  Clock,
  Calendar,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Inbox,
  ChevronRight,
  RefreshCw,
  ArrowUpRight,
  Plus,
  Users,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { DashboardStats, Email, Task, ActivityLog } from '../../types/index.js';
import { ClassificationBadge } from '../../components/common/ClassificationBadge.js';
import { PriorityBadge } from '../../components/common/PriorityBadge.js';
import { useAuthStore } from '../../store/useAuthStore.js';

export const AssistantDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [priorityEmails, setPriorityEmails] = useState<Email[]>([]);
  const [meetings, setMeetings] = useState<Task[]>([]);
  const [followups, setFollowups] = useState<Task[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, recentRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/recent'),
      ]);
      setStats(statsRes.data.data);
      setPriorityEmails(recentRes.data.data.priorityInbox || []);
      setMeetings(recentRes.data.data.upcomingMeetings || []);
      setFollowups(recentRes.data.data.pendingTasks || []);
      setActivity(recentRes.data.data.recentActivity || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const todayStr = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  return (
    <div className="mailpilot-dashboard-page space-y-8 animate-fadeIn max-w-7xl mx-auto">
      {/* Ambernif Style Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">Dashboard</h1>
          <p className="text-xs text-text-secondary mt-1">
            Plan, prioritize, & accomplish your task with ease
          </p>
          <p className="text-[11px] text-text-secondary/70 mt-0.5">
            Good morning, {user?.name?.split(' ')[0] || 'Sarah'} • {todayStr} • Managing executive communications
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchDashboardData}
            title="Refresh dashboard"
            className="p-2.5 rounded-full bg-surface-main border border-border-main text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-all shadow-subtle"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => navigate('/assistant/emails')}
            className="px-4 py-2 rounded-full bg-[#244A38] text-white text-xs font-semibold hover:bg-[#1B382B] transition-all shadow-subtle flex items-center gap-2"
          >
            <Inbox size={14} />
            <span>Open Inbox</span>
          </button>
        </div>
      </div>

      {/* Ambernif Style Hero 3-Card Metrics Row */}
      <div className="mailpilot-dashboard-metrics grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Total Emails / Total Projects (Dark Forest Hero Card) */}
        <div
          onClick={() => navigate('/assistant/emails')}
          className="p-6 rounded-3xl bg-[#234E39] text-white shadow-ambernif relative overflow-hidden cursor-pointer hover:bg-[#1C412F] transition-all group flex flex-col justify-between min-h-[170px]"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white/80">Total Emails</span>
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-white group-hover:text-[#234E39] transition-all">
              <ArrowUpRight size={17} />
            </div>
          </div>
          <div className="my-3">
            <p className="text-4xl sm:text-5xl font-extrabold tracking-tight">
              {loading ? (
                <span className="inline-block w-16 h-10 bg-white/20 rounded-lg animate-pulse"></span>
              ) : (
                stats?.totalEmails ?? 0
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-[11px] font-medium text-white/95 flex items-center gap-1">
              <span>Synchronized inboxes</span>
            </span>
          </div>
        </div>

        {/* Card 2: Ended Projects / Action Required (Crisp White Card) */}
        <div
          onClick={() => navigate('/assistant/emails?filter=action')}
          className="p-6 rounded-3xl bg-white border border-border-main shadow-card relative cursor-pointer hover:border-[#234E39]/40 transition-all group flex flex-col justify-between min-h-[170px]"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary">Action Required</span>
            <div className="w-8 h-8 rounded-full bg-bg-secondary flex items-center justify-center text-text-primary group-hover:bg-[#234E39] group-hover:text-white transition-all">
              <ArrowUpRight size={17} />
            </div>
          </div>
          <div className="my-3">
            <p className="text-4xl sm:text-5xl font-extrabold tracking-tight text-text-primary">
              {loading ? (
                <span className="inline-block w-16 h-10 bg-bg-secondary rounded-lg animate-pulse"></span>
              ) : (
                stats?.actionRequired ?? 0
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-bg-secondary text-[11px] font-medium text-text-secondary">
              Requires immediate action
            </span>
          </div>
        </div>

        {/* Card 3: Running / Client Attention (Crisp White Card) */}
        <div
          onClick={() => navigate('/assistant/emails?filter=client')}
          className="p-6 rounded-3xl bg-white border border-border-main shadow-card relative cursor-pointer hover:border-[#B7833D]/60 transition-all group flex flex-col justify-between min-h-[170px]"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#B7833D]">Client Attention</span>
            <div className="w-8 h-8 rounded-full bg-[#FDF6EC] flex items-center justify-center text-[#B7833D] group-hover:bg-[#B7833D] group-hover:text-white transition-all">
              <ArrowUpRight size={17} />
            </div>
          </div>
          <div className="my-3">
            <p className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#B7833D]">
              {loading ? (
                <span className="inline-block w-16 h-10 bg-[#FDF6EC] rounded-lg animate-pulse"></span>
              ) : (
                stats?.clientAttention ?? 0
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#FDF6EC] text-[11px] font-medium text-[#B7833D]">
              Requires executive decision
            </span>
          </div>
        </div>
      </div>

      {/* Supporting Metrics Strip (Unread, Assistant to Reply, Waiting) */}
      <div className="mailpilot-supporting-metrics grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div
          onClick={() => navigate('/assistant/emails?filter=unread')}
          className="p-4 rounded-2xl bg-white border border-border-main shadow-subtle flex items-center justify-between cursor-pointer hover:border-[#234E39]/40 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#234E39]"></span>
            <span className="text-xs font-medium text-text-secondary">Unread</span>
          </div>
          <span className="text-xl font-bold text-text-primary">{stats?.unreadEmails ?? 0}</span>
        </div>

        <div
          onClick={() => navigate('/assistant/emails?filter=assistant')}
          className="p-4 rounded-2xl bg-white border border-border-main shadow-subtle flex items-center justify-between cursor-pointer hover:border-[#234E39]/40 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <CheckSquare size={14} className="text-[#234E39]" />
            <span className="text-xs font-medium text-text-secondary">Assistant to Reply</span>
          </div>
          <span className="text-xl font-bold text-text-primary">{stats?.breakdown?.assistantToReply ?? stats?.assistantTasks ?? 0}</span>
        </div>

        <div
          onClick={() => navigate('/assistant/emails?filter=waiting')}
          className="p-4 rounded-2xl bg-white border border-border-main shadow-subtle flex items-center justify-between cursor-pointer hover:border-[#234E39]/40 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Clock size={14} className="text-text-secondary" />
            <span className="text-xs font-medium text-text-secondary">Waiting for Response</span>
          </div>
          <span className="text-xl font-bold text-text-primary">{stats?.waitingForResponse ?? 0}</span>
        </div>
      </div>

      {/* Ambernif Visual Graphic: Project Stats & Project Progress Bar Chart */}
      <div className="mailpilot-project-stats grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Ambernif Project Stats Weekly Capsule Chart */}
        <div className="p-6 rounded-3xl bg-white border border-border-main shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-text-primary">Project Stats</h3>
            <div className="w-7 h-7 rounded-full bg-bg-secondary flex items-center justify-center text-text-secondary">
              <ArrowUpRight size={14} />
            </div>
          </div>

          {/* Capsule pill bars matching the Ambernif reference screenshot */}
          <div className="h-44 flex items-end justify-between px-3 pt-4 pb-2">
            {[
              { day: 'S', height: '55%', type: 'striped' },
              { day: 'M', height: '85%', type: 'solid' },
              { day: 'T', height: '65%', type: 'striped-soft' },
              { day: 'W', height: '100%', type: 'solid' },
              { day: 'T', height: '75%', type: 'striped' },
              { day: 'F', height: '90%', type: 'striped-soft' },
              { day: 'S', height: '45%', type: 'striped' },
            ].map((bar, i) => (
              <div key={i} className="flex flex-col items-center gap-2 h-full justify-end">
                <div
                  style={{ height: bar.height }}
                  className={`w-7 rounded-full transition-all duration-500 hover:scale-105 ${
                    bar.type === 'solid'
                      ? 'bg-[#234E39] shadow-sm'
                      : bar.type === 'striped-soft'
                      ? 'capsule-striped-soft'
                      : 'capsule-striped'
                  }`}
                  title={`${bar.day}: ${bar.height} weekly activity`}
                ></div>
                <span className="text-[11px] font-semibold text-text-secondary">{bar.day}</span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-border-main flex items-center justify-between text-xs text-text-secondary">
            <span>Weekly Communication Volume</span>
            <span className="font-semibold text-[#234E39]">+18.4% this week</span>
          </div>
        </div>

        {/* Right 2 Columns: Project Progress & Connected Inboxes */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white border border-border-main shadow-card flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-text-primary">Project Progress & Active Accounts</h3>
              <p className="text-xs text-text-secondary mt-0.5">Connected client inboxes and active delegates</p>
            </div>
            <button
              onClick={() => navigate('/assistant/accounts')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EAF2EC] text-[#234E39] text-xs font-semibold hover:bg-[#234E39] hover:text-white transition-all"
            >
              <Plus size={13} />
              <span>Add Member</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            <div className="p-3.5 rounded-2xl bg-[#FAF9F5] border border-border-main flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#234E39] text-white flex items-center justify-center font-bold text-xs shadow-subtle">
                  AW
                </div>
                <div>
                  <p className="text-xs font-bold text-text-primary">Alexander Wright</p>
                  <p className="text-[11px] text-text-secondary">Managing Partner • Primary Client</p>
                </div>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EAF2EC] text-[#234E39]">
                Active
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FAF9F5] border border-border-main flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#B7833D] text-white flex items-center justify-center font-bold text-xs shadow-subtle">
                  SJ
                </div>
                <div>
                  <p className="text-xs font-bold text-text-primary">Sarah Jenkins</p>
                  <p className="text-[11px] text-text-secondary">Executive Assistant • Delegated</p>
                </div>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FDF6EC] text-[#B7833D]">
                Online
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-border-main flex items-center justify-between text-xs">
            <span className="text-text-secondary">Operational Synchronization</span>
            <span className="font-semibold text-[#234E39]">100% Up to date</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Priority Inbox & Side Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Priority Inbox */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-text-primary">Priority Inbox</h2>
              <span className="text-[11px] font-medium text-text-secondary bg-bg-secondary px-2 py-0.5 rounded-full">
                AI Filtered
              </span>
            </div>
            <button
              onClick={() => navigate('/assistant/emails')}
              className="text-xs text-forest hover:text-forest-hover font-medium flex items-center gap-1"
            >
              <span>View all emails</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <div className="bg-surface-main rounded-card border border-border-main shadow-card divide-y divide-border-main overflow-hidden">
            {priorityEmails.length === 0 ? (
              <div className="p-8 text-center text-xs text-text-secondary">
                No priority items requiring immediate response.
              </div>
            ) : (
              priorityEmails.map((email) => (
                <div
                  key={email._id}
                  onClick={() => navigate(`/assistant/emails/${email._id}`)}
                  className="p-4 hover:bg-bg-primary/50 transition-colors cursor-pointer flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <img
                      src={email.sender.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${email.sender.name}`}
                      alt=""
                      className="w-8 h-8 rounded-full border border-border-main shrink-0 object-cover mt-0.5"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-text-primary truncate">{email.sender.name}</span>
                        <ClassificationBadge
                          classification={email.classification}
                          emailId={email._id}
                          interactive={true}
                          onClassificationChange={(newClass) => {
                            setPriorityEmails((prev) =>
                              prev.map((item) => (item._id === email._id ? { ...item, classification: newClass } : item))
                            );
                            fetchDashboardData();
                          }}
                        />
                        <PriorityBadge priority={email.priority} />
                      </div>
                      <h4 className="text-xs font-medium text-text-primary mt-1 truncate">{email.subject}</h4>
                      <p className="text-[11px] text-text-secondary mt-0.5 line-clamp-1">
                        {email.aiSummary || email.body}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-text-secondary">
                      {new Date(email.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <ChevronRight size={14} className="text-text-secondary ml-auto mt-2" />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Extracted Upcoming Meetings Section */}
          <div className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar size={15} className="text-forest" />
                <h3 className="text-sm font-semibold text-text-primary">Upcoming Meetings (Extracted by AI)</h3>
              </div>
              <button
                onClick={() => navigate('/assistant/tasks?tab=meetings')}
                className="text-xs text-forest hover:underline"
              >
                Calendar View
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {meetings.length === 0 ? (
                <div className="col-span-2 p-6 bg-surface-main rounded-card border border-border-main text-center text-xs text-text-secondary">
                  No upcoming meetings extracted from conversations.
                </div>
              ) : (
                meetings.map((m) => (
                  <div key={m._id} className="p-3.5 bg-surface-main rounded-card border border-border-main shadow-subtle">
                    <div className="flex items-center justify-between text-xs font-semibold text-text-primary">
                      <span className="truncate">{m.meetingDetails?.title || m.title}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-forest-soft text-forest font-mono">
                        CONFIRMED
                      </span>
                    </div>
                    <p className="text-xs text-forest font-medium mt-1">
                      {m.meetingDetails?.date} • {m.meetingDetails?.time}
                    </p>
                    <p className="text-[11px] text-text-secondary mt-1">
                      Participants: {m.meetingDetails?.participants?.join(', ') || 'Alexander Wright'}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Pending Follow-ups & AI Activity Log */}
        <div className="space-y-6">
          {/* Pending Follow-ups */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckSquare size={15} className="text-forest" />
                <h3 className="text-sm font-semibold text-text-primary">Pending Follow-ups</h3>
              </div>
              <button
                onClick={() => navigate('/assistant/tasks?tab=tasks')}
                className="text-xs text-forest hover:underline"
              >
                Manage
              </button>
            </div>

            <div className="bg-surface-main rounded-card border border-border-main shadow-card p-3 space-y-2.5">
              {followups.length === 0 ? (
                <p className="text-xs text-text-secondary text-center py-4">No pending follow-ups.</p>
              ) : (
                followups.map((t) => (
                  <div
                    key={t._id}
                    className="p-2.5 rounded-card bg-bg-primary border border-border-main text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-text-primary truncate">{t.title}</span>
                      <span className="text-[10px] text-text-secondary">
                        {t.dueDate ? new Date(t.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Soon'}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-secondary line-clamp-1">{t.description}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* AI Activity Stream */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={15} className="text-forest" />
              <h3 className="text-sm font-semibold text-text-primary">Recent AI & Assistant Activity</h3>
            </div>

            <div className="bg-surface-main rounded-card border border-border-main shadow-card p-4 space-y-3.5">
              {activity.length === 0 ? (
                <p className="text-xs text-text-secondary text-center py-4">No recent activity.</p>
              ) : (
                activity.map((act) => (
                  <div key={act._id} className="flex items-start gap-2.5 text-xs">
                    <div className="w-2 h-2 rounded-full bg-forest mt-1.5 shrink-0"></div>
                    <div className="min-w-0">
                      <p className="text-text-primary text-[11px] leading-relaxed">{act.description}</p>
                      <p className="text-[10px] text-text-secondary mt-0.5">
                        {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
