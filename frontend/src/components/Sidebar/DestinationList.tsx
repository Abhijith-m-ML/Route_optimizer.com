import React, { useState } from 'react';
import { DestinationCard } from './DestinationCard';
import type { SelectedStop, TravelMode, Destination } from '../../types';
import { MapPin, AlertTriangle, Trash2, X } from 'lucide-react';

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

  const handleConfirmClear = () => {
    onClearAll();
    setShowClearConfirm(false);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 relative">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Selected Destinations
          </span>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-indigo-400 border border-slate-700/80">
            {stops.length} {stops.length === 1 ? 'Stop' : 'Stops'}
          </span>
        </div>

        {stops.length > 0 && (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="text-[11px] font-medium text-slate-400 hover:text-rose-400 transition flex items-center gap-1"
            title="Clear all destinations"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear All</span>
          </button>
        )}
      </div>

      {/* Confirmation Dialog for Clearing All Destinations */}
      {showClearConfirm && (
        <div className="mb-3 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-slate-200">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <h5 className="text-xs font-bold text-white">Clear all destinations?</h5>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  This will remove all {stops.length} stops from your Mumbai itinerary.
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

      {/* List Container or Unobtrusive Empty State */}
      {stops.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-slate-900/40 rounded-2xl border border-dashed border-slate-800/80 my-auto">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-2.5">
            <MapPin className="w-5 h-5" />
          </div>
          <p className="text-xs text-slate-400 leading-relaxed max-w-[240px]">
            Your trip starts here. Add destinations to see them on the map.
          </p>
        </div>
      ) : (
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
