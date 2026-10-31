import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Compass, 
  Bookmark, 
  Check, 
  Share2, 
  RotateCcw, 
  LogOut, 
  User as UserIcon,
  HelpCircle,
  Menu,
  X,
  Home,
  Map as MapIcon,
  ListFilter,
  Folder
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ShareDialog } from './ShareDialog';
import { TripSelector } from './Trips/TripSelector';
import type { SelectedStop, TravelMode, TripCollection } from '../types';

interface NavbarProps {
  tripTitle: string;
  onUpdateTitle: (title: string) => void;
  isSaving: boolean;
  lastSavedAt: string | null;
  onSaveTrip: () => void;
  onResetTrip: () => void;
  stopsCount: number;
  travelMode?: TravelMode;
  stops?: SelectedStop[];
  selectedState?: string;
  onOpenOnboarding?: () => void;
  trips?: TripCollection[];
  activeTripId?: string | 'ALL';
  onSelectTrip?: (tripId: string | 'ALL') => void;
  onCreateNewTrip?: () => void;
  onOpenMyTrips?: () => void;
  activeMobileTab?: 'map' | 'sidebar';
  onSelectMobileTab?: (tab: 'map' | 'sidebar') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  tripTitle,
  onUpdateTitle,
  isSaving,
  lastSavedAt,
  onSaveTrip,
  onResetTrip,
  stopsCount,
  travelMode = 'DRIVING',
  stops = [],
  selectedState = 'All States',
  onOpenOnboarding,
  trips = [],
  activeTripId = 'ALL',
  onSelectTrip,
  onCreateNewTrip,
  onOpenMyTrips,
  activeMobileTab = 'map',
  onSelectMobileTab,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(tripTitle);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Close mobile drawer on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileDrawerOpen) {
        setIsMobileDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileDrawerOpen]);

  const handleTitleSubmit = () => {
    if (tempTitle.trim()) {
      onUpdateTitle(tempTitle.trim());
    } else {
      setTempTitle(tripTitle);
    }
    setIsEditingTitle(false);
  };

  const handleOpenShare = () => {
    setIsShareDialogOpen(true);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const userDisplayName = user?.displayName || user?.email?.split('@')[0] || 'Traveler';
  const userInitials = userDisplayName.slice(0, 2).toUpperCase();

  return (
    <>
      <header className="h-14 sm:h-16 pt-safe bg-slate-900/95 backdrop-blur-md border-b border-slate-800/80 px-2 sm:px-4 md:px-6 flex items-center justify-between sticky top-0 z-40 transition-colors flex-shrink-0">
        {/* Left Section: Mobile Hamburger Icon OR Desktop Logo & Title */}
        <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-5 min-w-0 flex-shrink-0">
          {/* Mobile Hamburger Menu Icon (Hidden on Desktop) */}
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className="sm:hidden w-8 h-8 rounded-xl text-slate-300 hover:text-white bg-slate-800/90 hover:bg-slate-700/80 active:bg-slate-700 border border-slate-700/80 transition flex items-center justify-center flex-shrink-0 shadow-sm"
            title="Open navigation menu"
            aria-label="Open navigation menu"
          >
            <Menu className="w-4 h-4 text-indigo-400" />
          </button>

          {/* Desktop & Tablet Brand Logo & Title (Hidden on Mobile) */}
          <Link
            to="/dashboard"
            className="hidden sm:flex items-center space-x-2 sm:space-x-2.5 flex-shrink-0 group cursor-pointer"
            aria-label="Vazhikatti Dashboard"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-all duration-300 flex-shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Compass className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 animate-[spin_20s_linear_infinite]" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent whitespace-nowrap">
                  Vazhikatti <span className="hidden">RouteWise</span>
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hidden sm:inline-block">
                  India
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">Route Optimizer</p>
            </div>
          </Link>

          <div className="h-6 w-px bg-slate-800 hidden md:block" />

          {/* Trip Selector Dropdown (Desktop & Tablet) */}
          {trips && trips.length > 0 && (
            <div className="hidden sm:block">
              <TripSelector
                trips={trips}
                activeTripId={activeTripId}
                onSelectTrip={onSelectTrip || (() => {})}
                onCreateNewTrip={onCreateNewTrip || (() => {})}
                onOpenMyTrips={onOpenMyTrips || (() => {})}
              />
            </div>
          )}

          {/* Editable Trip Title (Desktop & Tablet) */}
          <div className="min-w-0 max-w-xs sm:max-w-md hidden md:block">
            {isEditingTitle ? (
              <input
                type="text"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTitleSubmit();
                  if (e.key === 'Escape') {
                    setTempTitle(tripTitle);
                    setIsEditingTitle(false);
                  }
                }}
                autoFocus
                className="bg-slate-800 text-white font-medium text-sm rounded-lg px-2.5 py-1 border border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 w-full"
              />
            ) : (
              <button
                onClick={() => {
                  setTempTitle(tripTitle);
                  setIsEditingTitle(true);
                }}
                className="flex items-center space-x-1.5 text-left text-xs md:text-sm font-semibold text-slate-200 hover:text-white px-2 py-1 rounded-md hover:bg-slate-800/60 transition group max-w-full"
                title="Click to rename trip"
              >
                <span className="truncate">{tripTitle}</span>
                <span className="text-slate-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  ✎
                </span>
              </button>
            )}
            {lastSavedAt && (
              <span className="text-[10px] text-emerald-400/80 px-2 hidden lg:inline-flex items-center gap-1">
                <Check className="w-2.5 h-2.5" /> Saved {lastSavedAt} • {stopsCount} stops
              </span>
            )}
          </div>
        </div>

        {/* Right Section: Compact & Accessible Action Buttons */}
        <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2.5 flex-shrink-0">
          {/* Help Button */}
          {onOpenOnboarding && (
            <button
              onClick={onOpenOnboarding}
              className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-xl text-slate-300 hover:text-indigo-400 active:text-indigo-300 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/70 transition flex items-center justify-center flex-shrink-0"
              title="How to use Vazhikatti"
              aria-label="App guide and tutorial"
            >
              <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          )}

          {/* My Trips Button (Compass) */}
          {onOpenMyTrips && (
            <button
              onClick={onOpenMyTrips}
              className="flex items-center justify-center gap-1.5 w-8 h-8 sm:w-9 sm:h-9 md:w-auto md:h-10 md:px-3 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 active:bg-slate-700 border border-slate-700/70 transition shadow-sm"
              title="Open My Trips Collections"
              aria-label="My Trips"
            >
              <Compass className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden md:inline">My Trips</span>
            </button>
          )}

          {/* Share Destinations Button */}
          <button
            onClick={handleOpenShare}
            className="flex items-center justify-center gap-1.5 w-8 h-8 sm:w-9 sm:h-9 md:w-auto md:h-10 md:px-3 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 active:bg-slate-700 border border-slate-700/70 transition shadow-sm"
            title="Share destinations & trips"
            aria-label="Share destinations"
          >
            <Share2 className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">Share</span>
          </button>

          {/* Reset Route Button */}
          <button
            onClick={onResetTrip}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-slate-400 hover:text-rose-400 active:text-rose-300 bg-slate-800/60 hover:bg-slate-700/80 active:bg-slate-700 border border-slate-700/60 transition flex items-center justify-center flex-shrink-0"
            title="Reset current route"
            aria-label="Reset route"
          >
            <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* Save Trip Button */}
          <button
            onClick={onSaveTrip}
            disabled={isSaving}
            className="flex items-center justify-center space-x-1 sm:space-x-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] text-white h-8 sm:h-9 md:h-10 px-2 sm:px-3 md:px-4 rounded-xl text-xs md:text-sm font-semibold shadow-md shadow-indigo-600/25 transition-all duration-200 border border-indigo-400/20 disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap flex-shrink-0"
            title="Save your trip"
          >
            {isSaving ? (
              <>
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="hidden sm:inline">Saving...</span>
              </>
            ) : (
              <>
                <Bookmark className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-white/20" />
                <span className="text-[11px] sm:text-xs md:text-sm">Save</span>
              </>
            )}
          </button>

          {/* User Account / Profile Button */}
          {user ? (
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center space-x-1.5 h-8 sm:h-9 md:h-10 p-0.5 sm:p-1 md:px-2 rounded-xl hover:bg-slate-800/70 active:bg-slate-700 border border-transparent hover:border-slate-700/60 transition group"
                title={`Logged in as ${user.email || userDisplayName}`}
                aria-label="User profile menu"
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={userDisplayName}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover border border-indigo-500/40"
                  />
                ) : (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center font-bold text-[11px] sm:text-xs text-white shadow-sm shadow-indigo-500/20">
                    {userInitials}
                  </div>
                )}
                <span className="text-xs font-semibold text-slate-200 hidden xl:inline-block max-w-[100px] truncate">
                  {userDisplayName}
                </span>
              </button>

              {/* Profile Dropdown Menu */}
              {showProfileMenu && (
                <div 
                  className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl py-2 z-50 text-slate-100 animate-in fade-in slide-in-from-top-2"
                  onMouseLeave={() => setShowProfileMenu(false)}
                >
                  <div className="px-3.5 py-2 border-b border-slate-800">
                    <p className="text-xs font-bold text-white truncate">{userDisplayName}</p>
                    <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                  </div>

                  <div className="py-1">
                    {onOpenMyTrips && (
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          onOpenMyTrips();
                        }}
                        className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition text-left"
                      >
                        <Compass className="w-3.5 h-3.5 text-purple-400" />
                        <span>My Trips Collections</span>
                      </button>
                    )}

                    {onOpenOnboarding && (
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          onOpenOnboarding();
                        }}
                        className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition text-left"
                      >
                        <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                        <span>How to Use Vazhikatti</span>
                      </button>
                    )}

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition text-left"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center space-x-1 sm:space-x-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white h-8 sm:h-9 md:h-10 px-2 sm:px-3 rounded-xl border border-slate-700 transition"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign In</span>
            </Link>
          )}
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {isMobileDrawerOpen && (
        <div
          className="fixed inset-0 z-50 flex sm:hidden bg-slate-950/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsMobileDrawerOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div
            className="w-72 max-w-[85vw] h-full bg-slate-900 border-r border-slate-800 flex flex-col shadow-2xl pt-safe pb-safe animate-slide-in-left overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header with Logo & Brand */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-400 p-0.5 shadow-md">
                  <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                    <Compass className="w-4 h-4 text-cyan-400 animate-[spin_20s_linear_infinite]" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-extrabold text-sm text-white tracking-tight">Vazhikatti</h3>
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300">
                      India
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">Route Optimizer</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                aria-label="Close navigation menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Profile Card in Drawer */}
            <div className="p-4 border-b border-slate-800/80 bg-slate-950/40">
              {user ? (
                <div className="flex items-center gap-3">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={userDisplayName}
                      className="w-10 h-10 rounded-xl object-cover border border-indigo-500/40"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center font-bold text-sm text-white shadow-md shadow-indigo-500/20">
                      {userInitials}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-white truncate">{userDisplayName}</h4>
                    <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                    <span className="inline-block text-[9px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded-full border border-emerald-500/20 mt-0.5">
                      Signed In
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-300">
                    <UserIcon className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-semibold">Guest Traveler</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Sign in to sync your trips across all devices.
                  </p>
                  <Link
                    to="/login"
                    onClick={() => setIsMobileDrawerOpen(false)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-sm"
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    <span>Sign In / Register</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Navigation Options List */}
            <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 py-1 block">
                Navigation
              </span>

              {/* 1. Dashboard / Home */}
              <button
                type="button"
                onClick={() => {
                  setIsMobileDrawerOpen(false);
                  navigate('/dashboard');
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 transition text-left"
              >
                <Home className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                <span>Dashboard / Home</span>
              </button>

              {/* 2. Interactive Map */}
              <button
                type="button"
                onClick={() => {
                  setIsMobileDrawerOpen(false);
                  if (onSelectMobileTab) onSelectMobileTab('map');
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition text-left ${
                  activeMobileTab === 'map'
                    ? 'bg-indigo-600/20 text-indigo-300 font-bold border border-indigo-500/30'
                    : 'text-slate-200 hover:text-white hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <MapIcon className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <span>Interactive Map</span>
                </div>
                {activeMobileTab === 'map' && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-500/30 text-indigo-300">
                    Active
                  </span>
                )}
              </button>

              {/* 3. Trip Plan */}
              <button
                type="button"
                onClick={() => {
                  setIsMobileDrawerOpen(false);
                  if (onSelectMobileTab) onSelectMobileTab('sidebar');
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition text-left ${
                  activeMobileTab === 'sidebar'
                    ? 'bg-indigo-600/20 text-indigo-300 font-bold border border-indigo-500/30'
                    : 'text-slate-200 hover:text-white hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ListFilter className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  <span>Trip Plan</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  {stopsCount} {stopsCount === 1 ? 'stop' : 'stops'}
                </span>
              </button>

              {/* 4. My Trips (Collections) */}
              {onOpenMyTrips && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    onOpenMyTrips();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 transition text-left"
                >
                  <div className="flex items-center gap-3">
                    <Folder className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                    <span>My Trips Collections</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300">
                    {trips.length}
                  </span>
                </button>
              )}

              {/* 5. Share Trips */}
              <button
                type="button"
                onClick={() => {
                  setIsMobileDrawerOpen(false);
                  handleOpenShare();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 transition text-left"
              >
                <Share2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <span>Share Trips & Places</span>
              </button>

              <div className="pt-2 pb-1">
                <div className="h-px bg-slate-800" />
              </div>

              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 py-1 block">
                Preferences & Support
              </span>

              {/* 6. Help & Tutorial */}
              {onOpenOnboarding && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    onOpenOnboarding();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 transition text-left"
                >
                  <HelpCircle className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                  <span>Help and Support (Tutorial)</span>
                </button>
              )}

              {/* 7. Reset Current Route */}
              <button
                type="button"
                onClick={() => {
                  setIsMobileDrawerOpen(false);
                  onResetTrip();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition text-left"
              >
                <RotateCcw className="w-4 h-4 flex-shrink-0" />
                <span>Reset Current Route</span>
              </button>

              {/* 8. Logout (if logged in) */}
              {user && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition text-left"
                >
                  <LogOut className="w-4 h-4 flex-shrink-0" />
                  <span>Log Out</span>
                </button>
              )}
            </nav>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 text-center">
              <p className="text-[11px] font-bold text-slate-300">Vazhikatti India</p>
              <p className="text-[10px] text-slate-500">Smart Route Optimizer • v1.1.0</p>
            </div>
          </div>
        </div>
      )}

      {/* Share Destinations & Trip Dialog */}
      <ShareDialog
        isOpen={isShareDialogOpen}
        onClose={() => setIsShareDialogOpen(false)}
        stops={stops}
        tripTitle={tripTitle}
        travelMode={travelMode}
        initialState={selectedState}
        trips={trips}
        activeTripId={activeTripId}
      />
    </>
  );
};
