import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Compass, 
  Bookmark, 
  Check, 
  Share2, 
  RotateCcw, 
  LogOut, 
  User as UserIcon 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ShareDialog } from './ShareDialog';
import type { SelectedStop, TravelMode } from '../types';

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
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(tripTitle);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
      <header className="h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-2.5 sm:px-4 md:px-6 flex items-center justify-between sticky top-0 z-40 transition-colors">
        {/* Left: Brand & Trip Title */}
        <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-5 min-w-0 flex-shrink-0">
          <Link to="/dashboard" className="flex items-center space-x-2 sm:space-x-2.5 flex-shrink-0 group cursor-pointer">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-all duration-300 flex-shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Compass className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 animate-[spin_20s_linear_infinite]" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent whitespace-nowrap">
                  RouteWise
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hidden sm:inline-block">
                  India
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">Smart Travel Planner</p>
            </div>
          </Link>

          <div className="h-6 w-px bg-slate-800 hidden md:block" />

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

        {/* Right: Actions & User Profile */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 md:space-x-3 flex-shrink-0">
          {/* Share Destinations Button (Opens State-Based Share Dialog) */}
          <button
            onClick={handleOpenShare}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/70 transition shadow-sm"
            title="Share destinations by state"
          >
            <Share2 className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Share</span>
          </button>

          <button
            onClick={onResetTrip}
            className="p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800/70 border border-transparent hover:border-slate-700/60 transition hidden sm:flex items-center justify-center"
            title="Reset to default stops"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Save Trip Button */}
          <button
            onClick={onSaveTrip}
            disabled={isSaving}
            className="flex items-center space-x-1.5 sm:space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] text-white px-2.5 sm:px-3.5 md:px-4 py-1.5 sm:py-2 rounded-xl text-xs md:text-sm font-semibold shadow-md sm:shadow-lg shadow-indigo-600/25 transition-all duration-200 border border-indigo-400/20 disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap flex-shrink-0"
          >
            {isSaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="hidden sm:inline">Saving...</span>
              </>
            ) : (
              <>
                <Bookmark className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white/20" />
                <span className="hidden sm:inline">Save Trip</span>
                <span className="sm:hidden font-medium">Save</span>
              </>
            )}
          </button>

          {/* User Account / Profile Button */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-slate-800/70 border border-transparent hover:border-slate-700/60 transition group"
                title={`Logged in as ${user.email || userDisplayName}`}
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={userDisplayName}
                    className="w-8 h-8 rounded-lg object-cover border border-indigo-500/40"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center font-bold text-xs text-white shadow-sm shadow-indigo-500/20">
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
              className="flex items-center space-x-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-3 py-2 rounded-xl border border-slate-700 transition"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign In</span>
            </Link>
          )}
        </div>
      </header>

      {/* State-Based Share Destinations Dialog */}
      <ShareDialog
        isOpen={isShareDialogOpen}
        onClose={() => setIsShareDialogOpen(false)}
        stops={stops}
        tripTitle={tripTitle}
        travelMode={travelMode}
        initialState={selectedState}
      />
    </>
  );
};
