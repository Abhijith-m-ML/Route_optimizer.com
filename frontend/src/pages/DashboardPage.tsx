import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar/Sidebar';
import { InteractiveMap } from '../components/Map/InteractiveMap';
import { Toast } from '../components/Toast';
import type { ToastMessage } from '../components/Toast';
import type { Destination, SelectedStop, TravelMode, SharedTripData, TripCollection } from '../types';
import { calculateRouteMetrics, optimizeRouteStops } from '../utils/routeOptimizer';
import { 
  decodeTripFromUrl,
  fetchSharedTrip,
  loadLocalTrips,
  saveLocalTrips,
  fetchUserTrips,
  createUserTrip,
  updateUserTrip,
  deleteUserTrip
} from '../services/tripService';
import { SharedTripPreviewModal } from '../components/SharedTripPreviewModal';
import { ShareDialog } from '../components/ShareDialog';
import { ResetRouteModal } from '../components/ResetRouteModal';
import { OnboardingModal } from '../components/OnboardingModal';
import { CreateEditTripModal } from '../components/Trips/CreateEditTripModal';
import { DeleteTripModal } from '../components/Trips/DeleteTripModal';
import { MyTripsModal } from '../components/Trips/MyTripsModal';
import { Map as MapIcon, ListFilter } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.uid || user?.email || user?.displayName || 'guest';

  // -------------------------------------------------------------
  // User-Created Trip Collections State
  // -------------------------------------------------------------
  const [trips, setTrips] = useState<TripCollection[]>(() => {
    const initial = loadLocalTrips(userId);
    if (initial.length > 0) return initial;
    // Default initial collection
    const defaultTrip: TripCollection = {
      id: 'trip_' + Date.now(),
      userId,
      name: 'Mumbai Trip',
      description: 'Iconic landmarks and destinations',
      travelMode: 'DRIVING',
      stops: [],
      isOptimized: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveLocalTrips([defaultTrip], userId);
    return [defaultTrip];
  });

  const [activeTripId, setActiveTripId] = useState<string | 'ALL'>(() => {
    const initial = loadLocalTrips(userId);
    return initial[0]?.id || 'ALL';
  });

  // Keep initial active stop null so no popups open passively on initial page load
  const [activeStopId, setActiveStopId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Modals state
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [sharedTripPreview, setSharedTripPreview] = useState<SharedTripData | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Trip Collection Modals
  const [isMyTripsModalOpen, setIsMyTripsModalOpen] = useState(false);
  const [isCreateTripModalOpen, setIsCreateTripModalOpen] = useState(false);
  const [isEditTripModalOpen, setIsEditTripModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<TripCollection | null>(null);
  const [isDeleteTripModalOpen, setIsDeleteTripModalOpen] = useState(false);
  const [deletingTrip, setDeletingTrip] = useState<TripCollection | null>(null);
  const [isDeletingTrip, setIsDeletingTrip] = useState(false);

  // Mobile active tab toggle ('sidebar' | 'map')
  const [mobileView, setMobileView] = useState<'sidebar' | 'map'>('map');

  const showToast = (toastMsg: Omit<ToastMessage, 'id'>) => {
    const id = Date.now().toString();
    setToast({ ...toastMsg, id });
  };

  // Synchronize trips from backend API with local cache
  useEffect(() => {
    fetchUserTrips(userId, user?.token).then((remoteTrips) => {
      if (remoteTrips && remoteTrips.length > 0) {
        setTrips(remoteTrips);
        setActiveTripId((prev) => {
          if (prev === 'ALL') return 'ALL';
          if (remoteTrips.some((t) => t.id === prev)) return prev;
          return remoteTrips[0]?.id || 'ALL';
        });
      }
    });
  }, [userId, user?.token]);

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

  // Check URL for shared trip parameters
  useEffect(() => {
    const hash = window.location.hash || '';
    const queryPart = hash.includes('?') ? hash.split('?')[1] : window.location.search.replace(/^\?/, '');
    const searchParams = new URLSearchParams(queryPart);
    const shareId = searchParams.get('share');
    const tripParam = searchParams.get('trip');

    if (shareId) {
      fetchSharedTrip(shareId).then((sharedRecord) => {
        if (sharedRecord && sharedRecord.stops && sharedRecord.stops.length > 0) {
          setSharedTripPreview(sharedRecord);
          setIsPreviewModalOpen(true);
        } else if (tripParam) {
          const fallback = decodeTripFromUrl(tripParam);
          if (fallback && fallback.stops.length > 0) {
            setSharedTripPreview({
              title: fallback.title,
              travelMode: fallback.travelMode,
              stops: fallback.stops,
              totalDestinations: fallback.stops.length,
            });
            setIsPreviewModalOpen(true);
          }
        }
      });
    } else if (tripParam) {
      const decoded = decodeTripFromUrl(tripParam);
      if (decoded && decoded.stops.length > 0) {
        setSharedTripPreview({
          title: decoded.title,
          travelMode: decoded.travelMode,
          stops: decoded.stops,
          totalDestinations: decoded.stops.length,
        });
        setIsPreviewModalOpen(true);
      }
    }
  }, []);

  // Active trip and displayed destinations resolution
  const activeTrip = useMemo(() => {
    if (activeTripId === 'ALL') return null;
    return trips.find((t) => t.id === activeTripId) || null;
  }, [trips, activeTripId]);

  const currentStops: SelectedStop[] = useMemo(() => {
    if (activeTripId === 'ALL') {
      return trips.flatMap((t) => t.stops || []);
    }
    return activeTrip?.stops || [];
  }, [activeTripId, activeTrip, trips]);

  // Alias for backward compatibility with component interfaces and tests
  const stops = currentStops;

  const travelMode: TravelMode = activeTrip?.travelMode || 'DRIVING';
  const tripTitle: string = activeTripId === 'ALL' ? 'All Trips' : activeTrip?.name || 'My Trip';
  const isOptimized: boolean = activeTrip?.isOptimized || false;

  // Live route metrics
  const metrics = useMemo(() => {
    return calculateRouteMetrics(currentStops, travelMode).metrics;
  }, [currentStops, travelMode]);

  // Existing trip names for case-insensitive duplicate validation
  const existingTripNames = useMemo(() => trips.map((t) => t.name), [trips]);

  // Helper to persist updated trip list locally and remotely
  const persistTripUpdates = useCallback(
    (updatedTrip: TripCollection) => {
      setTrips((prev) => {
        const next = prev.map((t) => (t.id === updatedTrip.id ? updatedTrip : t));
        saveLocalTrips(next, userId);
        return next;
      });
      updateUserTrip(
        updatedTrip.id,
        {
          stops: updatedTrip.stops,
          travelMode: updatedTrip.travelMode,
          isOptimized: updatedTrip.isOptimized,
        },
        userId,
        user?.token
      );
    },
    [userId, user?.token]
  );

  // Add destination to currently active trip (or prompt / default)
  const handleAddStop = async (destination: Destination) => {
    let targetTrip = activeTrip;
    let currentTripsList = [...trips];

    // If viewing ALL trips, add to the first trip or create a new one
    if (!targetTrip) {
      if (currentTripsList.length === 0) {
        try {
          const newTrip = await createUserTrip(
            { name: 'My First Trip', description: 'Created with your first destination' },
            userId,
            user?.token
          );
          currentTripsList = [newTrip];
          setTrips(currentTripsList);
          setActiveTripId(newTrip.id);
          targetTrip = newTrip;
        } catch (err: any) {
          showToast({ type: 'warning', title: 'Trip Error', description: err.message });
          return;
        }
      } else {
        targetTrip = currentTripsList[0];
        setActiveTripId(targetTrip.id);
      }
    }

    const targetStops = targetTrip.stops || [];
    const isDuplicate = targetStops.some(
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
        description: `${destination.name} is already added to "${targetTrip.name}".`,
      });
      return;
    }

    const newStop: SelectedStop = {
      ...destination,
      stopOrder: targetStops.length + 1,
      customDurationMinutes: destination.typicalVisitDurationMinutes,
    };

    const nextStops = [...targetStops, newStop];
    const updated = calculateRouteMetrics(nextStops, targetTrip.travelMode || 'DRIVING');

    const updatedTrip: TripCollection = {
      ...targetTrip,
      stops: updated.enrichedStops,
      isOptimized: false,
      updatedAt: new Date().toISOString(),
    };

    persistTripUpdates(updatedTrip);
    setActiveStopId(destination.id);

    showToast({
      type: 'success',
      title: 'Stop Added',
      description: `Added ${destination.name} to "${targetTrip.name}".`,
    });
  };

  const handleRemoveStop = (id: string) => {
    if (!activeTrip) {
      // Find which trip contains this stop
      const ownerTrip = trips.find((t) => t.stops?.some((s) => s.id === id));
      if (!ownerTrip) return;
      const target = ownerTrip.stops.find((s) => s.id === id);
      const remaining = ownerTrip.stops.filter((s) => s.id !== id);
      const updated = calculateRouteMetrics(remaining, ownerTrip.travelMode);
      persistTripUpdates({
        ...ownerTrip,
        stops: updated.enrichedStops,
        isOptimized: false,
        updatedAt: new Date().toISOString(),
      });
      if (activeStopId === id) setActiveStopId(null);
      if (target) {
        showToast({
          type: 'info',
          title: 'Stop Removed',
          description: `Removed ${target.name} from "${ownerTrip.name}".`,
        });
      }
      return;
    }

    const target = activeTrip.stops.find((s) => s.id === id);
    const remaining = activeTrip.stops.filter((s) => s.id !== id);
    const updated = calculateRouteMetrics(remaining, activeTrip.travelMode);
    persistTripUpdates({
      ...activeTrip,
      stops: updated.enrichedStops,
      isOptimized: false,
      updatedAt: new Date().toISOString(),
    });
    if (activeStopId === id) setActiveStopId(null);
    if (target) {
      showToast({
        type: 'info',
        title: 'Stop Removed',
        description: `Removed ${target.name} from "${activeTrip.name}".`,
      });
    }
  };

  const handleMoveUp = (index: number) => {
    if (!activeTrip || index === 0) return;
    const reordered = [...activeTrip.stops];
    const temp = reordered[index - 1];
    reordered[index - 1] = reordered[index];
    reordered[index] = temp;

    const updated = calculateRouteMetrics(reordered, activeTrip.travelMode);
    persistTripUpdates({
      ...activeTrip,
      stops: updated.enrichedStops,
      isOptimized: false,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleMoveDown = (index: number) => {
    if (!activeTrip || index === activeTrip.stops.length - 1) return;
    const reordered = [...activeTrip.stops];
    const temp = reordered[index + 1];
    reordered[index + 1] = reordered[index];
    reordered[index] = temp;

    const updated = calculateRouteMetrics(reordered, activeTrip.travelMode);
    persistTripUpdates({
      ...activeTrip,
      stops: updated.enrichedStops,
      isOptimized: false,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleUpdateDuration = (id: string, minutes: number) => {
    if (!activeTrip) return;
    const updatedStops = activeTrip.stops.map((s) =>
      s.id === id ? { ...s, customDurationMinutes: minutes } : s
    );
    persistTripUpdates({
      ...activeTrip,
      stops: updatedStops,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleOptimizeRoute = () => {
    if (!activeTrip || activeTrip.stops.length < 2) return;
    const result = optimizeRouteStops(activeTrip.stops, activeTrip.travelMode);
    persistTripUpdates({
      ...activeTrip,
      stops: result.optimizedStops,
      isOptimized: true,
      updatedAt: new Date().toISOString(),
    });

    showToast({
      type: 'success',
      title: 'Route Optimized!',
      description: `Saved ~${result.savedDistanceKm} km and ~${result.savedDurationMinutes} mins in "${activeTrip.name}".`,
    });
  };

  const handleReverseRoute = () => {
    if (!activeTrip || activeTrip.stops.length < 2) return;
    const reversed = [...activeTrip.stops].reverse();
    const updated = calculateRouteMetrics(reversed, activeTrip.travelMode);
    persistTripUpdates({
      ...activeTrip,
      stops: updated.enrichedStops,
      isOptimized: false,
      updatedAt: new Date().toISOString(),
    });

    showToast({
      type: 'info',
      title: 'Route Inverted',
      description: 'Reversed starting and ending destinations.',
    });
  };

  // Rename current trip
  const handleUpdateTripTitle = (newTitle: string) => {
    if (!activeTrip || !newTitle.trim()) return;
    const trimmed = newTitle.trim();
    // Case-insensitive duplicate check
    const duplicate = trips.some(
      (t) => t.id !== activeTrip.id && t.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      showToast({
        type: 'warning',
        title: 'Duplicate Name',
        description: `You already have another trip named "${trimmed}".`,
      });
      return;
    }

    const updatedTrip = { ...activeTrip, name: trimmed, updatedAt: new Date().toISOString() };
    persistTripUpdates(updatedTrip);
    updateUserTrip(activeTrip.id, { name: trimmed }, userId, user?.token);
    showToast({
      type: 'success',
      title: 'Trip Renamed',
      description: `Trip renamed to "${trimmed}".`,
    });
  };

  // Reset current route confirmation flow
  const handleRequestReset = () => {
    setIsResetModalOpen(true);
  };

  const handleConfirmReset = () => {
    if (isResetting) return;
    setIsResetting(true);
    try {
      if (activeTrip) {
        const clearedTrip = {
          ...activeTrip,
          stops: [],
          isOptimized: false,
          updatedAt: new Date().toISOString(),
        };
        persistTripUpdates(clearedTrip);
      }
      setActiveStopId(null);
      setIsResetModalOpen(false);
      showToast({
        type: 'success',
        title: 'Route Reset',
        description: 'Route reset successfully.',
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleSaveTrip = async () => {
    setIsSaving(true);
    try {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      saveLocalTrips(trips, userId);
      setLastSavedAt(timeStr);
      showToast({
        type: 'success',
        title: 'Trips Saved Successfully',
        description: `All ${trips.length} trip collections saved securely at ${timeStr}.`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Create New Trip Flow
  const handleCreateNewTrip = async (data: { name: string; description?: string }) => {
    const created = await createUserTrip(data, userId, user?.token);
    setTrips((prev) => [created, ...prev]);
    setActiveTripId(created.id);
    showToast({
      type: 'success',
      title: 'Trip Created',
      description: `Trip "${created.name}" created successfully.`,
    });
  };

  // Edit Trip Flow
  const handleOpenEditTrip = (trip: TripCollection) => {
    setEditingTrip(trip);
    setIsEditTripModalOpen(true);
  };

  const handleSaveEditTrip = async (data: { name: string; description?: string }) => {
    if (!editingTrip) return;
    const updated = await updateUserTrip(editingTrip.id, data, userId, user?.token);
    setTrips((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    showToast({
      type: 'success',
      title: 'Trip Updated',
      description: `"${updated.name}" updated successfully.`,
    });
  };

  // Delete Trip Flow
  const handleOpenDeleteTrip = (trip: TripCollection) => {
    setDeletingTrip(trip);
    setIsDeleteTripModalOpen(true);
  };

  const handleConfirmDeleteTrip = async () => {
    if (!deletingTrip || isDeletingTrip) return;
    setIsDeletingTrip(true);
    try {
      await deleteUserTrip(deletingTrip.id, userId, user?.token);
      const remaining = trips.filter((t) => t.id !== deletingTrip.id);
      setTrips(remaining);
      if (activeTripId === deletingTrip.id) {
        setActiveTripId(remaining[0]?.id || 'ALL');
      }
      setIsDeleteTripModalOpen(false);
      setDeletingTrip(null);
      showToast({
        type: 'info',
        title: 'Trip Deleted',
        description: `"${deletingTrip.name}" was removed from your collections.`,
      });
    } catch (err: any) {
      showToast({
        type: 'warning',
        title: 'Delete Failed',
        description: err.message || 'Failed to delete trip.',
      });
    } finally {
      setIsDeletingTrip(false);
    }
  };

  // Import Shared Trip Flow
  const handleImportSharedDestinations = async (importedStops: SelectedStop[], customTripName?: string) => {
    const targetName = customTripName?.trim() || sharedTripPreview?.tripName || 'Shared Trip';
    try {
      let finalName = targetName;
      let counter = 2;
      while (trips.some((t) => t.name.trim().toLowerCase() === finalName.toLowerCase())) {
        finalName = `${targetName} (${counter})`;
        counter++;
      }

      const created = await createUserTrip(
        {
          name: finalName,
          description: `Shared trip imported with ${importedStops.length} stops`,
          stops: importedStops,
          travelMode: sharedTripPreview?.travelMode || 'DRIVING',
        },
        userId,
        user?.token
      );

      setTrips((prev) => [created, ...prev]);
      setActiveTripId(created.id);
      if (importedStops[0]) {
        setActiveStopId(importedStops[0].id);
      }
      showToast({
        type: 'success',
        title: 'Trip Imported',
        description: `"${created.name}" imported with ${importedStops.length} destinations!`,
      });
    } catch (err: any) {
      showToast({
        type: 'warning',
        title: 'Import Issue',
        description: err.message || 'Failed to import shared trip.',
      });
    }
    window.history.replaceState(null, '', window.location.pathname + '#/dashboard');
  };

  return (
    <div className="h-screen h-[100dvh] bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white overflow-hidden">
      {/* Top Navigation Bar */}
      <Navbar
        tripTitle={tripTitle}
        onUpdateTitle={handleUpdateTripTitle}
        isSaving={isSaving}
        lastSavedAt={lastSavedAt}
        onSaveTrip={handleSaveTrip}
        onResetTrip={handleRequestReset}
        stopsCount={currentStops.length}
        travelMode={travelMode}
        stops={currentStops}
        onOpenOnboarding={() => setIsOnboardingOpen(true)}
        trips={trips}
        activeTripId={activeTripId}
        onSelectTrip={setActiveTripId}
        onCreateNewTrip={() => setIsCreateTripModalOpen(true)}
        onOpenMyTrips={() => setIsMyTripsModalOpen(true)}
        activeMobileTab={mobileView}
        onSelectMobileTab={(tab) => {
          setMobileView(tab);
          setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
          setTimeout(() => window.dispatchEvent(new Event('resize')), 200);
        }}
      />

      {/* Mobile / Tablet Tab Toggle Bar */}
      <div className="lg:hidden bg-slate-950/95 border-b border-slate-800/90 px-3 py-2 flex-shrink-0 z-40 backdrop-blur-md">
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900/90 rounded-2xl border border-slate-800/80 shadow-inner">
          <button
            type="button"
            onClick={() => {
              setMobileView('map');
              setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
              setTimeout(() => window.dispatchEvent(new Event('resize')), 200);
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
            onUpdateTitle={handleUpdateTripTitle}
            stops={currentStops}
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
            onClearAll={handleRequestReset}
            onOptimizeRoute={handleOptimizeRoute}
            onReverseRoute={handleReverseRoute}
            onOpenTutorial={() => setIsOnboardingOpen(true)}
            onSwitchToMap={() => {
              setMobileView('map');
              setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
            }}
            onOpenShare={() => setIsShareModalOpen(true)}
            trips={trips}
            activeTripId={activeTripId}
            onSelectTrip={setActiveTripId}
            onCreateNewTrip={() => setIsCreateTripModalOpen(true)}
            onOpenMyTrips={() => setIsMyTripsModalOpen(true)}
          />
        </div>

        {/* Real Google Map Panel (Interactive Map Clean View) */}
        <div
          className={`w-full lg:w-[65%] xl:w-[66%] h-full flex-1 relative min-h-0 ${
            mobileView === 'map' ? 'flex flex-col' : 'hidden lg:flex lg:flex-col'
          }`}
        >
          <InteractiveMap
            stops={currentStops}
            activeStopId={activeStopId}
            onSelectStop={(id) => setActiveStopId(id)}
            onRemoveStop={handleRemoveStop}
          />
        </div>
      </main>

      {/* First-Time Intelligent Onboarding Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onComplete={handleCompleteOnboarding}
      />

      {/* My Trips Management Modal */}
      <MyTripsModal
        isOpen={isMyTripsModalOpen}
        onClose={() => setIsMyTripsModalOpen(false)}
        trips={trips}
        activeTripId={activeTripId}
        onSelectTrip={(id) => setActiveTripId(id)}
        onCreateNewTrip={() => {
          setIsMyTripsModalOpen(false);
          setIsCreateTripModalOpen(true);
        }}
        onEditTrip={(trip) => {
          setIsMyTripsModalOpen(false);
          handleOpenEditTrip(trip);
        }}
        onShareTrip={(trip) => {
          setActiveTripId(trip.id);
          setIsMyTripsModalOpen(false);
          setIsShareModalOpen(true);
        }}
        onDeleteTrip={(trip) => {
          setIsMyTripsModalOpen(false);
          handleOpenDeleteTrip(trip);
        }}
      />

      {/* Create Trip Modal */}
      <CreateEditTripModal
        isOpen={isCreateTripModalOpen}
        onClose={() => setIsCreateTripModalOpen(false)}
        onSubmit={handleCreateNewTrip}
        existingTripNames={existingTripNames}
        isEditing={false}
      />

      {/* Edit Trip Modal */}
      <CreateEditTripModal
        isOpen={isEditTripModalOpen}
        onClose={() => {
          setIsEditTripModalOpen(false);
          setEditingTrip(null);
        }}
        onSubmit={handleSaveEditTrip}
        initialData={editingTrip || undefined}
        existingTripNames={existingTripNames}
        isEditing={true}
      />

      {/* Delete Trip Confirmation Modal */}
      <DeleteTripModal
        isOpen={isDeleteTripModalOpen}
        tripName={deletingTrip?.name || 'Trip'}
        destinationsCount={deletingTrip?.stops?.length || 0}
        isProcessing={isDeletingTrip}
        onCancel={() => {
          setIsDeleteTripModalOpen(false);
          setDeletingTrip(null);
        }}
        onConfirm={handleConfirmDeleteTrip}
      />

      {/* Shared Trip Preview & Import Modal */}
      <SharedTripPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        sharedData={sharedTripPreview}
        currentStops={currentStops}
        onImport={handleImportSharedDestinations}
      />

      {/* Reset Route Confirmation Modal */}
      <ResetRouteModal
        isOpen={isResetModalOpen}
        isProcessing={isResetting}
        onCancel={() => setIsResetModalOpen(false)}
        onConfirm={handleConfirmReset}
        stopsCount={currentStops.length}
      />

      {/* Share Dialog */}
      <ShareDialog
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        stops={currentStops}
        tripTitle={tripTitle}
        travelMode={travelMode}
        trips={trips}
        activeTripId={activeTripId}
      />

      {/* Notification Toast */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
};
