import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning';
  title: string;
  description?: string;
}

interface ToastProps {
  toast: ToastMessage | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  if (!toast) return null;

  const bgStyles = {
    success: 'bg-emerald-950/95 border-emerald-500/50 text-emerald-100',
    info: 'bg-indigo-950/95 border-indigo-500/50 text-indigo-100',
    warning: 'bg-amber-950/95 border-amber-500/50 text-amber-100',
  }[toast.type];

  const Icon = {
    success: CheckCircle2,
    info: Info,
    warning: AlertCircle,
  }[toast.type];

  return (
    <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div
        className={`flex items-start gap-3 p-3.5 rounded-2xl border shadow-2xl backdrop-blur-xl max-w-sm ${bgStyles}`}
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
          className="text-white/60 hover:text-white p-0.5 rounded-lg transition"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
