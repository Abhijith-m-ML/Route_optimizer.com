import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { IPFView } from '../components/IPF/IPFView';

export const IPFPage: React.FC = () => {
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
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-500 via-cyan-500 to-blue-600 p-0.5 shadow-md">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-teal-400" />
            </div>
          </div>
          <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            IPF • Instagram Place Finder
          </span>
        </div>
      </header>

      {/* Main IPF Interface */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <IPFView />
      </main>
    </div>
  );
};

export default IPFPage;
