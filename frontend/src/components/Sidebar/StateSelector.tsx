import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronDown, 
  MapPin, 
  Search, 
  Check, 
  X, 
  Globe
} from 'lucide-react';
import { 
  INDIAN_STATES, 
  ALL_STATES_OPTION 
} from '../../data/indianStates';

interface StateSelectorProps {
  selectedState: string;
  onSelectState: (stateName: string) => void;
  className?: string;
}

export const StateSelector: React.FC<StateSelectorProps> = ({
  selectedState,
  onSelectState,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchFilter('');
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const activeStateObj = 
    selectedState === 'All States' || !selectedState 
      ? ALL_STATES_OPTION 
      : INDIAN_STATES.find((s) => s.name === selectedState) || {
          name: selectedState,
          code: '',
          type: 'State',
          center: { lat: 20.5937, lng: 78.9629 },
          radiusMeters: 500000,
        };

  const isAllSelected = selectedState === 'All States' || !selectedState;

  // Filter states based on user search in dropdown
  const filterLower = searchFilter.trim().toLowerCase();
  const filteredStates = INDIAN_STATES.filter((s) => {
    if (!filterLower) return true;
    return (
      s.name.toLowerCase().includes(filterLower) ||
      s.code.toLowerCase().includes(filterLower) ||
      (s.aliases && s.aliases.some((a) => a.toLowerCase().includes(filterLower)))
    );
  });

  const stateItems = filteredStates.filter((s) => s.type === 'State');
  const utItems = filteredStates.filter((s) => s.type === 'Union Territory');

  const handleSelect = (name: string) => {
    onSelectState(name);
    setIsOpen(false);
    setSearchFilter('');
  };

  return (
    <div ref={dropdownRef} className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl border text-left transition shadow-sm ${
          isOpen
            ? 'bg-slate-900 border-indigo-500 ring-2 ring-indigo-500/20'
            : isAllSelected
            ? 'bg-slate-900/90 border-slate-700/80 hover:border-slate-600 text-slate-200'
            : 'bg-indigo-950/40 border-indigo-500/50 hover:border-indigo-400 text-white'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
              isAllSelected
                ? 'bg-slate-800 text-indigo-400'
                : 'bg-indigo-500/20 text-indigo-300'
            }`}
          >
            {isAllSelected ? (
              <Globe className="w-3.5 h-3.5" />
            ) : (
              <MapPin className="w-3.5 h-3.5" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold truncate">
                {activeStateObj.name}
              </span>
              {activeStateObj.code && activeStateObj.code !== 'ALL' && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 uppercase">
                  {activeStateObj.code}
                </span>
              )}
              {isAllSelected && (
                <span className="text-[10px] font-semibold text-slate-400">
                  (India)
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0 text-slate-400">
          {!isAllSelected && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                handleSelect('All States');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  handleSelect('All States');
                }
              }}
              className="p-1 hover:text-white rounded hover:bg-slate-800 transition text-[11px] text-slate-400 hover:text-slate-200"
              title="Reset to All States"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-indigo-400' : 'text-slate-400'
            }`}
          />
        </div>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900/98 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-80 flex flex-col animate-in fade-in zoom-in-95 duration-100">
          {/* Search Input Filter */}
          <div className="p-2.5 border-b border-slate-800 bg-slate-900/90 sticky top-0 z-10">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search state or union territory..."
                className="w-full bg-slate-800/90 text-xs text-white placeholder-slate-400 rounded-lg pl-8 pr-7 py-1.5 border border-slate-700 focus:outline-none focus:border-indigo-500 font-sans"
              />
              {searchFilter && (
                <button
                  type="button"
                  onClick={() => setSearchFilter('')}
                  className="absolute right-2 p-0.5 text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* States List */}
          <div className="flex-1 overflow-y-auto py-1 divide-y divide-slate-800/50">
            {/* "All States" default option */}
            {(!filterLower || 'all states'.includes(filterLower) || 'india'.includes(filterLower)) && (
              <div
                role="option"
                aria-selected={isAllSelected}
                onClick={() => handleSelect('All States')}
                className={`flex items-center justify-between px-3.5 py-2 text-xs font-semibold cursor-pointer transition ${
                  isAllSelected
                    ? 'bg-indigo-600/20 text-indigo-300 font-bold'
                    : 'text-slate-200 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-indigo-400" />
                  <span>All States (Nationwide)</span>
                </div>
                {isAllSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
              </div>
            )}

            {/* States (28) */}
            {stateItems.length > 0 && (
              <div>
                <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-900/80">
                  States ({stateItems.length})
                </div>
                {stateItems.map((state) => {
                  const isSelected = selectedState === state.name;
                  return (
                    <div
                      key={state.code}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(state.name)}
                      className={`flex items-center justify-between px-3.5 py-2 text-xs cursor-pointer transition ${
                        isSelected
                          ? 'bg-indigo-600/20 text-indigo-300 font-bold'
                          : 'text-slate-200 hover:bg-slate-800/80 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{state.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                          {state.code}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Union Territories (8) */}
            {utItems.length > 0 && (
              <div>
                <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-900/80">
                  Union Territories ({utItems.length})
                </div>
                {utItems.map((ut) => {
                  const isSelected = selectedState === ut.name;
                  return (
                    <div
                      key={ut.code}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(ut.name)}
                      className={`flex items-center justify-between px-3.5 py-2 text-xs cursor-pointer transition ${
                        isSelected
                          ? 'bg-indigo-600/20 text-indigo-300 font-bold'
                          : 'text-slate-200 hover:bg-slate-800/80 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{ut.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                          {ut.code}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Empty State */}
            {stateItems.length === 0 && utItems.length === 0 && (
              <div className="py-6 px-4 text-center">
                <MapPin className="w-4 h-4 text-slate-600 mx-auto mb-1" />
                <p className="text-xs font-semibold text-slate-300">No states found</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Try searching for another Indian state or union territory.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
