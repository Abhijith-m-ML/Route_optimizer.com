import React from 'react';
import { Map, Compass, Sparkles, Share2, User } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export interface MobileBottomNavProps {
  activeTab: 'map' | 'trips' | 'plan';
  onSelectTab: (tab: 'map' | 'trips' | 'plan') => void;
  onOptimizeRoute?: () => void;
  onOpenShare?: () => void;
  onOpenMyTrips?: () => void;
  onOpenProfile?: () => void;
  stopsCount?: number;
  tripsCount?: number;
  isOptimized?: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  onOptimizeRoute,
  onOpenShare,
  onOpenMyTrips,
  onOpenProfile,
  stopsCount = 0,
  tripsCount = 0,
  isOptimized = false,
}) => {
  const { isDark } = useTheme();

  return (
    <nav 
      data-testid="mobile-bottom-nav"
      className={`lg:hidden fixed bottom-0 inset-x-0 z-40 pb-safe transition-colors duration-200 ${
        isDark 
          ? 'bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/90 text-slate-400' 
          : 'bg-white/95 backdrop-blur-xl border-t border-slate-200/90 text-slate-600 shadow-lg'
      }`}
      aria-label="Mobile Bottom Navigation"
    >
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto px-2">
        {/* 1. Map / Explore */}
        <button
          type="button"
          onClick={() => onSelectTab('map')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-150 active:scale-95 ${
            activeTab === 'map'
              ? isDark 
                ? 'text-cyan-400 font-bold' 
                : 'text-indigo-600 font-bold'
              : 'hover:text-slate-200 dark:hover:text-slate-100'
          }`}
          aria-label="Interactive Map"
        >
          <div className="relative">
            <Map className="w-5 h-5" />
            {activeTab === 'map' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-current" />
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">Map</span>
        </button>

        {/* 2. My Trips */}
        <button
          type="button"
          onClick={() => {
            if (onOpenMyTrips) onOpenMyTrips();
            else onSelectTab('trips');
          }}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-150 active:scale-95 ${
            activeTab === 'trips'
              ? isDark 
                ? 'text-purple-400 font-bold' 
                : 'text-indigo-600 font-bold'
              : 'hover:text-slate-200 dark:hover:text-slate-100'
          }`}
          aria-label="My Trips"
        >
          <div className="relative">
            <Compass className="w-5 h-5" />
            {tripsCount > 0 && (
              <span className={`absolute -top-1 -right-2 text-[9px] font-bold px-1 rounded-full ${
                isDark ? 'bg-purple-500 text-white' : 'bg-indigo-600 text-white'
              }`}>
                {tripsCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">Trips</span>
        </button>

        {/* 3. Optimize Action Button (Center Accent) */}
        <button
          type="button"
          onClick={onOptimizeRoute}
          disabled={stopsCount < 2}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-150 active:scale-95 ${
            stopsCount < 2 
              ? 'opacity-40 cursor-not-allowed'
              : isOptimized
                ? 'text-emerald-500 font-bold'
                : isDark 
                  ? 'text-indigo-400 font-bold' 
                  : 'text-indigo-600 font-bold'
          }`}
          aria-label="Optimize Route"
          title={stopsCount < 2 ? 'Add at least 2 stops to optimize' : 'Optimize route sequence'}
        >
          <div className="relative">
            <div className={`p-1.5 rounded-xl transition-all ${
              stopsCount >= 2
                ? isOptimized
                  ? 'bg-emerald-500/15 border border-emerald-500/30'
                  : 'bg-indigo-600/15 border border-indigo-500/30'
                : ''
            }`}>
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">
            {isOptimized ? 'Optimized' : 'Optimize'}
          </span>
        </button>

        {/* 4. Share */}
        <button
          type="button"
          onClick={onOpenShare}
          className="flex flex-col items-center justify-center flex-1 py-1 transition-all duration-150 active:scale-95 hover:text-slate-200 dark:hover:text-slate-100"
          aria-label="Share Trip"
        >
          <Share2 className="w-5 h-5" />
          <span className="text-[10px] mt-1 tracking-tight">Share</span>
        </button>

        {/* 5. Profile & Settings */}
        <button
          type="button"
          onClick={onOpenProfile}
          className="flex flex-col items-center justify-center flex-1 py-1 transition-all duration-150 active:scale-95 hover:text-slate-200 dark:hover:text-slate-100"
          aria-label="User Profile & Settings"
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] mt-1 tracking-tight">Profile</span>
        </button>
      </div>
    </nav>
  );
};
