import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, 
  Loader2, 
  Plus, 
  Check, 
  X, 
  AlertCircle, 
  ExternalLink,
  LocateFixed,
  Sparkles
} from 'lucide-react';
import { 
  searchPlaces, 
  fetchPlaceDetails, 
  reverseGeocodeCoords,
  type PlacesSearchError
} from '../../services/placesService';
import type { Destination, PlaceSuggestion } from '../../types';

interface SearchBoxProps {
  onAddStop: (destination: Destination) => void;
  selectedIds: string[];
  selectedPlaceIds?: string[];
  selectedState?: string;
}

export const SearchBox: React.FC<SearchBoxProps> = ({
  onAddStop,
  selectedIds,
  selectedPlaceIds = [],
  selectedState = 'All States',
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPlaceId, setLoadingPlaceId] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isApiNotEnabled, setIsApiNotEnabled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search logic with selectedState biasing
  useEffect(() => {
    const trimmed = query.trim();

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!trimmed || trimmed.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      setHasSearched(false);
      setErrorMessage(null);
      setIsApiNotEnabled(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchPlaces(trimmed, selectedState);
        setSuggestions(results);
        setHasSearched(true);
        setIsApiNotEnabled(false);
        setIsOpen(true);
      } catch (err: unknown) {
        console.warn('[RouteWise Places Search] Error:', err);
        const placesErr = err as PlacesSearchError;
        setHasSearched(true);
        if (placesErr.code === 'PLACES_API_NOT_ENABLED') {
          setIsApiNotEnabled(true);
          setErrorMessage(
            'Google Places API (New) is not yet activated on your Google Cloud project. Please enable it in Google Cloud Console.'
          );
        } else {
          setErrorMessage('Could not load suggestions. Please check your network connection.');
        }
        setIsOpen(true);
      } finally {
        setIsLoading(false);
      }
    }, 280);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [query, selectedState]);

  // Handle adding user's current GPS location
  const handleUseCurrentLocation = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isLocating) return;

    if (!('geolocation' in navigator)) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let placeName = 'My Current Location';
        let formattedAddress = `Coordinates: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        let shortAddr = 'Current Location';
        let geoCity: string | undefined;
        let geoState: string | undefined;
        let geoStateCode: string | undefined;
        let geoCountry: string = 'India';

        try {
          const rev = await reverseGeocodeCoords(latitude, longitude);
          if (rev.address) {
            formattedAddress = rev.address;
          }
          geoCity = rev.city;
          geoState = rev.state;
          geoStateCode = rev.stateCode;
          geoCountry = rev.country || 'India';

          if (geoCity) {
            placeName = `Current Location (${geoCity})`;
            shortAddr = geoState ? `${geoCity}, ${geoState}` : geoCity;
          } else if (geoState) {
            placeName = `Current Location (${geoState})`;
            shortAddr = geoState;
          }
        } catch (geoErr) {
          console.warn('[RouteWise] Reverse geocoding failed:', geoErr);
        }

        const newStop: Destination = {
          id: `curr_loc_${Date.now()}`,
          name: placeName,
          address: formattedAddress,
          shortAddress: shortAddr,
          city: geoCity,
          state: geoState,
          stateCode: geoStateCode,
          country: geoCountry,
          description: 'Added via device GPS current location',
          coordinates: { lat: latitude, lng: longitude },
          category: 'modern',
          rating: 5.0,
          reviewsCount: 1,
          typicalVisitDurationMinutes: 15,
          photoUrl: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=600&auto=format&fit=crop&q=80',
          tags: ['Current Location', 'GPS', 'Start'],
        };

        onAddStop(newStop);
        setIsLocating(false);
        setIsOpen(false);
        setQuery('');
      },
      (err) => {
        setIsLocating(false);
        console.warn('[RouteWise] Geolocation error:', err.message);
        if (err.code === 1) {
          setLocationError('Location permission denied. Please allow location access in your browser settings.');
        } else if (err.code === 2) {
          setLocationError('Current location unavailable. Please check your GPS signal.');
        } else if (err.code === 3) {
          setLocationError('Location request timed out. Please try again.');
        } else {
          setLocationError('Could not retrieve current location.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  // Handle adding a destination from suggestions
  const handleSelectSuggestion = async (suggestion: PlaceSuggestion) => {
    // Check if place is already added by placeId or id
    const isAlreadyAdded =
      selectedPlaceIds.includes(suggestion.placeId) ||
      selectedIds.some((id) => id.includes(suggestion.placeId));

    if (isAlreadyAdded) return;

    setLoadingPlaceId(suggestion.placeId);
    try {
      const destination = await fetchPlaceDetails(suggestion.placeId, suggestion.primaryText);
      onAddStop(destination);
      setQuery('');
      setSuggestions([]);
      setIsOpen(false);
    } catch (err) {
      console.error('[RouteWise Places Details] Error fetching details:', err);
      // Fallback destination object if detail fetch fails
      const fallbackDestination: Destination = {
        id: `place_${suggestion.placeId}`,
        placeId: suggestion.placeId,
        name: suggestion.primaryText,
        address: suggestion.fullText,
        shortAddress: suggestion.secondaryText || suggestion.fullText,
        city: suggestion.city,
        state: suggestion.state,
        stateCode: suggestion.stateCode,
        country: 'India',
        description: suggestion.fullText,
        coordinates: { lat: 20.5937, lng: 78.9629 },
        category: 'heritage',
        rating: 4.5,
        reviewsCount: 150,
        typicalVisitDurationMinutes: 60,
        photoUrl: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=600&auto=format&fit=crop&q=80',
        tags: ['place', 'landmark'],
      };
      onAddStop(fallbackDestination);
      setQuery('');
      setSuggestions([]);
      setIsOpen(false);
    } finally {
      setLoadingPlaceId(null);
    }
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
    setErrorMessage(null);
    setLocationError(null);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Search Input Bar */}
      <div className="relative flex items-center">
        <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400">
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
          ) : (
            <MapPin className="w-4 h-4 text-indigo-400" />
          )}
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
          }}
          onClick={() => {
            setIsOpen(true);
          }}
          placeholder="Search places, landmarks, or addresses..."
          className="w-full bg-slate-900/90 text-base sm:text-sm text-slate-100 placeholder-slate-500 rounded-xl pl-11 pr-11 py-3 sm:py-2.5 border border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition shadow-inner font-sans min-h-[48px] sm:min-h-0"
        />

        {query && (
          <button
            onClick={handleClear}
            className="absolute right-2.5 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 active:bg-slate-700 transition"
            title="Clear search"
            aria-label="Clear search query"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Autocomplete Suggestions Dropdown with Add Current Location */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900/95 backdrop-blur-xl border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto">
          {/* Add Current Location Suggestion Item */}
          <div
            className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-gradient-to-r from-cyan-950/30 to-indigo-950/20 hover:from-cyan-900/40 hover:to-indigo-900/30 cursor-pointer border-b border-slate-800/80 transition group"
            onClick={handleUseCurrentLocation}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/15 text-cyan-400 flex items-center justify-center flex-shrink-0 group-hover:bg-cyan-500/25 group-hover:scale-105 transition">
                {isLocating ? (
                  <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                ) : (
                  <LocateFixed className="w-3.5 h-3.5 text-cyan-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h5 className="text-xs font-bold text-slate-100 group-hover:text-cyan-300 transition">
                    Add Current Location
                  </h5>
                  <span className="bg-cyan-500/20 text-cyan-300 text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                    GPS
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  {isLocating
                    ? 'Detecting your device coordinates...'
                    : 'Use your current location as a route stop'}
                </p>
              </div>
            </div>

            <div className="flex-shrink-0">
              {isLocating ? (
                <span className="text-[10px] font-semibold text-cyan-400 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Locating...</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  className="flex items-center gap-1 text-[11px] font-semibold text-cyan-400 group-hover:text-white bg-cyan-500/10 group-hover:bg-cyan-600 border border-cyan-500/30 group-hover:border-cyan-500 px-2.5 py-1 rounded-lg transition"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add</span>
                </button>
              )}
            </div>
          </div>

          {/* Location Error Notice */}
          {locationError && (
            <div className="px-3.5 py-2 bg-rose-500/10 border-b border-rose-500/20 text-[11px] text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{locationError}</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLocationError(null);
                }}
                className="text-rose-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* 1. Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center gap-2.5 py-5 px-4 text-xs text-slate-400">
              <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
              <span>
                Searching places
                {selectedState && selectedState !== 'All States' ? ` (prioritizing ${selectedState})` : ''}...
              </span>
            </div>
          )}

          {/* 2. API Not Enabled Banner */}
          {isApiNotEnabled && (
            <div className="p-4 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-200">
              <div className="flex items-start gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-amber-300">Places API (New) Required</h5>
                  <p className="text-[11px] text-amber-200/90 leading-relaxed mt-0.5">
                    {errorMessage}
                  </p>
                </div>
              </div>
              <a
                href="https://console.cloud.google.com/apis/library/places.googleapis.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white bg-amber-600 hover:bg-amber-500 px-3 py-1.5 rounded-lg shadow transition mt-1"
              >
                <span>Enable Places API in Google Cloud</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* 3. Empty Search Results */}
          {!isLoading && hasSearched && suggestions.length === 0 && !isApiNotEnabled && (
            <div className="py-5 px-4 text-center">
              <MapPin className="w-5 h-5 text-slate-600 mx-auto mb-1.5" />
              <p className="text-xs font-semibold text-slate-300">No matching places found</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {selectedState && selectedState !== 'All States'
                  ? `Try broadening your search or resetting to All States.`
                  : 'Try searching with a landmark, street address, or city name.'}
              </p>
            </div>
          )}

          {/* 4. Suggestions List */}
          {suggestions.length > 0 && (
            <div className="py-1 divide-y divide-slate-800/60">
              <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-900/60 flex items-center justify-between">
                <span>Search Results ({suggestions.length})</span>
                {selectedState && selectedState !== 'All States' && (
                  <span className="text-indigo-400 font-semibold normal-case text-[10px] flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-indigo-400" />
                    Prioritizing {selectedState}
                  </span>
                )}
              </div>
              {suggestions.map((suggestion) => {
                const isAlreadyAdded =
                  selectedPlaceIds.includes(suggestion.placeId) ||
                  selectedIds.some((id) => id.includes(suggestion.placeId));
                const isItemLoading = loadingPlaceId === suggestion.placeId;

                return (
                  <div
                    key={suggestion.placeId}
                    className={`flex items-center justify-between gap-3 px-3.5 py-2.5 transition text-left ${
                      isAlreadyAdded
                        ? 'bg-slate-900/40 opacity-70'
                        : suggestion.isPrioritized
                        ? 'bg-indigo-950/20 hover:bg-indigo-950/40 cursor-pointer border-l-2 border-indigo-500'
                        : 'hover:bg-slate-800/80 cursor-pointer'
                    }`}
                    onClick={() => {
                      if (!isAlreadyAdded && !isItemLoading) {
                        handleSelectSuggestion(suggestion);
                      }
                    }}
                  >
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          suggestion.isPrioritized
                            ? 'bg-indigo-500/20 text-indigo-400'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h5 className="text-xs font-bold text-white truncate">
                            {suggestion.primaryText}
                          </h5>
                          {suggestion.isPrioritized && (
                            <span className="bg-indigo-500/20 text-indigo-300 text-[9px] font-bold px-1.5 py-0.2 rounded border border-indigo-500/30">
                              Priority
                            </span>
                          )}
                          {suggestion.state && (
                            <span className="bg-slate-800 text-slate-300 text-[9px] font-semibold px-1.5 py-0.2 rounded border border-slate-700">
                              {suggestion.state}
                            </span>
                          )}
                          {suggestion.city && suggestion.city !== suggestion.primaryText && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              • {suggestion.city}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {suggestion.secondaryText || suggestion.fullText}
                        </p>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex-shrink-0">
                      {isItemLoading ? (
                        <div className="flex items-center gap-1.5 text-[11px] text-cyan-400 px-2 py-1">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Adding...</span>
                        </div>
                      ) : isAlreadyAdded ? (
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                          <Check className="w-3 h-3" />
                          <span>Added</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectSuggestion(suggestion);
                          }}
                          className={`flex items-center gap-1 text-[11px] font-semibold text-white px-2.5 py-1 rounded-lg shadow transition ${
                            suggestion.isPrioritized
                              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500'
                              : 'bg-indigo-600 hover:bg-indigo-500'
                          }`}
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
