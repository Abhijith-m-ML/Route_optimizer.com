import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, ArrowLeft } from 'lucide-react';
import { MPCView } from '../components/MPC/MPCView';

export const MPCPage: React.FC = () => {

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Bar with Brand & Back Button */}
      <header className="h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 md:px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <Link
            to="/dashboard"
            className="flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700/80 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </Link>
        </div>

        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-400 p-0.5 shadow-md">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Compass className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            RouteWise MPC
          </span>
        </div>
      </header>

      {/* Main MPC Interface */}
      <main className="flex-1 overflow-hidden">
        <MPCView />
      </main>
    </div>
  );
};
