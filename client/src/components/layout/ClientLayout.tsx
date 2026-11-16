import React from 'react';
import { Outlet, useNavigate, Link } from 'react-router-dom';
import { LogOut, ArrowLeftRight } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore.js';
import { AskAIDrawer } from '../common/AskAIDrawer.js';

export const ClientLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary font-sans flex flex-col">
      {/* Elegant Distraction-free Header */}
      <header className="mailpilot-client-header h-16 border-b border-border-main bg-bg-primary/90 backdrop-blur-md px-6 md:px-12 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link to="/client/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#244A38] flex items-center justify-center text-white font-bold text-sm shadow-subtle">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span className="font-bold text-base tracking-tight text-text-primary">MailPilot</span>
          </Link>
          <span className="hidden sm:inline-block text-xs text-text-secondary border-l border-border-main pl-3 font-medium">
            Executive Client Workspace
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Quick toggle to assistant workspace */}
          <button
            onClick={() => navigate('/assistant/dashboard')}
            aria-label="Assistant Workspace"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-text-secondary hover:text-text-primary bg-bg-secondary border border-border-main transition-colors"
          >
            <ArrowLeftRight size={13} />
            <span className="client-workspace-toggle-label">Assistant Workspace</span>
          </button>

          {/* User profile */}
          <div className="flex items-center gap-2.5">
            <img
              src={user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name || 'Alexander'}`}
              alt="Avatar"
              className="w-8 h-8 rounded-full border border-border-main object-cover shadow-subtle"
            />
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-text-primary">{user?.name}</p>
              <p className="text-[10px] text-text-secondary">Managing Partner</p>
            </div>
          </div>

          <button
            onClick={logout}
            title="Sign out"
            className="p-1.5 rounded-md text-text-secondary hover:text-status-error hover:bg-bg-secondary transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main Focus Area */}
      <main className="mailpilot-main flex-1 max-w-5xl w-full mx-auto p-6 md:p-10">
        <Outlet />
      </main>

      {/* Contextual Assistant available */}
      <AskAIDrawer />
    </div>
  );
};
