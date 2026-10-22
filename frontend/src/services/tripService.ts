import type { SelectedStop, TravelMode } from '../types';

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
 * Persist trip to localStorage and attempt backend sync
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
    userId: userId || undefined,
  };

  const serialized = JSON.stringify(trip);

  // 1. Primary persistence: localStorage
  try {
    if (userId) {
      localStorage.setItem(`${STORAGE_PREFIX}${userId.toLowerCase()}`, serialized);
    }
    localStorage.setItem(GLOBAL_STORAGE_KEY, serialized);
  } catch (err) {
    console.warn('[RouteWise] Failed to save trip to localStorage:', err);
  }

  // 2. Secondary persistence: Backend API (non-blocking, fails gracefully)
  try {
    await fetch('http://localhost:5000/api/trips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: serialized,
    }).catch(() => {
      // Backend may be offline or unreachable; silently continue
    });
  } catch {
    // Non-fatal
  }

  return trip;
}

/**
 * Clear the saved trip from localStorage
 */
export function clearSavedTrip(userId?: string | null): void {
  try {
    if (userId) {
      localStorage.removeItem(`${STORAGE_PREFIX}${userId.toLowerCase()}`);
    }
    localStorage.removeItem(GLOBAL_STORAGE_KEY);
  } catch (err) {
    console.error('[RouteWise] Failed to clear saved trip from localStorage:', err);
  }
}
