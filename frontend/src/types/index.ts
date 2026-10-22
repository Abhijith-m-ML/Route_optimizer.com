export interface LatLng {
  lat: number;
  lng: number;
}

export type PlaceCategory = 
  | 'heritage'
  | 'beach'
  | 'market'
  | 'food'
  | 'nature'
  | 'spiritual'
  | 'modern';

export interface PlaceSuggestion {
  placeId: string;
  primaryText: string;
  secondaryText: string;
  fullText: string;
  types?: string[];
}

export interface Destination {
  id: string;
  placeId?: string;
  name: string;
  hindiName?: string;
  category: PlaceCategory;
  description: string;
  address: string;
  shortAddress?: string;
  coordinates: LatLng;
  rating: number;
  reviewsCount: number;
  typicalVisitDurationMinutes: number;
  photoUrl: string;
  tags: string[];
  bestTimeToVisit?: string;
}

export interface SelectedStop extends Destination {
  stopOrder: number;
  customNotes?: string;
  customDurationMinutes?: number;
  distanceToNextKm?: number;
  timeToNextMinutes?: number;
}

export interface RouteMetrics {
  totalDistanceKm: number;
  totalDurationMinutes: number;
  totalStops: number;
  estimatedFuelCostInr: number;
  efficiencySavingsKm?: number;
  efficiencySavingsMinutes?: number;
}

export type TravelMode = 'DRIVING' | 'TRANSIT' | 'WALKING';

export interface TripState {
  id: string;
  title: string;
  date: string;
  travelMode: TravelMode;
  stops: SelectedStop[];
  isOptimized: boolean;
  isSaving: boolean;
  lastSavedAt: string | null;
}

export interface MPCLocation {
  id: string;
  name: string;
  address?: string;
  coordinates: LatLng;
  label?: string; // e.g. 'A', 'B', 'C', 'D'
  placeId?: string;
  category?: PlaceCategory;
}

export interface MPCDistanceResult {
  destination: MPCLocation;
  label: string;
  roadDistanceKm: number;
  straightDistanceKm: number;
  estimatedMinutes: number;
  rank: number;
  isClosest: boolean;
  differenceFromClosestKm: number;
}

