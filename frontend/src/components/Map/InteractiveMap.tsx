import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Plus, 
  Minus, 
  RotateCcw, 
  Layers, 
  Compass, 
  AlertTriangle, 
  ExternalLink,
  CheckCircle2,
  RefreshCw,
  MapPin,
  Maximize2,
  Navigation
} from 'lucide-react';
import { 
  loadGoogleMaps, 
  isGoogleMapsConfigured, 
  onGoogleMapsAuthFailure 
} from '../../services/googleMapsLoader';
import { ROUTEWISE_DARK_MAP_STYLE } from '../../utils/mapStyles';
import type { SelectedStop } from '../../types';
import googleMapsPinIcon from '../../assets/google-maps-pin.png';

// Official Mumbai geographic coordinates
const MUMBAI_CENTER = {
  lat: 19.0760,
  lng: 72.8777,
};
const DEFAULT_ZOOM = 11;

type MapThemeType = 'dark' | 'roadmap' | 'satellite';
type MapLoadingStatus = 'loading' | 'ready' | 'missing_key' | 'error';

export interface InteractiveMapProps {
  stops?: SelectedStop[];
  activeStopId?: string | null;
  onSelectStop?: (id: string) => void;
  onRemoveStop?: (id: string) => void;
}

/**
 * Creates a high-DPI numbered teardrop SVG marker icon
 */
function createNumberedMarkerIcon(
  number: number,
  isSelected: boolean,
  isFirst: boolean,
  isLast: boolean,
  totalStops: number
): google.maps.Icon {
  const bgColor = isSelected
    ? '#4f46e5' // Bright Indigo
    : isFirst
    ? '#10b981' // Emerald for Start
    : isLast && totalStops > 1
    ? '#f43f5e' // Rose for End
    : '#0284c7'; // Cyan/Blue for intermediate

  const strokeColor = isSelected ? '#fbbf24' : '#ffffff'; // Amber halo when selected
  const strokeWidth = isSelected ? 3 : 2;
  const scale = isSelected ? 42 : 36;
  const height = scale + 10;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${scale}" height="${height}" viewBox="0 0 38 48">
      <defs>
        <filter id="marker-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#000000" flood-opacity="0.6"/>
        </filter>
      </defs>
      <path d="M19 46 C19 46 3 25 3 17 A16 16 0 0 1 35 17 C35 25 19 46 19 46 Z" 
            fill="${bgColor}" 
            stroke="${strokeColor}" 
            stroke-width="${strokeWidth}" 
            filter="url(#marker-shadow)"/>
      <circle cx="19" cy="17" r="10.5" fill="#ffffff" opacity="0.96"/>
      <text x="19" y="21.5" 
            font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
            font-size="12px" 
            font-weight="800" 
            fill="${bgColor}" 
            text-anchor="middle">${number}</text>
    </svg>
  `;

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new window.google.maps.Size(scale, height),
    anchor: new window.google.maps.Point(scale / 2, height),
  };
}

/**
 * Generates official Google Maps Universal Directions URL.
 * Requests driving directions from the user's current location to the destination's exact coordinates.
 */
export function getGoogleMapsDirectionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  stops = [],
  activeStopId = null,
  onSelectStop,
  onRemoveStop,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersMapRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const prevStopsCountRef = useRef<number>(0);

  const [status, setStatus] = useState<MapLoadingStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [currentTheme, setCurrentTheme] = useState<MapThemeType>('dark');
  const [showThemeMenu, setShowThemeMenu] = useState<boolean>(false);

  // Initialize and render real Google Map
  const initMap = useCallback(async () => {
    if (!isGoogleMapsConfigured()) {
      setStatus('missing_key');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      const mapsLib = await loadGoogleMaps();

      if (!mapContainerRef.current) return;

      // Clean up previous listeners if re-initializing
      if (mapInstanceRef.current && window.google?.maps) {
        window.google.maps.event.clearInstanceListeners(mapInstanceRef.current);
        mapInstanceRef.current = null;
      }

      // Create new real Google Map instance using official library
      const map = new mapsLib.Map(mapContainerRef.current, {
        center: MUMBAI_CENTER,
        zoom: DEFAULT_ZOOM,
        minZoom: 9,
        maxZoom: 19,
        mapTypeId: 'roadmap',
        styles: currentTheme === 'dark' ? ROUTEWISE_DARK_MAP_STYLE : undefined,
        disableDefaultUI: false,
        zoomControl: false, // Powered by custom toolbar
        mapTypeControl: false, // Powered by custom toolbar
        streetViewControl: true,
        fullscreenControl: false,
        gestureHandling: 'greedy',
      });

      mapInstanceRef.current = map;

      // Initialize single reusable InfoWindow
      infoWindowRef.current = new window.google.maps.InfoWindow({
        disableAutoPan: false,
      });

      setStatus('ready');
    } catch (err: unknown) {
      console.error('[RouteWise Map] Failed to load Google Maps:', err);
      const errorObj = err as { message?: string };
      if (errorObj?.message === 'MISSING_API_KEY') {
        setStatus('missing_key');
      } else {
        setStatus('error');
        setErrorMessage(
          'Google Maps could not be initialized. Please check your network connection and ensure your Google Maps API key has the Maps JavaScript API enabled.'
        );
      }
    }
  }, [currentTheme]);

  // Initial load effect
  useEffect(() => {
    initMap();

    // Intercept Google Maps runtime console errors (such as ApiNotActivatedMapError)
    const originalConsoleError = console.error;
    console.error = (...args: unknown[]) => {
      const text = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
      if (text.includes('ApiNotActivatedMapError')) {
        setStatus('error');
        setErrorMessage(
          'Maps JavaScript API is not activated on your Google Cloud project. To render interactive map tiles and markers, please enable the "Maps JavaScript API" in your Google Cloud Console.'
        );
      } else if (text.includes('BillingNotEnabledMapError')) {
        setStatus('error');
        setErrorMessage(
          'Billing is not enabled on your Google Cloud project. Please attach a billing account in Google Cloud Console to render map tiles.'
        );
      }
      originalConsoleError.apply(console, args);
    };

    // Listen for Google Maps runtime auth rejection
    const unsubscribeAuthFailure = onGoogleMapsAuthFailure((msg) => {
      setStatus('error');
      setErrorMessage(msg);
    });

    // Handle responsive container resize
    const handleResize = () => {
      if (mapInstanceRef.current && window.google?.maps) {
        window.google.maps.event.trigger(mapInstanceRef.current, 'resize');
      }
    };
    window.addEventListener('resize', handleResize);

    // Automatically detect container element dimensions change (tab switches, responsive devtools, rotations)
    let resizeObserver: ResizeObserver | null = null;
    if (mapContainerRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      console.error = originalConsoleError;
      unsubscribeAuthFailure();
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      // Clean up markers
      markersMapRef.current.forEach((marker) => marker.setMap(null));
      markersMapRef.current.clear();
      if (mapInstanceRef.current && window.google?.maps) {
        window.google.maps.event.clearInstanceListeners(mapInstanceRef.current);
        mapInstanceRef.current = null;
      }
    };
  }, [initMap]);

  // Opens the InfoWindow for a given stop on its marker
  const openInfoWindowForStop = useCallback(
    (stop: SelectedStop, marker: google.maps.Marker, stopIndex: number) => {
      if (!infoWindowRef.current || !mapInstanceRef.current) return;

      const badgeLabel =
        stopIndex === 0
          ? 'Stop 1 (Start)'
          : stopIndex === stops.length - 1 && stops.length > 1
          ? `Stop ${stopIndex + 1} (End)`
          : `Stop ${stopIndex + 1}`;

      const destLat = stop.coordinates.lat;
      const destLng = stop.coordinates.lng;
      const navUrl = getGoogleMapsDirectionsUrl(destLat, destLng);

      const content = document.createElement('div');
      content.style.fontFamily = "'Plus Jakarta Sans', system-ui, sans-serif";
      content.style.padding = '8px 4px 6px 4px';
      content.style.maxWidth = '240px';
      content.style.color = '#0f172a';

      // Header row containing stop badge and category
      const headerRow = document.createElement('div');
      headerRow.style.cssText =
        'display:flex; align-items:center; gap:6px; margin-bottom:5px; padding-right:26px;';

      const badgesContainer = document.createElement('div');
      badgesContainer.style.cssText = 'display:flex; align-items:center; gap:6px; min-width:0;';
      badgesContainer.innerHTML = `
        <span style="background:#4f46e5; color:#ffffff; font-size:10px; font-weight:800; padding:2px 7px; border-radius:999px; white-space:nowrap;">
          ${badgeLabel}
        </span>
        <span style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          ${stop.category || 'Landmark'}
        </span>
      `;
      headerRow.appendChild(badgesContainer);
      content.appendChild(headerRow);

      // Destination Name and Address
      const infoBody = document.createElement('div');
      infoBody.innerHTML = `
        <h4 style="margin:0 0 3px 0; font-size:13px; font-weight:700; color:#0f172a; line-height:1.3;">
          ${stop.name}
        </h4>
        <p style="margin:0 0 8px 0; font-size:11px; color:#475569; line-height:1.4;">
          ${stop.shortAddress || stop.address}
        </p>
      `;
      content.appendChild(infoBody);

      // Footer row containing Remove Stop button (left) and Google Maps Pin logo (bottom-right)
      const footerRow = document.createElement('div');
      footerRow.style.cssText =
        'display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:6px; padding-top:4px;';

      // Remove button inside InfoWindow
      const removeBtn = document.createElement('button');
      removeBtn.innerText = 'Remove Stop';
      removeBtn.setAttribute('data-testid', 'remove-stop-btn');
      removeBtn.style.cssText =
        'font-size:10px; font-weight:600; color:#ef4444; background:#fee2e2; border:none; padding:3px 8px; border-radius:6px; cursor:pointer; transition:background-color 0.15s ease;';
      removeBtn.onmouseover = () => {
        removeBtn.style.backgroundColor = '#fecaca';
      };
      removeBtn.onmouseout = () => {
        removeBtn.style.backgroundColor = '#fee2e2';
      };
      removeBtn.onclick = () => {
        infoWindowRef.current?.close();
        onRemoveStop?.(stop.id);
      };
      footerRow.appendChild(removeBtn);

      // Google Maps Pin logo navigation link on the bottom-right
      const navLink = document.createElement('a');
      navLink.href = navUrl;
      navLink.target = '_blank';
      navLink.rel = 'noopener noreferrer';
      navLink.title = 'Navigate with Google Maps';
      navLink.setAttribute('aria-label', 'Navigate with Google Maps');
      navLink.setAttribute('data-testid', 'gmaps-nav-button');
      navLink.className = 'gmaps-nav-btn';
      navLink.style.cssText = `
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 26px;
        height: 26px;
        border-radius: 7px;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        text-decoration: none;
        flex-shrink: 0;
        cursor: pointer;
        padding: 2px;
        transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
      `;
      navLink.innerHTML = `
        <img 
          src="${googleMapsPinIcon || '/google-maps-pin.png'}" 
          alt="Navigate with Google Maps" 
          style="width: 20px; height: 20px; object-fit: contain; display: block;"
        />
      `;
      navLink.onmouseover = () => {
        navLink.style.borderColor = '#93c5fd';
        navLink.style.boxShadow = '0 3px 6px rgba(0, 0, 0, 0.14)';
        navLink.style.transform = 'scale(1.12)';
      };
      navLink.onmouseout = () => {
        navLink.style.borderColor = '#e2e8f0';
        navLink.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.08)';
        navLink.style.transform = 'scale(1)';
      };
      navLink.onclick = (e: MouseEvent) => {
        e.stopPropagation();
        if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
          e.preventDefault();
          window.open(navUrl, '_blank', 'noopener,noreferrer');
        }
      };
      footerRow.appendChild(navLink);

      content.appendChild(footerRow);

      infoWindowRef.current.setContent(content);
      infoWindowRef.current.open({
        anchor: marker,
        map: mapInstanceRef.current,
        shouldFocus: false,
      });
    },
    [stops.length, onRemoveStop]
  );

  // Synchronize Numbered Markers with `stops` state
  useEffect(() => {
    if (!mapInstanceRef.current || status !== 'ready' || !window.google?.maps) return;

    const map = mapInstanceRef.current;
    const currentStopIds = new Set(stops.map((s) => s.id));

    // 1. Remove markers that are no longer in `stops`
    markersMapRef.current.forEach((marker, id) => {
      if (!currentStopIds.has(id)) {
        marker.setMap(null);
        window.google.maps.event.clearInstanceListeners(marker);
        markersMapRef.current.delete(id);
      }
    });

    // 2. Create or update markers with updated sequential numbering
    stops.forEach((stop, index) => {
      const isSelected = stop.id === activeStopId;
      const isFirst = index === 0;
      const isLast = index === stops.length - 1;
      const icon = createNumberedMarkerIcon(
        index + 1,
        isSelected,
        isFirst,
        isLast,
        stops.length
      );

      let marker = markersMapRef.current.get(stop.id);

      if (!marker) {
        marker = new window.google.maps.Marker({
          position: stop.coordinates,
          map,
          title: `${index + 1}. ${stop.name}`,
          icon,
          zIndex: isSelected ? 9999 : index + 100,
          animation: window.google.maps.Animation.DROP,
        });

        const currentMarker = marker;
        currentMarker.addListener('click', () => {
          onSelectStop?.(stop.id);
          openInfoWindowForStop(stop, currentMarker, index);
        });

        markersMapRef.current.set(stop.id, currentMarker);
      } else {
        marker.setPosition(stop.coordinates);
        marker.setTitle(`${index + 1}. ${stop.name}`);
        marker.setIcon(icon);
        marker.setZIndex(isSelected ? 9999 : index + 100);
      }

      // If this marker is selected, open InfoWindow
      if (isSelected && marker) {
        openInfoWindowForStop(stop, marker, index);
      }
    });

    // 3. Handle Map Pan / Bounds on destination add / clear
    const prevCount = prevStopsCountRef.current;
    const currentCount = stops.length;

    if (currentCount > prevCount && currentCount > 0) {
      // A new destination was just added: pan map toward it
      const latestStop = stops[stops.length - 1];
      map.panTo(latestStop.coordinates);
      const currZoom = map.getZoom() || DEFAULT_ZOOM;
      if (currZoom < 13) {
        map.setZoom(13);
      }
      const latestMarker = markersMapRef.current.get(latestStop.id);
      if (latestMarker) {
        openInfoWindowForStop(latestStop, latestMarker, stops.length - 1);
      }
    } else if (currentCount === 0 && prevCount > 0) {
      // Itinerary cleared: close InfoWindow and reset to Mumbai center
      infoWindowRef.current?.close();
      map.panTo(MUMBAI_CENTER);
      map.setZoom(DEFAULT_ZOOM);
    }

    prevStopsCountRef.current = currentCount;
  }, [stops, activeStopId, status, onSelectStop, openInfoWindowForStop]);

  // Toolbar Actions
  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      const currentZoom = mapInstanceRef.current.getZoom() || DEFAULT_ZOOM;
      mapInstanceRef.current.setZoom(currentZoom + 1);
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      const currentZoom = mapInstanceRef.current.getZoom() || DEFAULT_ZOOM;
      mapInstanceRef.current.setZoom(currentZoom - 1);
    }
  };

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo(MUMBAI_CENTER);
      mapInstanceRef.current.setZoom(DEFAULT_ZOOM);
    }
  };

  /**
   * Adjusts the map bounds to include every selected destination
   */
  const handleFitAllDestinations = () => {
    if (!mapInstanceRef.current || !window.google?.maps) return;

    if (stops.length === 0) {
      handleRecenter();
      return;
    }

    if (stops.length === 1) {
      mapInstanceRef.current.panTo(stops[0].coordinates);
      mapInstanceRef.current.setZoom(14);
      return;
    }

    const bounds = new window.google.maps.LatLngBounds();
    stops.forEach((stop) => {
      bounds.extend(stop.coordinates);
    });

    mapInstanceRef.current.fitBounds(bounds, {
      top: 75,
      right: 75,
      bottom: 75,
      left: 75,
    });

    // Prevent excessive zoom-in if all markers are close together
    const listener = window.google.maps.event.addListenerOnce(
      mapInstanceRef.current,
      'idle',
      () => {
        if (mapInstanceRef.current && (mapInstanceRef.current.getZoom() || 0) > 16) {
          mapInstanceRef.current.setZoom(15);
        }
      }
    );
    setTimeout(() => {
      if (listener && window.google?.maps) {
        window.google.maps.event.removeListener(listener);
      }
    }, 1000);
  };

  const handleThemeChange = (theme: MapThemeType) => {
    setCurrentTheme(theme);
    setShowThemeMenu(false);

    if (!mapInstanceRef.current) return;

    if (theme === 'satellite') {
      mapInstanceRef.current.setMapTypeId('hybrid');
      mapInstanceRef.current.setOptions({ styles: [] });
    } else if (theme === 'roadmap') {
      mapInstanceRef.current.setMapTypeId('roadmap');
      mapInstanceRef.current.setOptions({ styles: [] });
    } else {
      mapInstanceRef.current.setMapTypeId('roadmap');
      mapInstanceRef.current.setOptions({ styles: ROUTEWISE_DARK_MAP_STYLE });
    }
  };

  const activeStop = stops.find((s) => s.id === activeStopId);

  return (
    <div className="relative w-full h-full min-h-0 flex-1 bg-slate-950 overflow-hidden select-none">
      {/* Real Google Maps Mounting DOM Container */}
      <div 
        ref={mapContainerRef} 
        id="google-map"
        className="absolute inset-0 w-full h-full"
        style={{ width: '100%', height: '100%', minHeight: '100%' }}
      />

      {/* --- UI State 1: Loading State --- */}
      {status === 'loading' && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center z-30 text-slate-100">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-400 p-0.5 shadow-2xl shadow-indigo-500/25 mb-4 animate-pulse">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Compass className="w-7 h-7 text-cyan-400 animate-[spin_4s_linear_infinite]" />
            </div>
          </div>
          <h3 className="font-bold text-base text-white tracking-wide">Loading Mumbai Interactive Map</h3>
          <p className="text-xs text-slate-400 mt-1">Connecting to Google Maps JavaScript API...</p>
        </div>
      )}

      {/* --- UI State 2: Missing API Key Configuration Banner --- */}
      {status === 'missing_key' && (
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 z-30">
          <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-100">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Google Maps API Key Required</h3>
                <p className="text-xs text-slate-400">Stage 4: Destination Search & Numbered Markers</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              To display the interactive Google Map and search places in Mumbai, configure your Google Cloud API key in your environment file:
            </p>

            <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 font-mono text-xs text-cyan-300 mb-5 overflow-x-auto select-all">
              VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={initMap}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs py-2.5 px-4 rounded-xl shadow-lg transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Connection</span>
              </button>
              <a
                href="https://console.cloud.google.com/google/maps-apis/overview"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 py-2.5 px-4 rounded-xl border border-slate-700 transition"
              >
                <span>Console</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* --- UI State 3: Error / Network Failure State --- */}
      {status === 'error' && (
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 z-30">
          <div className="max-w-md w-full bg-slate-900 border border-rose-500/30 rounded-3xl p-6 shadow-2xl text-slate-100">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Google Maps Error</h3>
                <p className="text-xs text-rose-400">Authentication or Network Error</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-5">
              {errorMessage || 'Google Maps failed to load. Please verify your API key restrictions and billing settings in Google Cloud Console.'}
            </p>

            <div className="flex items-center gap-2.5">
              <button
                onClick={initMap}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs py-2.5 px-3 rounded-xl border border-slate-700 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Map</span>
              </button>
              <a
                href="https://console.cloud.google.com/apis/library/maps-backend.googleapis.com"
                target="_blank"
                rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs py-2.5 px-3 rounded-xl shadow-lg transition"
              >
                <span>Enable Maps API</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* --- UI State 4: Ready State Overlays & Toolbar --- */}
      {status === 'ready' && (
        <>
          {/* Top-Left HUD Info Pill */}
          <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 pointer-events-auto max-w-[calc(100vw-110px)] sm:max-w-none">
            <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-1.5 sm:px-3.5 sm:py-2 shadow-xl flex items-center space-x-2 sm:space-x-2.5">
              <div className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
              <div className="text-xs min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white text-xs truncate">
                    {stops.length === 0 ? 'Mumbai Map' : `${stops.length} Selected Stops`}
                  </span>
                  {stops.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30 flex-shrink-0">
                      Live
                    </span>
                  )}
                </div>
                <div className="text-[10px] sm:text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 min-w-0">
                  <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-cyan-400 flex-shrink-0" />
                  <span className="truncate max-w-[130px] sm:max-w-[200px]">
                    {activeStop ? activeStop.name : 'Mumbai (19.0760° N, 72.8777° E)'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Top-Right Custom Map Toolbar */}
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 flex flex-col space-y-1 sm:space-y-1.5 bg-slate-900/90 backdrop-blur-md p-1 sm:p-1.5 rounded-xl border border-slate-800 shadow-xl pointer-events-auto">
            {/* Zoom In */}
            <button
              onClick={handleZoomIn}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition"
              title="Zoom In"
              aria-label="Zoom in"
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* Zoom Out */}
            <button
              onClick={handleZoomOut}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition"
              title="Zoom Out"
              aria-label="Zoom out"
            >
              <Minus className="w-4 h-4" />
            </button>

            <div className="h-px bg-slate-800 my-1" />

            {/* Fit All Destinations */}
            {stops.length > 0 && (
              <button
                onClick={handleFitAllDestinations}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-indigo-400 hover:text-white hover:bg-indigo-600 transition"
                title={`Fit All ${stops.length} Destinations`}
                aria-label="Fit all destinations"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Re-centre on Mumbai */}
            <button
              onClick={handleRecenter}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-cyan-400 hover:bg-slate-800 transition"
              title="Re-centre on Mumbai (19.0760, 72.8777)"
              aria-label="Re-centre on Mumbai"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Toggle Map Types */}
            <div className="relative">
              <button
                onClick={() => setShowThemeMenu(!showThemeMenu)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${
                  showThemeMenu 
                    ? 'text-cyan-400 bg-slate-800' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title="Change Map View Type"
                aria-label="Toggle map layer style"
              >
                <Layers className="w-3.5 h-3.5" />
              </button>

              {/* Map Type Dropdown */}
              {showThemeMenu && (
                <div 
                  className="absolute right-10 top-0 w-36 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl py-1 text-xs text-slate-200 z-30"
                  onMouseLeave={() => setShowThemeMenu(false)}
                >
                  <button
                    onClick={() => handleThemeChange('dark')}
                    className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-slate-800 transition ${
                      currentTheme === 'dark' ? 'text-cyan-400 font-bold' : ''
                    }`}
                  >
                    <span>RouteWise Dark</span>
                    {currentTheme === 'dark' && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                  </button>
                  <button
                    onClick={() => handleThemeChange('roadmap')}
                    className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-slate-800 transition ${
                      currentTheme === 'roadmap' ? 'text-cyan-400 font-bold' : ''
                    }`}
                  >
                    <span>Standard Road</span>
                    {currentTheme === 'roadmap' && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                  </button>
                  <button
                    onClick={() => handleThemeChange('satellite')}
                    className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-slate-800 transition ${
                      currentTheme === 'satellite' ? 'text-cyan-400 font-bold' : ''
                    }`}
                  >
                    <span>Satellite Hybrid</span>
                    {currentTheme === 'satellite' && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Floating "Fit All Stops" Bar when multiple destinations exist */}
          {stops.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
              <button
                onClick={handleFitAllDestinations}
                className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-slate-900/90 hover:bg-slate-850 backdrop-blur-md text-[11px] sm:text-xs font-semibold text-slate-200 hover:text-white border border-slate-700/80 shadow-2xl transition hover:scale-[1.02] whitespace-nowrap"
              >
                <Navigation className="w-3.5 h-3.5 text-indigo-400" />
                <span>Fit All {stops.length} Destinations</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
