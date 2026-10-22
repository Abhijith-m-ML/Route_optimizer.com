import { getGoogleMapsApiKey, loadPlacesLibrary } from './googleMapsLoader';
import type { Destination, PlaceCategory, PlaceSuggestion } from '../types';

// Fallback high-resolution Mumbai photos for various categories
const CATEGORY_DEFAULT_PHOTOS: Record<PlaceCategory, string> = {
  heritage: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=800&auto=format&fit=crop&q=80',
  beach: 'https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=800&auto=format&fit=crop&q=80',
  market: 'https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=800&auto=format&fit=crop&q=80',
  food: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&auto=format&fit=crop&q=80',
  nature: 'https://images.unsplash.com/photo-1588714477688-cf28a50e94f7?w=800&auto=format&fit=crop&q=80',
  spiritual: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&auto=format&fit=crop&q=80',
  modern: 'https://images.unsplash.com/photo-1566552881560-0be862a7c445?w=800&auto=format&fit=crop&q=80',
};

// Known Mumbai coordinates used for location biasing and quick landmark resolution
export const MUMBAI_CENTER_COORDS = { lat: 19.0760, lng: 72.8777 };

/**
 * Famous Mumbai landmark presets for instant testing & quick discovery
 */
export const POPULAR_MUMBAI_LANDMARKS = [
  { name: 'Gateway of India', query: 'Gateway of India, Colaba, Mumbai' },
  { name: 'Marine Drive', query: 'Marine Drive, Netaji Subhash Chandra Bose Road, Mumbai' },
  { name: 'CSMT', query: 'Chhatrapati Shivaji Maharaj Terminus, Mumbai' },
  { name: 'Bandra Bandstand', query: 'Bandstand Promenade, Bandra West, Mumbai' },
  { name: 'Siddhivinayak Temple', query: 'Shree Siddhivinayak Temple, Prabhadevi, Mumbai' },
  { name: 'Elephanta Caves', query: 'Elephanta Caves, Gharapuri, Mumbai' },
  { name: 'Juhu Beach', query: 'Juhu Beach, Mumbai' },
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
  if (t.includes('historical_landmark') || t.includes('museum') || t.includes('tourist_attraction') || t.includes('monument') || t.includes('historical_place')) {
    return 'heritage';
  }
  if (t.includes('restaurant') || t.includes('cafe') || t.includes('bar') || t.includes('food') || t.includes('bakery')) {
    return 'food';
  }
  if (t.includes('shopping_mall') || t.includes('market') || t.includes('store') || lowerName.includes('bazaar')) {
    return 'market';
  }
  if (t.includes('park') || t.includes('zoo') || t.includes('campground')) {
    return 'nature';
  }
  return 'modern';
}

/**
 * Shortens a formatted address to 2 relevant segments for clean UI card display
 */
export function formatShortAddress(address: string): string {
  if (!address) return 'Mumbai, Maharashtra';
  const parts = address.split(',').map((p) => p.trim());
  if (parts.length >= 2) {
    return `${parts[0]}, ${parts[1]}`;
  }
  return address;
}

export interface PlacesSearchError extends Error {
  code: 'PLACES_API_NOT_ENABLED' | 'REQUEST_DENIED' | 'NETWORK_ERROR' | 'UNKNOWN_ERROR';
  details?: string;
}

/**
 * Searches Mumbai places and landmarks using Google Places API (New) with legacy JS fallback
 */
export async function searchPlaces(query: string): Promise<PlaceSuggestion[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const apiKey = getGoogleMapsApiKey();

  // 1. Primary: Use Google Places API (New) REST endpoint (CORS supported)
  if (apiKey) {
    try {
      const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
        },
        body: JSON.stringify({
          input: trimmed,
        }),
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
        return data.suggestions
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

            return {
              placeId,
              primaryText,
              secondaryText,
              fullText,
              types: p.types,
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
  try {
    await loadPlacesLibrary();
    if (window.google?.maps?.places?.AutocompleteService) {
      const service = new window.google.maps.places.AutocompleteService();
      return new Promise((resolve, reject) => {
        service.getPlacePredictions(
          {
            input: trimmed,
          },
          (predictions, status) => {
            const placesStatus = window.google.maps.places.PlacesServiceStatus;
            if (status === placesStatus.OK && predictions) {
              const suggestions: PlaceSuggestion[] = predictions.map((p) => ({
                placeId: p.place_id,
                primaryText: p.structured_formatting?.main_text || p.description,
                secondaryText: p.structured_formatting?.secondary_text || '',
                fullText: p.description,
                types: p.types,
              }));
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
          }
        );
      });
    }
  } catch (sdkErr) {
    console.warn('[RouteWise Places SDK] JS AutocompleteService fallback unavailable:', sdkErr);
  }

  return [];
}

/**
 * Fetches full details for a selected place ID and transforms into a Destination object
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
              'id,displayName,formattedAddress,location,rating,userRatingCount,types',
          },
        }
      );

      const place = await response.json();

      if (place && place.location && typeof place.location.latitude === 'number') {
        const lat = place.location.latitude;
        const lng = place.location.longitude;
        const name = place.displayName?.text || fallbackName || 'Mumbai Destination';
        const formattedAddress = place.formattedAddress || 'Mumbai, Maharashtra, India';
        const shortAddress = formatShortAddress(formattedAddress);
        const category = inferPlaceCategory(place.types, name);
        const photoUrl = CATEGORY_DEFAULT_PHOTOS[category];

        return {
          id: `place_${place.id || cleanId}`,
          placeId: place.id || cleanId,
          name,
          category,
          description: formattedAddress,
          address: formattedAddress,
          shortAddress,
          coordinates: { lat, lng },
          rating: typeof place.rating === 'number' ? Number(place.rating.toFixed(1)) : 4.6,
          reviewsCount: place.userRatingCount || 500,
          typicalVisitDurationMinutes: 60,
          photoUrl,
          tags: place.types || ['mumbai', category],
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
            'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types',
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
        const name = place.displayName?.text || fallbackName || 'Mumbai Destination';
        const formattedAddress = place.formattedAddress || 'Mumbai, Maharashtra, India';
        const shortAddress = formatShortAddress(formattedAddress);
        const category = inferPlaceCategory(place.types, name);
        const photoUrl = CATEGORY_DEFAULT_PHOTOS[category];

        return {
          id: `place_${place.id || cleanId}`,
          placeId: place.id || cleanId,
          name,
          category,
          description: formattedAddress,
          address: formattedAddress,
          shortAddress,
          coordinates: { lat, lng },
          rating: typeof place.rating === 'number' ? Number(place.rating.toFixed(1)) : 4.6,
          reviewsCount: place.userRatingCount || 500,
          typicalVisitDurationMinutes: 60,
          photoUrl,
          tags: place.types || ['mumbai', category],
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

      return new Promise((resolve, reject) => {
        service.getDetails(
          {
            placeId: cleanId,
            fields: ['name', 'formatted_address', 'geometry', 'rating', 'user_ratings_total', 'types', 'place_id'],
          },
          (place, status) => {
            const placesStatus = window.google.maps.places.PlacesServiceStatus;
            if (status === placesStatus.OK && place && place.geometry?.location) {
              const lat = place.geometry.location.lat();
              const lng = place.geometry.location.lng();
              const name = place.name || fallbackName || 'Mumbai Destination';
              const formattedAddress = place.formatted_address || 'Mumbai, Maharashtra, India';
              const shortAddress = formatShortAddress(formattedAddress);
              const category = inferPlaceCategory(place.types, name);
              const photoUrl = CATEGORY_DEFAULT_PHOTOS[category];

              resolve({
                id: `place_${place.place_id || cleanId}`,
                placeId: place.place_id || cleanId,
                name,
                category,
                description: formattedAddress,
                address: formattedAddress,
                shortAddress,
                coordinates: { lat, lng },
                rating: place.rating || 4.5,
                reviewsCount: place.user_ratings_total || 200,
                typicalVisitDurationMinutes: 60,
                photoUrl,
                tags: place.types || ['mumbai', category],
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
  return {
    id: `place_${cleanId}`,
    placeId: cleanId,
    name: fallbackName || 'Mumbai Landmark',
    category: defaultCategory,
    description: 'Mumbai, Maharashtra, India',
    address: 'Mumbai, Maharashtra, India',
    shortAddress: 'Mumbai, Maharashtra',
    coordinates: MUMBAI_CENTER_COORDS,
    rating: 4.5,
    reviewsCount: 100,
    typicalVisitDurationMinutes: 60,
    photoUrl: CATEGORY_DEFAULT_PHOTOS[defaultCategory],
    tags: ['mumbai'],
  };
}
