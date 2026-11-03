import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning';
  title: string;
  description?: string;
  durationMs?: number;
}

interface ToastProps {
  toast: ToastMessage | null;
  onClose: () => void;
  defaultDurationMs?: number;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose, defaultDurationMs = 2500 }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (!toast) {
      setIsExiting(false);
      return;
    }

    setIsExiting(false);
    const duration = toast.durationMs ?? defaultDurationMs;

    // Start exit transition 300ms before close
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, Math.max(duration - 300, 400));

    // Trigger onClose to clear state
    const closeTimer = setTimeout(() => {
      onClose();
    }, duration);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(closeTimer);
    };
  }, [toast?.id, onClose, defaultDurationMs]);

  if (!toast) return null;

  const bgStyles = {
    success: 'bg-emerald-950/95 border-emerald-500/50 text-emerald-100 shadow-emerald-950/50',
    info: 'bg-indigo-950/95 border-indigo-500/50 text-indigo-100 shadow-indigo-950/50',
    warning: 'bg-amber-950/95 border-amber-500/50 text-amber-100 shadow-amber-950/50',
  }[toast.type];

  const Icon = {
    success: CheckCircle2,
    info: Info,
    warning: AlertCircle,
  }[toast.type];

  return (
    <div
      className={`fixed bottom-5 right-4 left-4 sm:left-auto sm:right-5 z-50 transition-all duration-300 ease-out pointer-events-auto ${
        isExiting
          ? 'opacity-0 translate-y-3 scale-95 pointer-events-none'
          : 'opacity-100 translate-y-0 scale-100 animate-in fade-in slide-in-from-bottom-4'
      }`}
    >
      <div
        className={`flex items-start gap-3 p-3.5 rounded-2xl border shadow-2xl backdrop-blur-xl max-w-sm transition-all ${bgStyles}`}
      >
        <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold leading-tight">{toast.title}</p>
          {toast.description && (
            <p className="text-[11px] opacity-80 mt-0.5 leading-relaxed">
              {toast.description}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="Close notification"
          className="text-white/60 hover:text-white p-0.5 rounded-lg transition hover:bg-white/10"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
