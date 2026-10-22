import type { MPCLocation, MPCDistanceResult, TravelMode } from '../types';
import { haversineDistanceKm, estimateRoadDistanceKm, estimateTravelTimeMinutes } from './routeOptimizer';

export const MPC_PRESET_ORIGIN: MPCLocation = {
  id: 'mpc-origin-gateway',
  name: 'Gateway of India',
  address: 'Apollo Bandar, Colaba, Mumbai',
  coordinates: { lat: 18.9220, lng: 72.8347 },
  label: 'A',
  category: 'heritage',
};

export const MPC_PRESET_CANDIDATES: MPCLocation[] = [
  {
    id: 'mpc-cand-marine-drive',
    name: 'Marine Drive',
    address: 'Netaji Subhash Chandra Bose Road, Mumbai',
    coordinates: { lat: 18.9432, lng: 72.8230 },
    label: 'B',
    category: 'beach',
  },
  {
    id: 'mpc-cand-csmt',
    name: 'CSMT Railway Terminus',
    address: 'Chhatrapati Shivaji Maharaj Terminus, Fort, Mumbai',
    coordinates: { lat: 18.9398, lng: 72.8355 },
    label: 'C',
    category: 'heritage',
  },
  {
    id: 'mpc-cand-bandra',
    name: 'Bandra Bandstand',
    address: 'Bandstand Promenade, Bandra West, Mumbai',
    coordinates: { lat: 19.0434, lng: 72.8197 },
    label: 'D',
    category: 'modern',
  },
];

/**
 * Calculates and ranks distances from Point A (standing point) to all candidate destinations (B, C, D...)
 */
export function calculateMPCDistances(
  origin: MPCLocation,
  destinations: MPCLocation[],
  mode: TravelMode = 'DRIVING'
): MPCDistanceResult[] {
  if (!origin || destinations.length === 0) {
    return [];
  }

  // Calculate raw distances for each destination
  const rawResults = destinations.map((dest, idx) => {
    const straightDist = Number(haversineDistanceKm(origin.coordinates, dest.coordinates).toFixed(2));
    const roadDist = Number(estimateRoadDistanceKm(origin.coordinates, dest.coordinates).toFixed(1));
    const mins = estimateTravelTimeMinutes(roadDist, mode);
    const assignedLabel = dest.label || String.fromCharCode(66 + idx); // B, C, D, E...

    return {
      destination: { ...dest, label: assignedLabel },
      label: assignedLabel,
      roadDistanceKm: roadDist,
      straightDistanceKm: straightDist,
      estimatedMinutes: mins,
      rank: 1,
      isClosest: false,
      differenceFromClosestKm: 0,
    };
  });

  // Sort by road distance ascending
  rawResults.sort((a, b) => a.roadDistanceKm - b.roadDistanceKm);

  const closestDistance = rawResults[0]?.roadDistanceKm || 0;

  // Assign ranks, nearest flags, and difference margins
  return rawResults.map((item, index) => {
    const diff = Number(Math.max(0, item.roadDistanceKm - closestDistance).toFixed(1));
    return {
      ...item,
      rank: index + 1,
      isClosest: index === 0,
      differenceFromClosestKm: diff,
    };
  });
}

/**
 * Generates an intuitive natural language comparison insight
 */
export function generateMPCSummary(
  origin: MPCLocation,
  results: MPCDistanceResult[]
): string {
  if (results.length === 0) return 'Add candidate destinations to compare distances.';
  if (results.length === 1) {
    return `${results[0].destination.name} (${results[0].label}) is ${results[0].roadDistanceKm} km from your standing place (${origin.name}).`;
  }

  const closest = results[0];
  const second = results[1];

  const diffKm = Number((second.roadDistanceKm - closest.roadDistanceKm).toFixed(1));

  if (diffKm === 0) {
    return `Both ${closest.destination.name} (${closest.label}) and ${second.destination.name} (${second.label}) are equally close at ~${closest.roadDistanceKm} km.`;
  }

  return `Point ${closest.label} (${closest.destination.name}) is your NEAREST destination at ${closest.roadDistanceKm} km (~${closest.estimatedMinutes} mins). It is ${diffKm} km closer than Point ${second.label} (${second.destination.name})!`;
}
