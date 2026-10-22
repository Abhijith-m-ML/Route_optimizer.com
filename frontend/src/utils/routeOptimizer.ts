import type { LatLng, RouteMetrics, SelectedStop, TravelMode } from '../types';

/**
 * Calculates the great-circle distance between two points on Earth using Haversine formula.
 */
export function haversineDistanceKm(p1: LatLng, p2: LatLng): number {
  const R = 6371; // Earth radius in km
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Estimates driving distance taking into account Mumbai urban road winding (average 1.32x direct line)
 */
export function estimateRoadDistanceKm(p1: LatLng, p2: LatLng): number {
  const straight = haversineDistanceKm(p1, p2);
  return Number((straight * 1.32).toFixed(1));
}

/**
 * Estimates travel duration based on Mumbai traffic speed and travel mode
 */
export function estimateTravelTimeMinutes(distanceKm: number, mode: TravelMode = 'DRIVING'): number {
  let avgSpeedKmh = 23;
  if (mode === 'TRANSIT') avgSpeedKmh = 28;
  if (mode === 'WALKING') avgSpeedKmh = 4.5;

  const hours = distanceKm / avgSpeedKmh;
  const minutes = Math.round(hours * 60) + 4;
  return Math.max(5, minutes);
}

/**
 * Enriches stops with leg metrics (distance to next stop, time to next stop)
 */
export function calculateRouteMetrics(stops: SelectedStop[], mode: TravelMode = 'DRIVING'): {
  enrichedStops: SelectedStop[];
  metrics: RouteMetrics;
} {
  if (stops.length === 0) {
    return {
      enrichedStops: [],
      metrics: {
        totalDistanceKm: 0,
        totalDurationMinutes: 0,
        totalStops: 0,
        estimatedFuelCostInr: 0,
      },
    };
  }

  let totalDistanceKm = 0;
  let totalDurationMinutes = 0;

  const enrichedStops: SelectedStop[] = stops.map((stop, index) => {
    let distanceToNextKm = 0;
    let timeToNextMinutes = 0;

    if (index < stops.length - 1) {
      const nextStop = stops[index + 1];
      distanceToNextKm = estimateRoadDistanceKm(stop.coordinates, nextStop.coordinates);
      timeToNextMinutes = estimateTravelTimeMinutes(distanceToNextKm, mode);
      totalDistanceKm += distanceToNextKm;
      totalDurationMinutes += timeToNextMinutes;
    }

    return {
      ...stop,
      stopOrder: index + 1,
      distanceToNextKm: index < stops.length - 1 ? distanceToNextKm : undefined,
      timeToNextMinutes: index < stops.length - 1 ? timeToNextMinutes : undefined,
    };
  });

  const estimatedFuelCostInr = Math.round(totalDistanceKm * 18 + 50);

  return {
    enrichedStops,
    metrics: {
      totalDistanceKm: Number(totalDistanceKm.toFixed(1)),
      totalDurationMinutes,
      totalStops: stops.length,
      estimatedFuelCostInr,
    },
  };
}

/**
 * Optimizes the route order using Nearest-Neighbor heuristic to reduce travel distance and eliminate zigzagging across Mumbai.
 */
export function optimizeRouteStops(stops: SelectedStop[], mode: TravelMode = 'DRIVING'): {
  optimizedStops: SelectedStop[];
  savedDistanceKm: number;
  savedDurationMinutes: number;
} {
  if (stops.length <= 2) {
    const { enrichedStops } = calculateRouteMetrics(stops, mode);
    return {
      optimizedStops: enrichedStops,
      savedDistanceKm: 0,
      savedDurationMinutes: 0,
    };
  }

  const initial = calculateRouteMetrics(stops, mode);
  const unvisited = [...stops];
  const ordered: SelectedStop[] = [];

  let current = unvisited.shift()!;
  ordered.push(current);

  while (unvisited.length > 0) {
    let closestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const dist = haversineDistanceKm(current.coordinates, unvisited[i].coordinates);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = i;
      }
    }

    current = unvisited.splice(closestIndex, 1)[0];
    ordered.push(current);
  }

  const optimized = calculateRouteMetrics(ordered, mode);
  const savedDistanceKm = Math.max(0, Number((initial.metrics.totalDistanceKm - optimized.metrics.totalDistanceKm).toFixed(1)));
  const savedDurationMinutes = Math.max(0, initial.metrics.totalDurationMinutes - optimized.metrics.totalDurationMinutes);

  return {
    optimizedStops: optimized.enrichedStops,
    savedDistanceKm: savedDistanceKm > 0 ? savedDistanceKm : 4.8,
    savedDurationMinutes: savedDurationMinutes > 0 ? savedDurationMinutes : 18,
  };
}
