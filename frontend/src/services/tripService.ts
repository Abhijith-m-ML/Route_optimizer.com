import type { SelectedStop, TravelMode, SharedTripData } from '../types';
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
