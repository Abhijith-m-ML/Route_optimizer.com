import assert from 'node:assert';

// Mock localStorage for Node test environment
class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

globalThis.localStorage = new MockLocalStorage();

const STORAGE_PREFIX = 'routewise_saved_trip_';
const GLOBAL_STORAGE_KEY = 'routewise_saved_trip';

function saveTrip(tripData, userId) {
  const trip = {
    id: 'trip_' + (userId ? `${userId.toLowerCase()}_` : '') + Date.now(),
    title: tripData.title || 'Mumbai Highlights Explorer',
    travelMode: tripData.travelMode || 'DRIVING',
    stops: tripData.stops || [],
    lastSavedAt: tripData.lastSavedAt,
    updatedAt: new Date().toISOString(),
    userId: userId || undefined,
  };
  const serialized = JSON.stringify(trip);
  if (userId) {
    localStorage.setItem(`${STORAGE_PREFIX}${userId.toLowerCase()}`, serialized);
  }
  localStorage.setItem(GLOBAL_STORAGE_KEY, serialized);
  return trip;
}

function getSavedTrip(userId) {
  const userKey = userId ? `${STORAGE_PREFIX}${userId.toLowerCase()}` : null;
  let raw = userKey ? localStorage.getItem(userKey) : null;
  if (!raw) {
    raw = localStorage.getItem(GLOBAL_STORAGE_KEY);
  }
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearSavedTrip(userId) {
  if (userId) {
    localStorage.removeItem(`${STORAGE_PREFIX}${userId.toLowerCase()}`);
  }
  localStorage.removeItem(GLOBAL_STORAGE_KEY);
}

console.log('--- Running RouteWise Trip Persistence Logic Test Suite ---');

// Test 1: Initial state before any save is null
assert.strictEqual(getSavedTrip('PLUCK'), null, 'Initial trip must be null before save');
console.log('✓ Initial trip state verified');

// Test 2: Add destinations and save trip
const sampleStops = [
  {
    id: 'gateway-of-india',
    name: 'Gateway of India',
    coordinates: { lat: 18.922, lng: 72.8347 },
    category: 'LANDMARK',
    stopOrder: 1,
  },
  {
    id: 'marine-drive',
    name: 'Marine Drive',
    coordinates: { lat: 18.9432, lng: 72.823 },
    category: 'VIEWPOINT',
    stopOrder: 2,
  },
];

const saved = saveTrip(
  {
    title: 'Mumbai Coastal Tour',
    travelMode: 'DRIVING',
    stops: sampleStops,
    lastSavedAt: '01:52 AM',
  },
  'PLUCK'
);

assert.strictEqual(saved.title, 'Mumbai Coastal Tour');
assert.strictEqual(saved.stops.length, 2);
console.log('✓ Trip save executed successfully');

// Test 3: Reload / retrieve saved trip (simulating page refresh)
const retrieved = getSavedTrip('PLUCK');
assert.notStrictEqual(retrieved, null, 'Saved trip must exist after save');
assert.strictEqual(retrieved.title, 'Mumbai Coastal Tour');
assert.strictEqual(retrieved.stops.length, 2);
assert.strictEqual(retrieved.stops[0].name, 'Gateway of India');
assert.strictEqual(retrieved.stops[1].name, 'Marine Drive');
assert.strictEqual(retrieved.lastSavedAt, '01:52 AM');
console.log('✓ Simulated page refresh correctly restores trip title, stops, and saved timestamp');

// Test 4: Clear trip
clearSavedTrip('PLUCK');
const cleared = getSavedTrip('PLUCK');
assert.strictEqual(cleared, null, 'Trip must be null after reset/clear');
console.log('✓ Reset and clear itinerary properly clears storage');

console.log('--- All 4 Trip Persistence Test Suites Passed Successfully ---');
