import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { PWAProvider } from './context/PWAContext';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import { PublicOnlyRoute } from './components/Auth/PublicOnlyRoute';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { SearchPage } from './pages/SearchPage';
import { SharedTripPage } from './pages/SharedTripPage';

export const App: React.FC = () => {
  // Support legacy hash links like #/s/Ab12Xy or #/dashboard
  useEffect(() => {
    if (window.location.hash) {
      const hashContent = window.location.hash.replace(/^#\/?/, '/');
      if (hashContent) {
        window.history.replaceState(null, '', hashContent);
      }
    }
  }, []);

  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <PWAProvider>
            <Routes>
          {/* Public Short Share Link Route */}
          <Route path="/s/:shareId" element={<SharedTripPage />} />

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

          {/* Dashboard Route */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Dedicated Search Page Route */}
          <Route
            path="/search"
            element={
              <ProtectedRoute>
                <SearchPage />
              </ProtectedRoute>
            }
          />

          {/* Root and Wildcard redirects */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </PWAProvider>
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
  );
};

export default App;
