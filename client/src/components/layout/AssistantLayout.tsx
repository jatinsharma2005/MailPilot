import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Mail,
  UserCheck,
  UserX,
  AlertCircle,
  CheckCircle2,
  Star,
  Clock,
  Calendar,
  CheckSquare,
  KeyRound,
  Settings,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Search,
  ExternalLink,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore.js';
import { AskAIDrawer } from '../common/AskAIDrawer.js';

export const AssistantLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isInboxRoute = pathname === '/assistant/emails';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const navItems = [
    { label: 'Overview', to: '/assistant/dashboard', icon: LayoutDashboard },
    { label: 'All Emails', to: '/assistant/emails', icon: Mail },
    { label: 'Action Required', to: '/assistant/emails?filter=action', icon: AlertCircle },
    { label: 'Assistant to Reply', to: '/assistant/emails?filter=assistant', icon: UserCheck },
    { label: 'Client to Reply', to: '/assistant/emails?filter=client', icon: UserX, badgeColor: 'bg-[#FDF6EC] text-[#B7833D]' },
    { label: 'Needs Review', to: '/assistant/emails?filter=needs_review', icon: AlertCircle, badgeColor: 'bg-[#FBEBE9] text-[#B75C52]' },
    { label: 'No Reply Needed', to: '/assistant/emails?filter=no_reply', icon: CheckCircle2 },
    { label: 'Important', to: '/assistant/emails?filter=important', icon: Star },
    { label: 'Waiting for Response', to: '/assistant/emails?filter=waiting', icon: Clock },
    { label: 'Meetings & Calendar', to: '/assistant/tasks?tab=meetings', icon: Calendar },
    { label: 'Tasks & Follow-ups', to: '/assistant/tasks?tab=tasks', icon: CheckSquare },
  ];

  const generalItems = [
    { label: 'Connected Accounts', to: '/assistant/accounts', icon: KeyRound },
    { label: 'Settings', to: '/assistant/settings', icon: Settings },
  ];

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/assistant/emails?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div
      className={`mailpilot-assistant-layout flex min-h-screen bg-bg-primary text-text-primary font-sans ${
        isInboxRoute ? 'mailpilot-inbox-shell' : ''
      }`}
    >
      {/* Desktop Sidebar */}
      <aside className="mailpilot-assistant-sidebar hidden lg:flex w-64 flex-col border-r border-border-main bg-bg-primary shrink-0 select-none">
        {/* Brand Header */}
        <div className="mailpilot-assistant-sidebar-header h-16 shrink-0 flex items-center px-6 border-b border-border-main">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#244A38] flex items-center justify-center text-white font-bold text-sm shadow-subtle">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-text-primary">MailPilot</span>
              <span className="ml-1.5 text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-full bg-[#EAF2EC] text-[#244A38]">PRO</span>
            </div>
          </div>
        </div>

        {/* Workspace Selector */}
        <div className="mailpilot-assistant-sidebar-workspace shrink-0 p-3 border-b border-border-main bg-bg-secondary/40">
          <div className="flex items-center justify-between p-2 rounded-card bg-surface-main border border-border-main shadow-subtle text-xs">
            <div className="truncate">
              <p className="text-[10px] text-text-secondary uppercase tracking-wider font-semibold">Active Workspace</p>
              <p className="font-medium text-text-primary truncate">{user?.workspaceName || 'Acme Executive Group'}</p>
            </div>
            <ChevronDown size={14} className="text-text-secondary shrink-0 ml-1" />
          </div>
        </div>

        {/* Navigation Links */}
        <div className="mailpilot-assistant-sidebar-navigation flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-6">
          <div>
            <p className="px-3 mb-2 text-[11px] font-semibold tracking-wider text-text-secondary uppercase">Menu</p>
            <nav className="space-y-0.5">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2 rounded-card text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-forest text-white shadow-subtle'
                        : 'text-text-primary hover:bg-bg-secondary text-text-secondary hover:text-text-primary'
                    }`
                  }
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <item.icon size={15} />
                    <span className="truncate">{item.label}</span>
                  </div>
                </NavLink>
              ))}
            </nav>
          </div>

          <div>
            <p className="px-3 mb-2 text-[11px] font-semibold tracking-wider text-text-secondary uppercase">General</p>
            <nav className="space-y-0.5">
              {generalItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-card text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-forest text-white'
                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
                    }`
                  }
                >
                  <item.icon size={15} />
                  <span>{item.label}</span>
                </NavLink>
              ))}

              {/* Workspace Switcher */}
              <button
                onClick={() => navigate('/client/dashboard')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-card text-xs font-medium text-forest hover:bg-forest-soft transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <ExternalLink size={15} />
                  <span>Switch to Client View</span>
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* User Footer */}
        <div className="mailpilot-assistant-sidebar-footer shrink-0 p-3 border-t border-border-main bg-bg-secondary/30">
          <div className="flex items-center justify-between p-2 rounded-card hover:bg-bg-secondary transition-colors">
            <div className="flex items-center gap-2.5 truncate">
              <img
                src={user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name || 'User'}`}
                alt="Avatar"
                className="w-7 h-7 rounded-full border border-border-main shrink-0 object-cover"
              />
              <div className="truncate">
                <p className="text-xs font-medium text-text-primary truncate">{user?.name}</p>
                <p className="text-[10px] text-text-secondary capitalize">{user?.role?.toLowerCase() || 'assistant'}</p>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="p-1 rounded text-text-secondary hover:text-status-error transition-colors"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          ></div>
          <div className="mailpilot-assistant-mobile-drawer relative w-64 max-w-[80%] bg-surface-main border-r border-border-main flex flex-col h-full min-h-0 overflow-hidden shadow-elevated z-10 animate-slideInLeft">
            <div className="mailpilot-assistant-sidebar-header h-16 shrink-0 flex items-center justify-between px-6 border-b border-border-main">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-forest flex items-center justify-center text-white font-bold text-sm shadow-subtle">
                  M
                </div>
                <span className="font-semibold text-base tracking-tight text-text-primary">MailPilot</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded text-text-secondary hover:text-text-primary"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mailpilot-assistant-sidebar-workspace shrink-0 p-3 border-b border-border-main bg-bg-secondary/40">
              <p className="text-[10px] text-text-secondary uppercase tracking-wider font-semibold">Active Workspace</p>
              <p className="font-medium text-xs text-text-primary truncate">{user?.workspaceName || 'Acme Executive Group'}</p>
            </div>

            <div className="mailpilot-assistant-sidebar-navigation flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-4">
              <nav className="space-y-0.5">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2 rounded-card text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-forest text-white shadow-subtle'
                          : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
                      }`
                    }
                  >
                    <div className="flex items-center gap-2.5">
                      <item.icon size={15} />
                      <span>{item.label}</span>
                    </div>
                  </NavLink>
                ))}
              </nav>

              <div className="pt-2 border-t border-border-main">
                <nav className="space-y-0.5">
                  {generalItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-card text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors"
                    >
                      <item.icon size={15} />
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/client/dashboard');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-card text-xs font-medium text-forest hover:bg-forest-soft transition-colors"
                  >
                    <ExternalLink size={15} />
                    <span>Switch to Client View</span>
                  </button>
                </nav>
              </div>
            </div>

            <div className="mailpilot-assistant-sidebar-footer shrink-0 p-3 border-t border-border-main bg-bg-secondary/30">
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-card text-xs font-medium text-status-error hover:bg-status-error/10 transition-colors"
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="mailpilot-assistant-main-area flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="mailpilot-assistant-header h-16 border-b border-border-main bg-bg-primary/80 backdrop-blur-md px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1.5 rounded-card border border-border-main text-text-secondary"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          {/* Search bar with / keyboard shortcut indicator (Ambernif Style) */}
          <form onSubmit={handleGlobalSearch} className="flex-1 max-w-md hidden sm:block">
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search task, email or sender..."
                className="w-full pl-9 pr-9 py-2 rounded-full bg-surface-main/90 border border-border-main text-xs outline-none focus:border-[#244A38] focus:bg-white transition-all shadow-subtle placeholder:text-text-secondary/70"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono rounded-md bg-bg-secondary text-text-secondary border border-border-main shadow-2xs">
                /
              </kbd>
            </div>
          </form>

          {/* Clean Executive Right Header Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/client/dashboard')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-[#234E39] hover:bg-[#EAF2EC] bg-white border border-border-main transition-all shadow-2xs"
            >
              <ExternalLink size={13} />
              <span>Client View</span>
            </button>

            <div className="flex items-center gap-2 pl-2 border-l border-border-main">
              <img
                src={user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name || 'User'}`}
                alt=""
                className="w-7 h-7 rounded-full border border-border-main object-cover"
              />
              <span className="hidden md:inline-block text-xs font-semibold text-text-primary">
                {user?.name?.split(' ')[0] || 'Assistant'}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className={`mailpilot-main flex-1 p-4 sm:p-6 md:p-8 ${isInboxRoute ? 'mailpilot-inbox-main' : ''}`}>
          <Outlet />
        </main>
      </div>

      {/* Contextual Ask AI Floating Drawer */}
      <AskAIDrawer />
    </div>
  );
};
