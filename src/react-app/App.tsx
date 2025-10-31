import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import EmailViewerPage from './pages/EmailViewerPage';
import { useGmailAuth } from './hooks/useGmailAuth';

function App() {
  const { isAuthenticated, loading } = useGmailAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-300">Loading MailPing...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/dashboard"
          element={isAuthenticated ? <DashboardPage /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/email/:id"
          element={isAuthenticated ? <EmailViewerPage /> : <Navigate to="/auth" replace />}
        />
        <Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/auth'} replace />} />
      </Routes>
    </Router>
  );
}

export default App;
