import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

// Augment Window interface for Google Maps runtime global properties
declare global {
  interface Window {
    google?: typeof google;
    gm_authFailure?: () => void;
  }
}

let isOptionsConfigured = false;
let mapsLibraryPromise: Promise<google.maps.MapsLibrary> | null = null;

type AuthFailureListener = (errorMsg: string) => void;
const authFailureListeners: Set<AuthFailureListener> = new Set();

// Register global window.gm_authFailure handler
if (typeof window !== 'undefined') {
  window.gm_authFailure = () => {
    console.error('[RouteWise Google Maps] Authentication failure: The provided Google Maps API key was rejected by Google servers.');
    const errorMsg = 'Google Maps authorization failed. Please check that your API key is valid, billing is enabled, and the Maps JavaScript API is activated in Google Cloud Console.';
    authFailureListeners.forEach((listener) => listener(errorMsg));
  };
}

export function onGoogleMapsAuthFailure(listener: AuthFailureListener): () => void {
  authFailureListeners.add(listener);
  return () => {
    authFailureListeners.delete(listener);
  };
}

/**
 * Returns the Google Maps API Key from Vite environment variables
 */
export function getGoogleMapsApiKey(): string {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  return typeof key === 'string' ? key.trim() : '';
}

/**
 * Checks whether a valid Google Maps API Key is configured
 */
export function isGoogleMapsConfigured(): boolean {
  const key = getGoogleMapsApiKey();
  return Boolean(
    key &&
    key !== 'your_google_maps_api_key_here' &&
    key !== 'your_api_key_here' &&
    key.length > 5
  );
}
let placesLibraryPromise: Promise<google.maps.PlacesLibrary> | null = null;

/**
 * Loads the Google Maps JavaScript API via the official loader (singleton pattern).
 * Prevents multiple script injections and guarantees safe async resolution.
 */
export async function loadGoogleMaps(): Promise<google.maps.MapsLibrary> {
  // If already loaded and available on window
  if (typeof window !== 'undefined' && window.google?.maps) {
    return window.google.maps;
  }

  // If loading is already in progress, return the existing promise
  if (mapsLibraryPromise) {
    return mapsLibraryPromise;
  }

  const apiKey = getGoogleMapsApiKey();

  if (!apiKey || !isGoogleMapsConfigured()) {
    throw new Error('MISSING_API_KEY');
  }

  if (!isOptionsConfigured) {
    setOptions({
      key: apiKey,
      v: 'weekly',
    });
    isOptionsConfigured = true;
  }

  mapsLibraryPromise = importLibrary('maps')
    .then((mapsLib) => {
      return mapsLib as google.maps.MapsLibrary;
    })
    .catch((err: unknown) => {
      mapsLibraryPromise = null; // reset so user can retry after fixing credentials
      console.error('[RouteWise Google Maps] Script loading error:', err);
      throw err;
    });

  return mapsLibraryPromise;
}

/**
 * Loads the Google Maps Places library on demand via importLibrary('places')
 */
export async function loadPlacesLibrary(): Promise<google.maps.PlacesLibrary> {
  if (typeof window !== 'undefined' && window.google?.maps?.places) {
    return window.google.maps.places as unknown as google.maps.PlacesLibrary;
  }

  if (placesLibraryPromise) {
    return placesLibraryPromise;
  }

  const apiKey = getGoogleMapsApiKey();

  if (!apiKey || !isGoogleMapsConfigured()) {
    throw new Error('MISSING_API_KEY');
  }

  if (!isOptionsConfigured) {
    setOptions({
      key: apiKey,
      v: 'weekly',
    });
    isOptionsConfigured = true;
  }

  placesLibraryPromise = importLibrary('places')
    .then((placesLib) => {
      return placesLib as google.maps.PlacesLibrary;
    })
    .catch((err: unknown) => {
      placesLibraryPromise = null;
      console.error('[RouteWise Google Maps] Places library loading error:', err);
      throw err;
    });

  return placesLibraryPromise;
}
