import React from 'react';
import { 
  X, 
  Download, 
  Smartphone, 
  Share, 
  PlusSquare, 
  CheckCircle2, 
  Compass, 
  Laptop
} from 'lucide-react';
import { usePWA } from '../../context/PWAContext';
import { useTheme } from '../../context/ThemeContext';

export interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose }) => {
  const { isDark } = useTheme();
  const { 
    isInstalled, 
    canInstall, 
    isIOS, 
    isAndroid, 
    promptInstall 
  } = usePWA();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 pt-[max(12px,env(safe-area-inset-top,0px))] pb-[max(12px,env(safe-area-inset-bottom,0px))] pl-[max(12px,env(safe-area-inset-left,0px))] pr-[max(12px,env(safe-area-inset-right,0px))] bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Install Vazhikatti App"
    >
      <div
        className={`w-full max-w-md max-h-[calc(100dvh-2rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))] flex flex-col rounded-3xl border shadow-2xl overflow-hidden transition-all duration-200 animate-scale-up ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-black/70'
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
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-400 p-0.5 shadow-md shadow-indigo-600/30 flex-shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Compass className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Install Vazhikatti</h2>
              <p className="text-[11px] text-slate-400">Direct install for Android, iOS & Desktop</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
              isDark
                ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
            aria-label="Close install dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 min-h-0 text-sm">
          {/* Card: Brand Overview */}
          <div
            className={`p-4 rounded-2xl border flex items-center gap-3.5 ${
              isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200/80'
            }`}
          >
            <img
              src="/pwa-192x192.png"
              alt="Vazhikatti Icon"
              className="w-14 h-14 rounded-2xl shadow-lg border border-indigo-500/30 flex-shrink-0 bg-slate-950"
            />
            <div className="min-w-0 flex-1">
              <h3 className="font-extrabold text-sm sm:text-base leading-snug truncate">
                Vazhikatti Route Optimizer
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                Fast, offline-ready navigation & multi-stop route planner directly on your home screen.
              </p>
            </div>
          </div>

          {/* Condition 1: App is Already Installed */}
          {isInstalled ? (
            <div
              className={`p-4 rounded-2xl border flex items-center gap-3 ${
                isDark ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
            >
              <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-xs">Vazhikatti is Already Installed</h4>
                <p className="text-[11px] opacity-80 mt-0.5">
                  You are running the standalone app on your home screen or desktop.
                </p>
              </div>
            </div>
          ) : isIOS ? (
            /* Condition 2: iOS / iPhone Safari Installation Guide */
            <div className="space-y-3">
              <div
                className={`p-3.5 rounded-2xl border ${
                  isDark ? 'bg-indigo-950/20 border-indigo-800/40' : 'bg-indigo-50/70 border-indigo-200/80'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Smartphone className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                  <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                    iPhone / iPad (Safari) Installation
                  </h4>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Apple iOS installs web apps directly through Safari's Add to Home Screen:
                </p>
              </div>

              {/* Step 1 */}
              <div
                className={`p-3 rounded-2xl border flex items-start gap-3 ${
                  isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="w-7 h-7 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  1
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold">
                    Tap the <strong className="text-blue-400">Share button</strong> in Safari
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                    Located in the bottom navigation toolbar <Share className="w-3.5 h-3.5 inline text-blue-400 flex-shrink-0" />
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div
                className={`p-3 rounded-2xl border flex items-start gap-3 ${
                  isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="w-7 h-7 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  2
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold">
                    Scroll down and select <strong className="text-indigo-400">Add to Home Screen</strong>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                    Represented by a square plus icon <PlusSquare className="w-3.5 h-3.5 inline text-indigo-400 flex-shrink-0" />
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div
                className={`p-3 rounded-2xl border flex items-start gap-3 ${
                  isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="w-7 h-7 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  3
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold">
                    Tap <strong className="text-emerald-400">Add</strong> in top-right corner
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Vazhikatti will now appear as a native app on your home screen!
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Condition 3: Android & Desktop Chrome / Edge */
            <div className="space-y-3">
              {canInstall ? (
                /* Native 1-Tap Install Button */
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={promptInstall}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-extrabold text-sm shadow-xl shadow-indigo-600/30 transition-all active:scale-[0.98]"
                    data-testid="pwa-install-btn"
                  >
                    <Download className="w-4 h-4 flex-shrink-0" />
                    <span>Install Vazhikatti App</span>
                  </button>
                  <p className="text-center text-[11px] text-slate-400">
                    Installs instantly with zero download size and no app store required.
                  </p>
                </div>
              ) : (
                /* Manual Browser Menu Instructions */
                <div
                  className={`p-3.5 rounded-2xl border space-y-2.5 ${
                    isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isAndroid ? (
                      <Smartphone className="w-4 h-4 text-cyan-400" />
                    ) : (
                      <Laptop className="w-4 h-4 text-cyan-400" />
                    )}
                    <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                      {isAndroid ? 'Android Chrome Installation' : 'Desktop Browser Installation'}
                    </h4>
                  </div>
                  <ol className="text-xs text-slate-300 space-y-1.5 list-decimal list-inside leading-relaxed">
                    <li>
                      Tap the browser menu <strong className="text-white">⋮ (three dots)</strong> in the top-right corner.
                    </li>
                    <li>
                      Select <strong className="text-indigo-400">Install app</strong> or <strong className="text-indigo-400">Add to Home screen</strong>.
                    </li>
                    <li>
                      Confirm <strong className="text-emerald-400">Install</strong> to add Vazhikatti to your home screen or desktop.
                    </li>
                  </ol>
                </div>
              )}

              {/* Benefits checklist */}
              <div className="pt-2 border-t border-slate-800/60 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span>Instant Launch</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span>Full Screen Map</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span>GPS Navigation</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span>Offline App Shell</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className={`px-5 py-3 border-t flex items-center justify-end flex-shrink-0 ${
            isDark ? 'border-slate-800/80 bg-slate-900/90' : 'border-slate-200/80 bg-slate-50/80'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
