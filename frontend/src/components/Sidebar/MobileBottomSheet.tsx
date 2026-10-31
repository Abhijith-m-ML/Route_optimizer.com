import React, { useState } from 'react';
import type { RouteMetrics, SelectedStop } from '../../types';
import { Sparkles, ChevronUp, ChevronDown, ArrowUpRight, ArrowRight, Route } from 'lucide-react';

export interface MobileBottomSheetProps {
  stops: SelectedStop[];
  metrics?: RouteMetrics;
  isOptimized: boolean;
  onOptimizeRoute: () => void;
  onOpenTripPlan?: () => void;
  // Backward compatibility props if passed from legacy callers
  tripTitle?: string;
  onUpdateTitle?: (title: string) => void;
  travelMode?: string;
  activeStopId?: string | null;
  onAddStop?: (dest: any) => void;
  onSelectStop?: (id: string) => void;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
  onRemoveStop?: (id: string) => void;
  onUpdateDuration?: (id: string, minutes: number) => void;
  onClearAll?: () => void;
  onReverseRoute?: () => void;
  selectedState?: string;
  onSelectState?: (state: string) => void;
}

/**
 * MobileRouteSummary (Compact Route Summary Bar)
 *
 * Sits unobtrusively at the bottom of the Interactive Map tab on mobile.
 * Displays:
 *  - Number of stops
 *  - Total route distance and estimated travel duration
 *  - Optimize Route button
 *  - One-tap action to switch to the Trip Plan tab
 *
 * Completely eliminates duplicate destination-management lists, search inputs,
 * and state filters from the map viewport so the map receives maximum screen area.
 */
export const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
  stops,
  metrics,
  isOptimized,
  onOptimizeRoute,
  onOpenTripPlan = () => {},
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // 1. Zero destinations added yet
  if (stops.length === 0) {
    return (
      <div 
        data-testid="compact-route-summary"
        className="lg:hidden fixed inset-x-3 bottom-3 z-30 pointer-events-auto bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-3 shadow-2xl transition-all duration-200"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 flex-shrink-0">
              0 Stops
            </span>
            <span className="text-xs text-slate-400 font-medium truncate">
              No destinations added yet
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenTripPlan}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition flex-shrink-0 active:scale-95 min-h-[36px]"
          >
            <span>Plan Trip</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // 2. Single destination added
  if (stops.length === 1) {
    return (
      <div 
        data-testid="compact-route-summary"
        className="lg:hidden fixed inset-x-3 bottom-3 z-30 pointer-events-auto bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-3 shadow-2xl transition-all duration-200"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex-shrink-0">
              1 Stop
            </span>
            <span className="text-xs text-slate-200 font-semibold truncate">
              {stops[0].name}
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenTripPlan}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition flex-shrink-0 active:scale-95 min-h-[36px]"
          >
            <span>Add More in Plan</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // 3. Multi-stop route (2+ stops): Compact 2-row summary or single-row collapsed pill
  return (
    <div 
      data-testid="compact-route-summary"
      className="lg:hidden fixed inset-x-3 bottom-3 z-30 pointer-events-auto bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-3 shadow-2xl transition-all duration-200"
    >
      {/* Visual Draggable Handle Pill */}
      <div 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex justify-center pb-1.5 cursor-pointer"
        aria-label="Toggle compact summary expansion"
      >
        <div className="w-8 h-1 rounded-full bg-slate-600/80 hover:bg-slate-500 transition" />
      </div>

      {isCollapsed ? (
        // Collapsed state: single ultra-thin row maximizing map view
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex-shrink-0">
              {stops.length} Stops
            </span>
            <span className="text-xs font-semibold text-slate-200 truncate">
              {metrics ? `${metrics.totalDistanceKm} km · ~${metrics.totalDurationMinutes} mins` : 'Route planned'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white rounded-lg bg-slate-800 transition flex-shrink-0"
            title="Expand route summary"
            aria-label="Expand route summary"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>
      ) : (
        // Expanded default state: compact 2-row layout as specified
        <div className="flex flex-col gap-2.5">
          {/* Top Row: Stops count & Route distance/time */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex-shrink-0">
                {stops.length} Stops
              </span>
              <div className="flex items-center gap-1.5 text-xs text-slate-200 font-semibold truncate">
                <Route className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                <span>
                  {metrics ? `${metrics.totalDistanceKm} km · ~${metrics.totalDurationMinutes} mins` : 'Route active'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition flex-shrink-0"
              title="Minimize summary"
              aria-label="Minimize route summary"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Bottom Row: [ ✨ Optimize ] and [ View Trip Plan ↑ ] */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onOptimizeRoute}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold shadow-md transition active:scale-[0.98] min-h-[40px] ${
                isOptimized
                  ? 'bg-emerald-600/25 hover:bg-emerald-600/35 text-emerald-300 border border-emerald-500/30'
                  : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-600/30'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" />
              <span>{isOptimized ? 'Optimized' : 'Optimize'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenTripPlan}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 active:bg-slate-650 text-indigo-300 hover:text-white text-xs font-bold border border-slate-700 transition active:scale-[0.98] min-h-[40px]"
            >
              <span>View Trip Plan</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const MobileRouteSummary = MobileBottomSheet;
