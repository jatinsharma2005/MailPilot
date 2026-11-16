import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('MailPilot Uncaught React Error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/assistant/dashboard';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 animate-fadeIn">
          <div className="max-w-md w-full bg-white rounded-3xl border border-border-main p-8 shadow-card text-center space-y-5">
            <div className="w-14 h-14 rounded-full bg-[#FBEBE9] text-[#B75C52] flex items-center justify-center mx-auto shadow-subtle">
              <AlertCircle size={28} />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-text-primary tracking-tight">
                {this.props.fallbackTitle || 'Something went wrong'}
              </h2>
              <p className="text-xs text-text-secondary leading-relaxed">
                {this.props.fallbackMessage ||
                  'An unexpected rendering error occurred. Your session data remains safe.'}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 rounded-full bg-[#234E39] text-white hover:bg-[#1B3D2D] text-xs font-semibold flex items-center gap-2 transition-all shadow-subtle"
              >
                <RefreshCw size={13} />
                <span>Reload Page</span>
              </button>

              <button
                onClick={this.handleGoHome}
                className="px-4 py-2 rounded-full bg-bg-secondary text-text-primary hover:bg-[#FAF9F5] text-xs font-semibold border border-border-main flex items-center gap-1.5 transition-all"
              >
                <Home size={13} />
                <span>Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
