import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Compass } from 'lucide-react';

export const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-400 p-0.5 shadow-xl shadow-indigo-500/20 mb-3 animate-pulse">
          <div className="w-full h-full bg-slate-950 rounded-[12px] flex items-center justify-center">
            <Compass className="w-6 h-6 text-cyan-400 animate-[spin_4s_linear_infinite]" />
          </div>
        </div>
        <p className="text-xs font-semibold tracking-wide text-slate-400">Loading RouteWise...</p>
      </div>
    );
  }

  if (user) {
    // Redirect authenticated users away from auth forms to their target or dashboard
    const destination = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';
    return <Navigate to={destination} replace />;
  }

  return <>{children}</>;
};
