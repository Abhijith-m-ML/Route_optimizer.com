import React, { useState, useMemo } from 'react';
import { DestinationCard } from './DestinationCard';
import type { SelectedStop, TravelMode, Destination } from '../../types';
import { MapPin, AlertTriangle, Trash2, X, Layers, Route } from 'lucide-react';

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
}) => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [viewMode, setViewMode] = useState<'route' | 'state'>('route');
  const [filterState, setFilterState] = useState<string | null>(null);

  const handleConfirmClear = () => {
    onClearAll();
    setShowClearConfirm(false);
  };

  // Group stops by geographical state
  const stateGroups = useMemo(() => {
    const groups: Record<string, SelectedStop[]> = {};
    for (const stop of stops) {
      const stateName = stop.state || 'Other Locations';
      if (!groups[stateName]) {
        groups[stateName] = [];
      }
      groups[stateName].push(stop);
    }
    return groups;
  }, [stops]);

  const uniqueStates = Object.keys(stateGroups);

  return (
    <div className="flex flex-col flex-1 min-h-0 relative">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Saved Destinations
          </span>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-indigo-400 border border-slate-700/80">
            {stops.length} {stops.length === 1 ? 'Place' : 'Places'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {stops.length > 1 && (
            <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700/80 text-[10px]">
              <button
                type="button"
                onClick={() => {
                  setViewMode('route');
                  setFilterState(null);
                }}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition ${
                  viewMode === 'route'
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="View in Route Sequence"
              >
                <Route className="w-3 h-3" />
                <span>Route</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('state')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition ${
                  viewMode === 'state'
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Group by Geographical State"
              >
                <Layers className="w-3 h-3" />
                <span>By State</span>
              </button>
            </div>
          )}

          {stops.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="text-[11px] font-medium text-slate-400 hover:text-rose-400 transition flex items-center gap-1"
              title="Clear all destinations"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* State breakdown badges bar */}
      {stops.length > 0 && uniqueStates.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-none">
          <button
            type="button"
            onClick={() => setFilterState(null)}
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap transition border ${
              filterState === null
                ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50'
                : 'bg-slate-850 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            All States ({stops.length})
          </button>
          {uniqueStates.map((stateName) => {
            const count = stateGroups[stateName].length;
            const isSelected = filterState === stateName;
            return (
              <button
                key={stateName}
                type="button"
                onClick={() => setFilterState(isSelected ? null : stateName)}
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap transition border flex items-center gap-1 ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-800/90 text-slate-300 border-slate-700/80 hover:text-white'
                }`}
              >
                <MapPin className="w-2.5 h-2.5 text-indigo-400" />
                <span>{stateName}</span>
                <span className="text-[9px] bg-slate-900/60 px-1 rounded-full">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog for Clearing All Destinations */}
      {showClearConfirm && (
        <div className="mb-3 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-slate-200">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <h5 className="text-xs font-bold text-white">Clear all destinations?</h5>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  This will remove all {stops.length} stops from your itinerary.
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
              Clear All Stops
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {stops.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-slate-900/40 rounded-2xl border border-dashed border-slate-800/80 my-auto">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-2.5">
            <MapPin className="w-5 h-5" />
          </div>
          <p className="text-xs text-slate-400 leading-relaxed max-w-[240px]">
            Your trip starts here. Select a state or search destinations to add them to your map.
          </p>
        </div>
      ) : viewMode === 'state' ? (
        /* Organized by State View */
        <div className="space-y-4 overflow-y-auto pr-1">
          {uniqueStates
            .filter((stateName) => !filterState || filterState === stateName)
            .map((stateName) => {
              const stateStops = stateGroups[stateName];
              return (
                <div key={stateName} className="bg-slate-950/40 rounded-2xl border border-slate-800/80 p-2.5">
                  <div className="flex items-center justify-between px-1.5 pb-2 mb-2 border-b border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-indigo-400" />
                      <h4 className="text-xs font-bold text-white">{stateName}</h4>
                    </div>
                    <span className="text-[10px] font-semibold text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded-full border border-indigo-500/30">
                      {stateStops.length} {stateStops.length === 1 ? 'place' : 'places'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    {stateStops.map((stop) => {
                      const originalIndex = stops.findIndex((s) => s.id === stop.id);
                      return (
                        <DestinationCard
                          key={stop.id}
                          stop={stop}
                          index={originalIndex}
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
        /* Sequential Route Order View */
        <div className="space-y-1 overflow-y-auto pr-1">
          {stops
            .map((stop, index) => ({ stop, index }))
            .filter(({ stop }) => !filterState || (stop.state || 'Other Locations') === filterState)
            .map(({ stop, index }) => (
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
