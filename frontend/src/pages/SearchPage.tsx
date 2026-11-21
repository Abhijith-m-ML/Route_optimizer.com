import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  X, 
  Clock, 
  MapPin, 
  Star, 
  FolderPlus, 
  Compass, 
  ArrowLeft, 
  Loader2, 
  Globe2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { CONTINENTS_DATA } from '../data/continentDestinations';
import type { ContinentCategory } from '../data/continentDestinations';
import type { Destination, TripCollection } from '../types';
import { 
  getSearchHistory, 
  addSearchHistory, 
  removeSearchHistoryItem, 
  clearSearchHistory 
} from '../services/searchHistoryService';
import type { SearchHistoryItem } from '../services/searchHistoryService';
import { searchWorldwidePlaces } from '../services/placesService';
import { loadLocalTrips, fetchUserTrips, saveLocalTrips } from '../services/tripService';
import { MobileBottomNav } from '../components/Navigation/MobileBottomNav';
import { AddToFileModal } from '../components/Trips/AddToFileModal';
import { MyTripsModal } from '../components/Trips/MyTripsModal';
import { CreateEditTripModal } from '../components/Trips/CreateEditTripModal';
import { SettingsModal } from '../components/Navigation/SettingsModal';
import { Toast } from '../components/Toast';
import type { ToastMessage } from '../components/Toast';

export const SearchPage: React.FC = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const userId = user?.uid || user?.email || user?.displayName || 'guest';

  // Search input state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Destination[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const searchTimeoutRef = useRef<any>(null);

  // Continent selection state
  const [selectedContinent, setSelectedContinent] = useState<ContinentCategory | null>(null);

  // Search history state
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>(() => {
    return getSearchHistory(userId);
  });

  // User Trip Collections state (Files)
  const [trips, setTrips] = useState<TripCollection[]>(() => {
    return loadLocalTrips(userId);
  });

  // Add to File Modal state
  const [activeDestinationForFile, setActiveDestinationForFile] = useState<Destination | null>(null);
  const [isAddToFileOpen, setIsAddToFileOpen] = useState(false);

  // Other Navigation Modals
  const [isMyTripsOpen, setIsMyTripsOpen] = useState(false);
  const [isCreateTripOpen, setIsCreateTripOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = (toastMsg: Omit<ToastMessage, 'id'>) => {
    const id = Date.now().toString();
    setToast({ ...toastMsg, id });
  };

  // Synchronize remote trips for user
  useEffect(() => {
    fetchUserTrips(userId, user?.token).then((remoteTrips) => {
      if (Array.isArray(remoteTrips)) {
        setTrips(remoteTrips);
        saveLocalTrips(remoteTrips, userId);
      }
    });
  }, [userId, user?.token]);

  // Load user search history when userId changes
  useEffect(() => {
    setSearchHistory(getSearchHistory(userId));
  }, [userId]);

  // Live debounced search execution
  const executeSearch = useCallback(async (query: string, recordToHistory = false) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults([]);
      setHasSearched(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      const places = await searchWorldwidePlaces(trimmed);
      setSearchResults(places);

      if (recordToHistory && places.length > 0) {
        const updated = addSearchHistory(trimmed, userId, {
          placeName: places[0]?.name,
          subtitle: places[0]?.city || places[0]?.country,
        });
        setSearchHistory(updated);
      }
    } catch (err) {
      console.warn('[SearchPage] Search failed:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [userId]);

  // Handle input changes with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    // If continent filter was active, clear it when user starts typing a custom search
    if (selectedContinent && value.trim()) {
      setSelectedContinent(null);
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!value.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      setIsSearching(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      executeSearch(value, false);
    }, 320);
  };

  // Handle explicit form submission (Enter key)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (searchQuery.trim()) {
      executeSearch(searchQuery, true);
    }
  };

  // Clear search input
  const handleClearInput = () => {
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
    setIsSearching(false);
    setSelectedContinent(null);
  };

  // Select a continent to browse
  const handleSelectContinent = (continent: ContinentCategory) => {
    setSelectedContinent(continent);
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Click history item
  const handleSelectHistoryItem = (item: SearchHistoryItem) => {
    setSearchQuery(item.query);
    setSelectedContinent(null);
    executeSearch(item.query, true);
  };

  // Remove individual history item
  const handleRemoveHistoryItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = removeSearchHistoryItem(id, userId);
    setSearchHistory(updated);
  };

  // Clear all history
  const handleClearAllHistory = () => {
    clearSearchHistory(userId);
    setSearchHistory([]);
  };

  // Open "Add to File" modal for a destination
  const handleOpenAddToFile = (destination: Destination) => {
    setActiveDestinationForFile(destination);
    setIsAddToFileOpen(true);
  };

  // View destination on map (navigate to dashboard and center/focus)
  const handleViewOnMap = (destination: Destination) => {
    // Record in search history
    addSearchHistory(destination.name, userId, {
      placeName: destination.name,
      subtitle: destination.city || destination.country,
    });
    // Navigate to dashboard
    navigate('/dashboard');
  };

  // Existing trip names for duplicate validation
  const existingTripNames = useMemo(() => trips.map((t) => t.name), [trips]);

  return (
    <div
      className={`min-h-[100dvh] flex flex-col font-sans transition-colors duration-200 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)] ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Top Search Header */}
      <header
        className={`sticky top-0 z-30 pt-safe px-4 sm:px-6 py-4 pl-[max(16px,env(safe-area-inset-left,0px))] pr-[max(16px,env(safe-area-inset-right,0px))] backdrop-blur-xl border-b transition-colors duration-200 ${
          isDark
            ? 'bg-slate-950/90 border-slate-800/80'
            : 'bg-white/90 border-slate-200/90 shadow-xs'
        }`}
      >
        <div className="max-w-4xl mx-auto space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Search
            </h1>
            {selectedContinent && (
              <button
                type="button"
                onClick={() => setSelectedContinent(null)}
                className={`text-xs font-bold flex items-center gap-1 px-2.5 py-1 rounded-xl transition ${
                  isDark ? 'text-indigo-400 hover:bg-slate-800' : 'text-indigo-600 hover:bg-slate-100'
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>All Continents</span>
              </button>
            )}
          </div>

          {/* Search Input Bar */}
          <form onSubmit={handleSubmit} className="relative">
            <div className="relative flex items-center">
              <Search
                className={`absolute left-3.5 w-4 h-4 transition-colors pointer-events-none ${
                  isSearching
                    ? 'text-indigo-500 animate-pulse'
                    : isDark
                    ? 'text-slate-400'
                    : 'text-slate-500'
                }`}
              />

              <input
                type="text"
                value={searchQuery}
                onChange={handleInputChange}
                placeholder="People and destinations"
                aria-label="Search people and destinations"
                data-testid="search-input"
                className={`w-full pl-10 pr-10 py-3 rounded-2xl text-sm font-medium border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500 focus:border-indigo-500/50 shadow-inner'
                    : 'bg-slate-100 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-400 shadow-inner'
                }`}
              />

              {/* Clear button or spinner */}
              {isSearching ? (
                <div className="absolute right-3.5">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                </div>
              ) : searchQuery ? (
                <button
                  type="button"
                  onClick={handleClearInput}
                  className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition"
                  aria-label="Clear search input"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : null}
            </div>
          </form>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-5 space-y-7">
        {/* VIEW 1: Active Search Results View */}
        {hasSearched && (
          <section className="space-y-4 animate-fade-in" aria-label="Search Results">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold tracking-tight">
                  Search Results
                </h2>
                <p className="text-xs text-slate-400">
                  {searchResults.length} places found for "{searchQuery}"
                </p>
              </div>

              <button
                type="button"
                onClick={handleClearInput}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
              >
                Clear Results
              </button>
            </div>

            {searchResults.length === 0 && !isSearching ? (
              <div
                className={`text-center py-12 px-4 rounded-3xl border ${
                  isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-3">
                  <Globe2 className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold">No places found</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1 leading-relaxed">
                  Try searching for a global city, country, or landmark (e.g., Paris, Tokyo, Cairo, New York, or Sydney).
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {searchResults.map((dest) => (
                  <DestinationCard
                    key={dest.id}
                    destination={dest}
                    isDark={isDark}
                    onAddToFile={() => handleOpenAddToFile(dest)}
                    onViewOnMap={() => handleViewOnMap(dest)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* VIEW 2: Continent Destination Filter View (when a user taps a continent) */}
        {!hasSearched && selectedContinent && (
          <section className="space-y-4 animate-fade-in" aria-label={`${selectedContinent.name} Destinations`}>
            {/* Continent Hero Banner */}
            <div
              className={`p-5 rounded-3xl bg-gradient-to-tr ${selectedContinent.gradientClass} text-white shadow-xl relative overflow-hidden`}
            >
              <div className="relative z-10 max-w-md">
                <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md inline-block mb-2">
                  Continent
                </span>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                  {selectedContinent.name}
                </h2>
                <p className="text-xs sm:text-sm text-white/90 mt-1 leading-relaxed">
                  {selectedContinent.description}
                </p>
              </div>

              {/* Stylized continent watermark SVG */}
              <div className="absolute -right-6 -bottom-6 w-36 h-36 opacity-20 pointer-events-none">
                <svg viewBox="0 0 100 100" className="w-full h-full fill-white">
                  <path d={selectedContinent.svgPath} />
                </svg>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <h3 className="text-sm sm:text-base font-bold tracking-tight">
                Top Destinations in {selectedContinent.name} ({selectedContinent.destinations.length})
              </h3>
              <button
                type="button"
                onClick={() => setSelectedContinent(null)}
                className="text-xs font-bold text-indigo-400 hover:text-indigo-300"
              >
                Back to All
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {selectedContinent.destinations.map((dest) => (
                <DestinationCard
                  key={dest.id}
                  destination={dest}
                  isDark={isDark}
                  onAddToFile={() => handleOpenAddToFile(dest)}
                  onViewOnMap={() => handleViewOnMap(dest)}
                />
              ))}
            </div>
          </section>
        )}

        {/* VIEW 3: Default Overview (Browse destinations & Search history) */}
        {!hasSearched && !selectedContinent && (
          <>
            {/* Section: Browse destinations (6 Continents) */}
            <section className="space-y-3" aria-label="Browse destinations">
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-bold tracking-tight">
                  Browse destinations
                </h2>
                <span className="text-xs text-slate-400 font-medium">6 Continents</span>
              </div>

              {/* Two-column grid on mobile, 3 cols on tablet */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                {CONTINENTS_DATA.map((continent) => (
                  <button
                    key={continent.id}
                    type="button"
                    onClick={() => handleSelectContinent(continent)}
                    className={`relative p-3.5 sm:p-4 rounded-3xl bg-gradient-to-tr ${continent.gradientClass} text-white shadow-md ${continent.glowColor} hover:shadow-lg active:scale-95 transition-all duration-200 text-left overflow-hidden group flex flex-col justify-between min-h-[115px] sm:min-h-[130px] border border-white/10`}
                  >
                    {/* Background Silhouette */}
                    <div className="absolute -right-3 -bottom-3 w-16 h-16 sm:w-20 sm:h-20 opacity-25 group-hover:scale-110 transition-transform duration-300 pointer-events-none">
                      <svg viewBox="0 0 100 100" className="w-full h-full fill-white">
                        <path d={continent.svgPath} />
                      </svg>
                    </div>

                    <div className="relative z-10">
                      <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/20 backdrop-blur-xs inline-block">
                        {continent.destinations.length} Places
                      </span>
                    </div>

                    <div className="relative z-10 mt-auto">
                      <h3 className="font-black text-sm sm:text-base tracking-tight leading-tight">
                        {continent.name}
                      </h3>
                      <p className="text-[10px] text-white/80 line-clamp-1 mt-0.5">
                        Explore
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Section: Search history (Recent searches) */}
            <section className="space-y-3 pt-2" aria-label="Recent searches">
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-bold tracking-tight">
                  Recent searches
                </h2>
                {searchHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllHistory}
                    className="text-xs font-semibold text-rose-400 hover:text-rose-300 transition"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {searchHistory.length === 0 ? (
                <div
                  className={`p-6 text-center rounded-2xl border ${
                    isDark ? 'bg-slate-900/30 border-slate-800/80 text-slate-400' : 'bg-slate-100/60 border-slate-200 text-slate-500'
                  }`}
                >
                  <Clock className="w-6 h-6 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-semibold">No recent searches</p>
                  <p className="text-[11px] opacity-75 mt-0.5">
                    Places and destinations you search for will appear here.
                  </p>
                </div>
              ) : (
                <div
                  className={`rounded-2xl border divide-y overflow-hidden shadow-xs ${
                    isDark ? 'bg-slate-900/60 border-slate-800 divide-slate-800/80' : 'bg-white border-slate-200 divide-slate-100'
                  }`}
                >
                  {searchHistory.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectHistoryItem(item)}
                      className={`flex items-center justify-between p-3.5 transition-colors cursor-pointer group ${
                        isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'
                      }`}
                      role="button"
                      tabIndex={0}
                      aria-label={`Search again for ${item.query}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          <Clock className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate group-hover:text-indigo-400 transition-colors">
                            {item.query}
                          </p>
                          {item.subtitle && (
                            <p className="text-[11px] text-slate-400 truncate">
                              {item.subtitle}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => handleRemoveHistoryItem(e, item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                          title="Remove from history"
                          aria-label={`Remove ${item.query} from history`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* Add To File Modal Dialog */}
      <AddToFileModal
        isOpen={isAddToFileOpen}
        onClose={() => setIsAddToFileOpen(false)}
        destination={activeDestinationForFile}
        trips={trips}
        userId={userId}
        token={user?.token}
        onTripUpdated={(updatedTrip) => {
          setTrips((prev) => prev.map((t) => (t.id === updatedTrip.id ? updatedTrip : t)));
        }}
        onTripCreated={(newTrip) => {
          setTrips((prev) => [newTrip, ...prev]);
        }}
        onSuccessToast={(msg) => {
          showToast({ type: 'success', title: msg });
        }}
        onWarningToast={(msg) => {
          showToast({ type: 'warning', title: msg });
        }}
      />

      {/* Navigation Modals */}
      <MyTripsModal
        isOpen={isMyTripsOpen}
        onClose={() => setIsMyTripsOpen(false)}
        trips={trips}
        activeTripId="ALL"
        onSelectTrip={() => {
          setIsMyTripsOpen(false);
          navigate('/dashboard');
        }}
        onCreateNewTrip={() => {
          setIsMyTripsOpen(false);
          setIsCreateTripOpen(true);
        }}
        onEditTrip={() => {}}
        onShareTrip={() => {}}
        onDeleteTrip={() => {}}
      />

      <CreateEditTripModal
        isOpen={isCreateTripOpen}
        onClose={() => setIsCreateTripOpen(false)}
        onSubmit={async (data) => {
          const newTrip: TripCollection = {
            id: 'trip_' + Date.now(),
            userId,
            name: data.name,
            description: data.description || '',
            travelMode: 'DRIVING',
            stops: [],
            isOptimized: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          const next = [newTrip, ...trips];
          setTrips(next);
          saveLocalTrips(next, userId);
          setIsCreateTripOpen(false);
          showToast({ type: 'success', title: `Created "${newTrip.name}"!` });
        }}
        existingTripNames={existingTripNames}
        isEditing={false}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        activeView="map"
        onSelectView={() => navigate('/dashboard')}
        stopsCount={trips.flatMap((t) => t.stops || []).length}
        tripsCount={trips.length}
        onOpenMyTrips={() => setIsMyTripsOpen(true)}
        onOpenShare={() => {}}
        onResetRoute={() => {}}
        onOpenHelp={() => {}}
      />

      {/* Mobile Bottom Navigation Bar (With highlighted Search tab) */}
      <MobileBottomNav
        activeTab="search"
        onSelectTab={(tab) => {
          if (tab === 'map') {
            navigate('/dashboard');
          } else if (tab === 'trips') {
            setIsMyTripsOpen(true);
          } else if (tab === 'plan') {
            navigate('/dashboard');
          }
        }}
        onOpenMyTrips={() => setIsMyTripsOpen(true)}
        onOpenProfile={() => setIsSettingsOpen(true)}
        tripsCount={trips.length}
      />

      {/* Toast Notification */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
};

interface DestinationCardProps {
  destination: Destination;
  isDark: boolean;
  onAddToFile: () => void;
  onViewOnMap: () => void;
}

const DestinationCard: React.FC<DestinationCardProps> = ({
  destination,
  isDark,
  onAddToFile,
  onViewOnMap,
}) => {
  return (
    <div
      className={`p-3 sm:p-3.5 rounded-3xl border flex flex-col justify-between transition-all duration-150 shadow-xs hover:shadow-md ${
        isDark
          ? 'bg-slate-900/80 border-slate-800 text-slate-100 hover:border-slate-700'
          : 'bg-white border-slate-200 text-slate-900 hover:border-slate-300'
      }`}
    >
      <div>
        {/* Photo Container */}
        <div className="relative h-36 sm:h-40 w-full rounded-2xl overflow-hidden mb-3 bg-slate-800">
          {destination.photoUrl ? (
            <img
              src={destination.photoUrl}
              alt={destination.name}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
              {destination.name.slice(0, 2)}
            </div>
          )}

          {/* Category Pill */}
          <span className="absolute top-2.5 left-2.5 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20">
            {destination.category || 'Destination'}
          </span>

          {/* Rating Badge */}
          {destination.rating && (
            <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-amber-300 border border-white/20">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>{destination.rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Title & Location */}
        <h3 className="font-bold text-sm tracking-tight line-clamp-1">
          {destination.name}
        </h3>

        <p className="text-xs text-slate-400 flex items-center gap-1 line-clamp-1 mt-1">
          <MapPin className="w-3 h-3 text-cyan-400 flex-shrink-0" />
          <span>
            {destination.city || destination.state
              ? `${destination.city ? destination.city : ''}${destination.city && destination.country ? ', ' : ''}${destination.country || ''}`
              : destination.shortAddress || destination.address}
          </span>
        </p>

        {destination.description && (
          <p className="text-[11px] text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">
            {destination.description}
          </p>
        )}
      </div>

      {/* Actions: Add to File (Primary) & View on Map (Secondary) */}
      <div className="mt-3.5 pt-3 border-t border-slate-800/60 flex items-center gap-2">
        <button
          type="button"
          onClick={onAddToFile}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white text-xs font-bold transition shadow-sm"
          data-testid="add-to-file-btn"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          <span>Add to File</span>
        </button>

        <button
          type="button"
          onClick={onViewOnMap}
          className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition active:scale-95 ${
            isDark
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
          }`}
          title="View on Map"
          aria-label="View on Map"
        >
          <Compass className="w-3.5 h-3.5 text-indigo-400" />
        </button>
      </div>
    </div>
  );
};
