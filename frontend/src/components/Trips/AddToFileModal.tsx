import React, { useState } from 'react';
import { 
  Folder, 
  Plus, 
  Check, 
  X, 
  Loader2, 
  MapPin, 
  AlertCircle,
  FolderPlus
} from 'lucide-react';
import type { Destination, SelectedStop, TripCollection } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { calculateRouteMetrics } from '../../utils/routeOptimizer';
import { updateUserTrip, createUserTrip, saveLocalTrips } from '../../services/tripService';
import { findDuplicateStop, hasDuplicateStop, deduplicateStops } from '../../utils/placeMatching';

export interface AddToFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  destination: Destination | null;
  trips: TripCollection[];
  userId?: string | null;
  token?: string | null;
  onTripUpdated?: (updatedTrip: TripCollection) => void;
  onTripCreated?: (newTrip: TripCollection) => void;
  onSuccessToast?: (message: string) => void;
  onWarningToast?: (message: string) => void;
}

export const AddToFileModal: React.FC<AddToFileModalProps> = ({
  isOpen,
  onClose,
  destination,
  trips,
  userId,
  token,
  onTripUpdated,
  onTripCreated,
  onSuccessToast,
  onWarningToast,
}) => {
  const { isDark } = useTheme();
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New File / Collection Creation inline state
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  if (!isOpen || !destination) return null;

  const handleSelectTrip = async (trip: TripCollection) => {
    setErrorMessage(null);

    // Robust duplicate place prevention within the selected file/collection
    const isDuplicate = hasDuplicateStop(trip.stops, destination);
    const duplicateStop = findDuplicateStop(trip.stops, destination);
    if (isDuplicate || duplicateStop) {
      // Destination is already in this file
      const msg = 'This place is already in this file.';
      setErrorMessage(msg);
      if (onWarningToast) {
        onWarningToast(msg);
      }
      return;
    }

    setSelectedTripId(trip.id);
    setIsSubmitting(true);

    try {
      const currentStops = trip.stops || [];
      const newStop: SelectedStop = {
        ...destination,
        stopOrder: currentStops.length + 1,
        customDurationMinutes: destination.typicalVisitDurationMinutes || 90,
      };

      const nextStops = deduplicateStops([...currentStops, newStop]);
      const updatedMetrics = calculateRouteMetrics(nextStops, trip.travelMode || 'DRIVING');

      const updatedTripData: TripCollection = {
        ...trip,
        stops: updatedMetrics.enrichedStops,
        isOptimized: false,
        updatedAt: new Date().toISOString(),
      };

      // 1. Immediately persist to backend PostgreSQL database
      const confirmedTrip = await updateUserTrip(
        trip.id,
        {
          name: updatedTripData.name,
          description: updatedTripData.description,
          stops: updatedTripData.stops,
          travelMode: updatedTripData.travelMode,
          isOptimized: updatedTripData.isOptimized,
        },
        userId,
        token
      );

      // 2. Synchronize local storage & parent state
      const nextTrips = trips.map((t) => (t.id === trip.id ? confirmedTrip : t));
      saveLocalTrips(nextTrips, userId);

      if (onTripUpdated) {
        onTripUpdated(confirmedTrip);
      }

      if (onSuccessToast) {
        onSuccessToast(`Added ${destination.name} to "${trip.name}"!`);
      }

      onClose();
    } catch (err: any) {
      console.error('[AddToFileModal] Failed to add stop to collection:', err);
      setErrorMessage(err.message || 'Failed to save place to backend. Please check connection and retry.');
    } finally {
      setIsSubmitting(false);
      setSelectedTripId(null);
    }
  };

  const handleCreateAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newFileName.trim();
    if (!trimmed) {
      setErrorMessage('Please enter a name for the new file.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const initialStop: SelectedStop = {
        ...destination,
        stopOrder: 1,
        customDurationMinutes: destination.typicalVisitDurationMinutes || 90,
      };

      // 1. Create and persist new trip to backend
      const createdTrip = await createUserTrip(
        {
          name: trimmed,
          description: `Created with ${destination.name}`,
          travelMode: 'DRIVING',
          stops: [initialStop],
          isOptimized: false,
        },
        userId,
        token
      );

      // 2. Save locally and update parent state
      const nextTrips = [createdTrip, ...trips];
      saveLocalTrips(nextTrips, userId);

      if (onTripCreated) {
        onTripCreated(createdTrip);
      }

      if (onSuccessToast) {
        onSuccessToast(`Created "${createdTrip.name}" and added ${destination.name}!`);
      }

      setNewFileName('');
      setIsCreatingNew(false);
      onClose();
    } catch (err: any) {
      console.error('[AddToFileModal] Failed to create collection and add place:', err);
      setErrorMessage(err.message || 'Failed to create new file. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)] bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Add Destination to File"
    >
      <div
        className={`w-full sm:max-w-md max-h-[calc(100dvh-1.5rem-env(safe-area-inset-top,0px))] flex flex-col rounded-t-3xl sm:rounded-3xl border shadow-2xl overflow-hidden transition-all duration-200 pb-safe ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-black/60'
            : 'bg-white border-slate-200 text-slate-900 shadow-slate-900/20'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Destination Preview */}
        <div
          className={`p-4 border-b flex-shrink-0 ${
            isDark ? 'border-slate-800/80 bg-slate-900/90' : 'border-slate-200/80 bg-slate-50/80'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600/15 text-indigo-400 flex items-center justify-center">
                <FolderPlus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight">Add to File</h3>
                <p className="text-[11px] text-slate-400">Save to a trip itinerary collection</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className={`p-1.5 rounded-xl transition ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Place Preview Card */}
          <div
            className={`p-2.5 rounded-2xl border flex items-center gap-3 ${
              isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
            }`}
          >
            {destination.photoUrl ? (
              <img
                src={destination.photoUrl}
                alt={destination.name}
                className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-slate-700/40 bg-slate-800"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white flex-shrink-0 font-bold text-base">
                {destination.name.slice(0, 1)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold truncate">{destination.name}</h4>
              <p className="text-[11px] text-slate-400 flex items-center gap-1 truncate mt-0.5">
                <MapPin className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                <span>
                  {destination.city || destination.state
                    ? `${destination.city ? destination.city : ''}${destination.city && destination.country ? ', ' : ''}${destination.country || ''}`
                    : destination.shortAddress || destination.address}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Error Alert (if duplicate or submission fails) */}
        {errorMessage && (
          <div className="p-3 mx-4 mt-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span className="flex-1">{errorMessage}</span>
          </div>
        )}

        {/* Collections List */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1 min-h-0">
          <div className="flex items-center justify-between px-1 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Select Destination File ({trips.length})
            </span>

            {!isCreatingNew && (
              <button
                type="button"
                onClick={() => setIsCreatingNew(true)}
                className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New File</span>
              </button>
            )}
          </div>

          {/* Inline Create New File Form */}
          {isCreatingNew && (
            <form onSubmit={handleCreateAndAdd} className="mb-3 p-3 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-300">Create New Collection</span>
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="text-slate-400 hover:text-white text-xs"
                >
                  Cancel
                </button>
              </div>
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="e.g., Summer Trip, Europe 2026..."
                autoFocus
                className={`w-full px-3 py-2 rounded-xl text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500'
                    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
              <button
                type="submit"
                disabled={isSubmitting || !newFileName.trim()}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Creating & Adding...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create & Add Place</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* List of Files */}
          {trips.length === 0 ? (
            <div className="text-center py-6">
              <Folder className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-semibold text-slate-400">No trip files created yet</p>
              <button
                type="button"
                onClick={() => setIsCreatingNew(true)}
                className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Your First File</span>
              </button>
            </div>
          ) : (
            trips.map((trip) => {
              const stopsCount = trip.stops?.length || 0;
              const isAlreadyAdded = Boolean(findDuplicateStop(trip.stops, destination));
              const isCurrentSubmitting = isSubmitting && selectedTripId === trip.id;

              return (
                <button
                  key={trip.id}
                  type="button"
                  onClick={() => handleSelectTrip(trip)}
                  disabled={isSubmitting || isAlreadyAdded}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left ${
                    isAlreadyAdded
                      ? isDark
                        ? 'bg-slate-900/40 border-slate-800/60 opacity-60 cursor-not-allowed text-slate-400'
                        : 'bg-slate-100/60 border-slate-200/60 opacity-60 cursor-not-allowed text-slate-400'
                      : isDark
                      ? 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-indigo-500/40 text-slate-200 active:scale-[0.99]'
                      : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100 hover:border-indigo-400/50 text-slate-800 active:scale-[0.99]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isAlreadyAdded
                          ? 'bg-slate-800 text-slate-500'
                          : 'bg-indigo-500/15 text-indigo-400'
                      }`}
                    >
                      <Folder className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{trip.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {stopsCount} {stopsCount === 1 ? 'place' : 'places'} • {trip.travelMode || 'DRIVING'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isCurrentSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                    ) : isAlreadyAdded ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/60 flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" /> Added
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-indigo-400 group-hover:text-indigo-300">
                        Select
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          className={`px-4 py-3 border-t text-center flex-shrink-0 ${
            isDark ? 'border-slate-800/80 bg-slate-950/40 text-slate-500' : 'border-slate-200/80 bg-slate-50/60 text-slate-400'
          }`}
        >
          <p className="text-[10px] font-semibold">
            Places are automatically saved & synchronized across all your devices
          </p>
        </div>
      </div>
    </div>
  );
};
