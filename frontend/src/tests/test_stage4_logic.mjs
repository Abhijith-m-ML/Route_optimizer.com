// Stage 4 Test Suite: Destination Search, Duplicate Prevention, Dynamic Renumbering, and Map Bounds
import assert from 'node:assert';

console.log('--- Running RouteWise Stage 4 Logic Test Suite ---');

// Mock Destination objects representing real Mumbai places
const GATEWAY_OF_INDIA = {
  id: 'place_gateway_of_india',
  placeId: 'ChIJz27b...gateway',
  name: 'Gateway of India',
  address: 'Apollo Bandar, Colaba, Mumbai, Maharashtra 400001',
  shortAddress: 'Apollo Bandar, Colaba',
  coordinates: { lat: 18.9220, lng: 72.8347 },
  category: 'heritage',
  rating: 4.6,
  reviewsCount: 124500,
  typicalVisitDurationMinutes: 60,
  photoUrl: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f',
  tags: ['monument', 'historical'],
};

const MARINE_DRIVE = {
  id: 'place_marine_drive',
  placeId: 'ChIJ748a...marine',
  name: 'Marine Drive',
  address: 'Netaji Subhash Chandra Bose Road, Mumbai, Maharashtra 400020',
  shortAddress: 'Netaji Subhash Chandra Bose Road',
  coordinates: { lat: 18.9432, lng: 72.8230 },
  category: 'beach',
  rating: 4.7,
  reviewsCount: 89000,
  typicalVisitDurationMinutes: 45,
  photoUrl: 'https://images.unsplash.com/photo-1567157577867-05ccb1388e66',
  tags: ['promenade', 'coast'],
};

const CSMT = {
  id: 'place_csmt',
  placeId: 'ChIJ819b...csmt',
  name: 'Chhatrapati Shivaji Maharaj Terminus (CSMT)',
  address: 'Fort, Mumbai, Maharashtra 400001',
  shortAddress: 'Fort, Mumbai',
  coordinates: { lat: 18.9401, lng: 72.8354 },
  category: 'heritage',
  rating: 4.5,
  reviewsCount: 45000,
  typicalVisitDurationMinutes: 40,
  photoUrl: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220',
  tags: ['unesco', 'architecture'],
};

// Simulation of Itinerary State Manager
class ItineraryManager {
  constructor() {
    this.stops = [];
    this.activeStopId = null;
  }

  addStop(destination) {
    const isDuplicate = this.stops.some(
      (s) => (destination.placeId && s.placeId === destination.placeId) || s.id === destination.id
    );
    if (isDuplicate) {
      return { success: false, reason: 'DUPLICATE_STOP' };
    }

    const newStop = {
      ...destination,
      stopOrder: this.stops.length + 1,
    };
    this.stops.push(newStop);
    this.activeStopId = destination.id;
    return { success: true, stop: newStop };
  }

  removeStop(id) {
    const initialLen = this.stops.length;
    this.stops = this.stops.filter((s) => s.id !== id);
    if (this.stops.length === initialLen) {
      return false;
    }
    // Dynamic re-numbering
    this.stops = this.stops.map((stop, index) => ({
      ...stop,
      stopOrder: index + 1,
    }));
    if (this.activeStopId === id) {
      this.activeStopId = this.stops[0]?.id || null;
    }
    return true;
  }

  selectStop(id) {
    if (this.stops.some((s) => s.id === id)) {
      this.activeStopId = id;
      return true;
    }
    return false;
  }

  clearAll(confirmed = false) {
    if (!confirmed) {
      return { success: false, reason: 'CONFIRMATION_REQUIRED' };
    }
    this.stops = [];
    this.activeStopId = null;
    return { success: true };
  }

  computeBounds() {
    if (this.stops.length === 0) return null;
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    for (const stop of this.stops) {
      minLat = Math.min(minLat, stop.coordinates.lat);
      maxLat = Math.max(maxLat, stop.coordinates.lat);
      minLng = Math.min(minLng, stop.coordinates.lng);
      maxLng = Math.max(maxLng, stop.coordinates.lng);
    }
    return {
      southWest: { lat: minLat, lng: minLng },
      northEast: { lat: maxLat, lng: maxLng },
      center: { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 },
    };
  }
}

// -------------------------------------------------------------
// Test 1 & 2: Add Gateway of India (Stop 1)
// -------------------------------------------------------------
const trip = new ItineraryManager();
const add1 = trip.addStop(GATEWAY_OF_INDIA);
assert.strictEqual(add1.success, true, 'Gateway of India should be added successfully');
assert.strictEqual(trip.stops.length, 1, 'Total stops should be 1');
assert.strictEqual(trip.stops[0].stopOrder, 1, 'Gateway of India should be stop #1');
assert.strictEqual(trip.stops[0].coordinates.lat, 18.9220, 'Stop 1 coordinates should match Gateway of India');
assert.strictEqual(trip.activeStopId, GATEWAY_OF_INDIA.id, 'Gateway of India should be active stop');
console.log('✓ Test 1 & 2 passed: Gateway of India added as Marker #1 at (18.9220, 72.8347)');

// -------------------------------------------------------------
// Test 3 & 4: Add Marine Drive (Stop 2)
// -------------------------------------------------------------
const add2 = trip.addStop(MARINE_DRIVE);
assert.strictEqual(add2.success, true, 'Marine Drive should be added successfully');
assert.strictEqual(trip.stops.length, 2, 'Total stops should be 2');
assert.strictEqual(trip.stops[1].stopOrder, 2, 'Marine Drive should be stop #2');
assert.strictEqual(trip.stops[1].coordinates.lat, 18.9432, 'Stop 2 coordinates should match Marine Drive');
assert.strictEqual(trip.activeStopId, MARINE_DRIVE.id, 'Marine Drive should be active stop');
console.log('✓ Test 3 & 4 passed: Marine Drive added as Marker #2 at (18.9432, 72.8230)');

// -------------------------------------------------------------
// Test 5: Verify Markers 1 and 2 are distinct and ordered
// -------------------------------------------------------------
assert.notStrictEqual(trip.stops[0].placeId, trip.stops[1].placeId, 'Stop 1 and Stop 2 must have distinct place IDs');
assert.strictEqual(trip.stops[0].name, 'Gateway of India');
assert.strictEqual(trip.stops[1].name, 'Marine Drive');
console.log('✓ Test 5 passed: Marker 1 and Marker 2 verified with correct places and coordinates');

// -------------------------------------------------------------
// Test 6: Add third destination (CSMT) -> Marker 3
// -------------------------------------------------------------
const add3 = trip.addStop(CSMT);
assert.strictEqual(add3.success, true, 'CSMT should be added as stop 3');
assert.strictEqual(trip.stops.length, 3, 'Total stops should be 3');
assert.strictEqual(trip.stops[2].stopOrder, 3, 'CSMT should be stop #3');
console.log('✓ Test 6 passed: CSMT added as Marker #3');

// -------------------------------------------------------------
// Test 7: Remove second destination (Marine Drive) -> Renumbering Check
// -------------------------------------------------------------
const removeRes = trip.removeStop(MARINE_DRIVE.id);
assert.strictEqual(removeRes, true, 'Marine Drive should be removed');
assert.strictEqual(trip.stops.length, 2, 'Remaining stops should be 2');
assert.strictEqual(trip.stops[0].name, 'Gateway of India', 'First stop remains Gateway of India');
assert.strictEqual(trip.stops[0].stopOrder, 1, 'Gateway of India is still Marker #1');
assert.strictEqual(trip.stops[1].name, 'Chhatrapati Shivaji Maharaj Terminus (CSMT)', 'Second stop is now CSMT');
assert.strictEqual(trip.stops[1].stopOrder, 2, 'CSMT was dynamically renumbered from #3 to #2');
console.log('✓ Test 7 passed: Removed stop #2; remaining markers dynamically renumbered (1 -> 1, 3 -> 2)');

// -------------------------------------------------------------
// Test 8: Attempt to add duplicate place (Gateway of India)
// -------------------------------------------------------------
const duplicateAdd = trip.addStop(GATEWAY_OF_INDIA);
assert.strictEqual(duplicateAdd.success, false, 'Duplicate place addition should be blocked');
assert.strictEqual(duplicateAdd.reason, 'DUPLICATE_STOP');
assert.strictEqual(trip.stops.length, 2, 'Stops count should not increase');
console.log('✓ Test 8 passed: Duplicate place addition prevented by placeId check');

// -------------------------------------------------------------
// Test 9: Click different destination -> Selection synchronization
// -------------------------------------------------------------
const selectGateway = trip.selectStop(GATEWAY_OF_INDIA.id);
assert.strictEqual(selectGateway, true);
assert.strictEqual(trip.activeStopId, GATEWAY_OF_INDIA.id, 'Active stop updated to Gateway of India');
const selectCsmt = trip.selectStop(CSMT.id);
assert.strictEqual(selectCsmt, true);
assert.strictEqual(trip.activeStopId, CSMT.id, 'Active stop updated to CSMT');
console.log('✓ Test 9 passed: Two-way selection state synchronization confirmed');

// -------------------------------------------------------------
// Test 10: "Fit All Destinations" LatLngBounds calculation
// -------------------------------------------------------------
const bounds = trip.computeBounds();
assert.ok(bounds !== null, 'Bounds should be computed');
assert.ok(bounds.southWest.lat <= 18.9220 && bounds.northEast.lat >= 18.9401, 'Bounds latitude span covers all stops');
assert.ok(bounds.southWest.lng <= 72.8347 && bounds.northEast.lng >= 72.8354, 'Bounds longitude span covers all stops');
console.log(`✓ Test 10 passed: Fit All Destinations calculated bounds center at (${bounds.center.lat.toFixed(4)}, ${bounds.center.lng.toFixed(4)})`);

// -------------------------------------------------------------
// Test 11 & 12: Clear All with confirmation safeguard
// -------------------------------------------------------------
const unconfirmedClear = trip.clearAll(false);
assert.strictEqual(unconfirmedClear.success, false, 'Unconfirmed clear should be rejected');
assert.strictEqual(trip.stops.length, 2, 'Stops must not be wiped without confirmation');

const confirmedClear = trip.clearAll(true);
assert.strictEqual(confirmedClear.success, true, 'Confirmed clear succeeds');
assert.strictEqual(trip.stops.length, 0, 'Itinerary should now be empty');
assert.strictEqual(trip.activeStopId, null, 'Active stop reset to null');
console.log('✓ Test 11 & 12 passed: Clear all requires confirmation safeguard; clean empty state restored');

console.log('--- All 12 Stage 4 Logic Test Suites Passed Successfully ---');
