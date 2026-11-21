import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  Folder, 
  Layers, 
  ChevronDown, 
  Loader2, 
  AlertCircle,
  ExternalLink,
  Trash2
} from 'lucide-react';
import type { SelectedStop, TravelMode, TripCollection } from '../types';
import { createTripCollectionShare, revokeTripShare } from '../services/tripService';
import { useAuth } from '../context/AuthContext';

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  stops: SelectedStop[];
  tripTitle: string;
  travelMode: TravelMode;
  initialState?: string;
  trips?: TripCollection[];
  activeTripId?: string | 'ALL';
}

export const ShareDialog: React.FC<ShareDialogProps> = ({
  isOpen,
  onClose,
  stops,
  tripTitle,
  travelMode,
  trips = [],
  activeTripId = 'ALL',
}) => {
  const { user } = useAuth();
  const [selectedTargetId, setSelectedTargetId] = useState<string | 'ALL'>(activeTripId);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [currentShareId, setCurrentShareId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  // Determine current active trip or all trips
  const currentTrip = selectedTargetId === 'ALL' ? null : trips.find((t) => t.id === selectedTargetId);

  // Eligible stops for this share
  const eligibleStops = useMemo(() => {
    if (selectedTargetId === 'ALL') {
      if (trips.length > 0) {
        return trips.flatMap((t) => t.stops || []);
      }
      return stops;
    }
    const target = trips.find((t) => t.id === selectedTargetId);
    return target?.stops || stops;
  }, [selectedTargetId, trips, stops]);

  const handleTargetSelect = (targetId: string | 'ALL') => {
    setSelectedTargetId(targetId);
    setIsDropdownOpen(false);
    setShareUrl(null);
    setCurrentShareId(null);
    setCopied(false);
    setErrorMessage(null);
    setSuccessNotice(null);
  };

  const handleGenerateShare = async () => {
    if (eligibleStops.length === 0) {
      setErrorMessage('No destinations found to share.');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    setSuccessNotice(null);
    try {
      const isAll = selectedTargetId === 'ALL';
      const result = await createTripCollectionShare({
        tripId: isAll ? undefined : selectedTargetId,
        isAllTrips: isAll,
        tripName: isAll ? 'All Trips' : currentTrip?.name || tripTitle,
        title: isAll ? 'All My Trips' : `Shared Trip: ${currentTrip?.name || tripTitle}`,
        ownerName: user?.displayName || user?.username || 'Fellow Traveler',
        userId: user?.uid,
        stops: eligibleStops,
        travelMode,
        token: user?.token,
      });

      setShareUrl(result.shareUrl);
      if (result.shareId) {
        setCurrentShareId(result.shareId);
      }
      setSuccessNotice('Short sharing link ready!');
    } catch (err: any) {
      console.error('[ShareDialog] Error sharing trip:', err);
      setErrorMessage(err.message || 'Could not generate share link. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Automatically generate or retrieve existing short link when opening
  useEffect(() => {
    if (isOpen && eligibleStops.length > 0 && !shareUrl && !isGenerating) {
      handleGenerateShare();
    }
  }, [isOpen, selectedTargetId]);

  const handleCopyExistingUrl = async () => {
    if (shareUrl && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      } catch {
        // Fallback
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }
    }
  };

  const handleNativeShare = async () => {
    if (!shareUrl) return;
    if (canNativeShare) {
      try {
        await navigator.share({
          title: currentTrip?.name || tripTitle || 'Route Optimizer Trip',
          text: `Explore this travel route on Route Optimizer: ${currentTrip?.name || tripTitle}`,
          url: shareUrl,
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          handleCopyExistingUrl();
        }
      }
    } else {
      handleCopyExistingUrl();
    }
  };

  const handleRevokeLink = async () => {
    if (!currentShareId) return;
    if (!window.confirm('Are you sure you want to revoke this public link? Anyone who tries to open it will no longer be able to access the trip.')) {
      return;
    }

    setIsRevoking(true);
    setErrorMessage(null);
    try {
      const ok = await revokeTripShare(currentShareId, user?.token, user?.uid);
      if (ok) {
        setShareUrl(null);
        setCurrentShareId(null);
        setSuccessNotice('Share link has been revoked. It will no longer resolve.');
      } else {
        setErrorMessage('Failed to revoke link. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error revoking link.');
    } finally {
      setIsRevoking(false);
    }
  };

  if (!isOpen) return null;

  const totalAllPlaces = trips.reduce((acc, t) => acc + (t.stops?.length || 0), stops.length);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 pt-[max(12px,env(safe-area-inset-top,0px))] pb-[max(12px,env(safe-area-inset-bottom,0px))] pl-[max(12px,env(safe-area-inset-left,0px))] pr-[max(12px,env(safe-area-inset-right,0px))] bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div 
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-4 sm:p-6 text-slate-100 flex flex-col max-h-[calc(100dvh-2rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))] overflow-y-auto my-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-dialog-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 id="share-dialog-title" className="text-base font-bold text-white leading-tight">
                Share Trip Collection
              </h3>
              <p className="text-xs text-slate-400">
                Share a specific trip or your entire collection with others
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-4 space-y-4 overflow-y-auto flex-1 pr-1">
          {/* Trip Selection Dropdown */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Select Trip to Share
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-800/90 hover:bg-slate-800 border border-slate-700 rounded-xl text-left transition shadow-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {selectedTargetId === 'ALL' ? (
                    <Layers className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                  ) : (
                    <Folder className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  )}
                  <span className="text-sm font-semibold text-white truncate">
                    {selectedTargetId === 'ALL' ? 'All Trips' : currentTrip?.name || 'Selected Trip'}
                  </span>
                  <span className="text-xs text-slate-400 bg-slate-900/60 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                    {eligibleStops.length} {eligibleStops.length === 1 ? 'place' : 'places'}
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition ${isDropdownOpen ? 'rotate-180 text-indigo-400' : ''}`} />
              </button>

              {/* Dropdown Options */}
              {isDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-1 z-30 max-h-56 overflow-y-auto divide-y divide-slate-800/60">
                  {/* All Trips */}
                  <div
                    onClick={() => handleTargetSelect('ALL')}
                    className={`flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold cursor-pointer transition ${
                      selectedTargetId === 'ALL'
                        ? 'bg-indigo-600/20 text-indigo-300 font-bold'
                        : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      <span>All Trips (Entire Collection)</span>
                    </div>
                    <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                      {totalAllPlaces}
                    </span>
                  </div>

                  {/* Individual User Trips */}
                  {trips.map((trip) => {
                    const count = trip.stops?.length || 0;
                    const isSelected = selectedTargetId === trip.id;
                    return (
                      <div
                        key={trip.id}
                        onClick={() => handleTargetSelect(trip.id)}
                        className={`flex items-center justify-between px-3.5 py-2.5 text-xs cursor-pointer transition ${
                          isSelected
                            ? 'bg-indigo-600/20 text-indigo-300 font-bold'
                            : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Folder className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                          <span className="truncate">{trip.name}</span>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded flex-shrink-0">
                          {count} {count === 1 ? 'place' : 'places'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Destination Preview List */}
          <div className="bg-slate-950/60 rounded-2xl border border-slate-800/80 p-3.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-2">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                Destinations in this share ({eligibleStops.length}):
              </span>
              <span className="text-[11px] text-indigo-400 font-bold truncate max-w-[140px]">
                {selectedTargetId === 'ALL' ? 'All Trips' : currentTrip?.name}
              </span>
            </div>

            {eligibleStops.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">
                No destinations saved in this trip.
              </p>
            ) : (
              <ol className="divide-y divide-slate-800/40 text-xs max-h-36 overflow-y-auto pr-1">
                {eligibleStops.map((stop, idx) => (
                  <li key={stop.id || idx} className="py-1.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[11px] font-bold text-slate-500 w-4">
                        {idx + 1}.
                      </span>
                      <span className="font-medium text-slate-200 truncate">
                        {stop.name}
                      </span>
                    </div>
                    {stop.city && (
                      <span className="text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.2 rounded flex-shrink-0">
                        {stop.city}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Notifications */}
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successNotice && !errorMessage && (
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* Generated Share Link Box */}
          {shareUrl && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  Link Generated &amp; Ready
                </span>
                {copied && (
                  <span className="text-[11px] text-emerald-300 font-bold animate-in fade-in">
                    Copied to clipboard!
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-xl p-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="bg-transparent text-xs text-slate-300 flex-1 truncate focus:outline-none font-mono"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />

                {/* Copy Link Button */}
                <button
                  type="button"
                  onClick={handleCopyExistingUrl}
                  className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition flex-shrink-0 flex items-center gap-1 text-xs font-semibold"
                  title="Copy share link"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>

                {/* Native Web Share API Button for Mobile / Supported Browsers */}
                {canNativeShare && (
                  <button
                    type="button"
                    onClick={handleNativeShare}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition flex-shrink-0 flex items-center justify-center"
                    title="Share via device app (WhatsApp, Messages, etc.)"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Open in new tab */}
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex-shrink-0 flex items-center justify-center"
                  title="Preview shared page"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Recipients opening this link will see a preview of {selectedTargetId === 'ALL' ? 'all shared trips' : `"${currentTrip?.name || 'this trip'}"`} and can import it directly to their own trip collections.
                </p>

                {currentShareId && (
                  <button
                    type="button"
                    disabled={isRevoking}
                    onClick={handleRevokeLink}
                    className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1 flex-shrink-0 transition ml-2"
                    title="Revoke link so it stops working"
                  >
                    {isRevoking ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    <span>Revoke</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            Close
          </button>

          <button
            type="button"
            disabled={isGenerating || eligibleStops.length === 0}
            onClick={handleGenerateShare}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-md shadow-indigo-600/25 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Generating Link...</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Trip</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
