import React from 'react';
import { SearchBox } from './SearchBox';
import { RouteOptimizer } from './RouteOptimizer';
import { DestinationList } from './DestinationList';
import { WelcomeCard } from './WelcomeCard';
import { TripSelector } from '../Trips/TripSelector';
import type { Destination, RouteMetrics, SelectedStop, TravelMode, TripCollection } from '../../types';
import { Info, Route, Map as MapIcon } from 'lucide-react';

interface SidebarProps {
  tripTitle?: string;
  onUpdateTitle?: (title: string) => void;
  stops: SelectedStop[];
  metrics?: RouteMetrics;
  travelMode: TravelMode;
  isOptimized: boolean;
  activeStopId: string | null;
  onAddStop: (dest: Destination) => void;
  onSelectStop: (id: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRemoveStop: (id: string) => void;
  onRenameStop?: (id: string, newName: string) => void;
  onSetAsStart?: (index: number) => void;
  onUpdateDuration: (id: string, minutes: number) => void;
  onClearAll: () => void;
  onOptimizeRoute: () => void;
  onReverseRoute: () => void;
  selectedState?: string;
  onSelectState?: (state: string) => void;
  onOpenTutorial?: () => void;
  onSwitchToMap?: () => void;
  onOpenShare?: () => void;
  trips?: TripCollection[];
  activeTripId?: string | 'ALL';
  onSelectTrip?: (tripId: string | 'ALL') => void;
  onCreateNewTrip?: () => void;
  onOpenMyTrips?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  tripTitle: _tripTitle,
  onUpdateTitle: _onUpdateTitle,
  stops,
  metrics,
  travelMode,
  isOptimized,
  activeStopId,
  onAddStop,
  onSelectStop,
  onMoveUp,
  onMoveDown,
  onRemoveStop,
  onRenameStop,
  onSetAsStart,
  onUpdateDuration,
  onClearAll,
  onOptimizeRoute,
  onReverseRoute,
  selectedState = 'All States',
  onOpenTutorial,
  onSwitchToMap,
  trips = [],
  activeTripId = 'ALL',
  onSelectTrip,
  onCreateNewTrip,
  onOpenMyTrips,
}) => {
  const selectedIds = stops.map((s) => s.id);

  return (
    <aside className="w-full h-full bg-slate-900/60 backdrop-blur-md flex flex-col border-r border-slate-800/80 overflow-hidden">
      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 md:p-5 space-y-4">
        {/* Main Content: Welcome Card for 0 stops or Active Route Planner for 1+ stops */}
        {stops.length === 0 ? (
          <WelcomeCard
            onAddStop={onAddStop}
            selectedState={selectedState}
            onOpenTutorial={onOpenTutorial || (() => {})}
          />
        ) : (
          <>
            {/* Quick Switch to Map button on mobile */}
            {onSwitchToMap && (
              <button
                type="button"
                onClick={onSwitchToMap}
                className="lg:hidden w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600/25 to-purple-600/25 hover:from-indigo-600/35 hover:to-purple-600/35 text-indigo-200 border border-indigo-500/35 text-xs font-bold transition shadow-sm"
              >
                <MapIcon className="w-4 h-4 text-cyan-400" />
                <span>View Route on Interactive Map ({stops.length})</span>
              </button>
            )}

            {/* Trip Selector Header */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-2.5 flex items-center justify-between gap-2 shadow-sm">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex-shrink-0">
                  Trip:
                </span>
                <TripSelector
                  trips={trips}
                  activeTripId={activeTripId}
                  onSelectTrip={onSelectTrip || (() => {})}
                  onCreateNewTrip={onCreateNewTrip || (() => {})}
                  onOpenMyTrips={onOpenMyTrips || (() => {})}
                />
              </div>
              {onOpenMyTrips && (
                <button
                  type="button"
                  onClick={onOpenMyTrips}
                  className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition flex-shrink-0 px-2 py-1 rounded-lg hover:bg-slate-800"
                >
                  My Trips
                </button>
              )}
            </div>

            {/* Destination Search Bar */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Find & Add Destinations
              </label>
              <SearchBox 
                onAddStop={onAddStop} 
                selectedIds={selectedIds} 
                selectedPlaceIds={stops.map((s) => s.placeId).filter(Boolean) as string[]}
                selectedState={selectedState}
              />
            </div>

            {/* Route Metrics Summary Banner */}
            {stops.length >= 2 && metrics && (
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <Route className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Route Distance & Time
                    </span>
                    <span className="text-xs font-bold text-white">
                      {stops.length} Stops ({travelMode.toLowerCase()})
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-extrabold text-white block">
                    {metrics.totalDistanceKm} km
                  </span>
                  <span className="text-[11px] font-medium text-indigo-300">
                    ~{metrics.totalDurationMinutes} mins travel
                  </span>
                </div>
              </div>
            )}

            {/* Route Optimizer Button */}
            <RouteOptimizer
              onOptimize={onOptimizeRoute}
              onReverseRoute={onReverseRoute}
              stopsCount={stops.length}
              isOptimized={isOptimized}
            />

            {/* Selected Destinations List (Organized by Custom Trip Collections) */}
            <DestinationList
              stops={stops}
              activeStopId={activeStopId}
              onSelectStop={onSelectStop}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              onRemove={onRemoveStop}
              onRenameStop={onRenameStop}
              onSetAsStart={onSetAsStart}
              onUpdateDuration={onUpdateDuration}
              onClearAll={onClearAll}
              onAddStop={onAddStop}
              travelMode={travelMode}
              trips={trips}
              activeTripId={activeTripId}
              onSelectTrip={onSelectTrip}
              onOpenMyTrips={onOpenMyTrips}
              onCreateNewTrip={onCreateNewTrip}
            />

            {/* Travel Pro-Tip Callout */}
            <div className="bg-slate-950/40 rounded-xl p-3 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-200">Travel Insight: </span>
                Add your destinations or use your current location as a starting point. Click &quot;Optimize Route&quot; to reorder stops for the most efficient travel time and distance.
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
};
