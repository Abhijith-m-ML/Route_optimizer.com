import React, { useState, useRef, useEffect } from 'react';
import { SearchBox } from './SearchBox';
import { RouteOptimizer } from './RouteOptimizer';
import { DestinationList } from './DestinationList';
import type { Destination, RouteMetrics, SelectedStop, TravelMode } from '../../types';
import { 
  ChevronUp, 
  ChevronDown, 
  Minimize2, 
  Sparkles, 
  Plus, 
  Info,
  Edit3,
  Check
} from 'lucide-react';

export type BottomSheetState = 'collapsed' | 'half' | 'full';

interface MobileBottomSheetProps {
  tripTitle?: string;
  onUpdateTitle?: (title: string) => void;
  stops: SelectedStop[];
  metrics?: RouteMetrics;
  travelMode: TravelMode;
  isOptimized: boolean;
  activeStopId: string | null;
  onAddStop: (dest: Destination) => void;
  onSelectStop: (id: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRemoveStop: (id: string) => void;
  onUpdateDuration: (id: string, minutes: number) => void;
  onClearAll: () => void;
  onOptimizeRoute: () => void;
  onReverseRoute: () => void;
  selectedState?: string;
  onSelectState?: (state: string) => void;
}

export const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
  tripTitle,
  onUpdateTitle,
  stops,
  metrics,
  travelMode,
  isOptimized,
  activeStopId,
  onAddStop,
  onSelectStop,
  onMoveUp,
  onMoveDown,
  onRemoveStop,
  onUpdateDuration,
  onClearAll,
  onOptimizeRoute,
  onReverseRoute,
  selectedState = 'All States',
}) => {
  const [sheetState, setSheetState] = useState<BottomSheetState>('collapsed');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(tripTitle || '');

  const handleTitleSubmit = () => {
    if (tempTitle.trim() && onUpdateTitle) {
      onUpdateTitle(tempTitle.trim());
    } else if (tripTitle) {
      setTempTitle(tripTitle);
    }
    setIsEditingTitle(false);
  };

  const touchStartY = useRef<number>(0);
  const touchCurrentY = useRef<number>(0);
  const isDragging = useRef<boolean>(false);

  // If a new stop is added, slightly expand to half so the user sees their updated route
  const prevStopsCount = useRef(stops.length);
  useEffect(() => {
    if (stops.length > prevStopsCount.current && sheetState === 'collapsed') {
      setSheetState('half');
    }
    prevStopsCount.current = stops.length;
  }, [stops.length, sheetState]);

  // Touch gesture handlers for dragging the bottom sheet
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchCurrentY.current = e.touches[0].clientY;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    touchCurrentY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const deltaY = touchCurrentY.current - touchStartY.current;

    // Swipe Up (deltaY is negative)
    if (deltaY < -40) {
      if (sheetState === 'collapsed') setSheetState('half');
      else if (sheetState === 'half') setSheetState('full');
    } 
    // Swipe Down (deltaY is positive)
    else if (deltaY > 40) {
      if (sheetState === 'full') setSheetState('half');
      else if (sheetState === 'half') setSheetState('collapsed');
    }
  };

  // Height configurations per state
  const heightClass = {
    collapsed: 'h-[72px] max-h-[72px]',
    half: 'h-[46dvh] max-h-[46dvh]',
    full: 'h-[86dvh] max-h-[86dvh]',
  }[sheetState];

  return (
    <>
      {/* Semi-transparent backdrop when fully expanded to focus on search / list */}
      {sheetState === 'full' && (
        <div
          onClick={() => setSheetState('half')}
          className="lg:hidden fixed inset-0 bg-slate-950/50 backdrop-blur-[2px] z-30 transition-opacity animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      {/* Main Bottom Sheet Container */}
      <div
        className={`lg:hidden fixed inset-x-0 bottom-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-slate-700/80 rounded-t-3xl shadow-2xl flex flex-col transition-all duration-300 ease-out pb-safe overflow-hidden ${heightClass}`}
      >
        {/* Draggable Handle & Header Bar */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="pt-2 pb-1.5 px-4 flex flex-col items-center flex-shrink-0 cursor-grab active:cursor-grabbing select-none"
        >
          {/* Visual Handle Pill */}
          <div className="w-10 h-1.5 rounded-full bg-slate-600/90 hover:bg-slate-500 transition mb-2" />

          {/* Collapsed State Bar */}
          {sheetState === 'collapsed' && (
            <div
              onClick={() => setSheetState('half')}
              className="w-full flex items-center justify-between gap-2.5 cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-600/25 text-indigo-300 border border-indigo-500/30 flex-shrink-0">
                  {stops.length} {stops.length === 1 ? 'Stop' : 'Stops'}
                </span>
                <span className="text-xs text-slate-300 font-medium truncate">
                  {stops.length === 0
                    ? 'Tap to search & plan trip'
                    : metrics && stops.length > 1
                    ? `${metrics.totalDistanceKm} km • ~${metrics.totalDurationMinutes} mins`
                    : stops[0]?.name || 'Current route'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {stops.length >= 2 ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOptimizeRoute();
                    }}
                    className="flex items-center gap-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold px-2.5 py-1 rounded-xl shadow-sm transition"
                  >
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>Optimize</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSheetState('full');
                    }}
                    className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold px-2.5 py-1 rounded-xl border border-slate-700 transition"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Place</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSheetState('half');
                  }}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white rounded-lg transition"
                  aria-label="Expand trip panel"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Half & Full Header Bar */}
          {sheetState !== 'collapsed' && (
            <div className="w-full flex items-center justify-between pb-1 border-b border-slate-800/80">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  {sheetState === 'full' ? 'Trip Route & Search' : 'Trip Itinerary'}
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-indigo-400 border border-slate-700">
                  {stops.length} {stops.length === 1 ? 'Place' : 'Places'}
                </span>
              </div>

              <div className="flex items-center gap-1">
                {stops.length >= 2 && (
                  <button
                    type="button"
                    onClick={onOptimizeRoute}
                    className="flex items-center gap-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 text-xs font-bold px-2 py-1 rounded-lg border border-indigo-500/30 transition mr-1"
                  >
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span className="hidden sm:inline">Optimize</span>
                  </button>
                )}

                {sheetState === 'half' ? (
                  <button
                    type="button"
                    onClick={() => setSheetState('full')}
                    className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                    title="Expand fully"
                    aria-label="Expand full height"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSheetState('half')}
                    className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                    title="Half view"
                    aria-label="Half view"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSheetState('collapsed')}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                  title="Collapse sheet"
                  aria-label="Collapse panel"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Scrollable Content Body for Half & Full States */}
        {sheetState !== 'collapsed' && (
          <div className="flex-1 overflow-y-auto px-3.5 py-2 space-y-3.5">
            {/* If Fully Expanded: Show Trip Title, Search Bar & Optimization Controls First */}
            {sheetState === 'full' && (
              <>
                {/* Mobile Trip Title Editor */}
                {tripTitle && (
                  <div className="bg-slate-900/90 rounded-2xl p-3 border border-slate-800 flex items-center justify-between gap-3 shadow-md">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block">
                        Itinerary
                      </span>
                      {isEditingTitle && onUpdateTitle ? (
                        <div className="flex items-center gap-1.5 mt-1">
                          <input
                            type="text"
                            value={tempTitle}
                            onChange={(e) => setTempTitle(e.target.value)}
                            onBlur={handleTitleSubmit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleTitleSubmit();
                              if (e.key === 'Escape') {
                                setTempTitle(tripTitle);
                                setIsEditingTitle(false);
                              }
                            }}
                            autoFocus
                            className="bg-slate-800 text-white font-semibold text-xs rounded-lg px-2 py-1 border border-indigo-500 focus:outline-none w-full"
                          />
                          <button
                            onClick={handleTitleSubmit}
                            className="p-1 bg-indigo-600 text-white rounded-lg"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            if (onUpdateTitle) {
                              setTempTitle(tripTitle);
                              setIsEditingTitle(true);
                            }
                          }}
                          className="flex items-center space-x-1.5 text-left text-xs font-bold text-white hover:text-indigo-300 transition group max-w-full mt-0.5"
                        >
                          <span className="truncate">{tripTitle}</span>
                          {onUpdateTitle && <Edit3 className="w-3 h-3 text-slate-500 group-hover:text-indigo-400 flex-shrink-0" />}
                        </button>
                      )}
                    </div>
                    <span className="text-[11px] font-semibold text-slate-300 bg-slate-800 px-2 py-1 rounded-xl border border-slate-700 whitespace-nowrap flex-shrink-0">
                      {stops.length} stop{stops.length === 1 ? '' : 's'}
                    </span>
                  </div>
                )}

                {/* Search Bar */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Find & Add Destinations
                  </label>
                  <SearchBox
                    onAddStop={(dest) => {
                      onAddStop(dest);
                      setSheetState('half');
                    }}
                    selectedIds={stops.map((s) => s.id)}
                    selectedPlaceIds={stops.map((s) => s.placeId || s.id)}
                    selectedState={selectedState}
                  />
                </div>

                {/* Route Optimizer Button */}
                <RouteOptimizer
                  onOptimize={onOptimizeRoute}
                  onReverseRoute={onReverseRoute}
                  stopsCount={stops.length}
                  isOptimized={isOptimized}
                />
              </>
            )}

            {/* In Half State: Quick "Add Destination" Trigger */}
            {sheetState === 'half' && (
              <button
                type="button"
                onClick={() => setSheetState('full')}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-cyan-300 font-semibold text-xs border border-slate-700 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Search and add destinations...</span>
              </button>
            )}

            {/* Destination List with Reorder, Remove, and Durations */}
            <DestinationList
              stops={stops}
              activeStopId={activeStopId}
              onSelectStop={onSelectStop}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              onRemove={onRemoveStop}
              onUpdateDuration={onUpdateDuration}
              onClearAll={onClearAll}
              onAddStop={onAddStop}
              travelMode={travelMode}
            />

            {/* Travel Insight Banner */}
            <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 flex items-start space-x-2 text-xs text-slate-400">
              <Info className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-200">Travel Insight: </span>
                Drag the sheet to half or full to manage stops and search. Click &quot;Optimize Route&quot; to arrange your stops in the fastest sequence.
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
