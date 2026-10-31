import React, { useState } from 'react';
import { DestinationCard } from './DestinationCard';
import type { SelectedStop, TravelMode, Destination, TripCollection } from '../../types';
import { MapPin, AlertTriangle, Trash2, X, Folder, Layers, Plus } from 'lucide-react';

interface DestinationListProps {
  stops: SelectedStop[];
  activeStopId: string | null;
  onSelectStop: (id: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRemove: (id: string) => void;
  onUpdateDuration: (id: string, minutes: number) => void;
  onClearAll: () => void;
  onAddStop: (destination: Destination) => void;
  travelMode: TravelMode;
  trips?: TripCollection[];
  activeTripId?: string | 'ALL';
  onSelectTrip?: (tripId: string | 'ALL') => void;
  onOpenMyTrips?: () => void;
  onCreateNewTrip?: () => void;
}

export const DestinationList: React.FC<DestinationListProps> = ({
  stops,
  activeStopId,
  onSelectStop,
  onMoveUp,
  onMoveDown,
  onRemove,
  onUpdateDuration,
  onClearAll,
  travelMode,
  trips = [],
  activeTripId = 'ALL',
  onSelectTrip,
  onOpenMyTrips,
  onCreateNewTrip,
}) => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleConfirmClear = () => {
    onClearAll();
    setShowClearConfirm(false);
  };

  const activeTrip = activeTripId !== 'ALL' ? trips.find((t) => t.id === activeTripId) : null;
  const isAllTripsView = activeTripId === 'ALL';

  return (
    <div className="flex flex-col flex-1 min-h-0 relative">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            {isAllTripsView ? (
              <Layers className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
            ) : (
              <Folder className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
            )}
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 truncate">
              {isAllTripsView ? 'All Trip Destinations' : activeTrip?.name || 'Saved Destinations'}
            </span>
          </div>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-indigo-400 border border-slate-700/80 flex-shrink-0">
            {stops.length} {stops.length === 1 ? 'Place' : 'Places'}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {onOpenMyTrips && (
            <button
              type="button"
              onClick={onOpenMyTrips}
              className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition"
              title="Manage Trips"
            >
              My Trips
            </button>
          )}

          {stops.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="text-[11px] font-medium text-slate-400 hover:text-rose-400 transition flex items-center gap-1"
              title="Clear destinations"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Dialog for Clearing Destinations */}
      {showClearConfirm && (
        <div className="mb-3 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-slate-200">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <h5 className="text-xs font-bold text-white">Clear destinations?</h5>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  This will remove all {stops.length} stops from {activeTrip ? `"${activeTrip.name}"` : 'the current view'}.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowClearConfirm(false)}
              className="text-slate-400 hover:text-white p-0.5 rounded transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 mt-2.5">
            <button
              onClick={() => setShowClearConfirm(false)}
              className="text-[11px] font-medium text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmClear}
              className="text-[11px] font-bold text-white px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 shadow transition"
            >
              Clear Stops
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {stops.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-slate-900/40 rounded-2xl border border-dashed border-slate-800/80 my-auto">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-2.5">
            <MapPin className="w-5 h-5" />
          </div>
          <p className="text-xs text-slate-400 leading-relaxed max-w-[240px]">
            Your trip starts here. Search destinations above to add them to your collection.
          </p>
          {onCreateNewTrip && (
            <button
              type="button"
              onClick={onCreateNewTrip}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-semibold border border-slate-700 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Trip</span>
            </button>
          )}
        </div>
      ) : isAllTripsView && trips.length > 0 ? (
        /* Organized by User-Created Trips View (When All Trips is Selected) */
        <div className="space-y-4 overflow-y-auto pr-1">
          {trips.map((trip) => {
            const tripStops = trip.stops || [];
            if (tripStops.length === 0) return null;

            return (
              <div
                key={trip.id}
                className="bg-slate-950/40 rounded-2xl border border-slate-800/80 p-2.5 transition hover:border-slate-700"
              >
                <div className="flex items-center justify-between px-1.5 pb-2 mb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2 min-w-0">
                    <Folder className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                    <h4 className="text-xs font-bold text-white truncate">{trip.name}</h4>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] font-semibold text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded-full border border-indigo-500/30">
                      {tripStops.length} {tripStops.length === 1 ? 'place' : 'places'}
                    </span>
                    {onSelectTrip && (
                      <button
                        type="button"
                        onClick={() => onSelectTrip(trip.id)}
                        className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 hover:underline"
                        title="Focus on this trip"
                      >
                        Focus →
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  {tripStops.map((stop) => {
                    const originalIndex = stops.findIndex((s) => s.id === stop.id);
                    return (
                      <DestinationCard
                        key={stop.id}
                        stop={stop}
                        index={originalIndex >= 0 ? originalIndex : 0}
                        totalStops={stops.length}
                        isActive={activeStopId === stop.id}
                        onSelect={() => onSelectStop(stop.id)}
                        onMoveUp={() => onMoveUp(originalIndex)}
                        onMoveDown={() => onMoveDown(originalIndex)}
                        onRemove={() => onRemove(stop.id)}
                        onUpdateDuration={(duration) => onUpdateDuration(stop.id, duration)}
                        travelMode={travelMode}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Sequential Route Order for Selected Trip */
        <div className="space-y-1 overflow-y-auto pr-1">
          {stops.map((stop, index) => (
            <DestinationCard
              key={stop.id}
              stop={stop}
              index={index}
              totalStops={stops.length}
              isActive={activeStopId === stop.id}
              onSelect={() => onSelectStop(stop.id)}
              onMoveUp={() => onMoveUp(index)}
              onMoveDown={() => onMoveDown(index)}
              onRemove={() => onRemove(stop.id)}
              onUpdateDuration={(duration) => onUpdateDuration(stop.id, duration)}
              travelMode={travelMode}
            />
          ))}
        </div>
      )}
    </div>
  );
};
