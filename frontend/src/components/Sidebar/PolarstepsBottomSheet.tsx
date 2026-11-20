import React, { useState, useRef, useMemo } from 'react';
import { 
  Plus, 
  BarChart3, 
  Share2, 
  ChevronUp, 
  ChevronDown, 
  Sparkles, 
  Route, 
  Folder, 
  Car, 
  Navigation,
  Compass,
  ArrowRight,
  Edit2
} from 'lucide-react';
import type { RouteMetrics, SelectedStop, TravelMode, TripCollection } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export interface PolarstepsBottomSheetProps {
  stops: SelectedStop[];
  metrics?: RouteMetrics;
  isOptimized: boolean;
  onOptimizeRoute: () => void;
  trips: TripCollection[];
  activeTripId: string | 'ALL';
  onSelectTrip: (tripId: string | 'ALL') => void;
  onCreateNewTrip: () => void;
  onOpenMyTrips: () => void;
  onOpenShare: () => void;
  onOpenEditProfile?: () => void;
  onOpenTripPlan?: () => void;
  onOpenStats?: () => void;
  travelMode?: TravelMode;
}

export const PolarstepsBottomSheet: React.FC<PolarstepsBottomSheetProps> = ({
  stops,
  metrics,
  isOptimized,
  onOptimizeRoute,
  trips,
  activeTripId,
  onSelectTrip,
  onCreateNewTrip,
  onOpenMyTrips,
  onOpenShare,
  onOpenEditProfile,
  onOpenTripPlan,
  onOpenStats,
  travelMode: _travelMode = 'DRIVING',
}) => {
  const { user } = useAuth();
  const { isDark } = useTheme();

  // Bottom sheet state: 'collapsed' (default ~38-42% screen) vs 'expanded' (~86-90% screen)
  const [isExpanded, setIsExpanded] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);

  // Drag handling refs
  const dragStartYRef = useRef<number | null>(null);
  const currentDragYRef = useRef<number>(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  const userDisplayName = user?.displayName || user?.username || 'Traveler';
  const userInitials = (userDisplayName.split(' ').map((n) => n[0]).join('') || 'TR').slice(0, 2).toUpperCase();

  // Compute travel statistics from real stops & trips
  const travelStats = useMemo(() => {
    // Unique states/cities visited
    const visitedLocations = new Set<string>();
    stops.forEach((s) => {
      if (s.state) visitedLocations.add(s.state);
      if (s.city) visitedLocations.add(s.city);
      if (!s.state && !s.city && s.name) visitedLocations.add(s.name);
    });

    const totalDistance = metrics?.totalDistanceKm || 0;
    const totalDuration = metrics?.totalDurationMinutes || 0;

    return {
      visitedCount: Math.max(visitedLocations.size, stops.length),
      tripsCount: trips.length,
      followersCount: 124, // Community stat
      followingCount: 38,
      totalDistanceKm: totalDistance,
      totalDurationMinutes: totalDuration,
    };
  }, [stops, trips, metrics]);

  // Touch gesture drag handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStartYRef.current === null) return;
    const deltaY = e.touches[0].clientY - dragStartYRef.current;
    currentDragYRef.current = deltaY;
  };

  const handleTouchEnd = () => {
    if (dragStartYRef.current === null) return;
    const deltaY = currentDragYRef.current;

    // Swipe upward (negative delta) expands; swipe downward (positive delta) collapses
    if (deltaY < -40) {
      setIsExpanded(true);
    } else if (deltaY > 40) {
      setIsExpanded(false);
    }

    dragStartYRef.current = null;
    currentDragYRef.current = 0;
  };

  const toggleExpand = () => {
    setIsExpanded((prev) => !prev);
  };

  const activeTrip = useMemo(() => {
    if (activeTripId === 'ALL') return null;
    return trips.find((t) => t.id === activeTripId) || null;
  }, [trips, activeTripId]);

  return (
    <div
      ref={sheetRef}
      data-testid="polarsteps-bottom-sheet"
      className={`lg:hidden fixed inset-x-0 bottom-14 z-30 flex flex-col rounded-t-[28px] sm:rounded-t-[32px] transition-all duration-300 ease-out will-change-[height] shadow-2xl ${
        isDark
          ? 'bg-slate-900/98 border-t border-slate-800 text-slate-100'
          : 'bg-white/98 border-t border-slate-200 text-slate-900'
      } ${
        isExpanded
          ? 'h-[85vh] sm:h-[88vh]'
          : 'h-[38vh] min-h-[290px] max-h-[340px]'
      }`}
      style={{
        boxShadow: isDark
          ? '0 -10px 40px -10px rgba(0, 0, 0, 0.7)'
          : '0 -10px 40px -10px rgba(0, 0, 0, 0.12)',
      }}
    >
      {/* ------------------------------------------------------------- */}
      {/* Draggable Pill Handle (Touch & Click Target) */}
      {/* ------------------------------------------------------------- */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={toggleExpand}
        className="w-full pt-2.5 pb-1 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing select-none flex-shrink-0"
        aria-label="Drag or tap to expand bottom sheet"
      >
        <div
          className={`w-11 h-1.5 rounded-full transition-colors ${
            isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-300 hover:bg-slate-400'
          }`}
        />
        <div className="flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase mt-1 opacity-60">
          <span>{isExpanded ? 'Collapse' : 'Swipe Up for Details'}</span>
          {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Scrollable Sheet Body */}
      {/* ------------------------------------------------------------- */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-6 pt-1 space-y-4 overscroll-contain">
        
        {/* 1. Polarsteps-Inspired User Profile Row */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-3 min-w-0">
            {/* User Avatar */}
            <div className="relative flex-shrink-0">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={userDisplayName}
                  className="w-13 h-13 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-indigo-500/60 shadow-md"
                />
              ) : (
                <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-400 flex items-center justify-center text-white font-extrabold text-base shadow-md shadow-indigo-500/20">
                  {userInitials}
                </div>
              )}
              {onOpenEditProfile && (
                <button
                  type="button"
                  onClick={onOpenEditProfile}
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow hover:bg-indigo-500 transition"
                  title="Edit profile photo"
                  aria-label="Edit photo"
                >
                  <Edit2 className="w-2.5 h-2.5" />
                </button>
              )}
            </div>

            {/* Name, Origin Flag & Handle */}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-sm sm:text-base tracking-tight truncate">
                  {userDisplayName}
                </h3>
                {/* Country Flag Badge (India default for Vazhikatti) */}
                <span className="text-base select-none" title="India">
                  🇮🇳
                </span>
              </div>
              <p className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {user?.email || '@traveler'}
              </p>
            </div>
          </div>

          {/* User Stats Counters (Places, Trips, Followers, Following) */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 text-center">
            <div className="flex flex-col">
              <span className="text-xs sm:text-sm font-black tracking-tight">
                {travelStats.visitedCount}
              </span>
              <span className={`text-[9px] sm:text-[10px] font-medium uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Places
              </span>
            </div>
            <div className={`w-px h-5 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
            <div className="flex flex-col">
              <span className="text-xs sm:text-sm font-black tracking-tight">
                {travelStats.tripsCount}
              </span>
              <span className={`text-[9px] sm:text-[10px] font-medium uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Trips
              </span>
            </div>
            <div className={`w-px h-5 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
            <div className="flex flex-col">
              <span className="text-xs sm:text-sm font-black tracking-tight">
                {travelStats.followersCount}
              </span>
              <span className={`text-[9px] sm:text-[10px] font-medium uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Followers
              </span>
            </div>
            <div className={`w-px h-5 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
            <div className="flex flex-col">
              <span className="text-xs sm:text-sm font-black tracking-tight">
                {travelStats.followingCount}
              </span>
              <span className={`text-[9px] sm:text-[10px] font-medium uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Following
              </span>
            </div>
          </div>
        </div>

        {/* 2. Main Action Buttons Row (Polarsteps Inspired) */}
        <div className="grid grid-cols-12 gap-2 pt-1">
          {/* Button 1: Add Trip (Primary) */}
          <button
            type="button"
            onClick={onCreateNewTrip}
            className="col-span-6 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all active:scale-[0.98]"
            aria-label="Add Trip"
          >
            <Plus className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Add Trip</span>
          </button>

          {/* Button 2: Travel Stats (Secondary) */}
          <button
            type="button"
            onClick={() => {
              if (onOpenStats) onOpenStats();
              else setShowStatsModal(true);
            }}
            className={`col-span-4 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl font-bold text-xs border transition-all active:scale-[0.98] ${
              isDark
                ? 'bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border-slate-700/80'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
            }`}
            aria-label="Travel Stats"
          >
            <BarChart3 className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
            <span className="truncate">Stats</span>
          </button>

          {/* Button 3: Find/Add Friends & Share (Icon) */}
          <button
            type="button"
            onClick={onOpenShare}
            className={`col-span-2 flex items-center justify-center py-2.5 rounded-2xl border transition-all active:scale-[0.98] ${
              isDark
                ? 'bg-slate-800/90 hover:bg-slate-700/90 text-slate-300 border-slate-700/80 hover:text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 hover:text-slate-900'
            }`}
            title="Share Trips with Friends"
            aria-label="Share Trips"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        {/* 3. Active Route Status Pill (if active stops exist) */}
        {stops.length > 0 && (
          <div
            className={`rounded-2xl p-3 border flex items-center justify-between gap-2.5 shadow-sm ${
              isDark
                ? 'bg-slate-800/60 border-slate-800 text-slate-200'
                : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-shrink-0">
                <Route className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {activeTrip ? activeTrip.name : 'All Trips'}
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-400">
                    {stops.length} {stops.length === 1 ? 'Stop' : 'Stops'}
                  </span>
                </div>
                <p className="text-xs font-bold truncate">
                  {metrics ? `${metrics.totalDistanceKm} km · ~${metrics.totalDurationMinutes} mins` : `${stops.length} destinations`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {stops.length >= 2 && (
                <button
                  type="button"
                  onClick={onOptimizeRoute}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition shadow-sm ${
                    isOptimized
                      ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-600/20'
                  }`}
                  aria-label="Optimize route"
                >
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>{isOptimized ? 'Active' : 'Optimize'}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* 4. Dedicated Trips Section */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider opacity-70">
                My Trips
              </h4>
              <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
              }`}>
                {trips.length}
              </span>
            </div>

            {trips.length > 0 && (
              <button
                type="button"
                onClick={onOpenMyTrips}
                className="text-[11px] font-bold text-indigo-500 hover:text-indigo-400 transition"
              >
                View All
              </button>
            )}
          </div>

          {/* Empty Trips State */}
          {trips.length === 0 ? (
            <div
              className={`rounded-2xl p-5 border text-center space-y-3 ${
                isDark
                  ? 'bg-slate-950/40 border-slate-800 text-slate-400'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
                <Compass className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  No trips yet
                </p>
                <p className="text-[11px] leading-relaxed max-w-xs mx-auto">
                  Create your first trip collection to organize stops, optimize travel time, and track your journeys.
                </p>
              </div>
              <button
                type="button"
                onClick={onCreateNewTrip}
                className="inline-flex items-center gap-1.5 py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Your First Trip</span>
              </button>
            </div>
          ) : (
            /* Active Trip Cards Grid */
            <div className="space-y-2">
              {/* "All Trips" Overview Card */}
              <div
                onClick={() => onSelectTrip('ALL')}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  activeTripId === 'ALL'
                    ? isDark
                      ? 'bg-indigo-600/20 border-indigo-500/50 text-white'
                      : 'bg-indigo-50 border-indigo-300 text-indigo-950 font-semibold'
                    : isDark
                      ? 'bg-slate-800/40 border-slate-800 hover:bg-slate-800/70'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    activeTripId === 'ALL'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Folder className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">All Trips (Master)</p>
                    <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {stops.length} Total destinations across all collections
                    </p>
                  </div>
                </div>

                {activeTripId === 'ALL' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white flex-shrink-0">
                    Active
                  </span>
                )}
              </div>

              {/* Individual Trips */}
              {trips.slice(0, 4).map((trip) => {
                const isActive = activeTripId === trip.id;
                const tripStopsCount = trip.stops?.length || 0;

                return (
                  <div
                    key={trip.id}
                    onClick={() => onSelectTrip(trip.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isActive
                        ? isDark
                          ? 'bg-indigo-600/20 border-indigo-500/50 text-white'
                          : 'bg-indigo-50 border-indigo-300 text-indigo-950 font-semibold'
                        : isDark
                          ? 'bg-slate-800/40 border-slate-800 hover:bg-slate-800/70'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <Car className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">{trip.name}</p>
                        <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {tripStopsCount} {tripStopsCount === 1 ? 'place' : 'places'} · {trip.travelMode || 'Driving'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {isActive ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                          Selected
                        </span>
                      ) : (
                        <span className={`text-[11px] font-semibold ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                          Select →
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 5. Quick Actions Section */}
        {onOpenTripPlan && (
          <div className="pt-2">
            <button
              type="button"
              onClick={onOpenTripPlan}
              className={`w-full flex items-center justify-between p-3 rounded-2xl border text-xs font-bold transition-all ${
                isDark
                  ? 'bg-slate-800/50 border-slate-800 text-slate-200 hover:bg-slate-800'
                  : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Navigation className="w-4 h-4 text-indigo-400" />
                <span>View Full Turn-by-Turn Trip Plan</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        )}

      </div>

      {/* ------------------------------------------------------------- */}
      {/* Travel Stats Quick Modal (when clicking Stats button) */}
      {/* ------------------------------------------------------------- */}
      {showStatsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-3xl p-5 border shadow-2xl space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-current/10">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-400" />
                <h3 className="font-extrabold text-sm">Travel Statistics</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowStatsModal(false)}
                className="w-7 h-7 rounded-full bg-current/10 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-current/5 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Total Distance</span>
                <p className="text-lg font-black text-indigo-400">{travelStats.totalDistanceKm} km</p>
              </div>
              <div className="p-3 rounded-2xl bg-current/5 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Travel Time</span>
                <p className="text-lg font-black text-cyan-400">~{travelStats.totalDurationMinutes} mins</p>
              </div>
              <div className="p-3 rounded-2xl bg-current/5 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Destinations</span>
                <p className="text-lg font-black text-emerald-400">{stops.length} stops</p>
              </div>
              <div className="p-3 rounded-2xl bg-current/5 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Trip Collections</span>
                <p className="text-lg font-black text-purple-400">{trips.length} saved</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowStatsModal(false)}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition"
            >
              Close Stats
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
