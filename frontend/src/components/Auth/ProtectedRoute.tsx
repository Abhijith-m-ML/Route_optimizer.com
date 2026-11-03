import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Compass } from 'lucide-react';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-400 p-0.5 shadow-xl shadow-indigo-500/20 mb-4 animate-pulse">
          <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
            <Compass className="w-7 h-7 text-cyan-400 animate-[spin_4s_linear_infinite]" />
          </div>
        </div>
        <p className="text-sm font-semibold tracking-wide text-slate-300">Verifying Vazhikatti Session...</p>
        <p className="text-xs text-slate-500 mt-1">Preparing your travel dashboard</p>
      </div>
    );
  }

  // Allow guests to view dashboard if they have a shared trip or pending shared trip
  const hasSharedTrip =
    location.search.includes('share=') ||
    location.search.includes('trip=') ||
    Boolean(localStorage.getItem('vazhikatti_pending_shared_trip'));

  if (!user && !hasSharedTrip) {
    // Preserve requested route destination so user is redirected back after sign in
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
