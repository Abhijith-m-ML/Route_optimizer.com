import React, { useState, useRef, useEffect } from 'react';
import type { TripCollection } from '../../types';
import { 
  ChevronDown, 
  MapPin, 
  Layers, 
  Plus, 
  Check, 
  Folder 
} from 'lucide-react';

interface TripSelectorProps {
  trips: TripCollection[];
  activeTripId: string | 'ALL';
  onSelectTrip: (tripId: string | 'ALL') => void;
  onCreateNewTrip: () => void;
  onOpenMyTrips: () => void;
  className?: string;
}

export const TripSelector: React.FC<TripSelectorProps> = ({
  trips,
  activeTripId,
  onSelectTrip,
  onCreateNewTrip,
  onOpenMyTrips,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeTrip = activeTripId === 'ALL' ? null : trips.find((t) => t.id === activeTripId);
  const totalStopsAll = trips.reduce((acc, t) => acc + (t.stops?.length || 0), 0);

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-850 text-slate-200 border border-slate-700/80 hover:border-slate-600 transition shadow-sm text-xs font-semibold max-w-full"
        title="Switch active trip collection or view all"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {activeTripId === 'ALL' ? (
            <Layers className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
          ) : (
            <Folder className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
          )}
          <span className="truncate max-w-[140px] sm:max-w-[180px] font-bold text-white">
            {activeTripId === 'ALL' ? 'All Trips' : activeTrip?.name || 'Active Trip'}
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-800 text-indigo-300 border border-slate-700/80">
            {activeTripId === 'ALL' ? totalStopsAll : activeTrip?.stops?.length || 0}
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-indigo-400' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-64 sm:w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="p-2.5 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Trip Collections
            </span>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenMyTrips();
              }}
              className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 transition"
            >
              Manage All
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto p-1.5 space-y-1">
            {/* All Trips Option */}
            <button
              type="button"
              onClick={() => {
                onSelectTrip('ALL');
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition ${
                activeTripId === 'ALL'
                  ? 'bg-indigo-600/20 text-indigo-300 font-bold border border-indigo-500/30'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Layers className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                <div className="min-w-0">
                  <span className="text-xs font-bold block truncate">All Trips</span>
                  <span className="text-[10px] text-slate-400 block">
                    Grouped by custom trip headings
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-indigo-300">
                  {totalStopsAll}
                </span>
                {activeTripId === 'ALL' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
              </div>
            </button>

            {/* Individual Trips */}
            {trips.map((trip) => {
              const isSelected = activeTripId === trip.id;
              const count = trip.stops?.length || 0;
              return (
                <button
                  key={trip.id}
                  type="button"
                  onClick={() => {
                    onSelectTrip(trip.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition ${
                    isSelected
                      ? 'bg-indigo-600/20 text-indigo-300 font-bold border border-indigo-500/30'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <span className="text-xs font-semibold block truncate">
                        {trip.name}
                      </span>
                      {trip.description && (
                        <span className="text-[10px] text-slate-500 block truncate">
                          {trip.description}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {count}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Bottom Action: Create New Trip */}
          <div className="p-2 border-t border-slate-800 bg-slate-950/60">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onCreateNewTrip();
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold text-white bg-indigo-600/80 hover:bg-indigo-600 transition shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Trip Collection</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
