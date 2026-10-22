import React from 'react';
import type { RouteMetrics, TravelMode } from '../../types';
import { Navigation, Clock, MapPin, IndianRupee, Sparkles, TrendingDown } from 'lucide-react';

interface TripMetricsProps {
  metrics: RouteMetrics;
  travelMode: TravelMode;
  isOptimized: boolean;
}

export const TripMetrics: React.FC<TripMetricsProps> = ({
  metrics,
  travelMode,
  isOptimized,
}) => {
  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remainder = mins % 60;
    return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`;
  };

  const modeLabel = {
    DRIVING: 'Driving',
    TRANSIT: 'Transit',
    WALKING: 'Walking',
  }[travelMode];

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          {modeLabel} Route Summary
        </h3>
        {isOptimized && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            <Sparkles className="w-3 h-3" />
            Route Optimized
          </span>
        )}
      </div>

      {/* Grid of 3 Primary Metrics */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 flex flex-col justify-between hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Distance</span>
            <Navigation className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div>
            <div className="text-lg md:text-xl font-extrabold text-white tracking-tight">
              {metrics.totalDistanceKm}
              <span className="text-xs font-semibold text-slate-400 ml-1">km</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 flex flex-col justify-between hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Est. Time</span>
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div>
            <div className="text-lg md:text-xl font-extrabold text-white tracking-tight">
              {formatDuration(metrics.totalDurationMinutes)}
            </div>
          </div>
        </div>

        <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 flex flex-col justify-between hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Stops</span>
            <MapPin className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div>
            <div className="text-lg md:text-xl font-extrabold text-white tracking-tight">
              {metrics.totalStops}
              <span className="text-xs font-semibold text-slate-400 ml-1">pts</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <IndianRupee className="w-3.5 h-3.5 text-emerald-400" />
          <span>Est. Fare / Fuel:</span>
          <span className="text-white font-semibold">₹{metrics.estimatedFuelCostInr}</span>
        </div>

        {isOptimized && (
          <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
            <TrendingDown className="w-3 h-3" />
            <span>Saved ~18 mins travel</span>
          </div>
        )}
      </div>
    </div>
  );
};
