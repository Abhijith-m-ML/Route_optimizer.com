import { getGoogleMapsApiKey, loadPlacesLibrary } from './googleMapsLoader';
import type { Destination, PlaceCategory, PlaceSuggestion } from '../types';
import { getStateByName, normalizeStateName } from '../data/indianStates';

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

// Known India coordinates used for fallback
export const INDIA_CENTER_COORDS = { lat: 20.5937, lng: 78.9629 };
export const MUMBAI_CENTER_COORDS = { lat: 19.0760, lng: 72.8777 };

/**
 * Famous India landmark presets for instant testing & quick discovery
 */
export const POPULAR_MUMBAI_LANDMARKS = [
  { name: 'Gateway of India', query: 'Gateway of India, Colaba, Mumbai' },
  { name: 'Marine Drive', query: 'Marine Drive, Netaji Subhash Chandra Bose Road, Mumbai' },
  { name: 'CSMT', query: 'Chhatrapati Shivaji Maharaj Terminus, Mumbai' },
  { name: 'Bandra Bandstand', query: 'Bandstand Promenade, Bandra West, Mumbai' },
  { name: 'Siddhivinayak Temple', query: 'Shree Siddhivinayak Temple, Prabhadevi, Mumbai' },
  { name: 'Fort Kochi', query: 'Fort Kochi, Kochi, Kerala' },
  { name: 'Munnar', query: 'Munnar, Idukki, Kerala' },
  { name: 'Lalbagh Botanical Garden', query: 'Lalbagh Botanical Garden, Bengaluru, Karnataka' },
];

/**
 * Maps Google Places API types to RouteWise PlaceCategory
 */
export function inferPlaceCategory(types?: string[], name?: string): PlaceCategory {
  const t = types || [];
  const lowerName = (name || '').toLowerCase();

  if (t.includes('hindu_temple') || t.includes('place_of_worship') || t.includes('church') || t.includes('mosque') || t.includes('synagogue')) {
    return 'spiritual';
  }
  if (t.includes('natural_feature') || lowerName.includes('beach') || lowerName.includes('chowpatty') || lowerName.includes('coast')) {
    return 'beach';
  }
  if (t.includes('historical_landmark') || t.includes('museum') || t.includes('tourist_attraction') || t.includes('monument') || t.includes('historical_place') || lowerName.includes('fort')) {
    return 'heritage';
  }
  if (t.includes('restaurant') || t.includes('cafe') || t.includes('bar') || t.includes('food') || t.includes('bakery')) {
    return 'food';
  }
  if (t.includes('shopping_mall') || t.includes('market') || t.includes('store') || lowerName.includes('bazaar')) {
    return 'market';
  }
  if (t.includes('park') || t.includes('zoo') || t.includes('campground') || lowerName.includes('garden')) {
    return 'nature';
  }
  return 'modern';
}

/**
 * Shortens a formatted address to 2 relevant segments for clean UI card display
 */
export function formatShortAddress(address: string): string {
  if (!address) return 'India';
  const parts = address.split(',').map((p) => p.trim());
  if (parts.length >= 2) {
    return `${parts[0]}, ${parts[1]}`;
  }
  return address;
}

export interface AddressComponentsResult {
  city?: string;
  state?: string;
  stateCode?: string;
  country?: string;
}

/**
 * Extracts normalized City, State, StateCode, and Country from Google address_components
 * Supporting both Places API (New) format (longText/shortText) and JS SDK format (long_name/short_name).
 */
export function parseAddressComponents(
  components?: Array<Record<string, unknown>>,
  fallbackAddress?: string
): AddressComponentsResult {
  let rawCity: string | undefined;
  let rawDistrict: string | undefined;
  let rawState: string | undefined;
  let rawStateCode: string | undefined;
  let rawCountry: string | undefined;

  if (Array.isArray(components) && components.length > 0) {
    for (const comp of components) {
      const types = (comp.types as string[]) || [];
      const longName = (comp.longText || comp.long_name || '') as string;
      const shortName = (comp.shortText || comp.short_name || '') as string;

      if (types.includes('locality')) {
        rawCity = longName;
      } else if (types.includes('administrative_area_level_2')) {
        rawDistrict = longName;
      } else if (types.includes('sublocality_level_1') && !rawCity) {
        rawCity = longName;
      }

      if (types.includes('administrative_area_level_1')) {
        rawState = longName;
        rawStateCode = shortName;
      }

      if (types.includes('country')) {
        rawCountry = longName;
      }
    }
  }

  // Fallback: If state is still missing, parse from formattedAddress text
  if (!rawState && fallbackAddress) {
    const segments = fallbackAddress.split(',').map((s) => s.trim());
    for (const seg of segments) {
      const normalized = normalizeStateName(seg);
      if (normalized.type !== 'Unknown') {
        rawState = normalized.name;
        rawStateCode = normalized.code;
        break;
      }
    }
  }

  const normalizedState = normalizeStateName(rawState, rawStateCode);

  return {
    city: rawCity || rawDistrict || undefined,
    state: normalizedState.name !== 'Other' ? normalizedState.name : (rawState || undefined),
    stateCode: normalizedState.code || rawStateCode || undefined,
    country: rawCountry || 'India',
  };
}

/**
 * Parses secondary prediction text (e.g. "Kochi, Kerala, India") to extract quick city & state
 */
export function extractCityAndStateFromText(text: string): { city?: string; state?: string } {
  if (!text) return {};
  const parts = text.split(',').map((p) => p.trim());
  let foundState: string | undefined;
  let foundCity: string | undefined;

  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    const match = normalizeStateName(part);
    if (match.type !== 'Unknown') {
      foundState = match.name;
      if (i > 0) {
        foundCity = parts[i - 1];
      }
      break;
    }
  }

  if (!foundCity && parts.length > 0 && parts[0] !== foundState) {
    foundCity = parts[0];
  }

  return { city: foundCity, state: foundState };
}

export interface PlacesSearchError extends Error {
  code: 'PLACES_API_NOT_ENABLED' | 'REQUEST_DENIED' | 'NETWORK_ERROR' | 'UNKNOWN_ERROR';
  details?: string;
}

/**
 * Searches places and landmarks using Google Places API (New) with legacy JS fallback.
 * Prioritizes suggestions from `selectedState` without excluding other states.
 */
export async function searchPlaces(
  query: string,
  selectedState?: string
): Promise<PlaceSuggestion[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const apiKey = getGoogleMapsApiKey();
  const stateObj = selectedState && selectedState !== 'All States' ? getStateByName(selectedState) : undefined;

  let rawSuggestions: PlaceSuggestion[] = [];

  // 1. Primary: Use Google Places API (New) REST endpoint
  if (apiKey) {
    try {
      const requestBody: Record<string, unknown> = {
        input: trimmed,
      };

      // Add locationBias if a specific state is selected
      if (stateObj && stateObj.center) {
        requestBody.locationBias = {
          circle: {
            center: {
              latitude: stateObj.center.lat,
              longitude: stateObj.center.lng,
            },
            radius: stateObj.radiusMeters,
          },
        };
      }

      const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.error) {
        if (data.error.status === 'PERMISSION_DENIED') {
          const err = new Error(
            'Places API (New) is not activated or enabled for this project. Please enable it in Google Cloud Console.'
          ) as PlacesSearchError;
          err.code = 'PLACES_API_NOT_ENABLED';
          throw err;
        }
      }

      if (data.suggestions && Array.isArray(data.suggestions)) {
        rawSuggestions = data.suggestions
          .filter((s: { placePrediction?: unknown }) => Boolean(s.placePrediction))
          .map((s: {
            placePrediction: {
              placeId?: string;
              place?: string;
              text?: { text?: string };
              structuredFormat?: {
                mainText?: { text?: string };
                secondaryText?: { text?: string };
              };
              types?: string[];
            };
          }) => {
            const p = s.placePrediction;
            const placeId = p.placeId || (p.place ? p.place.replace('places/', '') : `place_${Date.now()}`);
            const primaryText = p.structuredFormat?.mainText?.text || p.text?.text || trimmed;
            const secondaryText = p.structuredFormat?.secondaryText?.text || '';
            const fullText = p.text?.text || `${primaryText}, ${secondaryText}`;

            const locationInfo = extractCityAndStateFromText(secondaryText || fullText);

            return {
              placeId,
              primaryText,
              secondaryText,
              fullText,
              types: p.types,
              city: locationInfo.city,
              state: locationInfo.state,
            };
          });
      }
    } catch (restErr: unknown) {
      if ((restErr as PlacesSearchError)?.code === 'PLACES_API_NOT_ENABLED') {
        throw restErr;
      }
      console.warn('[RouteWise Places API New] Fetch failed, attempting JS SDK fallback:', restErr);
    }
  }

  // 2. Fallback: Google Maps JavaScript AutocompleteService
  if (rawSuggestions.length === 0) {
    try {
      await loadPlacesLibrary();
      if (window.google?.maps?.places?.AutocompleteService) {
        const service = new window.google.maps.places.AutocompleteService();
        rawSuggestions = await new Promise((resolve, reject) => {
          const options: google.maps.places.AutocompletionRequest = {
            input: trimmed,
          };

          if (stateObj && window.google?.maps?.Circle) {
            options.locationBias = new window.google.maps.Circle({
              center: stateObj.center,
              radius: stateObj.radiusMeters,
            });
          }

          service.getPlacePredictions(options, (predictions, status) => {
            const placesStatus = window.google.maps.places.PlacesServiceStatus;
            if (status === placesStatus.OK && predictions) {
              const suggestions: PlaceSuggestion[] = predictions.map((p) => {
                const secondary = p.structured_formatting?.secondary_text || '';
                const full = p.description;
                const locationInfo = extractCityAndStateFromText(secondary || full);

                return {
                  placeId: p.place_id,
                  primaryText: p.structured_formatting?.main_text || p.description,
                  secondaryText: secondary,
                  fullText: full,
                  types: p.types,
                  city: locationInfo.city,
                  state: locationInfo.state,
                };
              });
              resolve(suggestions);
            } else if (status === placesStatus.ZERO_RESULTS || !predictions) {
              resolve([]);
            } else {
              const err = new Error(
                'Google Places API returned: ' + status
              ) as PlacesSearchError;
              err.code = status === placesStatus.REQUEST_DENIED ? 'PLACES_API_NOT_ENABLED' : 'UNKNOWN_ERROR';
              reject(err);
            }
          });
        });
      }
    } catch (sdkErr) {
      console.warn('[RouteWise Places SDK] JS AutocompleteService fallback unavailable:', sdkErr);
    }
  }

  // 3. State prioritization logic
  if (stateObj && stateObj.name !== 'All States') {
    const targetState = stateObj.name.toLowerCase();
    const targetCode = stateObj.code.toLowerCase();

    const matchesTargetState = (s: PlaceSuggestion): boolean => {
      if (s.state && s.state.toLowerCase() === targetState) return true;
      if (s.stateCode && s.stateCode.toLowerCase() === targetCode) return true;
      const combined = `${s.secondaryText} ${s.fullText}`.toLowerCase();
      if (combined.includes(targetState) || combined.includes(targetCode)) return true;
      if (stateObj.aliases && stateObj.aliases.some((a) => combined.includes(a.toLowerCase()))) {
        return true;
      }
      return false;
    };

    const prioritized: PlaceSuggestion[] = [];
    const others: PlaceSuggestion[] = [];

    for (const sug of rawSuggestions) {
      if (matchesTargetState(sug)) {
        prioritized.push({
          ...sug,
          state: sug.state || stateObj.name,
          stateCode: stateObj.code,
          isPrioritized: true,
        });
      } else {
        others.push(sug);
      }
    }

    return [...prioritized, ...others];
  }

  return rawSuggestions;
}

/**
 * Reverse geocodes coordinates to fetch exact address, city, state and country
 */
export async function reverseGeocodeCoords(
  lat: number,
  lng: number
): Promise<{ address: string; city?: string; state?: string; stateCode?: string; country?: string }> {
  try {
    await loadPlacesLibrary();
    if (window.google?.maps?.Geocoder) {
      const geocoder = new window.google.maps.Geocoder();
      const res = await geocoder.geocode({ location: { lat, lng } });
      if (res.results && res.results[0]) {
        const first = res.results[0];
        const parsed = parseAddressComponents(
          first.address_components as unknown as Array<Record<string, unknown>>,
          first.formatted_address
        );
        return {
          address: first.formatted_address,
          ...parsed,
        };
      }
    }
  } catch (err) {
    console.warn('[reverseGeocodeCoords] Geocoder lookup failed:', err);
  }

  return {
    address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    country: 'India',
  };
}

/**
 * Fetches full details for a selected place ID and transforms into a Destination object
 * with accurate State, City, StateCode, and Country from address components.
 */
export async function fetchPlaceDetails(
  placeId: string,
  fallbackName?: string,
  mapInstance?: google.maps.Map | null
): Promise<Destination> {
  const apiKey = getGoogleMapsApiKey();
  const cleanId = placeId.startsWith('places/') ? placeId.replace('places/', '') : placeId;

  // 1. Primary: Use Places API (New) GET places/{placeId}
  if (apiKey && !cleanId.includes('/') && cleanId.length < 100) {
    try {
      const response = await fetch(
        `https://places.googleapis.com/v1/places/${encodeURIComponent(cleanId)}`,
        {
          headers: {
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask':
              'id,displayName,formattedAddress,addressComponents,location,rating,userRatingCount,types',
          },
        }
      );

      const place = await response.json();

      if (place && place.location && typeof place.location.latitude === 'number') {
        const lat = place.location.latitude;
        const lng = place.location.longitude;
        const name = place.displayName?.text || fallbackName || 'Destination';
        const formattedAddress = place.formattedAddress || 'India';
        const shortAddress = formatShortAddress(formattedAddress);
        const category = inferPlaceCategory(place.types, name);
        const photoUrl = CATEGORY_DEFAULT_PHOTOS[category];

        const { city, state, stateCode, country } = parseAddressComponents(
          place.addressComponents,
          formattedAddress
        );

        return {
          id: `place_${place.id || cleanId}`,
          placeId: place.id || cleanId,
          name,
          category,
          description: formattedAddress,
          address: formattedAddress,
          shortAddress,
          city,
          state,
          stateCode,
          country,
          coordinates: { lat, lng },
          rating: typeof place.rating === 'number' ? Number(place.rating.toFixed(1)) : 4.6,
          reviewsCount: place.userRatingCount || 500,
          typicalVisitDurationMinutes: 60,
          photoUrl,
          tags: place.types || ['india', category],
        };
      }
    } catch (err) {
      console.warn('[RouteWise Places API New] Details fetch error, trying searchText fallback:', err);
    }
  }

  // 2. Secondary: Places API (New) searchText if placeId was a compound token or details missed
  if (apiKey && (fallbackName || cleanId)) {
    try {
      const query = fallbackName || cleanId;
      const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask':
            'places.id,places.displayName,places.formattedAddress,places.addressComponents,places.location,places.rating,places.userRatingCount,places.types',
        },
        body: JSON.stringify({
          textQuery: query,
        }),
      });

      const data = await response.json();
      const place = data.places?.[0];

      if (place && place.location && typeof place.location.latitude === 'number') {
        const lat = place.location.latitude;
        const lng = place.location.longitude;
        const name = place.displayName?.text || fallbackName || 'Destination';
        const formattedAddress = place.formattedAddress || 'India';
        const shortAddress = formatShortAddress(formattedAddress);
        const category = inferPlaceCategory(place.types, name);
        const photoUrl = CATEGORY_DEFAULT_PHOTOS[category];

        const { city, state, stateCode, country } = parseAddressComponents(
          place.addressComponents,
          formattedAddress
        );

        return {
          id: `place_${place.id || cleanId}`,
          placeId: place.id || cleanId,
          name,
          category,
          description: formattedAddress,
          address: formattedAddress,
          shortAddress,
          city,
          state,
          stateCode,
          country,
          coordinates: { lat, lng },
          rating: typeof place.rating === 'number' ? Number(place.rating.toFixed(1)) : 4.6,
          reviewsCount: place.userRatingCount || 500,
          typicalVisitDurationMinutes: 60,
          photoUrl,
          tags: place.types || ['india', category],
        };
      }
    } catch (searchErr) {
      console.warn('[RouteWise Places searchText] Fallback error:', searchErr);
    }
  }

  // 3. Fallback: Google Maps JS PlacesService
  try {
    await loadPlacesLibrary();
    if (window.google?.maps?.places?.PlacesService) {
      const div = document.createElement('div');
      const service = new window.google.maps.places.PlacesService(mapInstance || div);

      return await new Promise<Destination>((resolve, reject) => {
        service.getDetails(
          {
            placeId: cleanId,
            fields: ['name', 'formatted_address', 'address_components', 'geometry', 'rating', 'user_ratings_total', 'types', 'place_id'],
          },
          (place, status) => {
            const placesStatus = window.google.maps.places.PlacesServiceStatus;
            if (status === placesStatus.OK && place && place.geometry?.location) {
              const lat = place.geometry.location.lat();
              const lng = place.geometry.location.lng();
              const name = place.name || fallbackName || 'Destination';
              const formattedAddress = place.formatted_address || 'India';
              const shortAddress = formatShortAddress(formattedAddress);
              const category = inferPlaceCategory(place.types, name);
              const photoUrl = CATEGORY_DEFAULT_PHOTOS[category];

              const { city, state, stateCode, country } = parseAddressComponents(
                place.address_components as unknown as Array<Record<string, unknown>>,
                formattedAddress
              );

              resolve({
                id: `place_${place.place_id || cleanId}`,
                placeId: place.place_id || cleanId,
                name,
                category,
                description: formattedAddress,
                address: formattedAddress,
                shortAddress,
                city,
                state,
                stateCode,
                country,
                coordinates: { lat, lng },
                rating: place.rating || 4.5,
                reviewsCount: place.user_ratings_total || 200,
                typicalVisitDurationMinutes: 60,
                photoUrl,
                tags: place.types || ['india', category],
              });
            } else {
              reject(new Error(`Failed to fetch place details: ${status}`));
            }
          }
        );
      });
    }
  } catch (sdkErr) {
    console.warn('[RouteWise Places SDK] JS PlacesService details fetch error:', sdkErr);
  }

  // Fallback default
  const defaultCategory: PlaceCategory = 'heritage';
  const defaultAddress = 'India';
  const { city, state, stateCode, country } = parseAddressComponents([], defaultAddress);

  return {
    id: `place_${cleanId}`,
    placeId: cleanId,
    name: fallbackName || 'Destination',
    category: defaultCategory,
    description: defaultAddress,
    address: defaultAddress,
    shortAddress: defaultAddress,
    city,
    state,
    stateCode,
    country,
    coordinates: INDIA_CENTER_COORDS,
    rating: 4.5,
    reviewsCount: 100,
    typicalVisitDurationMinutes: 60,
    photoUrl: CATEGORY_DEFAULT_PHOTOS[defaultCategory],
    tags: ['india'],
  };
}
