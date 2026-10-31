import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar/Sidebar';
import { InteractiveMap } from '../components/Map/InteractiveMap';
import { Toast } from '../components/Toast';
import type { ToastMessage } from '../components/Toast';
import type { Destination, SelectedStop, TravelMode, SharedTripData } from '../types';
import { calculateRouteMetrics, optimizeRouteStops } from '../utils/routeOptimizer';
import { 
  getSavedTrip, 
  saveTripToStorage, 
  getSavedTripFromCloud,
  decodeTripFromUrl,
  fetchSharedTrip
} from '../services/tripService';
import { SharedTripPreviewModal } from '../components/SharedTripPreviewModal';
import { ShareDialog } from '../components/ShareDialog';
import { ResetRouteModal } from '../components/ResetRouteModal';
import { MobileBottomSheet } from '../components/Sidebar/MobileBottomSheet';
import { OnboardingModal } from '../components/OnboardingModal';
import { Map as MapIcon, ListFilter } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.uid || user?.email || user?.displayName || 'guest';

  // Load previously saved trip from localStorage
  const savedTrip = useMemo(() => getSavedTrip(userId), [userId]);

  const [tripTitle, setTripTitle] = useState(() => savedTrip?.title || 'India Highlights Explorer');
  const [travelMode, setTravelMode] = useState<TravelMode>(() => savedTrip?.travelMode || 'DRIVING');
  const [stops, setStops] = useState<SelectedStop[]>(() => savedTrip?.stops || []);
  // Keep initial active stop null so no popups open passively on initial page load
  const [activeStopId, setActiveStopId] = useState<string | null>(null);
  const [isOptimized, setIsOptimized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(() => savedTrip?.lastSavedAt || null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // First-time user onboarding modal state
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  // Active state filter for search & organization
  const [selectedState, setSelectedState] = useState<string>('All States');

  // Shared trip preview modal state
  const [sharedTripPreview, setSharedTripPreview] = useState<SharedTripData | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Reset route confirmation modal state
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Direct sharing modal state for mobile Trip Plan
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Intelligent onboarding detection: trigger on first login / visit
  useEffect(() => {
    const onboardingKey = `vazhikatti_onboarding_${userId}`;
    const hasSeen = localStorage.getItem(onboardingKey) || localStorage.getItem('vazhikatti_onboarding_completed');
    if (!hasSeen) {
      setIsOnboardingOpen(true);
    }
  }, [userId]);

  const handleCompleteOnboarding = () => {
    const onboardingKey = `vazhikatti_onboarding_${userId}`;
    localStorage.setItem(onboardingKey, 'true');
    localStorage.setItem('vazhikatti_onboarding_completed', 'true');
    setIsOnboardingOpen(false);
  };

  // Sync if saved trip is updated, shared via URL, or loaded from cloud
  useEffect(() => {
    // 1. Check for shared trip link in URL (supports ?share=... or ?trip=...)
    const hash = window.location.hash || '';
    const queryPart = hash.includes('?') ? hash.split('?')[1] : window.location.search.replace(/^\?/, '');
    const searchParams = new URLSearchParams(queryPart);
    const shareId = searchParams.get('share');
    const tripParam = searchParams.get('trip');

    if (shareId || tripParam) {
      // Priority 1: Fetch authoritative shared trip record from backend by shareId
      if (shareId) {
        fetchSharedTrip(shareId).then((sharedRecord) => {
          if (sharedRecord && sharedRecord.stops && sharedRecord.stops.length > 0) {
            setSharedTripPreview(sharedRecord);
            setIsPreviewModalOpen(true);
            return;
          }
          // Fallback to base64 trip decoding if backend record is missing
          if (tripParam) {
            const fallbackDecoded = decodeTripFromUrl(tripParam);
            if (fallbackDecoded && fallbackDecoded.stops.length > 0) {
              setSharedTripPreview({
                title: fallbackDecoded.title,
                travelMode: fallbackDecoded.travelMode,
                selectedState: fallbackDecoded.selectedState || 'All States',
                stops: fallbackDecoded.stops,
                totalDestinations: fallbackDecoded.stops.length,
              });
              setIsPreviewModalOpen(true);
            }
          }
        });
      } else if (tripParam) {
        // Direct base64 fallback
        const decoded = decodeTripFromUrl(tripParam);
        if (decoded && decoded.stops.length > 0) {
          setSharedTripPreview({
            title: decoded.title,
            travelMode: decoded.travelMode,
            selectedState: decoded.selectedState || 'All States',
            stops: decoded.stops,
            totalDestinations: decoded.stops.length,
          });
          setIsPreviewModalOpen(true);
        }
      }
    }

    // 2. Load from localStorage
    const loaded = getSavedTrip(userId);
    if (loaded && loaded.stops.length > 0 && stops.length === 0) {
      setStops(loaded.stops);
      setTripTitle(loaded.title);
      setTravelMode(loaded.travelMode);
      setLastSavedAt(loaded.lastSavedAt);
      // Do not auto-select activeStopId so the map starts clean without unsolicited popups
    }

    // 3. Check Cloud (Firebase or Backend API) for cross-device sync between laptop & phone
    getSavedTripFromCloud(userId).then((cloudTrip) => {
      if (cloudTrip && Array.isArray(cloudTrip.stops) && cloudTrip.stops.length > 0) {
        setStops((currentStops) => {
          if (currentStops.length === 0) {
            setTripTitle(cloudTrip.title);
            setTravelMode(cloudTrip.travelMode);
            setLastSavedAt(cloudTrip.lastSavedAt);
            setToast({
              id: Date.now().toString(),
              type: 'info',
              title: 'Trip Restored from Cloud',
              description: `Synced "${cloudTrip.title}" (${cloudTrip.stops.length} stops) from your cloud account.`,
            });
            return cloudTrip.stops;
          }
          return currentStops;
        });
      }
    });
  }, [userId]);

  // Mobile active tab toggle ('sidebar' | 'map')
  const [mobileView, setMobileView] = useState<'sidebar' | 'map'>('map');

  const showToast = (toastMsg: Omit<ToastMessage, 'id'>) => {
    const id = Date.now().toString();
    setToast({ ...toastMsg, id });
  };

  // Compute live route metrics
  const metrics = useMemo(() => {
    return calculateRouteMetrics(stops, travelMode).metrics;
  }, [stops, travelMode]);

  // Add destination to itinerary
  const handleAddStop = (destination: Destination) => {
    const isDuplicate = stops.some(
      (s) =>
        (destination.placeId && s.placeId === destination.placeId) ||
        s.id === destination.id ||
        (s.name.toLowerCase() === destination.name.toLowerCase() &&
          s.coordinates.lat === destination.coordinates.lat &&
          s.coordinates.lng === destination.coordinates.lng)
    );

    if (isDuplicate) {
      showToast({
        type: 'warning',
        title: 'Already in Itinerary',
        description: `${destination.name} is already added to your trip stops.`,
      });
      return;
    }

    const newStop: SelectedStop = {
      ...destination,
      stopOrder: stops.length + 1,
      customDurationMinutes: destination.typicalVisitDurationMinutes,
    };

    const nextStops = [...stops, newStop];
    const updated = calculateRouteMetrics(nextStops, travelMode);
    setStops(updated.enrichedStops);
    setActiveStopId(destination.id);
    setIsOptimized(false);

    showToast({
      type: 'success',
      title: 'Stop Added',
      description: `Added ${destination.name}${destination.state ? ` (${destination.state})` : ''} to your route.`,
    });
  };

  /**
   * Non-destructively imports shared destinations into the recipient's map without overwriting
   * and deduplicates against places already on the map.
   */
  const handleImportSharedDestinations = (importedStops: SelectedStop[]) => {
    const existingPlaceIds = new Set(stops.map((s) => s.placeId || s.id).filter(Boolean));
    const existingNames = new Set(stops.map((s) => s.name.toLowerCase()));

    const newlyAdded: SelectedStop[] = [];

    for (const item of importedStops) {
      const isDuplicate =
        existingPlaceIds.has(item.placeId || item.id) ||
        existingNames.has(item.name.toLowerCase());

      if (!isDuplicate) {
        newlyAdded.push({
          ...item,
          stopOrder: stops.length + newlyAdded.length + 1,
        });
        if (item.placeId) existingPlaceIds.add(item.placeId);
        existingNames.add(item.name.toLowerCase());
      }
    }

    if (newlyAdded.length === 0) {
      showToast({
        type: 'info',
        title: 'Already on Your Map',
        description: 'All shared destinations are already included in your itinerary.',
      });
    } else {
      const combined = [...stops, ...newlyAdded];
      const updated = calculateRouteMetrics(combined, travelMode);
      setStops(updated.enrichedStops);
      if (newlyAdded[0]) {
        setActiveStopId(newlyAdded[0].id);
      }
      setIsOptimized(false);

      showToast({
        type: 'success',
        title: 'Destinations Imported',
        description: `Successfully added ${newlyAdded.length} new place${newlyAdded.length === 1 ? '' : 's'} to your map!`,
      });
    }

    // Clean up share query params from URL without reload
    window.history.replaceState(null, '', window.location.pathname + '#/dashboard');
  };

  const handleRemoveStop = (id: string) => {
    const target = stops.find((s) => s.id === id);
    const remaining = stops.filter((s) => s.id !== id);
    const updated = calculateRouteMetrics(remaining, travelMode);
    setStops(updated.enrichedStops);
    if (activeStopId === id) {
      setActiveStopId(updated.enrichedStops[0]?.id || null);
    }
    setIsOptimized(false);

    if (target) {
      showToast({
        type: 'info',
        title: 'Stop Removed',
        description: `Removed ${target.name} from itinerary.`,
      });
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const reordered = [...stops];
    const temp = reordered[index - 1];
    reordered[index - 1] = reordered[index];
    reordered[index] = temp;

    const updated = calculateRouteMetrics(reordered, travelMode);
    setStops(updated.enrichedStops);
    setIsOptimized(false);
  };

  const handleMoveDown = (index: number) => {
    if (index === stops.length - 1) return;
    const reordered = [...stops];
    const temp = reordered[index + 1];
    reordered[index + 1] = reordered[index];
    reordered[index] = temp;

    const updated = calculateRouteMetrics(reordered, travelMode);
    setStops(updated.enrichedStops);
    setIsOptimized(false);
  };

  const handleUpdateDuration = (id: string, minutes: number) => {
    setStops((prev) =>
      prev.map((s) => (s.id === id ? { ...s, customDurationMinutes: minutes } : s))
    );
  };

  const handleOptimizeRoute = () => {
    if (stops.length < 2) return;
    const result = optimizeRouteStops(stops, travelMode);
    setStops(result.optimizedStops);
    setIsOptimized(true);

    showToast({
      type: 'success',
      title: 'Route Optimized!',
      description: `Saved ~${result.savedDistanceKm} km and ~${result.savedDurationMinutes} mins.`,
    });
  };

  const handleReverseRoute = () => {
    if (stops.length < 2) return;
    const reversed = [...stops].reverse();
    const updated = calculateRouteMetrics(reversed, travelMode);
    setStops(updated.enrichedStops);
    setIsOptimized(false);

    showToast({
      type: 'info',
      title: 'Route Inverted',
      description: 'Reversed starting and ending destinations.',
    });
  };

  const handleSaveTrip = async () => {
    setIsSaving(true);
    try {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      await saveTripToStorage(
        {
          title: tripTitle,
          travelMode,
          stops,
          lastSavedAt: timeStr,
        },
        userId
      );

      setLastSavedAt(timeStr);
      showToast({
        type: 'success',
        title: 'Trip Saved Successfully',
        description: `"${tripTitle}" saved with ${stops.length} stop${stops.length === 1 ? '' : 's'} at ${timeStr}.`,
      });
    } catch (err) {
      console.error('Failed to save trip:', err);
      showToast({
        type: 'warning',
        title: 'Save Issue',
        description: 'Failed to persist your trip. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Trigger confirmation modal when user clicks Reset
  const handleRequestReset = () => {
    setIsResetModalOpen(true);
  };

  const handleCancelReset = () => {
    setIsResetModalOpen(false);
  };

  // Perform route reset only when user confirms in the modal
  const handleConfirmReset = () => {
    if (isResetting) return;
    setIsResetting(true);

    try {
      // 1. Clear currently selected destinations from active route
      setStops([]);

      // 2. Reset active stop selection
      setActiveStopId(null);

      // 3. Reset route optimization status
      setIsOptimized(false);

      // 4. Close the confirmation modal
      setIsResetModalOpen(false);

      // 5. Notify user with success confirmation toast
      showToast({
        type: 'success',
        title: 'Route Reset',
        description: 'Route reset successfully.',
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleClearAll = () => {
    handleRequestReset();
  };

  return (
    <div className="h-screen h-[100dvh] bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white overflow-hidden">
      {/* Top Navigation Bar */}
      <Navbar
        tripTitle={tripTitle}
        onUpdateTitle={setTripTitle}
        isSaving={isSaving}
        lastSavedAt={lastSavedAt}
        onSaveTrip={handleSaveTrip}
        onResetTrip={handleRequestReset}
        stopsCount={stops.length}
        travelMode={travelMode}
        stops={stops}
        selectedState={selectedState}
        onOpenOnboarding={() => setIsOnboardingOpen(true)}
      />

      {/* Mobile / Tablet Tab Toggle Bar */}
      <div className="lg:hidden bg-slate-950/95 border-b border-slate-800/90 px-3 py-2 flex-shrink-0 z-40 backdrop-blur-md">
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900/90 rounded-2xl border border-slate-800/80 shadow-inner">
          <button
            type="button"
            onClick={() => {
              setMobileView('map');
              setTimeout(() => {
                window.dispatchEvent(new Event('resize'));
              }, 50);
              setTimeout(() => {
                window.dispatchEvent(new Event('resize'));
              }, 200);
            }}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 min-h-[40px] select-none ${
              mobileView === 'map'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30 font-extrabold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
            aria-selected={mobileView === 'map'}
            role="tab"
          >
            <MapIcon className="w-4 h-4" />
            <span>Interactive Map</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileView('sidebar')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 min-h-[40px] select-none ${
              mobileView === 'sidebar'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30 font-extrabold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
            aria-selected={mobileView === 'sidebar'}
            role="tab"
          >
            <ListFilter className="w-4 h-4" />
            <span>Trip Plan ({stops.length})</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <main className="flex-1 w-full min-h-0 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Sidebar Panel (Trip Plan Dedicated View) */}
        <div
          className={`w-full lg:w-[35%] xl:w-[34%] h-full flex-shrink-0 min-h-0 ${
            mobileView === 'sidebar' ? 'flex flex-col' : 'hidden lg:flex lg:flex-col'
          }`}
        >
          <Sidebar
            tripTitle={tripTitle}
            onUpdateTitle={setTripTitle}
            stops={stops}
            metrics={metrics}
            travelMode={travelMode}
            isOptimized={isOptimized}
            activeStopId={activeStopId}
            onAddStop={handleAddStop}
            onSelectStop={(id) => setActiveStopId(id)}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            onRemoveStop={handleRemoveStop}
            onUpdateDuration={handleUpdateDuration}
            onClearAll={handleClearAll}
            onOptimizeRoute={handleOptimizeRoute}
            onReverseRoute={handleReverseRoute}
            selectedState={selectedState}
            onSelectState={setSelectedState}
            onOpenTutorial={() => setIsOnboardingOpen(true)}
            onSwitchToMap={() => {
              setMobileView('map');
              setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
            }}
            onOpenShare={() => setIsShareModalOpen(true)}
          />
        </div>

        {/* Real Google Map Panel (Interactive Map Clean View) */}
        <div
          className={`w-full lg:w-[65%] xl:w-[66%] h-full flex-1 relative min-h-0 ${
            mobileView === 'map' ? 'flex flex-col' : 'hidden lg:flex lg:flex-col'
          }`}
        >
          <InteractiveMap
            stops={stops}
            activeStopId={activeStopId}
            onSelectStop={(id) => setActiveStopId(id)}
            onRemoveStop={handleRemoveStop}
          />

          {/* Compact Route Summary Bar (at bottom of Map on mobile) */}
          <MobileBottomSheet
            stops={stops}
            metrics={metrics}
            isOptimized={isOptimized}
            onOptimizeRoute={handleOptimizeRoute}
            onOpenTripPlan={() => setMobileView('sidebar')}
          />
        </div>
      </main>

      {/* First-Time Intelligent Onboarding Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onComplete={handleCompleteOnboarding}
      />

      {/* Shared Destination Preview & Import Modal */}
      <SharedTripPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        sharedData={sharedTripPreview}
        currentStops={stops}
        onImport={handleImportSharedDestinations}
      />

      {/* Reset Route Confirmation Modal */}
      <ResetRouteModal
        isOpen={isResetModalOpen}
        isProcessing={isResetting}
        onCancel={handleCancelReset}
        onConfirm={handleConfirmReset}
        stopsCount={stops.length}
      />

      {/* Mobile & Sidebar Share Destinations Dialog */}
      <ShareDialog
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        stops={stops}
        tripTitle={tripTitle}
        travelMode={travelMode}
        initialState={selectedState}
      />

      {/* Notification Toast */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
};
