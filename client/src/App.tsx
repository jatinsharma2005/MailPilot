import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore.js';
import { ErrorBoundary } from './components/common/ErrorBoundary.js';

// Auth Pages
import { Login } from './pages/auth/Login.js';
import { Signup } from './pages/auth/Signup.js';
import { ForgotPassword } from './pages/auth/ForgotPassword.js';

// Onboarding
import { OnboardingWizard } from './pages/onboarding/OnboardingWizard.js';

// Layouts
import { AssistantLayout } from './components/layout/AssistantLayout.js';
import { ClientLayout } from './components/layout/ClientLayout.js';

// Assistant Pages
import { AssistantDashboard } from './pages/assistant/AssistantDashboard.js';
import { EmailManagement } from './pages/assistant/EmailManagement.js';
import { ConversationDetails } from './pages/assistant/ConversationDetails.js';
import { TasksPage } from './pages/assistant/TasksPage.js';
import { AccountsPage } from './pages/assistant/AccountsPage.js';
import { SettingsPage } from './pages/assistant/SettingsPage.js';

// Client Pages
import { ClientDashboard } from './pages/client/ClientDashboard.js';
import { ClientEmailDetails } from './pages/client/ClientEmailDetails.js';

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({
  children,
  allowedRoles,
}) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // If role mismatch, route to their designated dashboard
    return <Navigate to={user.role === 'CLIENT' ? '/client/dashboard' : '/assistant/dashboard'} replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  const { checkAuth, user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Onboarding */}
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <OnboardingWizard />
            </ProtectedRoute>
          }
        />
        <Route path="/onboarding/connect-email" element={<Navigate to="/onboarding" replace />} />
        <Route path="/onboarding/complete" element={<Navigate to="/onboarding" replace />} />

        {/* Assistant Workspace Routes */}
        <Route
          path="/assistant"
          element={
            <ProtectedRoute allowedRoles={['ASSISTANT', 'ADMIN']}>
              <ErrorBoundary fallbackTitle="Assistant Workspace Error" fallbackMessage="An unexpected error occurred while loading this view. You can reload or return to the dashboard.">
                <AssistantLayout />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/assistant/dashboard" replace />} />
          <Route path="dashboard" element={<AssistantDashboard />} />
          <Route path="emails" element={<EmailManagement />} />
          <Route path="emails/:id" element={<ConversationDetails />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="accounts" element={<AccountsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* Client Workspace Routes */}
        <Route
          path="/client"
          element={
            <ProtectedRoute allowedRoles={['CLIENT', 'ADMIN', 'ASSISTANT']}>
              <ErrorBoundary fallbackTitle="Client Workspace Error" fallbackMessage="An unexpected error occurred while loading this view. You can reload or return to the executive dashboard.">
                <ClientLayout />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/client/dashboard" replace />} />
          <Route path="dashboard" element={<ClientDashboard />} />
          <Route path="emails/:id" element={<ClientEmailDetails />} />
        </Route>

        {/* Root Route Redirect */}
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate
                to={user?.role === 'CLIENT' ? '/client/dashboard' : '/assistant/dashboard'}
                replace
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
