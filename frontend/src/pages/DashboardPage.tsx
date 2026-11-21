import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar/Sidebar';
import { InteractiveMap } from '../components/Map/InteractiveMap';
import { Toast } from '../components/Toast';
import type { ToastMessage } from '../components/Toast';
import type { Destination, SelectedStop, TravelMode, SharedTripData, TripCollection } from '../types';
import { calculateRouteMetrics, optimizeRouteStops } from '../utils/routeOptimizer';
import { findDuplicateStop, deduplicateStops } from '../utils/placeMatching';
import { reverseGeocodeCoords } from '../services/placesService';
import { 
  decodeTripFromUrl,
  fetchSharedTrip,
  loadLocalTrips,
  saveLocalTrips,
  fetchUserTrips,
  createUserTrip,
  updateUserTrip,
  deleteUserTrip,
  saveTripToStorage
} from '../services/tripService';
import { SharedTripPreviewModal } from '../components/SharedTripPreviewModal';
import { ShareDialog } from '../components/ShareDialog';
import { ResetRouteModal } from '../components/ResetRouteModal';
import { OnboardingModal } from '../components/OnboardingModal';
import { CreateEditTripModal } from '../components/Trips/CreateEditTripModal';
import { DeleteTripModal } from '../components/Trips/DeleteTripModal';
import { MyTripsModal } from '../components/Trips/MyTripsModal';
import { EditProfileModal } from '../components/EditProfileModal';
import { PolarstepsBottomSheet } from '../components/Sidebar/PolarstepsBottomSheet';
import { MobileBottomNav } from '../components/Navigation/MobileBottomNav';
import { SettingsModal } from '../components/Navigation/SettingsModal';
import { useTheme } from '../context/ThemeContext';
import { Settings } from 'lucide-react';

function queuePendingSyncTrip(trip: TripCollection, userId: string) {
  try {
    const key = `vazhikatti_pending_sync_${userId}`;
    const raw = localStorage.getItem(key);
    let list: TripCollection[] = raw ? JSON.parse(raw) : [];
    list = [trip, ...list.filter((t) => t.id !== trip.id)];
    localStorage.setItem(key, JSON.stringify(list));
  } catch {}
}

function clearPendingSyncTrip(tripId: string, userId: string) {
  try {
    const key = `vazhikatti_pending_sync_${userId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return;
    let list: TripCollection[] = JSON.parse(raw);
    list = list.filter((t) => t.id !== tripId);
    if (list.length === 0) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(list));
    }
  } catch {}
}

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const userId = user?.uid || user?.email || user?.displayName || 'guest';

  // -------------------------------------------------------------
  // User-Created Trip Collections State
  // -------------------------------------------------------------
  const [trips, setTrips] = useState<TripCollection[]>(() => {
    return loadLocalTrips(userId);
  });

  const [activeTripId, setActiveTripId] = useState<string | 'ALL'>('ALL');

  // Keep initial active stop null so no popups open passively on initial page load
  const [activeStopId, setActiveStopId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'offline'>('saved');
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const isSavingRef = useRef(false);
  const saveTimeoutRef = useRef<any>(null);
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
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  // Mobile active tab toggle ('sidebar' | 'map')
  const [mobileView, setMobileView] = useState<'sidebar' | 'map'>('map');

  const showToast = (toastMsg: Omit<ToastMessage, 'id'>) => {
    const id = Date.now().toString();
    setToast({ ...toastMsg, id });
  };

  // Synchronize remote trips from PostgreSQL backend for cross-device updates (Laptop <-> Phone)
  const syncRemoteTrips = useCallback(async () => {
    if (isSavingRef.current) return;
    try {
      const remoteTrips = await fetchUserTrips(userId, user?.token);
      if (Array.isArray(remoteTrips)) {
        setTrips((prev) => {
          // Compare whether server has different stops or collections
          const isDifferent = JSON.stringify(remoteTrips) !== JSON.stringify(prev);
          if (isDifferent) {
            saveLocalTrips(remoteTrips, userId);
            return remoteTrips;
          }
          return prev;
        });
        setAutoSaveStatus('saved');
      }
    } catch {
      // Offline / network failure handled gracefully
    }
  }, [userId, user?.token]);

  // Flush any pending trip updates queued while offline
  const flushPendingSyncQueue = useCallback(async () => {
    try {
      const key = `vazhikatti_pending_sync_${userId}`;
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const list: TripCollection[] = JSON.parse(raw);
      if (!Array.isArray(list) || list.length === 0) return;

      for (const trip of list) {
        try {
          await updateUserTrip(
            trip.id,
            {
              name: trip.name,
              description: trip.description,
              stops: trip.stops,
              travelMode: trip.travelMode,
              isOptimized: trip.isOptimized,
            },
            userId,
            user?.token
          );
          clearPendingSyncTrip(trip.id, userId);
        } catch {}
      }
      setAutoSaveStatus('saved');
    } catch {}
  }, [userId, user?.token]);

  // Initial load: populate from cache immediately, then fetch cloud updates and flush pending syncs
  useEffect(() => {
    const local = loadLocalTrips(userId);
    setTrips(local);
    setActiveTripId('ALL');
    setActiveStopId(null);

    syncRemoteTrips();
    flushPendingSyncQueue();
  }, [userId, syncRemoteTrips, flushPendingSyncQueue]);

  // Cross-device synchronization on window focus, visibility change, and network reconnect
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        syncRemoteTrips();
      }
    };
    const handleFocus = () => {
      syncRemoteTrips();
    };
    const handleOnline = () => {
      syncRemoteTrips();
      flushPendingSyncQueue();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Periodic gentle background poll (every 25 seconds) to ensure multi-device sync
    const intervalId = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        syncRemoteTrips();
      }
    }, 25000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, [syncRemoteTrips, flushPendingSyncQueue]);

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

  // Check URL for shared trip parameters or pending shared trip from /s/:shareId
  useEffect(() => {
    // 1. One-time import for shared trip from /s/:shareId
    const pendingJson = sessionStorage.getItem('vazhikatti_pending_shared_trip') || localStorage.getItem('vazhikatti_pending_shared_trip');
    if (pendingJson) {
      try {
        const pending = JSON.parse(pendingJson);
        sessionStorage.removeItem('vazhikatti_pending_shared_trip');
        localStorage.removeItem('vazhikatti_pending_shared_trip');
        localStorage.removeItem('vazhikatti_active_shared_trip');
        if (pending && Array.isArray(pending.stops) && pending.stops.length > 0) {
          sessionStorage.setItem('vazhikatti_guest_viewing_shared_trip', 'true');
          handleImportSharedDestinations(pending.stops, pending.tripName || pending.title || 'Shared Trip');
          return;
        }
      } catch {}
    }

    // Purge any stale active shared trip modal state so it never reappears on normal dashboard visits
    localStorage.removeItem('vazhikatti_active_shared_trip');

    // 2. Legacy URL search parameter check (explicit ?share= or ?trip= in URL)
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
  const tripTitle: string = activeTripId === 'ALL' ? 'All Trips' : activeTrip?.name || 'All Trips';
  const isOptimized: boolean = activeTrip
    ? Boolean(activeTrip.isOptimized)
    : trips.length > 0 && trips.some((t) => (t.stops?.length || 0) >= 2 && Boolean(t.isOptimized));

  // Live route metrics
  const metrics = useMemo(() => {
    return calculateRouteMetrics(currentStops, travelMode).metrics;
  }, [currentStops, travelMode]);

  // Existing trip names for case-insensitive duplicate validation
  const existingTripNames = useMemo(() => trips.map((t) => t.name), [trips]);

  // Helper to persist updated trip list locally and remotely (Immediate UI update + auto-save to cloud)
  const persistTripUpdates = useCallback(
    (updatedTrip: TripCollection) => {
      // 1. Immediate optimistic state and local storage persistence
      setTrips((prev) => {
        const next = prev.map((t) => (t.id === updatedTrip.id ? updatedTrip : t));
        saveLocalTrips(next, userId);
        return next;
      });

      // 2. Set auto-saving state
      setIsSaving(true);
      isSavingRef.current = true;
      setAutoSaveStatus('saving');

      // Clear existing debounce timer if user is rapidly adding/removing stops
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          // Send update to backend PostgreSQL & API
          await updateUserTrip(
            updatedTrip.id,
            {
              name: updatedTrip.name,
              description: updatedTrip.description,
              stops: updatedTrip.stops,
              travelMode: updatedTrip.travelMode,
              isOptimized: updatedTrip.isOptimized,
            },
            userId,
            user?.token
          );

          // Also synchronize active trip stops with cloud storage fallback
          const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          if (updatedTrip.stops && updatedTrip.stops.length > 0) {
            saveTripToStorage(
              {
                title: updatedTrip.name,
                travelMode: updatedTrip.travelMode,
                stops: updatedTrip.stops,
                lastSavedAt: timeStr,
              },
              userId
            ).catch(() => {});
          }

          setLastSavedAt(timeStr);
          setAutoSaveStatus('saved');
          clearPendingSyncTrip(updatedTrip.id, userId);
        } catch (err) {
          console.warn('[Vazhikatti] Auto-save error, queued for sync:', err);
          setAutoSaveStatus('offline');
          queuePendingSyncTrip(updatedTrip, userId);
        } finally {
          setIsSaving(false);
          isSavingRef.current = false;
        }
      }, 300);
    },
    [userId, user?.token]
  );

  // Add destination to currently active trip (or default under All Trips)
  const handleAddStop = async (destination: Destination) => {
    let targetTrip = activeTrip;
    let currentTripsList = [...trips];

    // If viewing ALL trips, add to the first trip or create a new one while remaining in All Trips view
    if (!targetTrip) {
      if (currentTripsList.length === 0) {
        try {
          const newTrip = await createUserTrip(
            { name: 'My Trip', description: 'Default itinerary collection' },
            userId,
            user?.token
          );
          currentTripsList = [newTrip];
          setTrips(currentTripsList);
          // Keep activeTripId as 'ALL' so view stays under All Trips!
          targetTrip = newTrip;
        } catch (err: any) {
          showToast({ type: 'warning', title: 'Trip Error', description: err.message });
          return;
        }
      } else {
        targetTrip = currentTripsList[0];
      }
    }

    let targetStops = [...(targetTrip.stops || [])];

    // Scenario B: If the destination being added is a system-generated Current Location,
    // automatically rename any existing system-generated Current Location entry to its actual place name + (C)
    const isNewSystemCurrentLocation =
      Boolean(destination.isCurrentLocation) &&
      !destination.isCustomName &&
      destination.name.trim().toLowerCase() === 'current location';

    if (isNewSystemCurrentLocation) {
      for (let i = 0; i < targetStops.length; i++) {
        const existing = targetStops[i];
        const isExistingSystemCurrentLoc =
          existing.isCurrentLocation &&
          !existing.isCustomName &&
          existing.name.trim().toLowerCase() === 'current location';

        if (isExistingSystemCurrentLoc) {
          let resolvedName = existing.originalName;
          if (!resolvedName || resolvedName.trim().toLowerCase() === 'current location') {
            try {
              const rev = await reverseGeocodeCoords(existing.coordinates.lat, existing.coordinates.lng);
              resolvedName = rev.placeName || rev.city || existing.city || 'Location';
            } catch {
              resolvedName = existing.city || 'Location';
            }
          }
          targetStops[i] = {
            ...existing,
            name: `${resolvedName} (C)`,
            originalName: resolvedName,
          };
        }
      }
    }

    const duplicateStop = findDuplicateStop(targetStops, destination);
    if (duplicateStop) {
      showToast({
        type: 'warning',
        title: 'This place is already in this file.',
        description: `"${destination.name}" is already in "${targetTrip.name}".`,
      });
      return;
    }

    const newStop: SelectedStop = {
      ...destination,
      stopOrder: targetStops.length + 1,
      customDurationMinutes: destination.typicalVisitDurationMinutes,
    };

    const nextStops = deduplicateStops([...targetStops, newStop]);
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
    if (activeTrip) {
      if (index === 0) return;
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
      return;
    }

    if (index <= 0 || index >= currentStops.length) return;
    const targetStop = currentStops[index];
    const ownerTrip = trips.find((t) => t.stops?.some((s) => s.id === targetStop.id));
    if (!ownerTrip) return;
    const idxInTrip = ownerTrip.stops.findIndex((s) => s.id === targetStop.id);
    if (idxInTrip <= 0) return;

    const reordered = [...ownerTrip.stops];
    const temp = reordered[idxInTrip - 1];
    reordered[idxInTrip - 1] = reordered[idxInTrip];
    reordered[idxInTrip] = temp;

    const updated = calculateRouteMetrics(reordered, ownerTrip.travelMode);
    persistTripUpdates({
      ...ownerTrip,
      stops: updated.enrichedStops,
      isOptimized: false,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleMoveDown = (index: number) => {
    if (activeTrip) {
      if (index === activeTrip.stops.length - 1) return;
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
      return;
    }

    if (index < 0 || index >= currentStops.length - 1) return;
    const targetStop = currentStops[index];
    const ownerTrip = trips.find((t) => t.stops?.some((s) => s.id === targetStop.id));
    if (!ownerTrip) return;
    const idxInTrip = ownerTrip.stops.findIndex((s) => s.id === targetStop.id);
    if (idxInTrip < 0 || idxInTrip >= ownerTrip.stops.length - 1) return;

    const reordered = [...ownerTrip.stops];
    const temp = reordered[idxInTrip + 1];
    reordered[idxInTrip + 1] = reordered[idxInTrip];
    reordered[idxInTrip] = temp;

    const updated = calculateRouteMetrics(reordered, ownerTrip.travelMode);
    persistTripUpdates({
      ...ownerTrip,
      stops: updated.enrichedStops,
      isOptimized: false,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSetAsStart = (index: number) => {
    if (activeTrip) {
      if (index <= 0 || index >= activeTrip.stops.length) return;
      const reordered = [...activeTrip.stops];
      const [chosenStart] = reordered.splice(index, 1);
      reordered.unshift(chosenStart);

      const updated = calculateRouteMetrics(reordered, activeTrip.travelMode);
      persistTripUpdates({
        ...activeTrip,
        stops: updated.enrichedStops,
        isOptimized: false,
        updatedAt: new Date().toISOString(),
      });

      showToast({
        type: 'success',
        title: 'Starting Place Set',
        description: `"${chosenStart.name}" is now the starting place for "${activeTrip.name}".`,
      });
      return;
    }

    if (index < 0 || index >= currentStops.length) return;
    const targetStop = currentStops[index];
    if (!targetStop) return;

    const ownerTrip = trips.find((t) => t.stops?.some((s) => s.id === targetStop.id));
    if (!ownerTrip) return;

    const stopIdxInTrip = ownerTrip.stops.findIndex((s) => s.id === targetStop.id);
    if (stopIdxInTrip <= 0) return;

    const reordered = [...ownerTrip.stops];
    const [chosenStart] = reordered.splice(stopIdxInTrip, 1);
    reordered.unshift(chosenStart);

    const updated = calculateRouteMetrics(reordered, ownerTrip.travelMode);
    persistTripUpdates({
      ...ownerTrip,
      stops: updated.enrichedStops,
      isOptimized: false,
      updatedAt: new Date().toISOString(),
    });

    showToast({
      type: 'success',
      title: 'Starting Place Set',
      description: `"${chosenStart.name}" is now the starting place for "${ownerTrip.name}".`,
    });
  };

  const handleSetAsStartById = (id: string) => {
    const ownerTrip = activeTrip || trips.find((t) => t.stops?.some((s) => s.id === id));
    if (!ownerTrip) return;
    const idx = ownerTrip.stops.findIndex((s) => s.id === id);
    if (idx > 0) {
      const reordered = [...ownerTrip.stops];
      const [chosenStart] = reordered.splice(idx, 1);
      reordered.unshift(chosenStart);

      const updated = calculateRouteMetrics(reordered, ownerTrip.travelMode);
      persistTripUpdates({
        ...ownerTrip,
        stops: updated.enrichedStops,
        isOptimized: false,
        updatedAt: new Date().toISOString(),
      });

      showToast({
        type: 'success',
        title: 'Starting Place Set',
        description: `"${chosenStart.name}" is now the starting place for "${ownerTrip.name}".`,
      });
    }
  };

  const handleRenameStop = (id: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    const ownerTrip = activeTrip || trips.find((t) => t.stops?.some((s) => s.id === id));
    if (!ownerTrip) return;

    const updatedStops = ownerTrip.stops.map((s) => {
      if (s.id === id) {
        return {
          ...s,
          name: trimmed,
          customName: trimmed,
          isCustomName: true,
          originalName: s.originalName || s.name,
        };
      }
      return s;
    });

    const updated = calculateRouteMetrics(updatedStops, ownerTrip.travelMode);
    persistTripUpdates({
      ...ownerTrip,
      stops: updated.enrichedStops,
      updatedAt: new Date().toISOString(),
    });

    showToast({
      type: 'success',
      title: 'Place Renamed',
      description: `Renamed to "${trimmed}".`,
    });
  };

  const handleUpdateDuration = (id: string, minutes: number) => {
    const ownerTrip = activeTrip || trips.find((t) => t.stops?.some((s) => s.id === id));
    if (!ownerTrip) return;
    const updatedStops = ownerTrip.stops.map((s) =>
      s.id === id ? { ...s, customDurationMinutes: minutes } : s
    );
    persistTripUpdates({
      ...ownerTrip,
      stops: updatedStops,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleOptimizeRoute = () => {
    if (activeTrip) {
      if (activeTrip.stops.length < 2) {
        showToast({
          type: 'warning',
          title: 'Cannot Optimize',
          description: 'Add at least 2 destinations to optimize your route.',
        });
        return;
      }
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
      return;
    }

    // In All Trips view: find trips with at least 2 stops
    const eligibleTrips = trips.filter((t) => (t.stops?.length || 0) >= 2);
    if (eligibleTrips.length === 0) {
      showToast({
        type: 'warning',
        title: 'Cannot Optimize',
        description: 'Add at least 2 destinations to a trip to optimize your route.',
      });
      return;
    }

    let totalSavedKm = 0;
    let totalSavedMins = 0;
    let lastTripName = '';
    const nextTrips = trips.map((t) => {
      if ((t.stops?.length || 0) < 2) return t;
      const result = optimizeRouteStops(t.stops, t.travelMode);
      totalSavedKm += Number(result.savedDistanceKm) || 0;
      totalSavedMins += Number(result.savedDurationMinutes) || 0;
      lastTripName = t.name;
      return {
        ...t,
        stops: result.optimizedStops,
        isOptimized: true,
        updatedAt: new Date().toISOString(),
      };
    });

    setTrips(nextTrips);
    saveLocalTrips(nextTrips, userId);
    for (const ut of nextTrips) {
      if ((ut.stops?.length || 0) >= 2) {
        updateUserTrip(ut.id, { stops: ut.stops, isOptimized: true }, userId, user?.token);
      }
    }

    showToast({
      type: 'success',
      title: 'Route Optimized!',
      description:
        eligibleTrips.length === 1
          ? `Saved ~${totalSavedKm.toFixed(1)} km and ~${totalSavedMins} mins in "${lastTripName}".`
          : `Optimized ${eligibleTrips.length} trips! Saved ~${totalSavedKm.toFixed(1)} km and ~${totalSavedMins} mins.`,
    });
  };

  const handleReverseRoute = () => {
    if (activeTrip) {
      if (activeTrip.stops.length < 2) {
        showToast({
          type: 'warning',
          title: 'Cannot Invert Route',
          description: 'Add at least 2 destinations to invert the route.',
        });
        return;
      }
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
      return;
    }

    const eligibleTrips = trips.filter((t) => (t.stops?.length || 0) >= 2);
    if (eligibleTrips.length === 0) {
      showToast({
        type: 'warning',
        title: 'Cannot Invert Route',
        description: 'Add at least 2 destinations to invert the route.',
      });
      return;
    }

    const nextTrips = trips.map((t) => {
      if ((t.stops?.length || 0) < 2) return t;
      const reversed = [...t.stops].reverse();
      const updated = calculateRouteMetrics(reversed, t.travelMode);
      return {
        ...t,
        stops: updated.enrichedStops,
        isOptimized: false,
        updatedAt: new Date().toISOString(),
      };
    });

    setTrips(nextTrips);
    saveLocalTrips(nextTrips, userId);
    for (const ut of nextTrips) {
      if ((ut.stops?.length || 0) >= 2) {
        updateUserTrip(ut.id, { stops: ut.stops, isOptimized: false }, userId, user?.token);
      }
    }

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
      // 1. Save locally for instant persistence
      saveLocalTrips(trips, userId);

      // 2. Sync all user trip collections to central backend
      let syncedCount = 0;
      for (const t of trips) {
        try {
          await updateUserTrip(
            t.id,
            {
              name: t.name,
              description: t.description,
              stops: t.stops,
              travelMode: t.travelMode,
              isOptimized: t.isOptimized,
            },
            userId,
            user?.token
          );
          syncedCount++;
        } catch {
          try {
            await createUserTrip(
              {
                name: t.name,
                description: t.description,
                stops: t.stops,
                travelMode: t.travelMode,
                isOptimized: t.isOptimized,
              },
              userId,
              user?.token
            );
            syncedCount++;
          } catch {}
        }
      }

      // 3. Sync active route to cloud storage for cross-device synchronization
      if (stops.length > 0) {
        await saveTripToStorage(
          {
            title: tripTitle,
            travelMode,
            stops,
            lastSavedAt: timeStr,
          },
          userId
        ).catch(() => {});
      }

      setLastSavedAt(timeStr);
      showToast({
        type: 'success',
        title: 'Trips Saved & Synced',
        description: `All ${trips.length} trip collections saved and synced securely to cloud at ${timeStr}. Accessible on all your devices!`,
      });
    } catch {
      showToast({
        type: 'info',
        title: 'Saved Locally',
        description: 'Trips saved on this device. Cloud sync will automatically complete when online.',
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
    <div className={`h-screen h-[100dvh] flex flex-col font-sans selection:bg-indigo-600 selection:text-white overflow-hidden transition-colors duration-200 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
    }`}>
      {/* Desktop Top Navigation Bar (Hidden on Mobile & Tablet, Available on Desktop) */}
      <div className="hidden lg:block flex-shrink-0">
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
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          autoSaveStatus={autoSaveStatus}
          activeMobileTab={mobileView}
          onSelectMobileTab={(tab) => {
            setMobileView(tab);
            setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
            setTimeout(() => window.dispatchEvent(new Event('resize')), 200);
          }}
        />
      </div>

      {/* Main Workspace Layout (Both Mobile Top Navigation Bars Removed - Clean Map First) */}
      <main className="flex-1 w-full min-h-0 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Sidebar Panel (Trip Plan Dedicated View) */}
        <div
          className={`w-full lg:w-[35%] xl:w-[34%] h-full flex-shrink-0 min-h-0 pb-14 lg:pb-0 ${
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
            onRenameStop={handleRenameStop}
            onSetAsStart={handleSetAsStart}
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

        {/* Real Google Map Panel (Interactive Map Clean View with Polarsteps Draggable Bottom Sheet) */}
        <div
          className={`w-full lg:w-[65%] xl:w-[66%] h-full flex-1 relative min-h-0 ${
            mobileView === 'map' ? 'flex flex-col' : 'hidden lg:flex lg:flex-col'
          }`}
        >
          {/* Polarsteps Single Floating Settings Icon (Mobile & Tablet) */}
          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(true)}
            className={`fixed top-4 right-4 z-40 lg:hidden w-11 h-11 rounded-full backdrop-blur-md shadow-lg border flex items-center justify-center transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
              isDark
                ? 'bg-slate-900/85 text-slate-200 border-slate-700/80 hover:bg-slate-900 hover:text-white shadow-black/40'
                : 'bg-white/90 text-slate-700 border-slate-200 hover:bg-white hover:text-slate-950 shadow-slate-900/10'
            }`}
            style={{
              marginTop: 'env(safe-area-inset-top, 0px)',
            }}
            aria-label="Open Settings"
            title="Settings & Map Controls"
            data-testid="polarsteps-settings-button"
          >
            <Settings className="w-5 h-5 text-current" />
            {isSaving ? (
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-indigo-500 border-2 border-white dark:border-slate-900 animate-ping" />
            ) : autoSaveStatus === 'offline' ? (
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-amber-500 border-2 border-white dark:border-slate-900" />
            ) : null}
          </button>

          <InteractiveMap
            stops={currentStops}
            activeStopId={activeStopId}
            travelMode={travelMode}
            onSelectStop={(id) => setActiveStopId(id)}
            onRemoveStop={handleRemoveStop}
            onSetAsStart={handleSetAsStartById}
          />

          {/* Polarsteps-Style Draggable Bottom Sheet (Mobile & Tablet) */}
          <PolarstepsBottomSheet
            stops={currentStops}
            metrics={metrics}
            isOptimized={isOptimized}
            onOptimizeRoute={handleOptimizeRoute}
            trips={trips}
            activeTripId={activeTripId}
            onSelectTrip={(id) => setActiveTripId(id)}
            onCreateNewTrip={() => setIsCreateTripModalOpen(true)}
            onOpenMyTrips={() => setIsMyTripsModalOpen(true)}
            onOpenShare={() => setIsShareModalOpen(true)}
            onOpenEditProfile={() => setIsEditProfileOpen(true)}
            onOpenTripPlan={() => {
              setMobileView('sidebar');
              setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
            }}
            travelMode={travelMode}
          />
        </div>
      </main>

      {/* Mobile Fixed Bottom Navigation */}
      <MobileBottomNav
        activeTab={mobileView === 'map' ? 'map' : 'plan'}
        onSelectTab={(tab) => {
          if (tab === 'map') {
            setMobileView('map');
          } else if (tab === 'search') {
            navigate('/search');
          } else if (tab === 'plan') {
            setMobileView('sidebar');
          } else if (tab === 'trips') {
            setIsMyTripsModalOpen(true);
          }
          setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
        }}
        onOptimizeRoute={handleOptimizeRoute}
        onOpenShare={() => setIsShareModalOpen(true)}
        onOpenMyTrips={() => setIsMyTripsModalOpen(true)}
        onOpenProfile={() => setIsEditProfileOpen(true)}
        stopsCount={currentStops.length}
        tripsCount={trips.length}
        isOptimized={isOptimized}
      />

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

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        onSuccess={(msg) => setToast({ id: Date.now().toString(), type: 'success', title: msg })}
      />

      {/* Polarsteps Settings Modal (Houses all actions from the removed top bars) */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        activeView={mobileView}
        onSelectView={(v) => {
          setMobileView(v);
          setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
          setTimeout(() => window.dispatchEvent(new Event('resize')), 200);
        }}
        stopsCount={currentStops.length}
        tripsCount={trips.length}
        onOpenMyTrips={() => setIsMyTripsModalOpen(true)}
        onOpenShare={() => setIsShareModalOpen(true)}
        onResetRoute={handleRequestReset}
        onOpenHelp={() => setIsOnboardingOpen(true)}
        onOpenEditProfile={() => setIsEditProfileOpen(true)}
        isSaving={isSaving}
        lastSavedAt={lastSavedAt}
        autoSaveStatus={autoSaveStatus}
      />

      {/* Notification Toast */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
};
