import type { SelectedStop, TravelMode } from '../types';
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

  // If custom environment variable is set and NOT pointing to obsolete subdomains, use it
  if (
    envUrl &&
    !envUrl.includes('vazhikatti.onrender.com') &&
    !envUrl.includes('vazhikatti-api.onrender.com')
  ) {
    return envUrl.replace(/\/+$/, '');
  }

  // Deployed web environments (Vercel, GitHub Pages, custom domain)
  if (
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  ) {
    return 'https://vazhikatti-gfuq.onrender.com';
  }

  return 'http://localhost:5000';
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

  // 2. Try Backend API (enables laptop <-> phone synchronization via your Render backend)
  try {
    const backendUrl = getBackendUrl();
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
  } catch (backendErr) {
    // Backend offline or warming up
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
    title: tripData.title || 'Mumbai Highlights Explorer',
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

  // 3. Secondary persistence: Backend API (cross-device sync via backend)
  try {
    const backendUrl = getBackendUrl();
    await fetch(`${backendUrl}/api/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: serialized,
    }).catch(() => {});
  } catch {}

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
  try {
    const backendUrl = getBackendUrl();
    const cleanId = userId ? userId.toLowerCase().replace(/[^a-z0-9_-]/g, '_') : 'default';
    await fetch(`${backendUrl}/api/trips/${cleanId}`, { method: 'DELETE' }).catch(() => {});
  } catch {}
}

/**
 * Encodes trip data into a lightweight shareable URL that can be opened on any phone or browser
 */
export function encodeTripToUrl(title: string, travelMode: TravelMode, stops: SelectedStop[]): string {
  try {
    const compact = {
      t: title,
      m: travelMode,
      s: stops.map((s) => ({
        id: s.id,
        n: s.name,
        a: s.address,
        c: s.coordinates,
        cat: s.category,
        d: s.customDurationMinutes || s.typicalVisitDurationMinutes,
        p: s.photoUrl,
        pid: s.placeId,
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
): { title: string; travelMode: TravelMode; stops: SelectedStop[] } | null {
  try {
    const jsonStr = decodeURIComponent(atob(encoded));
    const parsed = JSON.parse(jsonStr);
    if (!parsed || !Array.isArray(parsed.s)) return null;

    const stops: SelectedStop[] = parsed.s.map((item: any, idx: number) => ({
      id: item.id || `stop_${idx}_${Date.now()}`,
      name: item.n || 'Destination',
      address: item.a || '',
      coordinates: item.c || { lat: 19.076, lng: 72.8777 },
      category: item.cat || 'sightseeing',
      typicalVisitDurationMinutes: item.d || 60,
      customDurationMinutes: item.d || 60,
      stopOrder: idx + 1,
      photoUrl: item.p,
      placeId: item.pid,
      description: item.n,
      rating: 4.8,
      reviewsCount: 100,
    }));

    return {
      title: parsed.t || 'Shared RouteWise Trip',
      travelMode: parsed.m || 'DRIVING',
      stops,
    };
  } catch (err) {
    console.error('[RouteWise] Failed to decode trip from URL:', err);
    return null;
  }
}
