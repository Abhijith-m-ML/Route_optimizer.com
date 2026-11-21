import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Settings,
  X,
  Map as MapIcon,
  ListFilter,
  Compass,
  Share2,
  RotateCcw,
  Sun,
  Moon,
  HelpCircle,
  LogOut,
  User as UserIcon,
  Edit2,
  CheckCircle2,
  Loader2,
  CloudOff,
  Search,
  Download,
  Sparkles,
  Share,
  PlusSquare,
  Smartphone
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { usePWA } from '../../context/PWAContext';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeView: 'map' | 'sidebar';
  onSelectView: (view: 'map' | 'sidebar') => void;
  stopsCount: number;
  tripsCount: number;
  onOpenMyTrips: () => void;
  onOpenShare: () => void;
  onResetRoute: () => void;
  onOpenHelp: () => void;
  onOpenEditProfile?: () => void;
  isSaving?: boolean;
  lastSavedAt?: string | null;
  autoSaveStatus?: 'idle' | 'saving' | 'saved' | 'offline';
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  activeView,
  onSelectView,
  stopsCount,
  tripsCount,
  onOpenMyTrips,
  onOpenShare,
  onResetRoute,
  onOpenHelp,
  onOpenEditProfile,
  isSaving = false,
  lastSavedAt = null,
  autoSaveStatus = 'saved',
}) => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { isInstalled, canInstall, isIOS, openInstallModal, promptInstall, hasUpdate, applyUpdate } = usePWA();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleLogout = async () => {
    try {
      onClose();
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const userDisplayName = user?.displayName || user?.email?.split('@')[0] || 'Traveler';
  const userInitials = userDisplayName.slice(0, 2).toUpperCase();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 pt-[max(12px,env(safe-area-inset-top,0px))] pb-[max(12px,env(safe-area-inset-bottom,0px))] pl-[max(12px,env(safe-area-inset-left,0px))] pr-[max(12px,env(safe-area-inset-right,0px))] bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Application Settings and Options"
    >
      <div
        className={`w-full max-w-md max-h-[calc(100dvh-2rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))] flex flex-col rounded-3xl border shadow-2xl overflow-hidden transition-all duration-200 animate-scale-up ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-black/60'
            : 'bg-white border-slate-200 text-slate-900 shadow-slate-900/20'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className={`px-5 py-4 flex items-center justify-between border-b flex-shrink-0 ${
            isDark ? 'border-slate-800/80 bg-slate-900/90' : 'border-slate-200/80 bg-slate-50/80'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Settings & Options</h2>
              <p className="text-[11px] text-slate-400">Map views, actions & preferences</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
              isDark
                ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 min-h-0 text-sm">
          {/* Automatic Cloud Save Status Card */}
          <div
            className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
              autoSaveStatus === 'offline'
                ? isDark
                  ? 'bg-amber-950/30 border-amber-800/40 text-amber-300'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
                : isSaving
                ? isDark
                  ? 'bg-indigo-950/30 border-indigo-800/40 text-indigo-300'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-800'
                : isDark
                ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {autoSaveStatus === 'offline' ? (
                <CloudOff className="w-5 h-5 flex-shrink-0 text-amber-500" />
              ) : isSaving ? (
                <Loader2 className="w-5 h-5 flex-shrink-0 animate-spin text-indigo-500" />
              ) : (
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-500" />
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">
                  {autoSaveStatus === 'offline'
                    ? 'Offline Mode - Saved Locally'
                    : isSaving
                    ? 'Saving Places to Cloud...'
                    : 'Auto-Save: All Places Synced'}
                </p>
                <p className="text-[11px] opacity-80 truncate">
                  {autoSaveStatus === 'offline'
                    ? 'Changes will auto-sync when reconnected'
                    : lastSavedAt
                    ? `Last synced at ${lastSavedAt}`
                    : 'Automatic cloud persistence active'}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-current/10 border border-current/20 flex-shrink-0">
              Auto
            </span>
          </div>

          {/* Section 1: View Modes */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block px-1">
              View Mode
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  onSelectView('map');
                  onClose();
                }}
                className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all duration-150 ${
                  activeView === 'map'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-transparent shadow-md shadow-indigo-600/30 font-bold'
                    : isDark
                    ? 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:text-white'
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900'
                }`}
                aria-selected={activeView === 'map'}
              >
                <MapIcon className="w-5 h-5" />
                <span className="text-xs font-bold">Interactive Map</span>
                {activeView === 'map' && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-extrabold uppercase">
                    Active
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectView('sidebar');
                  onClose();
                }}
                className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all duration-150 ${
                  activeView === 'sidebar'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-transparent shadow-md shadow-indigo-600/30 font-bold'
                    : isDark
                    ? 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:text-white'
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900'
                }`}
                aria-selected={activeView === 'sidebar'}
              >
                <ListFilter className="w-5 h-5" />
                <span className="text-xs font-bold">Trip Plan</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded-full font-extrabold uppercase ${
                    activeView === 'sidebar'
                      ? 'bg-white/20 text-white'
                      : isDark
                      ? 'bg-slate-700 text-slate-300'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {stopsCount} {stopsCount === 1 ? 'place' : 'places'}
                </span>
              </button>
            </div>
          </div>

          {/* Section 2: Trip Actions */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block px-1">
              Trip Actions
            </span>
            <div className="space-y-1.5">
              {/* Search & Discover Destinations */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/search');
                }}
                className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all ${
                  isDark
                    ? 'bg-slate-800/50 border-slate-800 hover:bg-slate-800 text-slate-200'
                    : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                    <Search className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold">Search & Discover</p>
                    <p className="text-[11px] text-slate-400">Explore continents, cities & landmarks</p>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-700'
                  }`}
                >
                  Explore
                </span>
              </button>

              {/* My Trips Collections (Compass) */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenMyTrips();
                }}
                className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all ${
                  isDark
                    ? 'bg-slate-800/50 border-slate-800 hover:bg-slate-800 text-slate-200'
                    : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                    <Compass className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold">My Trips Collections</p>
                    <p className="text-[11px] text-slate-400">Manage and switch itinerary collections</p>
                  </div>
                </div>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    isDark ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700'
                  }`}
                >
                  {tripsCount}
                </span>
              </button>

              {/* Share Trips & Places */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenShare();
                }}
                className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all ${
                  isDark
                    ? 'bg-slate-800/50 border-slate-800 hover:bg-slate-800 text-slate-200'
                    : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold">Share Trip & Places</p>
                    <p className="text-[11px] text-slate-400">Generate shareable link or export itinerary</p>
                  </div>
                </div>
              </button>

              {/* Reset Current Route (Undo) */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onResetRoute();
                }}
                className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all ${
                  isDark
                    ? 'bg-rose-950/20 border-rose-900/30 hover:bg-rose-950/40 text-rose-300'
                    : 'bg-rose-50/50 border-rose-200/60 hover:bg-rose-100/60 text-rose-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center">
                    <RotateCcw className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold">Reset Current Route</p>
                    <p className="text-[11px] opacity-75">Clear all stops in current trip</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Section 3: Appearance & Preferences */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block px-1">
              Preferences
            </span>
            <div
              className={`p-3 rounded-2xl border flex items-center justify-between ${
                isDark ? 'bg-slate-800/50 border-slate-800' : 'bg-slate-50 border-slate-200/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-indigo-500/15 text-indigo-600'
                  }`}
                >
                  {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </div>
                <div>
                  <p className="text-xs font-bold">Theme Mode</p>
                  <p className="text-[11px] text-slate-400">
                    Currently in {isDark ? 'Dark Mode' : 'Light Mode'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={toggleTheme}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isDark
                    ? 'bg-slate-700 hover:bg-slate-600 text-amber-300'
                    : 'bg-slate-200 hover:bg-slate-300 text-indigo-700'
                }`}
              >
                Switch to {isDark ? 'Light' : 'Dark'}
              </button>
            </div>
          </div>

          {/* Section: Application & PWA Installation */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block px-1">
              App & Installation
            </span>

            {/* If New Version Update is Available */}
            {hasUpdate && (
              <div
                className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                  isDark ? 'bg-cyan-950/30 border-cyan-800/40 text-cyan-300' : 'bg-cyan-50 border-cyan-200 text-cyan-800'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0 animate-pulse" />
                  <span className="text-xs font-bold truncate">New Version Available</span>
                </div>
                <button
                  type="button"
                  onClick={applyUpdate}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 transition flex-shrink-0"
                >
                  Update
                </button>
              </div>
            )}

            {/* PWA Installation Card */}
            {isInstalled ? (
              <div
                className={`p-3 rounded-2xl border flex items-center justify-between ${
                  isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold">App Installed (PWA)</p>
                    <p className="text-[11px] text-slate-400">Running as standalone app</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Installed
                </span>
              </div>
            ) : isIOS ? (
              /* iPhone / iPad Safari Installation */
              <div
                className={`p-3.5 rounded-2xl border space-y-2.5 ${
                  isDark
                    ? 'bg-gradient-to-r from-indigo-950/40 to-cyan-950/30 border-indigo-800/40'
                    : 'bg-gradient-to-r from-indigo-50/80 to-cyan-50/60 border-indigo-200/80'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white flex items-center justify-center shadow-md shadow-indigo-600/30 flex-shrink-0">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">Install on iPhone / iPad</p>
                      <p className="text-[11px] text-slate-400 truncate">Safari: Share &rarr; Add to Home Screen</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      openInstallModal();
                    }}
                    className="px-2.5 py-1 rounded-xl text-xs font-bold text-indigo-400 hover:text-white hover:bg-indigo-600/30 border border-indigo-500/30 transition flex-shrink-0"
                  >
                    View Guide
                  </button>
                </div>
                <div className={`p-2.5 rounded-xl border text-[11px] space-y-1 ${
                  isDark ? 'bg-slate-900/60 border-slate-800 text-slate-300' : 'bg-white/80 border-slate-200 text-slate-700'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0">1</span>
                    <span>Tap <strong>Share</strong> in Safari bottom toolbar</span>
                    <Share className="w-3 h-3 text-blue-400 inline" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0">2</span>
                    <span>Scroll and tap <strong>Add to Home Screen</strong></span>
                    <PlusSquare className="w-3 h-3 text-indigo-400 inline" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0">3</span>
                    <span>Tap <strong>Add</strong> in top-right corner</span>
                  </div>
                </div>
              </div>
            ) : canInstall ? (
              /* Browser with Native beforeinstallprompt support */
              <div
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                  isDark
                    ? 'bg-gradient-to-r from-indigo-950/40 to-cyan-950/30 border-indigo-800/40'
                    : 'bg-gradient-to-r from-indigo-50/80 to-cyan-50/60 border-indigo-200/80'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white flex items-center justify-center shadow-md shadow-indigo-600/30 flex-shrink-0">
                    <Download className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">Install Vazhikatti App</p>
                    <p className="text-[11px] text-slate-400 truncate">
                      Fast, full-screen map & offline access
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    await promptInstall();
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 shadow-sm shadow-indigo-600/30 transition flex-shrink-0 flex items-center gap-1.5"
                  data-testid="settings-install-pwa-btn"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Install</span>
                </button>
              </div>
            ) : (
              /* Automatic Prompt Unavailable - Clear Manual Instructions */
              <div
                className={`p-3.5 rounded-2xl border space-y-2 ${
                  isDark
                    ? 'bg-slate-800/40 border-slate-800'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center flex-shrink-0">
                      <Download className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">Install Vazhikatti</p>
                      <p className="text-[11px] text-slate-400 truncate">Manual browser installation</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      openInstallModal();
                    }}
                    className="px-2.5 py-1 rounded-xl text-xs font-bold text-indigo-400 hover:text-white hover:bg-indigo-600/20 border border-indigo-500/30 transition flex-shrink-0"
                  >
                    Instructions
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed px-1">
                  Open your browser menu (<strong>&vellip;</strong>) and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.
                </p>
              </div>
            )}
          </div>

          {/* Section 4: Help and Support */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block px-1">
              Support
            </span>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenHelp();
              }}
              className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all ${
                isDark
                  ? 'bg-slate-800/50 border-slate-800 hover:bg-slate-800 text-slate-200'
                  : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100 text-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold">App Guide & Tutorial</p>
                  <p className="text-[11px] text-slate-400">Learn how to build and optimize routes</p>
                </div>
              </div>
            </button>
          </div>

          {/* Section 5: Account & Session */}
          <div className="space-y-2 pt-1 border-t border-slate-800/60">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block px-1">
              Account
            </span>
            {user ? (
              <div
                className={`p-3.5 rounded-2xl border space-y-3 ${
                  isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={userDisplayName}
                      className="w-10 h-10 rounded-xl object-cover border border-indigo-500/40 bg-slate-800"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center font-bold text-sm text-white shadow-md shadow-indigo-500/20">
                      {userInitials}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold truncate">{userDisplayName}</h4>
                    <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                  </div>
                  {onOpenEditProfile && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenEditProfile();
                      }}
                      className="p-2 rounded-xl text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition"
                      title="Edit Profile"
                      aria-label="Edit Profile"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition ${
                    isDark
                      ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20'
                      : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200'
                  }`}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            ) : (
              <div
                className={`p-3 rounded-2xl border flex items-center justify-between ${
                  isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200/80'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <UserIcon className="w-4 h-4 text-slate-400" />
                  <span className="text-xs text-slate-400 font-medium">Guest Traveler</span>
                </div>
                <Link
                  to="/login"
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-sm"
                >
                  Sign In
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div
          className={`px-5 py-3 border-t text-center flex-shrink-0 ${
            isDark ? 'border-slate-800/80 bg-slate-950/40 text-slate-500' : 'border-slate-200/80 bg-slate-50/60 text-slate-400'
          }`}
        >
          <p className="text-[10px] font-semibold">
            Vazhikatti Route Optimizer • Auto-Saving Enabled
          </p>
        </div>
      </div>
    </div>
  );
};
