import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Compass, 
  MapPin, 
  Car, 
  Train, 
  Footprints, 
  Plus, 
  Trash2, 
  ArrowUpDown, 
  Trophy, 
  Search, 
  LocateFixed, 
  Loader2
} from 'lucide-react';
import type { MPCLocation, MPCDistanceResult, TravelMode, Destination, PlaceSuggestion } from '../../types';
import { 
  MPC_PRESET_ORIGIN, 
  MPC_PRESET_CANDIDATES, 
  calculateMPCDistances, 
  generateMPCSummary 
} from '../../utils/mpcCalculator';
import { 
  searchPlaces, 
  fetchPlaceDetails, 
  POPULAR_MUMBAI_LANDMARKS 
} from '../../services/placesService';

interface MPCViewProps {
  onAddStopToTrip?: (destination: Destination) => void;
  onClose?: () => void;
  initialStops?: Destination[];
}

export const MPCView: React.FC<MPCViewProps> = ({
  onAddStopToTrip,
}) => {
  // Point A: Standing Location
  const [origin, setOrigin] = useState<MPCLocation>(MPC_PRESET_ORIGIN);
  
  // Candidates: Point B, C, D...
  const [candidates, setCandidates] = useState<MPCLocation[]>(MPC_PRESET_CANDIDATES);
  
  // Travel calculation mode
  const [travelMode, setTravelMode] = useState<TravelMode>('DRIVING');

  // Search input state for adding destinations
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTarget, setSearchTarget] = useState<'candidate' | 'origin'>('candidate');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSuggestions([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search with Google Places (New) or fallback
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchPlaces(trimmed);
        setSuggestions(results);
      } catch (err) {
        console.error('MPC search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 280);
  }, [searchQuery]);

  // Flash toast notification
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Run calculation
  const results: MPCDistanceResult[] = useMemo(() => {
    return calculateMPCDistances(origin, candidates, travelMode);
  }, [origin, candidates, travelMode]);

  const summary = useMemo(() => {
    return generateMPCSummary(origin, results);
  }, [origin, results]);

  const nearest = results[0] || null;

  // Use browser GPS for Point A
  const handleUseGPS = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const userLoc: MPCLocation = {
          id: 'gps_current_location',
          name: 'My Standing Location (GPS)',
          address: `Lat: ${pos.coords.latitude.toFixed(4)}, Lng: ${pos.coords.longitude.toFixed(4)}`,
          coordinates: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          label: 'A',
          category: 'modern',
        };
        setOrigin(userLoc);
        showToast('Standing Point A set to your real GPS coordinates!');
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err.message);
        showToast('Could not access GPS. Please allow location permissions or search a place.');
      },
      { timeout: 8000 }
    );
  };

  // Add place from suggestion or preset
  const handleSelectPlace = async (suggestion: PlaceSuggestion) => {
    try {
      const dest = await fetchPlaceDetails(suggestion.placeId, suggestion.primaryText);
      if (!dest) return;

      if (searchTarget === 'origin') {
        setOrigin({
          id: dest.id,
          name: dest.name,
          address: dest.address,
          coordinates: dest.coordinates,
          label: 'A',
          placeId: dest.placeId,
          category: dest.category,
        });
        showToast(`Point A updated to ${dest.name}`);
      } else {
        const label = String.fromCharCode(66 + candidates.length);
        const newCand: MPCLocation = {
          id: dest.id,
          name: dest.name,
          address: dest.address,
          coordinates: dest.coordinates,
          label,
          placeId: dest.placeId,
          category: dest.category,
        };
        setCandidates((prev) => [...prev, newCand]);
        showToast(`Added ${dest.name} as Point ${label}`);
      }
      setSearchQuery('');
      setSuggestions([]);
    } catch (err) {
      console.error('Failed to select place:', err);
    }
  };

  // Quick preset button click
  const handleAddPreset = async (presetQuery: string) => {
    setIsSearching(true);
    try {
      const list = await searchPlaces(presetQuery);
      if (list.length > 0) {
        await handleSelectPlace(list[0]);
      }
    } catch {
      // Fallback
    } finally {
      setIsSearching(false);
    }
  };

  // Remove candidate
  const handleRemoveCandidate = (id: string) => {
    if (candidates.length <= 1) {
      showToast('Need at least 1 destination to calculate distance.');
      return;
    }
    const filtered = candidates.filter((c) => c.id !== id);
    // Re-label B, C, D...
    const reLabeled = filtered.map((c, idx) => ({
      ...c,
      label: String.fromCharCode(66 + idx),
    }));
    setCandidates(reLabeled);
  };

  // Swap candidate with Point A
  const handleSwapWithOrigin = (candidate: MPCLocation) => {
    const oldOrigin = { ...origin, label: candidate.label };
    const newOrigin = { ...candidate, label: 'A' };
    const newCandidates = candidates.map((c) => (c.id === candidate.id ? oldOrigin : c));

    setOrigin(newOrigin);
    setCandidates(newCandidates);
    showToast(`Swapped: Point A is now ${newOrigin.name}`);
  };

  // Add nearest destination to current trip plan
  const handleAddNearestToTrip = () => {
    if (!nearest || !onAddStopToTrip) return;
    const dest: Destination = {
      id: nearest.destination.id,
      name: nearest.destination.name,
      address: nearest.destination.address || '',
      coordinates: nearest.destination.coordinates,
      category: nearest.destination.category || 'heritage',
      description: `Discovered as closest place via MPC (${nearest.roadDistanceKm} km from ${origin.name})`,
      rating: 4.8,
      reviewsCount: 1200,
      typicalVisitDurationMinutes: 60,
      photoUrl: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=800&auto=format&fit=crop&q=80',
      tags: ['MPC Closest', 'Mumbai Spot'],
    };
    onAddStopToTrip(dest);
    showToast(`Added ${nearest.destination.name} to your RouteWise Trip stops!`);
  };

  const maxDist = Math.max(...results.map((r) => r.roadDistanceKm), 1);

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 selection:bg-indigo-600 selection:text-white">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-cyan-600 to-indigo-600 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-xl shadow-cyan-600/30 border border-cyan-400/40 animate-in fade-in slide-in-from-top-3">
          {toastMsg}
        </div>
      )}

      {/* Header Banner */}
      <div className="p-4 sm:p-6 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-blue-600 p-0.5 shadow-lg shadow-indigo-500/25">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Compass className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                  MPC <span className="text-cyan-400 font-semibold">— Multi-Place Distance Calculator</span>
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  Live
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Set your standing point (Point A) and compare which candidate destination (B, C, D...) is nearest.
              </p>
            </div>
          </div>

          {/* Travel Mode Selector */}
          <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 self-stretch sm:self-auto justify-center">
            <button
              onClick={() => setTravelMode('DRIVING')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                travelMode === 'DRIVING'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>Drive</span>
            </button>
            <button
              onClick={() => setTravelMode('TRANSIT')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                travelMode === 'TRANSIT'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Train className="w-3.5 h-3.5" />
              <span>Local/Metro</span>
            </button>
            <button
              onClick={() => setTravelMode('WALKING')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                travelMode === 'WALKING'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Footprints className="w-3.5 h-3.5" />
              <span>Walk</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-6xl mx-auto w-full">
        {/* Nearest Highlight Banner */}
        {nearest && (
          <div className="bg-gradient-to-r from-cyan-950/70 via-indigo-950/80 to-blue-950/70 border border-cyan-500/40 rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
              <div className="flex items-start space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/30 flex-shrink-0 mt-0.5">
                  <Trophy className="w-6 h-6 fill-slate-950" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                      🏆 Nearest Destination Found
                    </span>
                    <span className="text-[10px] bg-cyan-500/20 text-cyan-300 font-bold px-2 py-0.5 rounded-full border border-cyan-500/30">
                      Point {nearest.label}
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-white mt-0.5">
                    {nearest.destination.name}
                  </h2>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                    {summary}
                  </p>
                </div>
              </div>

              {/* Quick Metrics & Action */}
              <div className="flex items-center gap-3 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-800">
                <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-2 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Distance
                  </span>
                  <span className="text-base sm:text-lg font-black text-cyan-400 font-mono">
                    {nearest.roadDistanceKm} km
                  </span>
                </div>
                <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-2 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Travel Time
                  </span>
                  <span className="text-base sm:text-lg font-black text-amber-400 font-mono">
                    ~{nearest.estimatedMinutes} min
                  </span>
                </div>
                {onAddStopToTrip && (
                  <button
                    onClick={handleAddNearestToTrip}
                    className="flex items-center space-x-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs px-3.5 py-3 rounded-xl shadow-lg shadow-emerald-600/25 transition active:scale-[0.98] border border-emerald-400/30 whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add to Trip</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Location Setup Grid: Point A vs Destinations (B, C, D...) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Point A: Standing Location Column (4 cols) */}
          <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-black text-sm flex items-center justify-center border border-emerald-500/40">
                    A
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Your Standing Place</h3>
                    <p className="text-[11px] text-slate-400">The origin location for distance calculations</p>
                  </div>
                </div>
                <button
                  onClick={handleUseGPS}
                  disabled={isLocating}
                  className="flex items-center space-x-1 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/30 px-2.5 py-1.5 rounded-lg transition"
                  title="Use My Current GPS Position"
                >
                  {isLocating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <LocateFixed className="w-3.5 h-3.5" />
                  )}
                  <span>Use GPS</span>
                </button>
              </div>

              {/* Point A Active Card */}
              <div className="mt-4 p-4 rounded-2xl bg-slate-950/80 border border-emerald-500/30 shadow-inner">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <h4 className="text-sm font-bold text-white">{origin.name}</h4>
                    </div>
                    {origin.address && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {origin.address}
                      </p>
                    )}
                    <p className="text-[10px] font-mono text-slate-500 mt-2">
                      {origin.coordinates.lat.toFixed(4)}° N, {origin.coordinates.lng.toFixed(4)}° E
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Origin Selectors */}
              <div className="mt-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Quick Standing Points:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { name: 'Gateway of India', lat: 18.9220, lng: 72.8347 },
                    { name: 'CSMT', lat: 18.9398, lng: 72.8355 },
                    { name: 'Marine Drive', lat: 18.9432, lng: 72.8230 },
                    { name: 'Bandra', lat: 19.0596, lng: 72.8295 },
                    { name: 'Dadar', lat: 19.0178, lng: 72.8478 },
                    { name: 'Airport T2', lat: 19.0896, lng: 72.8656 },
                  ].map((loc) => (
                    <button
                      key={loc.name}
                      onClick={() => {
                        setOrigin({
                          id: `origin_${loc.name.toLowerCase()}`,
                          name: loc.name,
                          address: `${loc.name}, Mumbai`,
                          coordinates: { lat: loc.lat, lng: loc.lng },
                          label: 'A',
                        });
                        showToast(`Point A set to ${loc.name}`);
                      }}
                      className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition ${
                        origin.name === loc.name
                          ? 'bg-emerald-600 text-white border-emerald-400'
                          : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      {loc.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Change Origin Search Option */}
            <div className="mt-4 pt-4 border-t border-slate-800/80">
              <button
                onClick={() => setSearchTarget('origin')}
                className="w-full text-xs font-semibold text-slate-300 hover:text-white flex items-center justify-center gap-1.5 p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700 transition"
              >
                <Search className="w-3.5 h-3.5 text-cyan-400" />
                <span>Change Point A via Google Search...</span>
              </button>
            </div>
          </div>

          {/* Candidate Destinations (B, C, D...) Column (7 cols) */}
          <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Target Destinations</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {candidates.length} places
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Comparing distances from Point A ({origin.name})
                  </p>
                </div>
                <button
                  onClick={() => setSearchTarget('candidate')}
                  className="flex items-center space-x-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-500/30 px-3 py-1.5 rounded-xl transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Place</span>
                </button>
              </div>

              {/* Destination Search Box */}
              <div ref={searchContainerRef} className="relative mt-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    {isSearching ? (
                      <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      searchTarget === 'origin'
                        ? 'Search to set Point A (Standing Point)...'
                        : 'Search Mumbai landmark to compare (e.g. Juhu, Elephanta)...'
                    }
                    className="w-full bg-slate-950/90 text-xs text-slate-100 placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 border border-slate-700/80 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 transition"
                  />
                </div>

                {/* Autocomplete Dropdown */}
                {suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-1.5 z-50 max-h-56 overflow-y-auto">
                    {suggestions.map((s) => (
                      <button
                        key={s.placeId}
                        onClick={() => handleSelectPlace(s)}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-800 transition flex items-center space-x-2.5 group"
                      >
                        <MapPin className="w-4 h-4 text-cyan-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white truncate">{s.primaryText}</p>
                          <p className="text-[10px] text-slate-400 truncate">{s.secondaryText}</p>
                        </div>
                        <span className="text-[10px] text-cyan-400 font-semibold uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                          + Select
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Preset Buttons */}
              <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <span className="text-[10px] font-bold text-slate-500 uppercase flex-shrink-0">
                  Quick Add:
                </span>
                {POPULAR_MUMBAI_LANDMARKS.slice(0, 5).map((l) => (
                  <button
                    key={l.name}
                    onClick={() => handleAddPreset(l.query)}
                    className="text-[11px] bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white px-2 py-0.5 rounded-lg border border-slate-700 transition whitespace-nowrap"
                  >
                    + {l.name}
                  </button>
                ))}
              </div>

              {/* List of Destination Cards */}
              <div className="mt-4 space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {results.map((res) => {
                  const percentOfMax = Math.min(100, Math.round((res.roadDistanceKm / maxDist) * 100));

                  return (
                    <div
                      key={res.destination.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        res.isClosest
                          ? 'bg-cyan-950/30 border-cyan-500/50 shadow-md shadow-cyan-500/10'
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center flex-shrink-0 border ${
                              res.isClosest
                                ? 'bg-cyan-500 text-slate-950 border-cyan-300 font-black'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {res.label}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-2">
                              <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                                {res.destination.name}
                              </h4>
                              {res.isClosest && (
                                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold px-1.5 py-0.2 rounded-full flex-shrink-0">
                                  Closest
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 truncate">
                              {res.destination.address || 'Mumbai, Maharashtra'}
                            </p>
                          </div>
                        </div>

                        {/* Distance & Action Controls */}
                        <div className="flex items-center space-x-2.5 flex-shrink-0">
                          <div className="text-right">
                            <span className="text-xs sm:text-sm font-black text-cyan-400 font-mono block">
                              {res.roadDistanceKm} km
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              ~{res.estimatedMinutes} min
                            </span>
                          </div>

                          {/* Swap With Point A */}
                          <button
                            onClick={() => handleSwapWithOrigin(res.destination)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-300 hover:bg-slate-800 border border-transparent hover:border-slate-700 transition"
                            title="Make this my standing point (Point A)"
                          >
                            <ArrowUpDown className="w-3.5 h-3.5" />
                          </button>

                          {/* Remove Candidate */}
                          <button
                            onClick={() => handleRemoveCandidate(res.destination.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/50 transition"
                            title="Remove candidate"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Visual Distance Comparison Bar */}
                      <div className="mt-2.5 pt-2 border-t border-slate-900 flex items-center gap-2">
                        <div className="flex-1 bg-slate-900 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              res.isClosest
                                ? 'bg-gradient-to-r from-cyan-400 to-emerald-400'
                                : 'bg-slate-700'
                            }`}
                            style={{ width: `${percentOfMax}%` }}
                          />
                        </div>
                        <span className="text-[9px] font-mono text-slate-400 flex-shrink-0">
                          {res.isClosest
                            ? 'Rank #1 (Nearest)'
                            : `+${res.differenceFromClosestKm} km further than ${nearest?.label}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Full Distance Comparison Matrix Table */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl">
          <h3 className="text-sm font-bold text-white mb-1">
            Distance Comparison Matrix
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Side-by-side breakdown from Point A (<strong className="text-white">{origin.name}</strong>) to all candidates.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Rank</th>
                  <th className="py-2.5 px-3">Point</th>
                  <th className="py-2.5 px-3">Destination Name</th>
                  <th className="py-2.5 px-3">Driving/Road Dist.</th>
                  <th className="py-2.5 px-3">Direct Aerial Dist.</th>
                  <th className="py-2.5 px-3">Est. Duration</th>
                  <th className="py-2.5 px-3">Difference vs Closest</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-medium">
                {results.map((res) => (
                  <tr
                    key={res.destination.id}
                    className={`hover:bg-slate-800/40 transition ${
                      res.isClosest ? 'bg-cyan-950/20 text-cyan-200' : 'text-slate-300'
                    }`}
                  >
                    <td className="py-3 px-3">
                      {res.rank === 1 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                          🥇 #1 Nearest
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono">#{res.rank}</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-bold font-mono">
                      <span className="w-5 h-5 rounded bg-slate-800 text-slate-200 inline-flex items-center justify-center text-[10px]">
                        {res.label}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-white">
                      {res.destination.name}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-cyan-400">
                      {res.roadDistanceKm} km
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-400">
                      {res.straightDistanceKm} km
                    </td>
                    <td className="py-3 px-3 text-amber-300 font-mono">
                      ~{res.estimatedMinutes} mins
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-400">
                      {res.isClosest ? (
                        <span className="text-emerald-400 font-bold">0 km (Closest)</span>
                      ) : (
                        <span className="text-slate-400">+{res.differenceFromClosestKm} km</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {onAddStopToTrip && (
                        <button
                          onClick={() => {
                            const dest: Destination = {
                              id: res.destination.id,
                              name: res.destination.name,
                              address: res.destination.address || '',
                              coordinates: res.destination.coordinates,
                              category: res.destination.category || 'heritage',
                              description: `Added via MPC distance comparison (${res.roadDistanceKm} km from ${origin.name})`,
                              rating: 4.8,
                              reviewsCount: 850,
                              typicalVisitDurationMinutes: 45,
                              photoUrl: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=800&auto=format&fit=crop&q=80',
                              tags: ['MPC Added'],
                            };
                            onAddStopToTrip(dest);
                            showToast(`Added ${res.destination.name} to trip stops!`);
                          }}
                          className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-500/30 px-2.5 py-1 rounded-lg transition"
                        >
                          + Add to Trip
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
