import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteTripModalProps {
  isOpen: boolean;
  tripName: string;
  destinationsCount: number;
  isProcessing?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const DeleteTripModal: React.FC<DeleteTripModalProps> = ({
  isOpen,
  tripName,
  destinationsCount,
  isProcessing = false,
  onCancel,
  onConfirm,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isProcessing) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isProcessing, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
      onClick={() => {
        if (!isProcessing) onCancel();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-trip-title"
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 id="delete-trip-title" className="text-base font-bold text-white">
                Delete this trip?
              </h3>
              <p className="text-xs text-slate-400">Remove &quot;{tripName}&quot; from your collections</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/80 transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-3">
          <p className="text-xs text-slate-300 leading-relaxed">
            Are you sure you want to delete <span className="font-bold text-white">&quot;{tripName}&quot;</span>?
            This will permanently remove this trip collection and its{' '}
            <span className="font-bold text-indigo-400">
              {destinationsCount} saved destination{destinationsCount === 1 ? '' : 's'}
            </span>
            .
          </p>
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center gap-2 text-slate-300 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Your user account and other trips remain completely safe.</span>
            </div>
            <p className="pl-3.5 text-slate-500">
              This action only deletes &quot;{tripName}&quot; and cannot be undone.
            </p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 p-5 pt-2 border-t border-slate-800/60 bg-slate-950/40">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition shadow-lg shadow-rose-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            <span>{isProcessing ? 'Deleting...' : 'Delete Trip'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
