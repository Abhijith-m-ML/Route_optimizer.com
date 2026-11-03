import React, { useEffect } from 'react';
import type { SelectedStop, SharedTripData } from '../types';

interface SharedTripPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  sharedData: SharedTripData | null;
  currentStops?: SelectedStop[];
  onImport: (stopsToImport: SelectedStop[], customTripName?: string) => void;
}

export const SharedTripPreviewModal: React.FC<SharedTripPreviewModalProps> = ({
  isOpen,
  onClose,
  sharedData,
  onImport,
}) => {
  // Allow closing via Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !sharedData) return null;

  const stops = sharedData.stops || [];
  const displayName = sharedData.tripName || sharedData.title || 'Shared Trip';

  const handleViewSharedTrip = () => {
    onImport(stops, displayName);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black min-h-screen overflow-y-auto selection:bg-indigo-600 selection:text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Trip Invitation"
    >
      {/* Centered Container with thin dark-grey border and rounded corners */}
      <div className="w-full max-w-[620px] bg-black border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative flex flex-col my-auto transition-all">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <span className="text-xl sm:text-2xl font-bold text-white tracking-tight select-none">
            vazhikatti
          </span>
          <span className="inline-flex items-center px-3.5 py-1 sm:px-4 sm:py-1 rounded-full text-[11px] sm:text-xs font-bold tracking-wider uppercase text-[#05df72] bg-[#032110] border border-[#0a3d20]">
            TRIP INVITATION
          </span>
        </div>

        {/* Main Invitation Card with dark navy-blue background */}
        <div className="bg-[#0c1f38] rounded-2xl p-6 sm:p-8 md:p-10 text-left border border-white/5 shadow-inner">
          {/* Small Heading */}
          <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#7a95b3] mb-2 sm:mb-2.5">
            YOU'VE BEEN INVITED TO EXPLORE
          </p>

          {/* Main Heading */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-wide mb-7 sm:mb-9 leading-tight">
            A SURPRISE TRIP
          </h1>

          {/* Main Button */}
          <button
            type="button"
            onClick={handleViewSharedTrip}
            className="w-full bg-white hover:bg-slate-100 active:bg-slate-200 text-[#0c1f38] font-extrabold text-sm sm:text-base py-3.5 sm:py-4 px-6 rounded-xl sm:rounded-2xl transition-all shadow-md active:scale-[0.99] flex items-center justify-center tracking-wider uppercase cursor-pointer"
          >
            VIEW SHARED TRIP →
          </button>

          {/* Footer Inside the Invitation Card */}
          <p className="text-xs sm:text-sm text-[#7a95b3] text-center mt-4 sm:mt-5 font-medium">
            Shared securely through Vazhikatti
          </p>
        </div>

        {/* Bottom Footer Outside the Blue Card */}
        <p className="text-xs sm:text-sm text-zinc-500 text-center mt-5 sm:mt-6 font-normal">
          No external photos · No image API · Responsive design
        </p>

      </div>
    </div>
  );
};
