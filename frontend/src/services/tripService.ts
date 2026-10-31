import type { SelectedStop, TravelMode, SharedTripData, TripCollection } from '../types';
import { db } from '../config/firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

export interface SavedTrip {
  id: string;
  title: string;
  travelMode: TravelMode;
  stops: SelectedStop[];
  lastSavedAt: string;
  updatedAt: string;
  userId?: string;
}

const STORAGE_PREFIX = 'routewise_saved_trip_';
const GLOBAL_STORAGE_KEY = 'routewise_saved_trip';
const TRIPS_COLLECTIONS_PREFIX = 'routewise_user_trips_';
const GLOBAL_TRIPS_COLLECTIONS_KEY = 'routewise_user_trips';

/**
 * Retrieve saved trip from localStorage for the given user, falling back to global trip
 */
export function getSavedTrip(userId?: string | null): SavedTrip | null {
  try {
    const userKey = userId ? `${STORAGE_PREFIX}${userId.toLowerCase()}` : null;
    let raw = userKey ? localStorage.getItem(userKey) : null;
    
    // Fall back to general key if user-specific key is not found
    if (!raw) {
      raw = localStorage.getItem(GLOBAL_STORAGE_KEY);
    }

    if (!raw) return null;

    const parsed: SavedTrip = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.stops)) {
      return null;
    }

    return parsed;
  } catch (err) {
    console.error('[RouteWise] Failed to parse saved trip from localStorage:', err);
    return null;
  }
}

/**
 * Resolves the backend URL dynamically (uses VITE_BACKEND_URL or defaults to deployed Render backend in production)
 */
export function getBackendUrl(): string {
  const envUrl = (import.meta.env.VITE_BACKEND_URL as string | undefined)?.trim();
  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
     window.location.hostname === '127.0.0.1' ||
     window.location.hostname === '');

  // 1. Localhost browser development environment
  if (isLocalhost) {
    if (envUrl && (envUrl.includes('localhost') || envUrl.includes('127.0.0.1'))) {
      return envUrl.replace(/\/+$/, '');
    }
    return 'http://localhost:5000';
  }

  // 2. Production / Deployed environment
  if (
    envUrl &&
    !envUrl.includes('vazhikatti.onrender.com') &&
    !envUrl.includes('vazhikatti-api.onrender.com') &&
    !envUrl.includes('localhost') &&
    !envUrl.includes('127.0.0.1')
  ) {
    return envUrl.replace(/\/+$/, '');
  }

  return 'https://vazhikatti-gfuq.onrender.com';
}

/**
 * Returns candidate backend URLs to attempt in order of preference.
 * Enables automatic seamless failover between local server and cloud backend.
 */
export function getBackendCandidateUrls(): string[] {
  const primary = getBackendUrl();
  const candidates: string[] = [primary];
  const cloudUrl = 'https://vazhikatti-gfuq.onrender.com';
  const localUrl = 'http://localhost:5000';

  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
     window.location.hostname === '127.0.0.1' ||
     window.location.hostname === '');

  if (isLocalhost && !candidates.includes(localUrl)) {
    candidates.unshift(localUrl);
  }

  if (!candidates.includes(cloudUrl)) {
    candidates.push(cloudUrl);
  }

  return candidates;
}

/**
 * Retrieve saved trip from Cloud (Firebase Firestore or Backend API for cross-device sync)
 */
export async function getSavedTripFromCloud(userId?: string | null): Promise<SavedTrip | null> {
  const cleanId = userId ? userId.toLowerCase().replace(/[^a-z0-9_-]/g, '_') : 'default';

  // 1. Try Firebase Firestore (if configured)
  if (db && userId) {
    try {
      const tripDocRef = doc(db, 'trips', cleanId);
      const snap = await getDoc(tripDocRef);
      if (snap.exists()) {
        const data = snap.data() as SavedTrip;
        if (data && Array.isArray(data.stops)) {
          try {
            localStorage.setItem(`${STORAGE_PREFIX}${userId.toLowerCase()}`, JSON.stringify(data));
            localStorage.setItem(GLOBAL_STORAGE_KEY, JSON.stringify(data));
          } catch {}
          return data;
        }
      }
    } catch (err) {
      console.warn('[RouteWise] Cloud trip fetch non-fatal error:', err);
    }
  }

  // 2. Try Backend API (enables laptop <-> phone synchronization with automatic fallback)
  for (const backendUrl of getBackendCandidateUrls()) {
    try {
      const res = await fetch(`${backendUrl}/api/trips/${cleanId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.trip && Array.isArray(json.trip.stops)) {
          const data = json.trip as SavedTrip;
          try {
            if (userId) {
              localStorage.setItem(`${STORAGE_PREFIX}${userId.toLowerCase()}`, JSON.stringify(data));
            }
            localStorage.setItem(GLOBAL_STORAGE_KEY, JSON.stringify(data));
          } catch {}
          return data;
        }
      }
    } catch {
      // Try next candidate backend URL
    }
  }

  return null;
}

/**
 * Persist trip to localStorage, Firebase Firestore (if configured), and backend
 */
export async function saveTripToStorage(
  tripData: {
    title: string;
    travelMode: TravelMode;
    stops: SelectedStop[];
    lastSavedAt: string;
  },
  userId?: string | null
): Promise<SavedTrip> {
  const trip: SavedTrip = {
    id: 'trip_' + (userId ? `${userId.toLowerCase()}_` : '') + Date.now(),
    title: tripData.title || 'Highlights Explorer',
    travelMode: tripData.travelMode,
    stops: tripData.stops,
    lastSavedAt: tripData.lastSavedAt,
    updatedAt: new Date().toISOString(),
    userId: userId || 'guest',
  };

  const serialized = JSON.stringify(trip);

  // 1. Primary persistence: localStorage (instant, per-browser)
  try {
    if (userId) {
      localStorage.setItem(`${STORAGE_PREFIX}${userId.toLowerCase()}`, serialized);
    }
    localStorage.setItem(GLOBAL_STORAGE_KEY, serialized);
  } catch (err) {
    console.warn('[RouteWise] Failed to save trip to localStorage:', err);
  }

  // 2. Cloud persistence: Firebase Firestore (cross-device sync between laptop & phone)
  if (db && userId) {
    try {
      const cleanId = userId.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      const tripDocRef = doc(db, 'trips', cleanId);
      await setDoc(tripDocRef, trip, { merge: true });
    } catch (firebaseErr) {
      console.warn('[RouteWise] Cloud sync to Firestore failed:', firebaseErr);
    }
  }

  // 3. Secondary persistence: Backend API (cross-device sync via candidate backends)
  for (const backendUrl of getBackendCandidateUrls()) {
    try {
      const res = await fetch(`${backendUrl}/api/trips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: serialized,
      });
      if (res.ok) break;
    } catch {}
  }

  return trip;
}

/**
 * Clear the saved trip from localStorage and Firestore
 */
export async function clearSavedTrip(userId?: string | null): Promise<void> {
  try {
    if (userId) {
      localStorage.removeItem(`${STORAGE_PREFIX}${userId.toLowerCase()}`);
    }
    localStorage.removeItem(GLOBAL_STORAGE_KEY);
  } catch (err) {
    console.error('[RouteWise] Failed to clear saved trip from localStorage:', err);
  }

  if (db && userId) {
    try {
      const cleanId = userId.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      const tripDocRef = doc(db, 'trips', cleanId);
      await deleteDoc(tripDocRef);
    } catch {}
  }

  // Clear from backend API
  const cleanId = userId ? userId.toLowerCase().replace(/[^a-z0-9_-]/g, '_') : 'default';
  for (const backendUrl of getBackendCandidateUrls()) {
    try {
      await fetch(`${backendUrl}/api/trips/${cleanId}`, { method: 'DELETE' });
    } catch {}
  }
}

/**
 * Encodes trip data into a lightweight shareable URL that can be opened on any phone or browser.
 * Preserves selectedState and destination geographical metadata (state, city, stateCode).
 */
export function encodeTripToUrl(
  title: string,
  travelMode: TravelMode,
  stops: SelectedStop[],
  selectedState: string = 'All States'
): string {
  try {
    const compact = {
      t: title,
      m: travelMode,
      st: selectedState,
      s: stops.map((s) => ({
        id: s.id,
        n: s.name,
        a: s.address,
        c: s.coordinates,
        cat: s.category,
        d: s.customDurationMinutes || s.typicalVisitDurationMinutes,
        p: s.photoUrl,
        pid: s.placeId,
        city: s.city,
        state: s.state,
        sc: s.stateCode,
        country: s.country,
      })),
    };
    const jsonStr = JSON.stringify(compact);
    const b64 = btoa(encodeURIComponent(jsonStr));
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    return `${origin}${pathname}#/dashboard?trip=${b64}`;
  } catch (err) {
    console.error('[RouteWise] Failed to encode trip to URL:', err);
    return window.location.href;
  }
}

/**
 * Decodes trip data from a shared URL parameter
 */
export function decodeTripFromUrl(
  encoded: string
): { title: string; travelMode: TravelMode; selectedState: string; stops: SelectedStop[] } | null {
  try {
    const jsonStr = decodeURIComponent(atob(encoded));
    const parsed = JSON.parse(jsonStr);
    if (!parsed || !Array.isArray(parsed.s)) return null;

    const stops: SelectedStop[] = parsed.s.map((item: any, idx: number) => ({
      id: item.id || `stop_${idx}_${Date.now()}`,
      placeId: item.pid,
      name: item.n || 'Destination',
      address: item.a || '',
      shortAddress: item.city && item.state ? `${item.city}, ${item.state}` : (item.a || item.n),
      city: item.city,
      state: item.state,
      stateCode: item.sc,
      country: item.country || 'India',
      coordinates: item.c || { lat: 20.5937, lng: 78.9629 },
      category: item.cat || 'heritage',
      typicalVisitDurationMinutes: item.d || 60,
      customDurationMinutes: item.d || 60,
      stopOrder: idx + 1,
      photoUrl: item.p || 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=600&auto=format&fit=crop&q=80',
      description: item.a || item.n,
      rating: 4.8,
      reviewsCount: 100,
    }));

    return {
      title: parsed.t || 'Shared RouteWise Trip',
      travelMode: parsed.m || 'DRIVING',
      selectedState: parsed.st || 'All States',
      stops,
    };
  } catch (err) {
    console.error('[RouteWise] Failed to decode trip from URL:', err);
    return null;
  }
}

/**
 * Creates a state-filtered shareable trip record via the backend API with fallback base64 URL.
 * Strictly filters stops by the selected state before transmission.
 */
export async function createSharedTrip(params: {
  title: string;
  travelMode: TravelMode;
  stops: SelectedStop[];
  selectedState: string;
  ownerName?: string;
  userId?: string;
}): Promise<{ shareUrl: string; shareId?: string; selectedState: string; totalDestinations: number }> {
  const { title, travelMode, stops, selectedState, ownerName, userId } = params;

  // Filter stops by selected state
  let filteredStops = stops;
  if (selectedState && selectedState !== 'All States' && selectedState !== 'ALL') {
    const targetState = selectedState.toLowerCase();
    filteredStops = stops.filter((s) => {
      const itemState = (s.state || '').trim().toLowerCase();
      return itemState === targetState || itemState.includes(targetState) || targetState.includes(itemState);
    });
  }

  if (filteredStops.length === 0) {
    throw new Error(`No saved destinations found in state "${selectedState}" to share.`);
  }

  // Encode fallback base64 payload
  const fallbackUrl = encodeTripToUrl(title, travelMode, filteredStops, selectedState);
  const fallbackB64Match = fallbackUrl.match(/trip=([^&]+)/);
  const fallbackB64 = fallbackB64Match ? fallbackB64Match[1] : '';

  // Try creating record on backend
  let generatedShareId: string | undefined;

  for (const backendUrl of getBackendCandidateUrls()) {
    try {
      const res = await fetch(`${backendUrl}/api/trips/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          travelMode,
          stops: filteredStops,
          selectedState,
          ownerName: ownerName || 'A Fellow Traveler',
          userId,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.shareId) {
          generatedShareId = json.shareId;
          break;
        }
      }
    } catch {
      // Try next candidate URL
    }
  }

  const origin = window.location.origin;
  const pathname = window.location.pathname;

  let finalShareUrl: string;
  if (generatedShareId) {
    // Include both shareId and fallback trip b64 for resilience
    finalShareUrl = `${origin}${pathname}#/dashboard?share=${generatedShareId}&trip=${fallbackB64}`;
  } else {
    finalShareUrl = `${origin}${pathname}#/dashboard?trip=${fallbackB64}`;
  }

  return {
    shareUrl: finalShareUrl,
    shareId: generatedShareId,
    selectedState,
    totalDestinations: filteredStops.length,
  };
}

/**
 * Fetches shared trip preview record by shareId from backend API
 */
export async function fetchSharedTrip(shareId: string): Promise<SharedTripData | null> {
  for (const backendUrl of getBackendCandidateUrls()) {
    try {
      const res = await fetch(`${backendUrl}/api/trips/share/${shareId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.share) {
          return json.share as SharedTripData;
        }
      }
    } catch {}
  }
  return null;
}

// =========================================================================
// Custom Trip Collections & Multi-Trip Management System
// =========================================================================

/**
 * Loads trip collections from localStorage with automatic migration of legacy saved trip
 */
export function loadLocalTrips(userId?: string | null): TripCollection[] {
  try {
    const key = userId ? `${TRIPS_COLLECTIONS_PREFIX}${userId.toLowerCase()}` : GLOBAL_TRIPS_COLLECTIONS_KEY;
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }

    // Auto-migrate from legacy single trip if available
    const legacy = getSavedTrip(userId);
    if (legacy && Array.isArray(legacy.stops) && legacy.stops.length > 0) {
      const migratedTrip: TripCollection = {
        id: 'trip_' + Date.now(),
        userId: userId || 'default',
        name: legacy.title || 'Mumbai Trip',
        description: 'Auto-migrated from previous route',
        travelMode: legacy.travelMode || 'DRIVING',
        stops: legacy.stops,
        isOptimized: false,
        createdAt: legacy.lastSavedAt || new Date().toISOString(),
        updatedAt: legacy.updatedAt || new Date().toISOString(),
      };
      const initialList = [migratedTrip];
      saveLocalTrips(initialList, userId);
      return initialList;
    }
  } catch (err) {
    console.warn('[RouteWise] Failed to load local trips:', err);
  }
  return [];
}

/**
 * Saves trip collections to localStorage
 */
export function saveLocalTrips(trips: TripCollection[], userId?: string | null): void {
  try {
    const key = userId ? `${TRIPS_COLLECTIONS_PREFIX}${userId.toLowerCase()}` : GLOBAL_TRIPS_COLLECTIONS_KEY;
    localStorage.setItem(key, JSON.stringify(trips));
    if (userId) {
      localStorage.setItem(GLOBAL_TRIPS_COLLECTIONS_KEY, JSON.stringify(trips));
    }
  } catch (err) {
    console.warn('[RouteWise] Failed to save local trips:', err);
  }
}

/**
 * Fetches all trips for the authenticated or current user from the backend API,
 * with seamless fallback to localStorage and auto-migration.
 */
export async function fetchUserTrips(userId?: string | null, token?: string | null): Promise<TripCollection[]> {
  const localList = loadLocalTrips(userId);

  for (const backendUrl of getBackendCandidateUrls()) {
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const url = `${backendUrl}/api/user-trips${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`;
      const res = await fetch(url, { headers });

      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.trips)) {
          // If server returned trips, persist locally
          if (json.trips.length > 0) {
            saveLocalTrips(json.trips, userId);
            return json.trips;
          } else if (localList.length > 0) {
            // Sync local trips up to server
            for (const t of localList) {
              await createUserTrip(
                {
                  name: t.name,
                  description: t.description,
                  travelMode: t.travelMode,
                  stops: t.stops,
                  isOptimized: t.isOptimized,
                },
                userId,
                token
              );
            }
            return localList;
          }
        }
      }
    } catch {
      // Continue to next candidate
    }
  }

  return localList;
}

/**
 * Creates a new trip collection with duplicate name validation (case-insensitive)
 */
export async function createUserTrip(
  data: {
    name: string;
    description?: string;
    travelMode?: TravelMode;
    stops?: SelectedStop[];
    isOptimized?: boolean;
  },
  userId?: string | null,
  token?: string | null
): Promise<TripCollection> {
  const trimmedName = data.name.trim();
  if (!trimmedName) {
    throw new Error('Trip name is required.');
  }

  // Pre-check local trips to prevent duplicate names
  const localTrips = loadLocalTrips(userId);
  const existsLocally = localTrips.some(
    t => t.name.trim().toLowerCase() === trimmedName.toLowerCase()
  );
  if (existsLocally) {
    throw new Error(`You already have a trip named "${trimmedName}". Please choose a different name.`);
  }

  const newTrip: TripCollection = {
    id: 'trip_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    userId: userId || 'default',
    name: trimmedName,
    description: data.description?.trim() || '',
    travelMode: data.travelMode || 'DRIVING',
    stops: data.stops || [],
    isOptimized: Boolean(data.isOptimized),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Try backend creation
  for (const backendUrl of getBackendCandidateUrls()) {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${backendUrl}/api/user-trips`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...data,
          userId: userId || undefined,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.trip) {
          const created = json.trip as TripCollection;
          const updatedList = [created, ...localTrips.filter(t => t.id !== created.id)];
          saveLocalTrips(updatedList, userId);
          return created;
        }
      } else {
        const json = await res.json().catch(() => ({}));
        if (json.error) {
          throw new Error(json.error);
        }
      }
    } catch (err: any) {
      if (err.message && err.message.includes('already have a trip')) {
        throw err;
      }
      // If network error, continue with local creation
    }
  }

  // Fallback to local persistence
  const updatedList = [newTrip, ...localTrips];
  saveLocalTrips(updatedList, userId);
  return newTrip;
}

/**
 * Updates a trip collection (name, description, stops, travelMode, etc.)
 */
export async function updateUserTrip(
  tripId: string,
  updates: Partial<TripCollection>,
  userId?: string | null,
  token?: string | null
): Promise<TripCollection> {
  const localTrips = loadLocalTrips(userId);
  const targetIndex = localTrips.findIndex(t => t.id === tripId);
  if (targetIndex === -1 && localTrips.length === 0) {
    throw new Error('Trip not found.');
  }

  // If renaming, check case-insensitive uniqueness against other trips
  if (updates.name) {
    const trimmed = updates.name.trim();
    if (!trimmed) throw new Error('Trip name cannot be empty.');
    const duplicate = localTrips.some(
      t => t.id !== tripId && t.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      throw new Error(`You already have another trip named "${trimmed}". Please choose a different name.`);
    }
    updates.name = trimmed;
  }

  // Try backend update
  for (const backendUrl of getBackendCandidateUrls()) {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${backendUrl}/api/user-trips/${tripId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.trip) {
          const updatedTrip = json.trip as TripCollection;
          const newList = localTrips.map(t => (t.id === tripId ? updatedTrip : t));
          saveLocalTrips(newList, userId);
          return updatedTrip;
        }
      } else {
        const json = await res.json().catch(() => ({}));
        if (json.error) throw new Error(json.error);
      }
    } catch (err: any) {
      if (err.message && err.message.includes('already have')) throw err;
    }
  }

  // Local fallback
  const existing = localTrips[targetIndex] || {
    id: tripId,
    userId: userId || 'default',
    name: 'My Trip',
    travelMode: 'DRIVING',
    stops: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const updated: TripCollection = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  const updatedList = targetIndex >= 0
    ? localTrips.map(t => (t.id === tripId ? updated : t))
    : [updated, ...localTrips];

  saveLocalTrips(updatedList, userId);
  return updated;
}

/**
 * Deletes a trip collection
 */
export async function deleteUserTrip(
  tripId: string,
  userId?: string | null,
  token?: string | null
): Promise<void> {
  const localTrips = loadLocalTrips(userId);
  const updatedList = localTrips.filter(t => t.id !== tripId);
  saveLocalTrips(updatedList, userId);

  for (const backendUrl of getBackendCandidateUrls()) {
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      await fetch(`${backendUrl}/api/user-trips/${tripId}`, {
        method: 'DELETE',
        headers,
      });
    } catch {}
  }
}

/**
 * Creates a shareable link for a user trip or all trips
 */
export async function createTripCollectionShare(params: {
  tripId?: string;
  isAllTrips?: boolean;
  tripName?: string;
  title?: string;
  ownerName?: string;
  userId?: string;
  stops?: SelectedStop[];
  travelMode?: TravelMode;
  token?: string | null;
}): Promise<{ shareUrl: string; shareId?: string; tripName?: string; totalDestinations: number }> {
  const { tripId, isAllTrips, tripName, title, ownerName, userId, stops, travelMode, token } = params;

  let generatedShareId: string | undefined;
  let finalTripName = tripName || (isAllTrips ? 'All Trips' : 'Shared Trip');
  let finalTotal = stops?.length || 0;

  for (const backendUrl of getBackendCandidateUrls()) {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${backendUrl}/api/trips/share`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          tripId,
          isAllTrips,
          tripName,
          title,
          ownerName: ownerName || 'A Fellow Traveler',
          userId,
          stops,
          travelMode: travelMode || 'DRIVING',
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.shareId) {
          generatedShareId = json.shareId;
          finalTripName = json.tripName || finalTripName;
          finalTotal = json.totalDestinations || finalTotal;
          break;
        }
      }
    } catch {}
  }

  const origin = window.location.origin;
  const pathname = window.location.pathname;

  let fallbackB64 = '';
  if (stops && stops.length > 0) {
    const fallbackUrl = encodeTripToUrl(title || finalTripName, travelMode || 'DRIVING', stops, 'All States');
    const match = fallbackUrl.match(/trip=([^&]+)/);
    if (match) fallbackB64 = match[1];
  }

  let finalShareUrl: string;
  if (generatedShareId) {
    finalShareUrl = `${origin}${pathname}#/dashboard?share=${generatedShareId}${fallbackB64 ? `&trip=${fallbackB64}` : ''}`;
  } else {
    finalShareUrl = `${origin}${pathname}#/dashboard?trip=${fallbackB64}`;
  }

  return {
    shareUrl: finalShareUrl,
    shareId: generatedShareId,
    tripName: finalTripName,
    totalDestinations: finalTotal,
  };
}

/**
 * Imports a shared trip into the current user's collections
 */
export async function importSharedTripToUser(
  shareId: string,
  customTripName?: string,
  userId?: string | null,
  token?: string | null
): Promise<{ trip?: TripCollection; importedTrips?: TripCollection[]; message: string }> {
  for (const backendUrl of getBackendCandidateUrls()) {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${backendUrl}/api/trips/import`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          shareId,
          customTripName,
          userId,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.trip) {
          const localTrips = loadLocalTrips(userId);
          saveLocalTrips([json.trip, ...localTrips.filter(t => t.id !== json.trip.id)], userId);
          return { trip: json.trip, message: json.message || 'Trip imported successfully!' };
        } else if (Array.isArray(json.importedTrips)) {
          const localTrips = loadLocalTrips(userId);
          const combined = [...json.importedTrips, ...localTrips];
          saveLocalTrips(combined, userId);
          return { importedTrips: json.importedTrips, message: json.message || 'Trips imported successfully!' };
        }
      }
    } catch {}
  }

  throw new Error('Failed to import shared trip. Please check your connection and try again.');
}
