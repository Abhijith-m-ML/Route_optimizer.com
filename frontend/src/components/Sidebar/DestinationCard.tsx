import React from 'react';
import { 
  ChevronUp, 
  ChevronDown, 
  Trash2, 
  Clock, 
  Star, 
  Car,
  Train,
  Footprints,
  MapPin
} from 'lucide-react';
import type { SelectedStop, TravelMode } from '../../types';

interface DestinationCardProps {
  stop: SelectedStop;
  index: number;
  totalStops: number;
  isActive: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onUpdateDuration: (minutes: number) => void;
  travelMode: TravelMode;
}

export const DestinationCard: React.FC<DestinationCardProps> = ({
  stop,
  index,
  totalStops,
  isActive,
  onSelect,
  onMoveUp,
  onMoveDown,
  onRemove,
  onUpdateDuration,
  travelMode,
}) => {
  const isFirst = index === 0;
  const isLast = index === totalStops - 1;

  const badgeColorClass = isFirst
    ? 'bg-emerald-500 text-white'
    : isLast
    ? 'bg-rose-500 text-white'
    : 'bg-indigo-600 text-white';

  const visitDuration = stop.customDurationMinutes || stop.typicalVisitDurationMinutes;

  const ModeIcon = {
    DRIVING: Car,
    TRANSIT: Train,
    WALKING: Footprints,
  }[travelMode];

  return (
    <div className="flex flex-col">
      {/* Main Destination Card */}
      <div
        onClick={onSelect}
        className={`group relative bg-slate-900/90 rounded-2xl border p-3.5 transition-all duration-200 cursor-pointer ${
          isActive
            ? 'border-indigo-500 bg-slate-800/90 shadow-lg shadow-indigo-500/10'
            : 'border-slate-800/90 hover:border-slate-700 hover:bg-slate-850'
        }`}
      >
        <div className="flex items-start gap-3">
          {/* Stop Number Badge */}
          <div className="flex flex-col items-center flex-shrink-0 pt-0.5">
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center font-extrabold text-xs shadow-md ${badgeColorClass}`}
            >
              {index + 1}
            </div>
            <span className="text-[10px] text-slate-500 font-medium mt-1">
              {isFirst ? 'Start' : isLast ? 'End' : `Stop ${index + 1}`}
            </span>
          </div>

          {/* Place Thumbnail */}
          <img
            src={stop.photoUrl}
            alt={stop.name}
            className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-slate-700/80 shadow"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=600&auto=format&fit=crop&q=80';
            }}
          />

          {/* Place Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-1.5">
              <h4 className="font-bold text-xs md:text-sm text-white truncate leading-tight group-hover:text-indigo-300 transition">
                {stop.name}
              </h4>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="text-slate-500 hover:text-rose-400 p-1 rounded-lg hover:bg-slate-800 transition"
                title="Remove stop"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Geographical State & City Tags */}
            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              {stop.state && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  <MapPin className="w-2.5 h-2.5 text-indigo-400" />
                  {stop.state}
                  {stop.stateCode && <span className="opacity-70">({stop.stateCode})</span>}
                </span>
              )}
              {stop.city && stop.city !== stop.name && (
                <span className="text-[10px] text-slate-300 font-medium bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700/70">
                  {stop.city}
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-400 truncate mt-1" title={stop.address}>
              {stop.shortAddress || stop.address}
            </p>

            <div className="flex items-center gap-2 mt-1.5 text-[11px]">
              <div className="flex items-center text-amber-400 font-semibold">
                <Star className="w-3 h-3 fill-amber-400 mr-0.5" />
                {stop.rating}
              </div>
              <span className="text-slate-600">•</span>
              <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                {stop.category}
              </span>
            </div>

            {/* Duration Selector & Reorder Buttons */}
            <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-800/80">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Clock className="w-3 h-3 text-cyan-400" />
                <span>Visit:</span>
                <select
                  value={visitDuration}
                  onChange={(e) => {
                    e.stopPropagation();
                    onUpdateDuration(Number(e.target.value));
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-slate-800 text-slate-200 text-[11px] rounded px-1.5 py-0.5 border border-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value={30}>30 min</option>
                  <option value={45}>45 min</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hrs</option>
                  <option value={120}>2 hours</option>
                  <option value={180}>3 hours</option>
                </select>
              </div>

              {/* Up/Down buttons */}
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={onMoveUp}
                  disabled={isFirst}
                  className="p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                  title="Move stop earlier"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={onMoveDown}
                  disabled={isLast}
                  className="p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                  title="Move stop later"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transit Connector Between Stops */}
      {!isLast && stop.distanceToNextKm !== undefined && (
        <div className="my-1.5 pl-6 flex items-center gap-2 text-[11px] text-slate-400">
          <div className="w-0.5 h-6 bg-gradient-to-b from-indigo-500/80 to-indigo-500/20 my-0.5" />
          <div className="bg-slate-900/60 px-2.5 py-1 rounded-full border border-slate-800/80 flex items-center gap-2 shadow-sm">
            <ModeIcon className="w-3 h-3 text-cyan-400" />
            <span className="font-semibold text-slate-200">{stop.distanceToNextKm} km</span>
            <span className="text-slate-600">•</span>
            <span>~{stop.timeToNextMinutes} mins via {travelMode.toLowerCase()}</span>
          </div>
        </div>
      )}
    </div>
  );
};
