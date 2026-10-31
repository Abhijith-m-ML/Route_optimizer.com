import React, { useMemo } from 'react';
import { 
  MapPin, 
  Plus, 
  X, 
  Sparkles, 
  Check, 
  Star 
} from 'lucide-react';
import type { SelectedStop, SharedTripData } from '../types';

interface SharedTripPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  sharedData: SharedTripData | null;
  currentStops: SelectedStop[];
  onImport: (stopsToImport: SelectedStop[]) => void;
}

export const SharedTripPreviewModal: React.FC<SharedTripPreviewModalProps> = ({
  isOpen,
  onClose,
  sharedData,
  currentStops,
  onImport,
}) => {
  if (!isOpen || !sharedData) return null;

  const { title, selectedState, stops, ownerName } = sharedData;

  // Check which places are already in the recipient's map
  const existingPlaceIds = useMemo(() => {
    return new Set(
      currentStops
        .map((s) => s.placeId || s.id)
        .filter(Boolean)
    );
  }, [currentStops]);

  // Group by state if multiple states are present
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
  const isMultiState = uniqueStates.length > 1;

  // Count new non-duplicate stops
  const newStops = stops.filter(
    (s) => !existingPlaceIds.has(s.placeId || s.id) &&
           !currentStops.some((c) => c.name.toLowerCase() === s.name.toLowerCase())
  );

  const duplicateCount = stops.length - newStops.length;

  const handleImport = () => {
    onImport(stops);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl p-5 md:p-6 text-slate-100 flex flex-col max-h-[90vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shared-preview-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3.5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 p-0.5 shadow-lg shadow-indigo-600/30 flex-shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <h3 id="shared-preview-title" className="text-lg font-extrabold text-white leading-tight">
                Shared Destinations
              </h3>
              <p className="text-xs text-slate-400">
                {ownerName ? `Shared by ${ownerName}` : 'Shared itinerary list'} • {title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Metadata Summary Cards */}
        <div className="grid grid-cols-2 gap-3 py-3.5">
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              State
            </span>
            <span className="text-sm font-bold text-indigo-300 mt-0.5 truncate flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
              {selectedState}
            </span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Total Destinations
            </span>
            <span className="text-sm font-bold text-white mt-0.5">
              {stops.length} {stops.length === 1 ? 'place' : 'places'}
            </span>
          </div>
        </div>

        {/* Scrollable Destinations List */}
        <div className="flex-1 overflow-y-auto py-1 pr-1 space-y-3">
          {isMultiState ? (
            /* Multi-state grouped view */
            uniqueStates.map((stateName) => {
              const stateStops = stateGroups[stateName];
              return (
                <div key={stateName} className="bg-slate-950/50 rounded-2xl border border-slate-800/80 p-3">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-indigo-400" />
                      State: {stateName}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {stateStops.length} {stateStops.length === 1 ? 'destination' : 'destinations'}
                    </span>
                  </div>

                  <ol className="divide-y divide-slate-800/50">
                    {stateStops.map((stop, idx) => {
                      const isAlreadyAdded = existingPlaceIds.has(stop.placeId || stop.id);
                      return (
                        <li key={stop.id} className="py-2 flex items-center justify-between gap-3">
                          <div className="flex items-start gap-2.5 min-w-0 flex-1">
                            <span className="text-xs font-bold text-slate-500 w-4 pt-0.5">
                              {idx + 1}.
                            </span>
                            <div className="min-w-0 flex-1">
                              <h5 className="text-xs font-bold text-white truncate">
                                {stop.name}
                              </h5>
                              <p className="text-[11px] text-slate-400 truncate">
                                {stop.shortAddress || stop.address}
                              </p>
                            </div>
                          </div>

                          <div className="flex-shrink-0">
                            {isAlreadyAdded ? (
                              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                On Map
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                                {stop.city || 'India'}
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              );
            })
          ) : (
            /* Single state simple numbered list */
            <div className="bg-slate-950/50 rounded-2xl border border-slate-800/80 p-3">
              <ol className="divide-y divide-slate-800/50">
                {stops.map((stop, idx) => {
                  const isAlreadyAdded = existingPlaceIds.has(stop.placeId || stop.id);
                  return (
                    <li key={stop.id} className="py-2 flex items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <span className="text-xs font-bold text-indigo-400 w-4 pt-0.5">
                          {idx + 1}.
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h5 className="text-xs font-bold text-white truncate">
                              {stop.name}
                            </h5>
                            {stop.rating && (
                              <span className="text-[10px] text-amber-400 flex items-center">
                                <Star className="w-2.5 h-2.5 fill-amber-400 mr-0.5" />
                                {stop.rating}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {stop.shortAddress || stop.address}
                          </p>
                        </div>
                      </div>

                      <div className="flex-shrink-0">
                        {isAlreadyAdded ? (
                          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Already on Map
                          </span>
                        ) : stop.city ? (
                          <span className="text-[10px] text-slate-300 font-medium bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                            {stop.city}
                          </span>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </div>

        {/* Import Info Notice */}
        {duplicateCount > 0 && (
          <div className="py-2 px-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-[11px] text-indigo-300 mt-2 flex items-center justify-between">
            <span>
              {duplicateCount} place{duplicateCount === 1 ? ' is' : 's are'} already on your map.
            </span>
            <span className="font-semibold text-white">
              {newStops.length} new place{newStops.length === 1 ? '' : 's'} will be added.
            </span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-3.5 mt-2 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleImport}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 active:scale-[0.98] shadow-lg shadow-indigo-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add All to My Map</span>
          </button>
        </div>
      </div>
    </div>
  );
};

