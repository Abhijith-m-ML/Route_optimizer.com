import React from 'react';
import { SearchBox } from './SearchBox';
import type { Destination } from '../../types';
import { 
  Sparkles, 
  MapPin, 
  Compass, 
  Route, 
  Share2, 
  HelpCircle,
  ArrowRight
} from 'lucide-react';

interface WelcomeCardProps {
  onAddStop: (dest: Destination) => void;
  selectedState?: string;
  onOpenTutorial: () => void;
}

export const WelcomeCard: React.FC<WelcomeCardProps> = ({
  onAddStop,
  selectedState = 'All States',
  onOpenTutorial,
}) => {
  return (
    <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-800/90 rounded-3xl p-4 sm:p-6 shadow-2xl text-slate-100 flex flex-col space-y-4">
      {/* Welcoming Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[11px] font-bold uppercase tracking-wider mb-2.5">
          <Compass className="w-3.5 h-3.5 text-cyan-400 animate-[spin_20s_linear_infinite]" />
          <span>Vazhikatti Route Optimizer</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-snug">
          Plan your next journey.
        </h2>

        <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
          Discover destinations, organize your stops and find the best route.
        </p>
      </div>

      {/* Prominent Search Bar */}
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
          Find & Add Your First Destination
        </label>
        <SearchBox
          onAddStop={onAddStop}
          selectedIds={[]}
          selectedPlaceIds={[]}
          selectedState={selectedState}
        />
      </div>

      {/* 4 Feature Highlights Grid */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <div className="p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-1.5">
            <MapPin className="w-3.5 h-3.5" />
          </div>
          <div>
            <h5 className="text-xs font-bold text-white">Search Places</h5>
            <p className="text-[10px] text-slate-400 mt-0.5">Explore landmarks nationwide</p>
          </div>
        </div>

        <div className="p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-1.5">
            <Route className="w-3.5 h-3.5" />
          </div>
          <div>
            <h5 className="text-xs font-bold text-white">Add Stops</h5>
            <p className="text-[10px] text-slate-400 mt-0.5">Organize by Indian state</p>
          </div>
        </div>

        <div className="p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between">
          <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center mb-1.5">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h5 className="text-xs font-bold text-white">Optimize TSP</h5>
            <p className="text-[10px] text-slate-400 mt-0.5">Fastest travel sequence</p>
          </div>
        </div>

        <div className="p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-1.5">
            <Share2 className="w-3.5 h-3.5" />
          </div>
          <div>
            <h5 className="text-xs font-bold text-white">Share Route</h5>
            <p className="text-[10px] text-slate-400 mt-0.5">Send links to co-travelers</p>
          </div>
        </div>
      </div>

      {/* Quick Tutorial CTA */}
      <button
        type="button"
        onClick={onOpenTutorial}
        className="w-full flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-indigo-950/60 to-purple-950/50 hover:from-indigo-900/60 hover:to-purple-900/60 border border-indigo-500/30 transition group text-left"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center group-hover:scale-105 transition">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <h5 className="text-xs font-bold text-white group-hover:text-indigo-300 transition">
              New to Vazhikatti?
            </h5>
            <p className="text-[11px] text-slate-400">
              Take a 1-minute visual guide
            </p>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
      </button>
    </div>
  );
};

