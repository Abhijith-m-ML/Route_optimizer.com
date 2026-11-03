import React, { useState, useEffect } from 'react';
import { 
  ChevronUp, 
  ChevronDown, 
  Trash2, 
  Car,
  Train,
  Footprints,
  MapPin,
  Flag,
  Pencil,
  Check,
  X
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
  onRename?: (newName: string) => void;
  onSetAsStart?: () => void;
  onUpdateDuration?: (minutes: number) => void;
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
  onRename,
  onSetAsStart,
  travelMode,
}) => {
  const isFirst = index === 0;
  const isLast = index === totalStops - 1;

  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState(stop.name);

  useEffect(() => {
    setNameInput(stop.name);
  }, [stop.name]);

  const handleSaveName = (e?: React.MouseEvent | React.FormEvent) => {
    e?.stopPropagation();
    const trimmed = nameInput.trim();
    if (trimmed && trimmed !== stop.name && onRename) {
      onRename(trimmed);
    }
    setIsEditing(false);
  };

  const handleCancelName = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setNameInput(stop.name);
    setIsEditing(false);
  };

  const badgeColorClass = isFirst
    ? 'bg-emerald-500 text-white'
    : isLast
    ? 'bg-rose-500 text-white'
    : 'bg-indigo-600 text-white';

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
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (!isFirst && onSetAsStart) onSetAsStart();
              }}
              disabled={isFirst}
              title={isFirst ? 'Starting Place' : 'Click to set as Starting Place'}
              className={`w-7 h-7 rounded-xl flex items-center justify-center font-extrabold text-xs shadow-md transition ${badgeColorClass} ${
                !isFirst ? 'hover:scale-105 hover:ring-2 hover:ring-emerald-400/50 cursor-pointer' : ''
              }`}
            >
              {index + 1}
            </button>
            <span className="text-[10px] text-slate-500 font-medium mt-1">
              {isFirst ? 'Start' : isLast ? 'End' : `Stop ${index + 1}`}
            </span>
          </div>

          {/* Place Thumbnail */}
          <img
            src={stop.photoUrl}
            alt={stop.name}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover flex-shrink-0 border border-slate-700/80 shadow"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=600&auto=format&fit=crop&q=80';
            }}
          />

          {/* Place Details */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div
                className="flex items-center gap-1.5 w-full my-0.5"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') handleCancelName();
                  }}
                  autoFocus
                  className="flex-1 bg-slate-800 text-white text-xs font-bold rounded-lg px-2 py-1 border border-indigo-500 focus:outline-none shadow-inner"
                  placeholder="e.g. Home, Chai Spot..."
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition flex-shrink-0"
                  title="Save name"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleCancelName}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:text-white transition flex-shrink-0"
                  title="Cancel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-1.5">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <h4
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditing(true);
                    }}
                    className="font-bold text-xs sm:text-sm text-white truncate leading-tight group-hover:text-indigo-300 transition cursor-pointer"
                    title="Click to rename place"
                  >
                    {stop.name}
                  </h4>
                  {onRename && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditing(true);
                      }}
                      className="text-slate-500 hover:text-indigo-300 transition p-0.5 rounded opacity-0 group-hover:opacity-100 flex-shrink-0"
                      title="Rename place"
                      aria-label={`Rename ${stop.name}`}
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                  }}
                  className="text-slate-400 hover:text-rose-400 active:text-rose-300 w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg hover:bg-slate-800/80 active:bg-slate-800 transition flex-shrink-0"
                  title="Remove stop"
                  aria-label={`Remove ${stop.name}`}
                >
                  <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                </button>
              </div>
            )}

            {/* If place was customized, show original name */}
            {stop.isCustomName && stop.originalName && stop.originalName.toLowerCase() !== stop.name.toLowerCase() && (
              <p className="text-[10px] text-slate-500 truncate mt-0.5" title={`Original: ${stop.originalName}`}>
                📍 {stop.originalName}
              </p>
            )}

            {/* Geographical State & City Tags */}
            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              {stop.isCurrentLocation && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  GPS
                </span>
              )}
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

            {/* Actions: Set as Start & Reorder Buttons */}
            <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-800/80">
              {isFirst ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Starting Place</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSetAsStart) onSetAsStart();
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-emerald-500/20 active:bg-emerald-500/30 text-slate-300 hover:text-emerald-300 border border-slate-700 hover:border-emerald-500/40 text-[11px] font-semibold transition group/startbtn shadow-sm"
                  title="Make this the starting destination of your route"
                  aria-label={`Set ${stop.name} as starting place`}
                >
                  <Flag className="w-3.5 h-3.5 text-slate-400 group-hover/startbtn:text-emerald-400 transition" />
                  <span>Set as Start</span>
                </button>
              )}

              {/* Up/Down buttons */}
              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={onMoveUp}
                  disabled={isFirst}
                  className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg bg-slate-800/80 hover:bg-slate-700 active:bg-slate-600 text-slate-300 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed transition"
                  title="Move stop earlier"
                  aria-label="Move stop earlier"
                >
                  <ChevronUp className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                </button>
                <button
                  onClick={onMoveDown}
                  disabled={isLast}
                  className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg bg-slate-800/80 hover:bg-slate-700 active:bg-slate-600 text-slate-300 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed transition"
                  title="Move stop later"
                  aria-label="Move stop later"
                >
                  <ChevronDown className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
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
