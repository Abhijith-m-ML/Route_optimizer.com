import React, { useState } from 'react';
import { 
  Folder, 
  Plus, 
  X, 
  Sparkles, 
  Check, 
  Star, 
  Edit3 
} from 'lucide-react';
import type { SelectedStop, SharedTripData } from '../types';

interface SharedTripPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  sharedData: SharedTripData | null;
  currentStops: SelectedStop[];
  onImport: (stopsToImport: SelectedStop[], customTripName?: string) => void;
}

export const SharedTripPreviewModal: React.FC<SharedTripPreviewModalProps> = ({
  isOpen,
  onClose,
  sharedData,
  currentStops,
  onImport,
}) => {
  const initialName = sharedData?.tripName || sharedData?.title || 'Shared Trip';
  const [importName, setImportName] = useState(initialName);
  const [isEditingName, setIsEditingName] = useState(false);

  // Sync state if modal reopens with new sharedData
  React.useEffect(() => {
    if (sharedData) {
      setImportName(sharedData.tripName || sharedData.title || 'Shared Trip');
    }
  }, [sharedData]);

  if (!isOpen || !sharedData) return null;

  const { title, tripName, stops, ownerName, isAllTrips } = sharedData;
  const displayName = tripName || title || 'Shared Trip';

  // Check which places are already in the recipient's map
  const existingPlaceIds = new Set(
    currentStops.map((s) => s.placeId || s.id).filter(Boolean)
  );

  const newStops = stops.filter(
    (s) =>
      !existingPlaceIds.has(s.placeId || s.id) &&
      !currentStops.some((c) => c.name.toLowerCase() === s.name.toLowerCase())
  );

  const duplicateCount = stops.length - newStops.length;

  const handleImportClick = () => {
    onImport(stops, importName.trim() || displayName);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div
        className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl p-4 sm:p-6 text-slate-100 flex flex-col max-h-[90dvh] overflow-y-auto my-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shared-preview-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3.5 border-b border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 p-0.5 shadow-lg shadow-indigo-600/30 flex-shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block">
                Shared Trip
              </span>
              <h3 id="shared-preview-title" className="text-base sm:text-lg font-extrabold text-white leading-tight truncate">
                {displayName}
              </h3>
              <p className="text-xs text-slate-400 truncate">
                {ownerName ? `Shared by ${ownerName}` : 'Shared trip collection'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition flex-shrink-0"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Name Editing Section for Recipient's Account */}
        <div className="pt-3 pb-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
            <span>Add to My Trips as:</span>
            {!isEditingName && (
              <button
                type="button"
                onClick={() => setIsEditingName(true)}
                className="text-indigo-400 hover:text-indigo-300 text-[11px] font-semibold flex items-center gap-1"
              >
                <Edit3 className="w-3 h-3" />
                <span>Rename</span>
              </button>
            )}
          </label>
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={importName}
                onChange={(e) => setImportName(e.target.value)}
                maxLength={60}
                className="flex-1 bg-slate-950 border border-indigo-500 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setIsEditingName(false)}
                className="px-2.5 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
              >
                Done
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-semibold">
              <Folder className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
              <span className="truncate">{importName}</span>
            </div>
          )}
        </div>

        {/* Metadata Summary Cards */}
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Trip Type
            </span>
            <span className="text-xs font-bold text-indigo-300 mt-0.5 truncate flex items-center gap-1">
              <Folder className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
              {isAllTrips ? 'All Trips Bundle' : 'Custom Collection'}
            </span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Total Destinations
            </span>
            <span className="text-xs font-bold text-white mt-0.5">
              {stops.length} {stops.length === 1 ? 'place' : 'places'}
            </span>
          </div>
        </div>

        {/* Scrollable Destinations List */}
        <div className="flex-1 overflow-y-auto py-2 pr-1 space-y-2">
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
                          On Map
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
        </div>

        {/* Duplicate Notice */}
        {duplicateCount > 0 && (
          <div className="py-2 px-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-[11px] text-indigo-300 mt-2 flex items-center justify-between">
            <span>
              {duplicateCount} place{duplicateCount === 1 ? ' is' : 's are'} already in your places.
            </span>
            <span className="font-semibold text-white">
              {newStops.length} new place{newStops.length === 1 ? '' : 's'}
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
            onClick={handleImportClick}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 active:scale-[0.98] shadow-lg shadow-indigo-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add to My Trips</span>
          </button>
        </div>
      </div>
    </div>
  );
};
