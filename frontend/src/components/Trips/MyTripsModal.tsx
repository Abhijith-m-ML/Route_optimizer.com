import React, { useState } from 'react';
import type { TripCollection } from '../../types';
import { 
  X, 
  Plus, 
  MapPin, 
  Calendar, 
  Share2, 
  Edit3, 
  Trash2, 
  Compass, 
  Check, 
  ExternalLink,
  Layers
} from 'lucide-react';

interface MyTripsModalProps {
  isOpen: boolean;
  onClose: () => void;
  trips: TripCollection[];
  activeTripId: string | 'ALL';
  onSelectTrip: (tripId: string | 'ALL') => void;
  onCreateNewTrip: () => void;
  onEditTrip: (trip: TripCollection) => void;
  onShareTrip: (trip: TripCollection) => void;
  onDeleteTrip: (trip: TripCollection) => void;
}

export const MyTripsModal: React.FC<MyTripsModalProps> = ({
  isOpen,
  onClose,
  trips,
  activeTripId,
  onSelectTrip,
  onCreateNewTrip,
  onEditTrip,
  onShareTrip,
  onDeleteTrip,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredTrips = trips.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalDestinationsAllTrips = trips.reduce((acc, t) => acc + (t.stops?.length || 0), 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>My Trip Collections</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300 border border-slate-700">
                  {trips.length} {trips.length === 1 ? 'Trip' : 'Trips'}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Manage, organize, open and share your personalized trip plans
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCreateNewTrip}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 transition shadow-md shadow-indigo-600/30"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Trip</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/80 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Create Button & Search */}
        <div className="p-3 sm:p-4 border-b border-slate-800/60 bg-slate-950/40 space-y-2.5">
          <div className="sm:hidden">
            <button
              type="button"
              onClick={onCreateNewTrip}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 shadow-md shadow-indigo-600/30"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Trip</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your trips..."
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
            {/* All Trips button */}
            <button
              type="button"
              onClick={() => {
                onSelectTrip('ALL');
                onClose();
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
                activeTripId === 'ALL'
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:text-white'
              }`}
              title="Show all destinations organized by trip"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Trips ({totalDestinationsAllTrips})</span>
            </button>
          </div>
        </div>

        {/* Trips List / Cards */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredTrips.length === 0 ? (
            <div className="text-center py-12 px-4 bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
              <Compass className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-white">
                {searchQuery ? 'No matching trips found' : 'No trips created yet'}
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? `No trip matches "${searchQuery}". Try a different keyword.`
                  : 'Create custom trips like "Mumbai Trip" or "Kerala Vacation" to organize your destinations.'}
              </p>
              {!searchQuery && (
                <button
                  type="button"
                  onClick={onCreateNewTrip}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Your First Trip</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredTrips.map((trip) => {
                const isActive = activeTripId === trip.id;
                const stopsCount = trip.stops?.length || 0;
                const updatedTime = trip.updatedAt
                  ? new Date(trip.updatedAt).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'Recent';

                return (
                  <div
                    key={trip.id}
                    className={`bg-slate-950/60 rounded-2xl border p-4 flex flex-col justify-between transition-all duration-200 group relative ${
                      isActive
                        ? 'border-indigo-500 shadow-md shadow-indigo-500/10 ring-1 ring-indigo-500/30'
                        : 'border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    {/* Top Row: Title & Active Badge */}
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-white truncate group-hover:text-indigo-300 transition">
                            {trip.name}
                          </h4>
                        </div>
                        {isActive ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex-shrink-0">
                            <Check className="w-3 h-3" />
                            <span>Active</span>
                          </span>
                        ) : null}
                      </div>

                      {/* Description */}
                      {trip.description && (
                        <p className="text-[11px] text-slate-400 line-clamp-2 mb-2 leading-relaxed">
                          {trip.description}
                        </p>
                      )}

                      {/* Meta Information */}
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mb-3.5">
                        <span className="flex items-center gap-1 text-indigo-400 font-semibold">
                          <MapPin className="w-3 h-3" />
                          <span>
                            {stopsCount} {stopsCount === 1 ? 'Destination' : 'Destinations'}
                          </span>
                        </span>
                        <span className="flex items-center gap-1 text-slate-500">
                          <Calendar className="w-3 h-3" />
                          <span>{updatedTime}</span>
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-800/70 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectTrip(trip.id);
                          onClose();
                        }}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold transition ${
                          isActive
                            ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-600/50'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                        }`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{isActive ? 'View on Map' : 'Open Map'}</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onShareTrip(trip)}
                          className="p-1.5 text-slate-400 hover:text-indigo-400 rounded-lg hover:bg-slate-800 transition"
                          title="Share this trip"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditTrip(trip)}
                          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                          title="Edit trip details"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteTrip(trip)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                          title="Delete trip"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

