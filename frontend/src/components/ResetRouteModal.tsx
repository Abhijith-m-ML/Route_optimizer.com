import React, { useEffect, useRef } from 'react';
import { RotateCcw, AlertTriangle, X, Loader2 } from 'lucide-react';

interface ResetRouteModalProps {
  isOpen: boolean;
  isProcessing?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  stopsCount?: number;
}

export const ResetRouteModal: React.FC<ResetRouteModalProps> = ({
  isOpen,
  isProcessing = false,
  onCancel,
  onConfirm,
  stopsCount = 0,
}) => {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus Cancel button on open (safest default action)
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        cancelButtonRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Handle Escape key to cancel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || isProcessing) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isProcessing, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto"
      onClick={(e) => {
        if (!isProcessing && e.target === e.currentTarget) {
          onCancel();
        }
      }}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-modal-title"
        aria-describedby="reset-modal-description"
        className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl p-4 sm:p-6 text-slate-100 flex flex-col max-h-[90dvh] overflow-y-auto animate-in zoom-in-95 fade-in duration-150 my-auto"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center flex-shrink-0 shadow-inner">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3
                id="reset-modal-title"
                className="text-base sm:text-lg font-extrabold text-white leading-tight"
              >
                Reset Your Route?
              </h3>
              {stopsCount > 0 && (
                <span className="text-[11px] font-semibold text-rose-400/90">
                  {stopsCount} {stopsCount === 1 ? 'destination' : 'destinations'} currently selected
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-50"
            aria-label="Close dialog"
            title="Cancel and close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="py-4">
          <p
            id="reset-modal-description"
            className="text-xs sm:text-sm text-slate-300 leading-relaxed"
          >
            Are you sure you want to reset your current route? This will remove all destinations from your current route and clear the existing route configuration. This action cannot be undone.
          </p>

          <div className="mt-3.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
            <RotateCcw className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
            <span>
              Your account details, saved destinations, and shared links will remain safely preserved.
            </span>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 hover:from-rose-500 hover:to-amber-500 active:scale-[0.98] shadow-lg shadow-rose-600/25 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Resetting...</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" />
                <span>Yes, Reset Route</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

