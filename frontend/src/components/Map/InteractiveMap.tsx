import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';

// Configure official MapLibre Web Worker bundled via Vite to prevent worker loading failures
try {
  setWorkerUrl(workerUrl);
} catch (workerErr) {
  console.warn('[MapLibre] Worker URL configuration warning:', workerErr);
}
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
  Navigation,
  X,
  Trash2,
  Flag
} from 'lucide-react';
import { 
  getGeoapifyMapStyleUrl, 
  isGeoapifyConfigured, 
  geoapifyCalculateRoute 
} from '../../services/geoapifyService';
import { useTheme } from '../../context/ThemeContext';
import type { SelectedStop, TravelMode } from '../../types';
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
  travelMode?: TravelMode;
  onSelectStop?: (id: string) => void;
  onRemoveStop?: (id: string) => void;
  onSetAsStart?: (id: string) => void;
}

/**
 * Creates high-DPI numbered teardrop SVG marker markup
 */
function getNumberedMarkerSvg(
  number: number,
  isSelected: boolean,
  isFirst: boolean,
  isLast: boolean,
  totalStops: number
): string {
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

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${scale}" height="${height}" viewBox="0 0 38 48" style="display:block; filter: drop-shadow(0 3px 5px rgba(0,0,0,0.45));">
      <defs>
        <filter id="marker-shadow-${number}" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#000000" flood-opacity="0.6"/>
        </filter>
      </defs>
      <path d="M19 46 C19 46 3 25 3 17 A16 16 0 0 1 35 17 C35 25 19 46 19 46 Z" 
            fill="${bgColor}" 
            stroke="${strokeColor}" 
            stroke-width="${strokeWidth}" 
            filter="url(#marker-shadow-${number})"/>
      <circle cx="19" cy="17" r="10.5" fill="#ffffff" opacity="0.96"/>
      <text x="19" y="21.5" 
            font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
            font-size="12px" 
            font-weight="800" 
            fill="${bgColor}" 
            text-anchor="middle">${number}</text>
    </svg>
  `;
}

/**
 * Backwards-compatibility wrapper for test suites verifying marker icon creation
 */
export function createNumberedMarkerIcon(
  number: number,
  isSelected: boolean,
  isFirst: boolean,
  isLast: boolean,
  totalStops: number
): { url: string; scaledSize?: { width: number; height: number }; anchor?: { x: number; y: number } } {
  const svg = getNumberedMarkerSvg(number, isSelected, isFirst, isLast, totalStops);
  const scale = isSelected ? 42 : 36;
  const height = scale + 10;

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: { width: scale, height },
    anchor: { x: scale / 2, y: height },
  };
}

/**
 * Generates official Google Maps Universal Directions URL.
 * Requests driving directions from the user's current location to the destination's exact coordinates.
 */
export function getGoogleMapsDirectionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}

const getInitialMapTheme = (): MapThemeType => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('vazhikatti_map_theme');
      if (saved === 'dark' || saved === 'roadmap' || saved === 'satellite') {
        return saved as MapThemeType;
      }
    } catch {}
  }
  return 'roadmap'; // White / standard Google Maps on initial open
};

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  stops = [],
  activeStopId = null,
  travelMode = 'DRIVING',
  onSelectStop,
  onRemoveStop,
  onSetAsStart,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const markersMapRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const prevStopsCountRef = useRef<number>(0);

  const { isDark } = useTheme();
  const [status, setStatus] = useState<MapLoadingStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [currentTheme, setCurrentTheme] = useState<MapThemeType>(getInitialMapTheme);
  const currentThemeRef = useRef<MapThemeType>(currentTheme);
  const [showThemeMenu, setShowThemeMenu] = useState<boolean>(false);
  const [mobileSelectedStop, setMobileSelectedStop] = useState<{ stop: SelectedStop; index: number } | null>(null);
  const userClickedStopIdRef = useRef<string | null>(null);
  const isMarkerClickedRef = useRef<boolean>(false);
  const currentRouteGeoJsonRef = useRef<any>(null);
  const failsafeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialThemeMountRef = useRef<boolean>(true);

  // Guarantees the map loading overlay is dismissed and never blocks user interaction
  useEffect(() => {
    if (status !== 'loading') return;
    const timer = setTimeout(() => {
      setStatus('ready');
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.resize();
        } catch {}
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [status]);

  // Synchronize mobileSelectedStop with activeStopId only upon explicit user interaction
  useEffect(() => {
    if (!activeStopId || stops.length === 0 || userClickedStopIdRef.current !== activeStopId) {
      setMobileSelectedStop(null);
      return;
    }
    const idx = stops.findIndex((s) => s.id === activeStopId);
    if (idx !== -1 && typeof window !== 'undefined' && window.innerWidth < 1024) {
      setMobileSelectedStop({ stop: stops[idx], index: idx });
    } else if (idx === -1) {
      setMobileSelectedStop(null);
    }
  }, [activeStopId, stops]);

  // Opens the Popup for a given stop on its marker
  const openInfoWindowForStop = useCallback(
    (stop: SelectedStop, stopIndex: number) => {
      if (!mapInstanceRef.current) return;
      const map = mapInstanceRef.current;

      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }

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
      content.style.padding = '4px 2px 2px 2px';
      content.style.maxWidth = '250px';
      content.style.color = '#0f172a';

      // Header row containing stop badge
      const headerRow = document.createElement('div');
      headerRow.style.cssText =
        'display:flex; align-items:center; gap:6px; margin-bottom:5px; padding-right:16px;';

      const badgesContainer = document.createElement('div');
      badgesContainer.style.cssText = 'display:flex; align-items:center; gap:6px; min-width:0;';
      badgesContainer.innerHTML = `
        <span style="background:${stopIndex === 0 ? '#10b981' : '#4f46e5'}; color:#ffffff; font-size:10px; font-weight:800; padding:2px 7px; border-radius:999px; white-space:nowrap;">
          ${badgeLabel}
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

      // Footer row containing action buttons (left) and Google Maps Pin logo (bottom-right)
      const footerRow = document.createElement('div');
      footerRow.style.cssText =
        'display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:6px; padding-top:4px;';

      const leftActions = document.createElement('div');
      leftActions.style.cssText = 'display:flex; align-items:center; gap:6px;';

      if (stopIndex !== 0 && onSetAsStart) {
        const startBtn = document.createElement('button');
        startBtn.innerText = 'Set as Start';
        startBtn.setAttribute('data-testid', 'set-start-btn');
        startBtn.style.cssText =
          'font-size:10px; font-weight:700; color:#059669; background:#ecfdf5; border:1px solid #a7f3d0; padding:3px 8px; border-radius:6px; cursor:pointer; transition:background-color 0.15s ease;';
        startBtn.onmouseover = () => {
          startBtn.style.backgroundColor = '#d1fae5';
        };
        startBtn.onmouseout = () => {
          startBtn.style.backgroundColor = '#ecfdf5';
        };
        startBtn.onclick = () => {
          popupRef.current?.remove();
          popupRef.current = null;
          onSetAsStart(stop.id);
        };
        leftActions.appendChild(startBtn);
      }

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
        popupRef.current?.remove();
        popupRef.current = null;
        onRemoveStop?.(stop.id);
      };
      leftActions.appendChild(removeBtn);
      footerRow.appendChild(leftActions);

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

      const popup = new maplibregl.Popup({
        offset: [0, -42],
        closeButton: false,
        closeOnClick: true,
        className: 'vazhikatti-map-popup',
        maxWidth: '280px',
      })
        .setDOMContent(content)
        .setLngLat([stop.coordinates.lng, stop.coordinates.lat])
        .addTo(map);

      popupRef.current = popup;
    },
    [stops.length, onRemoveStop, onSetAsStart]
  );

  // Helper function to safely apply or update GeoJSON route line source and layers on MapLibre
  const applyRouteLineToMap = useCallback((geojson: any) => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    if (!map.isStyleLoaded()) return;

    try {
      const existingSource = map.getSource('route-line-source') as maplibregl.GeoJSONSource | undefined;
      if (existingSource) {
        existingSource.setData(geojson);
      } else {
        map.addSource('route-line-source', {
          type: 'geojson',
          data: geojson,
        });

        // Layer 1: Casing glow for contrast against all map themes
        if (!map.getLayer('route-line-casing')) {
          map.addLayer({
            id: 'route-line-casing',
            type: 'line',
            source: 'route-line-source',
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': currentThemeRef.current === 'dark' ? '#0f172a' : '#ffffff',
              'line-width': 7.5,
              'line-opacity': 0.8,
            },
          });
        }

        // Layer 2: Main crisp route line in Indigo/Blue
        if (!map.getLayer('route-line')) {
          map.addLayer({
            id: 'route-line',
            type: 'line',
            source: 'route-line-source',
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': '#4f46e5',
              'line-width': 4.5,
              'line-opacity': 0.95,
            },
          });
        }
      }
    } catch (err) {
      console.warn('[InteractiveMap] Route layer application non-fatal error:', err);
    }
  }, []);

  // Initialize MapLibre GL JS map using Geoapify OSM Bright / Dark styles
  const initMap = useCallback(() => {
    if (!isGeoapifyConfigured()) {
      setStatus('missing_key');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      if (!mapContainerRef.current) return;

      // Clean up previous instance if re-initializing
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const styleUrl = getGeoapifyMapStyleUrl(currentThemeRef.current);

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: styleUrl,
        center: [MUMBAI_CENTER.lng, MUMBAI_CENTER.lat],
        zoom: DEFAULT_ZOOM,
        minZoom: 1, // Enable full/infinite zoom out (global & national view)
        maxZoom: 20,
        attributionControl: false,
      });

      mapInstanceRef.current = map;

      let isReady = false;
      const markReady = () => {
        if (isReady) return;
        isReady = true;
        setStatus('ready');
        try {
          map.resize();
        } catch {}
        if (currentRouteGeoJsonRef.current) {
          applyRouteLineToMap(currentRouteGeoJsonRef.current);
        }
      };

      map.on('load', markReady);
      map.on('style.load', markReady);
      map.on('idle', markReady);
      map.on('render', () => {
        if (map.isStyleLoaded()) {
          markReady();
        }
      });

      // Safety failsafe timer: ensures spinner overlay never gets stuck on slow fonts/glyphs
      if (failsafeTimerRef.current) clearTimeout(failsafeTimerRef.current);
      failsafeTimerRef.current = setTimeout(() => {
        markReady();
      }, 500);

      // Force immediate initial resize measurement
      setTimeout(() => {
        try {
          map.resize();
        } catch {}
      }, 50);

      // Close popups and mobile panel on general map click
      map.on('click', () => {
        if (isMarkerClickedRef.current) return;
        if (popupRef.current) {
          popupRef.current.remove();
          popupRef.current = null;
        }
        setMobileSelectedStop(null);
        userClickedStopIdRef.current = null;
      });

      map.on('error', (e: any) => {
        console.warn('[MapLibre Map Error]:', e);
        // Do not stay stuck in loading if non-fatal tile error occurs
        markReady();
      });
    } catch (err: unknown) {
      console.error('[RouteWise Map] Failed to load MapLibre map:', err);
      setStatus('error');
      setErrorMessage(
        'The interactive map could not be initialized. Please check your network connection and verify your Geoapify configuration.'
      );
    }
  }, [applyRouteLineToMap]);

  // Initial load effect
  useEffect(() => {
    initMap();

    // Handle responsive container resize
    const handleResize = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.resize();
      }
    };
    window.addEventListener('resize', handleResize);

    let resizeObserver: ResizeObserver | null = null;
    if (mapContainerRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (failsafeTimerRef.current) {
        clearTimeout(failsafeTimerRef.current);
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      markersMapRef.current.forEach((marker) => marker.remove());
      markersMapRef.current.clear();
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [initMap]);

  // Synchronize Numbered Markers with `stops` state
  useEffect(() => {
    if (!mapInstanceRef.current || status !== 'ready') return;
    const map = mapInstanceRef.current;
    const currentStopIds = new Set(stops.map((s) => s.id));

    // 1. Remove markers that are no longer in `stops`
    markersMapRef.current.forEach((marker, id) => {
      if (!currentStopIds.has(id)) {
        marker.remove();
        markersMapRef.current.delete(id);
      }
    });

    // 2. Create or update markers with updated sequential numbering
    stops.forEach((stop, index) => {
      const isSelected = stop.id === activeStopId;
      const isFirst = index === 0;
      const isLast = index === stops.length - 1;
      const svgMarkup = getNumberedMarkerSvg(
        index + 1,
        isSelected,
        isFirst,
        isLast,
        stops.length
      );

      let marker = markersMapRef.current.get(stop.id);

      if (!marker) {
        const el = document.createElement('div');
        el.className = 'vazhikatti-marker-container';
        el.setAttribute('data-stop-id', stop.id);
        el.setAttribute('data-stop-index', String(index + 1));
        el.innerHTML = svgMarkup;

        const handleMarkerSelect = (e: Event) => {
          e.stopPropagation();
          isMarkerClickedRef.current = true;
          setTimeout(() => {
            isMarkerClickedRef.current = false;
          }, 450);

          userClickedStopIdRef.current = stop.id;
          onSelectStop?.(stop.id);

          if (typeof window !== 'undefined' && window.innerWidth < 1024) {
            if (popupRef.current) {
              popupRef.current.remove();
              popupRef.current = null;
            }
            setMobileSelectedStop({ stop, index });
            map.panTo([stop.coordinates.lng, stop.coordinates.lat], {
              offset: [0, -70],
              duration: 400,
            });
          } else {
            openInfoWindowForStop(stop, index);
          }
        };

        const stopGesturePropagation = (e: Event) => {
          e.stopPropagation();
          isMarkerClickedRef.current = true;
        };

        el.addEventListener('click', handleMarkerSelect);
        el.addEventListener('touchend', handleMarkerSelect);
        el.addEventListener('mousedown', stopGesturePropagation);
        el.addEventListener('touchstart', stopGesturePropagation);
        el.addEventListener('pointerdown', stopGesturePropagation);

        marker = new maplibregl.Marker({
          element: el,
          anchor: 'bottom',
        })
          .setLngLat([stop.coordinates.lng, stop.coordinates.lat])
          .addTo(map);

        markersMapRef.current.set(stop.id, marker);
      } else {
        marker.setLngLat([stop.coordinates.lng, stop.coordinates.lat]);
        const el = marker.getElement();
        if (el) {
          el.innerHTML = svgMarkup;
          el.setAttribute('data-stop-index', String(index + 1));
        }
      }

      // Only open popup if explicitly selected by user interaction, not on passive initial load
      if (isSelected && userClickedStopIdRef.current === stop.id) {
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
          if (popupRef.current) {
            popupRef.current.remove();
            popupRef.current = null;
          }
          setMobileSelectedStop({ stop, index });
        } else {
          openInfoWindowForStop(stop, index);
        }
      }
    });

    // Keep mobileSelectedStop in sync if list reordered
    if (mobileSelectedStop) {
      const matchIdx = stops.findIndex((s) => s.id === mobileSelectedStop.stop.id);
      if (matchIdx !== -1 && (matchIdx !== mobileSelectedStop.index || stops[matchIdx] !== mobileSelectedStop.stop)) {
        setMobileSelectedStop({ stop: stops[matchIdx], index: matchIdx });
      } else if (matchIdx === -1) {
        setMobileSelectedStop(null);
      }
    }

    // 3. Handle Map Pan / Bounds on destination add / clear
    const prevCount = prevStopsCountRef.current;
    const currentCount = stops.length;

    if (prevCount === 0 && currentCount > 1) {
      // Initial load with multiple stops: fit all stops comfortably inside viewport
      const bounds = new maplibregl.LngLatBounds();
      stops.forEach((s) => {
        bounds.extend([s.coordinates.lng, s.coordinates.lat]);
      });
      map.fitBounds(bounds, {
        padding: { top: 80, right: 30, bottom: 120, left: 30 },
        maxZoom: 14,
        duration: 0,
      });
    } else if (currentCount > prevCount && currentCount > 0) {
      // A new destination was just added: pan map toward it
      const latestStop = stops[stops.length - 1];
      map.panTo([latestStop.coordinates.lng, latestStop.coordinates.lat]);
      const currZoom = map.getZoom() || DEFAULT_ZOOM;
      if (currZoom < 13) {
        map.setZoom(13);
      }
    } else if (currentCount === 0 && prevCount > 0) {
      // Itinerary cleared: close InfoWindow and reset to Mumbai center
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
      setMobileSelectedStop(null);
      userClickedStopIdRef.current = null;
      map.panTo([MUMBAI_CENTER.lng, MUMBAI_CENTER.lat]);
      map.setZoom(DEFAULT_ZOOM);
    }

    prevStopsCountRef.current = currentCount;
  }, [stops, activeStopId, status, onSelectStop, openInfoWindowForStop]);

  // Synchronize Geoapify Multi-Stop Route Polyline
  useEffect(() => {
    if (!mapInstanceRef.current || status !== 'ready') return;
    let isCancelled = false;

    const syncRoutePolyline = async () => {
      if (stops.length < 2) {
        const emptyGeoJson = { type: 'FeatureCollection', features: [] };
        currentRouteGeoJsonRef.current = emptyGeoJson;
        applyRouteLineToMap(emptyGeoJson);
        return;
      }

      // Fallback straight lines between sequential waypoints while calculating
      const straightLineGeoJson = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: stops.map((s) => [s.coordinates.lng, s.coordinates.lat]),
            },
          },
        ],
      };

      try {
        const routeResult = await geoapifyCalculateRoute(stops, travelMode);
        if (isCancelled) return;

        if (routeResult && routeResult.geometry) {
          const liveGeoJson = {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                properties: {},
                geometry: routeResult.geometry,
              },
            ],
          };
          currentRouteGeoJsonRef.current = liveGeoJson;
          applyRouteLineToMap(liveGeoJson);
        } else {
          currentRouteGeoJsonRef.current = straightLineGeoJson;
          applyRouteLineToMap(straightLineGeoJson);
        }
      } catch (err) {
        if (!isCancelled) {
          currentRouteGeoJsonRef.current = straightLineGeoJson;
          applyRouteLineToMap(straightLineGeoJson);
        }
      }
    };

    syncRoutePolyline();

    return () => {
      isCancelled = true;
    };
  }, [stops, travelMode, status, applyRouteLineToMap]);

  // Toolbar Actions
  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut();
    }
  };

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo({
        center: [MUMBAI_CENTER.lng, MUMBAI_CENTER.lat],
        zoom: DEFAULT_ZOOM,
        duration: 800,
      });
    }
  };

  /**
   * Adjusts the map bounds to include every selected destination
   */
  const handleFitAllDestinations = () => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (stops.length === 0) {
      handleRecenter();
      return;
    }

    if (stops.length === 1) {
      map.flyTo({
        center: [stops[0].coordinates.lng, stops[0].coordinates.lat],
        zoom: 14,
        duration: 800,
      });
      return;
    }

    const bounds = new maplibregl.LngLatBounds();
    stops.forEach((stop) => {
      bounds.extend([stop.coordinates.lng, stop.coordinates.lat]);
    });

    map.fitBounds(bounds, {
      padding: { top: 75, right: 75, bottom: 75, left: 75 },
      maxZoom: 15,
      duration: 800,
    });
  };

  const handleThemeChange = (theme: MapThemeType) => {
    setCurrentTheme(theme);
    currentThemeRef.current = theme;
    setShowThemeMenu(false);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('vazhikatti_map_theme', theme);
      } catch {}
    }

    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const styleUrl = getGeoapifyMapStyleUrl(theme);

    map.once('style.load', () => {
      if (currentRouteGeoJsonRef.current) {
        applyRouteLineToMap(currentRouteGeoJsonRef.current);
      }
      setStatus('ready');
    });

    map.setStyle(styleUrl);
  };

  // Synchronize map theme when application global theme changes (after initial map mount)
  useEffect(() => {
    if (isInitialThemeMountRef.current) {
      isInitialThemeMountRef.current = false;
      return;
    }
    const targetMapTheme: MapThemeType = isDark ? 'dark' : 'roadmap';
    if (currentTheme !== 'satellite' && currentTheme !== targetMapTheme) {
      handleThemeChange(targetMapTheme);
    }
  }, [isDark]);

  const activeStop = stops.find((s) => s.id === activeStopId);

  return (
    <div className="relative w-full h-full min-h-0 flex-1 bg-slate-950 overflow-hidden select-none">
      {/* Real MapLibre + Geoapify Mounting DOM Container */}
      <div 
        ref={mapContainerRef} 
        id="google-map"
        className="absolute inset-0 w-full h-full"
        style={{ width: '100%', height: '100%', minHeight: '100%' }}
      />

      {/* --- UI State 1: Loading State --- */}
      {status === 'loading' && (
        <div 
          onClick={() => setStatus('ready')}
          className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center z-30 text-slate-100 cursor-pointer select-none"
          title="Click to dismiss loading screen"
        >
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-400 p-0.5 shadow-2xl shadow-indigo-500/25 mb-4 animate-pulse">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Compass className="w-7 h-7 text-cyan-400 animate-[spin_4s_linear_infinite]" />
            </div>
          </div>
          <h3 className="font-bold text-base text-white tracking-wide">Loading Mumbai Interactive Map</h3>
          <p className="text-xs text-slate-400 mt-1">Connecting to Geoapify OSM Bright Map Tiles...</p>
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
                <h3 className="font-bold text-base text-white">Geoapify API Key Required</h3>
                <p className="text-xs text-slate-400">MapLibre GL JS & Geoapify Integration</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              To display the interactive map and search places, configure your Geoapify API key in your environment file:
            </p>

            <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 font-mono text-xs text-cyan-300 mb-5 overflow-x-auto select-all">
              VITE_GEOAPIFY_API_KEY=37474d11d3de48b0a71f97304ab9cff1
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
                href="https://myprojects.geoapify.com"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 py-2.5 px-4 rounded-xl border border-slate-700 transition"
              >
                <span>Geoapify Console</span>
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
                <h3 className="font-bold text-base text-white">Map Display Error</h3>
                <p className="text-xs text-rose-400">Connection or Rendering Issue</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-5">
              {errorMessage || 'The map could not be loaded. Please verify your internet connection and Geoapify API key.'}
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
                href="https://myprojects.geoapify.com"
                target="_blank"
                rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs py-2.5 px-3 rounded-xl shadow-lg transition"
              >
                <span>Geoapify Portal</span>
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
          <div className="absolute top-[max(12px,calc(env(safe-area-inset-top,0px)+8px))] left-[max(12px,calc(env(safe-area-inset-left,0px)+8px))] lg:top-4 lg:left-4 z-20 pointer-events-auto max-w-[calc(100vw-110px)] sm:max-w-none">
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

          {/* Custom Map Toolbar (Positioned below Polarsteps Settings button on mobile) */}
          <div className={`absolute top-[max(68px,calc(env(safe-area-inset-top,0px)+64px))] right-[max(12px,calc(env(safe-area-inset-right,0px)+12px))] lg:top-4 lg:right-4 z-20 flex flex-col space-y-1 sm:space-y-1.5 backdrop-blur-md p-1 sm:p-1.5 rounded-xl border shadow-xl pointer-events-auto transition-colors ${
            isDark ? 'bg-slate-900/90 border-slate-800 text-slate-300' : 'bg-white/95 border-slate-200 text-slate-800 shadow-md'
          }`}>
            {/* Zoom In */}
            <button
              onClick={handleZoomIn}
              className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 active:bg-slate-700 transition"
              title="Zoom In"
              aria-label="Zoom in"
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* Zoom Out */}
            <button
              onClick={handleZoomOut}
              className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 active:bg-slate-700 transition"
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
                className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-indigo-400 hover:text-white hover:bg-indigo-600 active:bg-indigo-700 transition"
                title={`Fit All ${stops.length} Destinations`}
                aria-label="Fit all destinations"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Re-centre on Mumbai */}
            <button
              onClick={handleRecenter}
              className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-cyan-400 hover:bg-slate-800 active:bg-slate-700 transition"
              title="Re-centre on Mumbai (19.0760, 72.8777)"
              aria-label="Re-centre on Mumbai"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Toggle Map Types */}
            <div className="relative">
              <button
                onClick={() => setShowThemeMenu(!showThemeMenu)}
                className={`w-9 h-9 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition ${
                  showThemeMenu 
                    ? 'text-cyan-400 bg-slate-800' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800 active:bg-slate-700'
                }`}
                title="Change Map Style (White / Dark / Satellite)"
                aria-label="Toggle map style"
              >
                <Layers className="w-3.5 h-3.5" />
              </button>

              {/* Map Type Dropdown */}
              {showThemeMenu && (
                <div 
                  className="absolute right-10 top-0 w-44 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-xl shadow-2xl py-1 text-xs text-slate-200 z-30"
                  onMouseLeave={() => setShowThemeMenu(false)}
                >
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/80 mb-1">
                    Map Style
                  </div>
                  <button
                    onClick={() => handleThemeChange('roadmap')}
                    className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-slate-800 transition ${
                      currentTheme === 'roadmap' ? 'text-emerald-400 font-bold bg-slate-800/50' : 'text-slate-300'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-white border border-slate-400 inline-block shadow-sm" />
                      <span>White (Default)</span>
                    </span>
                    {currentTheme === 'roadmap' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                  <button
                    onClick={() => handleThemeChange('dark')}
                    className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-slate-800 transition ${
                      currentTheme === 'dark' ? 'text-indigo-400 font-bold bg-slate-800/50' : 'text-slate-300'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-indigo-400 inline-block" />
                      <span>Dark Theme</span>
                    </span>
                    {currentTheme === 'dark' && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
                  </button>
                  <button
                    onClick={() => handleThemeChange('satellite')}
                    className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-slate-800 transition ${
                      currentTheme === 'satellite' ? 'text-cyan-400 font-bold bg-slate-800/50' : 'text-slate-300'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-700 border border-emerald-400 inline-block" />
                      <span>Satellite View</span>
                    </span>
                    {currentTheme === 'satellite' && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Desktop Floating "Fit All Stops" Bar when multiple destinations exist */}
          {stops.length > 1 && (
            <div className="hidden lg:flex absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
              <button
                onClick={handleFitAllDestinations}
                className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-slate-900/90 hover:bg-slate-850 backdrop-blur-md text-[11px] sm:text-xs font-semibold text-slate-200 hover:text-white border border-slate-700/80 shadow-2xl transition hover:scale-[1.02] whitespace-nowrap"
              >
                <Navigation className="w-3.5 h-3.5 text-indigo-400" />
                <span>Fit All {stops.length} Destinations</span>
              </button>
            </div>
          )}

          {/* Mobile-Optimized Destination Detail & Action Panel (Docked cleanly above bottom nav) */}
          {mobileSelectedStop && (
            <div 
              data-testid="mobile-destination-card"
              className={`lg:hidden fixed z-50 left-[max(12px,calc(env(safe-area-inset-left,0px)+12px))] right-[max(12px,calc(env(safe-area-inset-right,0px)+12px))] sm:left-4 sm:right-auto sm:max-w-md bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px)+10px)] pointer-events-auto rounded-2xl p-3.5 shadow-2xl transition-all duration-200 animate-in slide-in-from-bottom-3 ${
                isDark
                  ? 'bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 text-white shadow-black/50'
                  : 'bg-white/95 backdrop-blur-xl border border-slate-200/90 text-slate-900 shadow-slate-900/20'
              }`}
            >
              {/* Header row: Badge, Name, Close Button */}
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full text-white flex-shrink-0 shadow-sm ${
                    mobileSelectedStop.index === 0
                      ? 'bg-emerald-600'
                      : mobileSelectedStop.index === stops.length - 1 && stops.length > 1
                      ? 'bg-rose-600'
                      : 'bg-indigo-600'
                  }`}>
                    {mobileSelectedStop.index === 0
                      ? 'Stop 1 (Start)'
                      : mobileSelectedStop.index === stops.length - 1 && stops.length > 1
                      ? `Stop ${mobileSelectedStop.index + 1} (End)`
                      : `Stop ${mobileSelectedStop.index + 1}`}
                  </span>
                  <h4 className="font-bold text-sm truncate leading-snug">
                    {mobileSelectedStop.stop.name}
                  </h4>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setMobileSelectedStop(null);
                    userClickedStopIdRef.current = null;
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 transition flex-shrink-0"
                  aria-label="Close action panel"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Subtitle / Location Row */}
              <div className="mt-1 flex items-center gap-2 text-xs">
                {(mobileSelectedStop.stop.city || mobileSelectedStop.stop.state) ? (
                  <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 min-w-0">
                    <MapPin className="w-3 h-3 text-cyan-500 dark:text-cyan-400 flex-shrink-0" />
                    <span className="truncate">
                      {mobileSelectedStop.stop.city}
                      {mobileSelectedStop.stop.state ? `, ${mobileSelectedStop.stop.state}` : ''}
                    </span>
                  </span>
                ) : mobileSelectedStop.stop.shortAddress ? (
                  <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 min-w-0">
                    <MapPin className="w-3 h-3 text-cyan-500 dark:text-cyan-400 flex-shrink-0" />
                    <span className="truncate">{mobileSelectedStop.stop.shortAddress}</span>
                  </span>
                ) : null}

                {mobileSelectedStop.index === 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex-shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                    Starting Place
                  </span>
                )}
              </div>

              {/* Additional Address Line if available */}
              {mobileSelectedStop.stop.shortAddress && (mobileSelectedStop.stop.city || mobileSelectedStop.stop.state) && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {mobileSelectedStop.stop.shortAddress}
                </p>
              )}

              {/* Action Buttons Row: Set as Start (Flag + text), Remove Stop (Trash + text), Google Maps (Logo only) */}
              <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {mobileSelectedStop.index !== 0 && onSetAsStart ? (
                    <button
                      type="button"
                      onClick={() => {
                        onSetAsStart(mobileSelectedStop.stop.id);
                        setMobileSelectedStop(null);
                        userClickedStopIdRef.current = null;
                      }}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 border border-emerald-200 dark:border-emerald-500/30 transition min-h-[44px]"
                      data-testid="set-start-btn"
                      aria-label="Set as Start"
                      title="Set as Start"
                    >
                      <Flag className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="whitespace-nowrap">Set as Start</span>
                    </button>
                  ) : mobileSelectedStop.index === 0 ? (
                    <div className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/20 min-h-[44px]">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="whitespace-nowrap">Start Point</span>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => {
                      onRemoveStop?.(mobileSelectedStop.stop.id);
                      setMobileSelectedStop(null);
                      userClickedStopIdRef.current = null;
                    }}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/20 transition min-h-[44px]"
                    data-testid="remove-stop-btn"
                    aria-label="Remove Stop"
                    title="Remove Stop"
                  >
                    <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="whitespace-nowrap">Remove Stop</span>
                  </button>
                </div>

                {/* Google Maps Button: Small button containing ONLY the official Google Maps logo */}
                <a
                  href={getGoogleMapsDirectionsUrl(
                    mobileSelectedStop.stop.coordinates.lat,
                    mobileSelectedStop.stop.coordinates.lng
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-11 h-11 flex items-center justify-center rounded-xl bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-200 dark:border-slate-300 shadow-sm transition min-h-[44px] flex-shrink-0"
                  data-testid="gmaps-nav-button"
                  aria-label="Open in Google Maps"
                  title="Open in Google Maps"
                >
                  <img
                    src={googleMapsPinIcon || '/google-maps-pin.png'}
                    alt="Google Maps"
                    className="w-5 h-5 object-contain flex-shrink-0"
                  />
                </a>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};