import type { SelectedStop, TravelMode, Destination, PlaceCategory } from '../types';

// Fallback short address formatter
function formatShortAddress(address: string): string {
  if (!address) return 'India';
  const parts = address.split(',').map((p) => p.trim());
  if (parts.length >= 2) {
    return `${parts[0]}, ${parts[1]}`;
  }
  return address;
}

// Fallback high-resolution photos for various categories
const CATEGORY_DEFAULT_PHOTOS: Record<PlaceCategory, string> = {
  heritage: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=800&auto=format&fit=crop&q=80',
  beach: 'https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=800&auto=format&fit=crop&q=80',
  market: 'https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=800&auto=format&fit=crop&q=80',
  food: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&auto=format&fit=crop&q=80',
  nature: 'https://images.unsplash.com/photo-1588714477688-cf28a50e94f7?w=800&auto=format&fit=crop&q=80',
  spiritual: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&auto=format&fit=crop&q=80',
  modern: 'https://images.unsplash.com/photo-1566552881560-0be862a7c445?w=800&auto=format&fit=crop&q=80',
};

// Default fallback Geoapify API key for production stability
const FALLBACK_GEOAPIFY_KEY = '37474d11d3de48b0a71f97304ab9cff1';

/**
 * Returns the active Geoapify API Key from environment or fallback
 */
export function getGeoapifyApiKey(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEOAPIFY_API_KEY) {
    const key = import.meta.env.VITE_GEOAPIFY_API_KEY.trim();
    if (key && key !== 'YOUR_GEOAPIFY_API_KEY') {
      return key;
    }
  }
  return FALLBACK_GEOAPIFY_KEY;
}

/**
 * Checks whether a valid Geoapify API key is present
 */
export function isGeoapifyConfigured(): boolean {
  const key = getGeoapifyApiKey();
  return Boolean(key && key.length > 10);
}

/**
 * Returns the MapLibre style JSON URL for the chosen map theme
 */
export function getGeoapifyMapStyleUrl(theme: 'roadmap' | 'dark' | 'satellite' = 'roadmap'): string {
  const apiKey = getGeoapifyApiKey();
  if (theme === 'dark') {
    return `https://maps.geoapify.com/v1/styles/dark-matter/style.json?apiKey=${apiKey}`;
  }
  // Standard / Light mode uses Geoapify OSM Bright style as requested
  return `https://maps.geoapify.com/v1/styles/osm-bright/style.json?apiKey=${apiKey}`;
}

// In-memory caches to prevent repeated API calls and preserve quota
const searchCache = new Map<string, Destination[]>();
const reverseCache = new Map<string, { name: string; address: string; shortAddress: string; city?: string; state?: string; country?: string }>();
const routeCache = new Map<string, GeoapifyRouteResult>();

// In-flight request controller for autocomplete debounce cancellation
let activeSearchAbortController: AbortController | null = null;
let quotaExhausted = false;

export function isGeoapifyQuotaExhausted(): boolean {
  return quotaExhausted;
}

export interface GeoapifyRouteLeg {
  distanceKm: number;
  durationMinutes: number;
}

export interface GeoapifyRouteResult {
  totalDistanceKm: number;
  totalDurationMinutes: number;
  geometry: any; // GeoJSON geometry (LineString or MultiLineString)
  legs: GeoapifyRouteLeg[];
}

/**
 * Maps Geoapify categories and place types to Vazhikatti PlaceCategory
 */
function mapGeoapifyCategory(categories?: string[], name?: string): PlaceCategory {
  const cats = (categories || []).map((c) => c.toLowerCase());
  const lowerName = (name || '').toLowerCase();

  if (cats.some((c) => c.includes('religion') || c.includes('place_of_worship')) || lowerName.includes('temple') || lowerName.includes('church') || lowerName.includes('mosque')) {
    return 'spiritual';
  }
  if (cats.some((c) => c.includes('beach') || c.includes('natural.water')) || lowerName.includes('beach') || lowerName.includes('coast')) {
    return 'beach';
  }
  if (cats.some((c) => c.includes('heritage') || c.includes('tourism') || c.includes('historic') || c.includes('monument')) || lowerName.includes('fort') || lowerName.includes('palace') || lowerName.includes('museum')) {
    return 'heritage';
  }
  if (cats.some((c) => c.includes('catering') || c.includes('restaurant') || c.includes('cafe') || c.includes('food')) || lowerName.includes('restaurant') || lowerName.includes('bhojanalaya')) {
    return 'food';
  }
  if (cats.some((c) => c.includes('commercial') || c.includes('shopping') || c.includes('market') || c.includes('retail')) || lowerName.includes('market') || lowerName.includes('bazaar')) {
    return 'market';
  }
  if (cats.some((c) => c.includes('national_park') || c.includes('park') || c.includes('leisure.park')) || lowerName.includes('garden') || lowerName.includes('park')) {
    return 'nature';
  }
  return 'modern';
}

/**
 * Geocoding & Autocomplete via Geoapify API
 * Includes 450ms debounce support, query cancellation, caching, and rate-limit safety.
 */
export async function geoapifyAutocomplete(
  query: string,
  options: { stateBias?: string; limit?: number } = {}
): Promise<Destination[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  const apiKey = getGeoapifyApiKey();
  const limit = options.limit || 8;
  const cacheKey = `${trimmed.toLowerCase()}_${options.stateBias || ''}_${limit}`;

  // Check cache first
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey)!;
  }

  // Cancel prior in-flight request if user is still actively typing
  if (activeSearchAbortController) {
    activeSearchAbortController.abort();
  }
  activeSearchAbortController = new AbortController();

  try {
    const url = new URL('https://api.geoapify.com/v1/geocode/autocomplete');
    url.searchParams.set('text', trimmed);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('apiKey', apiKey);

    // Optional country/state bias if query does not already specify a country
    if (options.stateBias && options.stateBias !== 'All States' && !trimmed.toLowerCase().includes(options.stateBias.toLowerCase())) {
      url.searchParams.set('filter', `countrycode:in`);
    }

    let res: Response;
    try {
      res = await fetch(url.toString(), { signal: activeSearchAbortController.signal });
      if (!res.ok) {
        throw new Error(`Direct status ${res.status}`);
      }
    } catch (directErr) {
      // Automatic fallback to backend proxy (/api/places/autocomplete)
      const proxyUrl = `/api/places/autocomplete?text=${encodeURIComponent(trimmed)}&limit=${limit}`;
      res = await fetch(proxyUrl);
    }

    if (!res.ok) {
      if (res.status === 401 || res.status === 402 || res.status === 429) {
        quotaExhausted = true;
        console.warn(`[Geoapify] Quota exceeded or invalid key (Status ${res.status}).`);
      }
      return [];
    }

    const data = await res.json();
    const features = Array.isArray(data.features) ? data.features : [];

    const destinations: Destination[] = features.map((f: any, idx: number) => {
      const props = f.properties || {};
      const coords = f.geometry?.coordinates || [0, 0];
      const lng = Number(props.lon ?? coords[0]);
      const lat = Number(props.lat ?? coords[1]);

      const primaryName = props.name || props.address_line1 || trimmed;
      const formattedAddress = props.formatted || `${primaryName}, ${props.city || ''}, ${props.state || ''}, ${props.country || ''}`.replace(/,\s*,/g, ', ').trim();
      const shortAddr = formatShortAddress(props.address_line1 ? `${props.address_line1}, ${props.city || props.state || props.country || ''}` : formattedAddress);
      const cat = mapGeoapifyCategory(props.categories, primaryName);

      return {
        id: `geo_${props.place_id || `${lat.toFixed(4)}_${lng.toFixed(4)}`}_${idx}`,
        name: primaryName,
        address: formattedAddress,
        shortAddress: shortAddr,
        coordinates: { lat, lng },
        category: cat,
        photoUrl: CATEGORY_DEFAULT_PHOTOS[cat],
        city: props.city || props.county,
        state: props.state,
        country: props.country,
        placeId: props.place_id,
        typicalVisitDurationMinutes: 60,
      };
    });

    // Cache valid results
    if (destinations.length > 0) {
      searchCache.set(cacheKey, destinations);
      if (searchCache.size > 200) {
        const oldestKey = searchCache.keys().next().value;
        if (oldestKey) searchCache.delete(oldestKey);
      }
    }

    return destinations;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return [];
    }
    console.warn('[Geoapify] Autocomplete request failed:', err);
    return [];
  }
}

/**
 * Reverse Geocoding via Geoapify API
 */
export async function geoapifyReverseGeocode(
  lat: number,
  lng: number
): Promise<{ name: string; address: string; shortAddress: string; city?: string; state?: string; country?: string }> {
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (reverseCache.has(cacheKey)) {
    return reverseCache.get(cacheKey)!;
  }

  const apiKey = getGeoapifyApiKey();
  try {
    const url = `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lng}&apiKey=${apiKey}`;
    let res: Response;
    try {
      res = await fetch(url);
      if (!res.ok) throw new Error(`Direct status: ${res.status}`);
    } catch {
      // Backend proxy fallback
      res = await fetch(`/api/places/reverse?lat=${lat}&lon=${lng}`);
    }

    if (!res.ok) {
      throw new Error(`Reverse geocoding status: ${res.status}`);
    }

    const data = await res.json();
    const first = data.features?.[0]?.properties;

    if (first) {
      const name = first.name || first.address_line1 || 'Pinned Location';
      const address = first.formatted || `${name}, India`;
      const shortAddress = first.address_line1 && first.city 
        ? `${first.address_line1}, ${first.city}` 
        : formatShortAddress(address);

      const result = {
        name,
        address,
        shortAddress,
        city: first.city || first.county,
        state: first.state,
        country: first.country,
      };

      reverseCache.set(cacheKey, result);
      return result;
    }
  } catch (err) {
    console.warn('[Geoapify] Reverse geocode lookup failed:', err);
  }

  // Fallback
  return {
    name: 'Selected Location',
    address: `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`,
    shortAddress: `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`,
  };
}

/**
 * Multi-stop routing calculation via Geoapify Routing API
 */
export async function geoapifyCalculateRoute(
  stops: SelectedStop[],
  mode: TravelMode = 'DRIVING'
): Promise<GeoapifyRouteResult | null> {
  if (stops.length < 2) return null;

  // Format waypoints: lat,lng|lat,lng|...
  const waypointsStr = stops.map((s) => `${s.coordinates.lat.toFixed(6)},${s.coordinates.lng.toFixed(6)}`).join('|');
  const geoapifyMode = mode === 'WALKING' ? 'walk' : 'drive'; // Supported modes
  const cacheKey = `${waypointsStr}_${geoapifyMode}`;

  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey)!;
  }

  const apiKey = getGeoapifyApiKey();
  try {
    const url = `https://api.geoapify.com/v1/routing?waypoints=${encodeURIComponent(waypointsStr)}&mode=${geoapifyMode}&apiKey=${apiKey}`;
    let res: Response;
    try {
      res = await fetch(url);
      if (!res.ok) throw new Error(`Direct status: ${res.status}`);
    } catch {
      // Backend proxy fallback
      res = await fetch(`/api/routes?waypoints=${encodeURIComponent(waypointsStr)}&mode=${geoapifyMode}`);
    }

    if (!res.ok) {
      console.warn(`[Geoapify Routing] API returned status ${res.status}`);
      return null;
    }

    const data = await res.json();
    const feature = data.features?.[0];
    if (!feature) return null;

    const props = feature.properties || {};
    const distanceMeters = Number(props.distance || 0);
    const durationSeconds = Number(props.time || 0);

    const totalDistanceKm = Number((distanceMeters / 1000).toFixed(1));
    const totalDurationMinutes = Math.max(1, Math.round(durationSeconds / 60));

    const legsData = Array.isArray(props.legs) ? props.legs : [];
    const legs: GeoapifyRouteLeg[] = legsData.map((leg: any) => ({
      distanceKm: Number(((leg.distance || 0) / 1000).toFixed(1)),
      durationMinutes: Math.max(1, Math.round((leg.time || 0) / 60)),
    }));

    const result: GeoapifyRouteResult = {
      totalDistanceKm,
      totalDurationMinutes,
      geometry: feature.geometry,
      legs,
    };

    routeCache.set(cacheKey, result);
    if (routeCache.size > 50) {
      const oldest = routeCache.keys().next().value;
      if (oldest) routeCache.delete(oldest);
    }

    return result;
  } catch (err) {
    console.warn('[Geoapify Routing] Route calculation failed, falling back to local geometry:', err);
    return null;
  }
}
