import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import { PublicOnlyRoute } from './components/Auth/PublicOnlyRoute';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { MPCPage } from './pages/MPCPage';
import { IPFPage } from './pages/IPFPage';

export const App: React.FC = () => {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          {/* Public Auth Routes (Redirects to dashboard if already authenticated) */}
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicOnlyRoute>
                <SignupPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PublicOnlyRoute>
                <ForgotPasswordPage />
              </PublicOnlyRoute>
            }
          />

          {/* Protected Dashboard Route */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Dedicated MPC Distance Calculator Route */}
          <Route
            path="/mpc"
            element={
              <ProtectedRoute>
                <MPCPage />
              </ProtectedRoute>
            }
          />

          {/* Dedicated IPF Instagram Place Finder Route */}
          <Route
            path="/ipf"
            element={
              <ProtectedRoute>
                <IPFPage />
              </ProtectedRoute>
            }
          />

          {/* Root and Wildcard redirects */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  );
};

export default App;
