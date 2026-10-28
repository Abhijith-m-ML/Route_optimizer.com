import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar/Sidebar';
import { InteractiveMap } from '../components/Map/InteractiveMap';
import { Toast } from '../components/Toast';
import type { ToastMessage } from '../components/Toast';
import type { Destination, SelectedStop, TravelMode } from '../types';
import { calculateRouteMetrics, optimizeRouteStops } from '../utils/routeOptimizer';
import { 
  getSavedTrip, 
  saveTripToStorage, 
  clearSavedTrip,
  getSavedTripFromCloud,
  decodeTripFromUrl
} from '../services/tripService';
import { MPCModal } from '../components/MPC/MPCModal';
import { IPFModal } from '../components/IPF/IPFModal';
import { Map as MapIcon, ListFilter } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.displayName || user?.uid || 'pluck';

  // Load previously saved trip from localStorage
  const savedTrip = useMemo(() => getSavedTrip(userId), [userId]);

  const [tripTitle, setTripTitle] = useState(() => savedTrip?.title || 'Mumbai Highlights Explorer');
  const [travelMode, setTravelMode] = useState<TravelMode>(() => savedTrip?.travelMode || 'DRIVING');
  const [stops, setStops] = useState<SelectedStop[]>(() => savedTrip?.stops || []);
  const [activeStopId, setActiveStopId] = useState<string | null>(() => savedTrip?.stops[0]?.id || null);
  const [isOptimized, setIsOptimized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(() => savedTrip?.lastSavedAt || null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Modal visibility states for tools
  const [isMPCOpen, setIsMPCOpen] = useState(false);
  const [isIPFOpen, setIsIPFOpen] = useState(false);

  // Sync if saved trip is updated, shared via URL, or loaded from cloud
  useEffect(() => {
    // 1. Check for shared trip link in URL (e.g., sent from computer to phone)
    const hash = window.location.hash || '';
    const queryPart = hash.includes('?') ? hash.split('?')[1] : window.location.search.replace(/^\?/, '');
    const searchParams = new URLSearchParams(queryPart);
    const tripParam = searchParams.get('trip');

    if (tripParam) {
      const imported = decodeTripFromUrl(tripParam);
      if (imported && imported.stops.length > 0) {
        setStops(imported.stops);
        setTripTitle(imported.title);
        setTravelMode(imported.travelMode);
        if (imported.stops[0]) {
          setActiveStopId(imported.stops[0].id);
        }
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        saveTripToStorage(
          {
            title: imported.title,
            travelMode: imported.travelMode,
            stops: imported.stops,
            lastSavedAt: timeStr,
          },
          userId
        );
        setLastSavedAt(timeStr);
        setToast({
          id: Date.now().toString(),
          type: 'success',
          title: 'Shared Trip Imported',
          description: `Loaded "${imported.title}" with ${imported.stops.length} stop${imported.stops.length === 1 ? '' : 's'} on this device!`,
        });
        window.history.replaceState(null, '', window.location.pathname + '#/dashboard');
        return;
      }
    }

    // 2. Load from localStorage
    const loaded = getSavedTrip(userId);
    if (loaded && loaded.stops.length > 0 && stops.length === 0) {
      setStops(loaded.stops);
      setTripTitle(loaded.title);
      setTravelMode(loaded.travelMode);
      setLastSavedAt(loaded.lastSavedAt);
      if (loaded.stops[0]) {
        setActiveStopId(loaded.stops[0].id);
      }
    }

    // 3. Check Cloud (Firebase or Backend API) for cross-device sync between laptop & phone
    getSavedTripFromCloud(userId).then((cloudTrip) => {
      if (cloudTrip && Array.isArray(cloudTrip.stops) && cloudTrip.stops.length > 0) {
        setStops((currentStops) => {
          // If no stops are currently loaded in this session, restore cloud trip
          if (currentStops.length === 0) {
            setTripTitle(cloudTrip.title);
            setTravelMode(cloudTrip.travelMode);
            setLastSavedAt(cloudTrip.lastSavedAt);
            if (cloudTrip.stops[0]) {
              setActiveStopId(cloudTrip.stops[0].id);
            }
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

  // Add destination to itinerary (ready for Stage 4 places integration)
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
      description: `Added ${destination.name} to your route.`,
    });
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

  const handleResetTrip = () => {
    setStops([]);
    setActiveStopId(null);
    setIsOptimized(false);
    setLastSavedAt(null);
    clearSavedTrip(userId);

    showToast({
      type: 'info',
      title: 'Itinerary Reset',
      description: 'Cleared all destinations and reset saved trip.',
    });
  };

  const handleClearAll = () => {
    setStops([]);
    setActiveStopId(null);
    setIsOptimized(false);
    setLastSavedAt(null);
    clearSavedTrip(userId);
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
        onResetTrip={handleResetTrip}
        stopsCount={stops.length}
        onOpenMPC={() => setIsMPCOpen(true)}
        onOpenIPF={() => setIsIPFOpen(true)}
        travelMode={travelMode}
        stops={stops}
      />

      {/* Mobile / Tablet Tab Toggle Bar */}
      <div className="lg:hidden flex items-center bg-slate-900/95 border-b border-slate-800 px-3 py-1.5 justify-center gap-2 flex-shrink-0 z-30 shadow-sm">
        <button
          onClick={() => {
            setMobileView('map');
            setTimeout(() => {
              window.dispatchEvent(new Event('resize'));
            }, 50);
            setTimeout(() => {
              window.dispatchEvent(new Event('resize'));
            }, 200);
          }}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
            mobileView === 'map'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white bg-slate-800/60'
          }`}
        >
          <MapIcon className="w-3.5 h-3.5" />
          <span>Interactive Map</span>
        </button>
        <button
          onClick={() => setMobileView('sidebar')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
            mobileView === 'sidebar'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white bg-slate-800/60'
          }`}
        >
          <ListFilter className="w-3.5 h-3.5" />
          <span>Trip Plan ({stops.length})</span>
        </button>
      </div>

      {/* Main Workspace Layout */}
      <main className="flex-1 w-full min-h-0 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Sidebar Panel */}
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
          />
        </div>

        {/* Real Google Map Panel */}
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
        </div>
      </main>

      {/* Notification Toast */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* MPC Multi-Place Distance Calculator Modal */}
      <MPCModal
        isOpen={isMPCOpen}
        onClose={() => setIsMPCOpen(false)}
        onAddStopToTrip={handleAddStop}
        initialStops={stops}
      />

      {/* IPF Instagram Place Finder Modal */}
      <IPFModal
        isOpen={isIPFOpen}
        onClose={() => setIsIPFOpen(false)}
        onAddStopToTrip={handleAddStop}
      />
    </div>
  );
};
