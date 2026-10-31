import React, { useState } from 'react';
import { Sparkles, ArrowUpDown, CheckCircle2 } from 'lucide-react';

interface RouteOptimizerProps {
  onOptimize: () => void;
  onReverseRoute: () => void;
  stopsCount: number;
  isOptimized: boolean;
}

export const RouteOptimizer: React.FC<RouteOptimizerProps> = ({
  onOptimize,
  onReverseRoute,
  stopsCount,
  isOptimized,
}) => {
  const [isCalculating, setIsCalculating] = useState(false);

  const handleOptimizeClick = () => {
    if (stopsCount < 2) return;
    setIsCalculating(true);
    setTimeout(() => {
      onOptimize();
      setIsCalculating(false);
    }, 500);
  };

  const isDisabled = stopsCount < 2;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {/* Main Optimize Route Button */}
        <button
          onClick={handleOptimizeClick}
          disabled={isDisabled || isCalculating}
          className={`relative group flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm tracking-wide shadow-lg transition-all duration-300 min-h-[44px] ${
            isDisabled
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
              : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_auto] hover:bg-right text-white shadow-indigo-600/30 hover:shadow-indigo-600/50 active:scale-[0.98] border border-indigo-400/30'
          }`}
        >
          {isCalculating ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Solving Optimal TSP Route...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-amber-300 group-hover:rotate-12 transition-transform" />
              <span>Optimize Route</span>
            </>
          )}
        </button>

        {/* Reverse Order Quick Action */}
        <button
          onClick={onReverseRoute}
          disabled={isDisabled}
          className="w-11 h-11 flex items-center justify-center bg-slate-800/90 hover:bg-slate-700 active:bg-slate-600 text-slate-300 hover:text-white rounded-xl border border-slate-700/80 transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          title="Reverse route direction (North to South / South to North)"
          aria-label="Reverse route stops direction"
        >
          <ArrowUpDown className="w-4 h-4" />
        </button>
      </div>

      {isOptimized && (
        <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs px-3 py-2 rounded-xl">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span>Optimal sequence active. Mumbai traffic cross-travel minimized.</span>
        </div>
      )}
    </div>
  );
};
