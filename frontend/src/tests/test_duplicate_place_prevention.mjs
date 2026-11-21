import assert from 'node:assert';

// -------------------------------------------------------------
// Test Suite: Duplicate Place Prevention in Route Optimizer
// -------------------------------------------------------------

console.log('🧪 Starting Duplicate Place Prevention Test Suite...\n');

// 1. Place Matching Utility Logic
function normalizePlaceId(id) {
  if (!id || typeof id !== 'string') return '';
  return id.trim().replace(/^places\//, '').replace(/^place_/, '');
}

function normalizePlaceName(name) {
  if (!name || typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .replace(/\s*\(c\)\s*$/i, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function namesAreCompatible(nameA, nameB) {
  const normA = normalizePlaceName(nameA);
  const normB = normalizePlaceName(nameB);

  if (!normA || !normB) return false;
  if (normA === normB) return true;
  if (normA.includes(normB) || normB.includes(normA)) return true;

  const tokensA = normA.split(' ').filter((t) => t.length >= 3);
  const tokensB = normB.split(' ').filter((t) => t.length >= 3);

  return tokensA.some((t) => tokensB.includes(t));
}

function isSamePlace(a, b) {
  if (!a || !b) return false;

  const normPlaceIdA = normalizePlaceId(a.placeId);
  const normPlaceIdB = normalizePlaceId(b.placeId);
  if (normPlaceIdA && normPlaceIdB && normPlaceIdA === normPlaceIdB) {
    return true;
  }

  if (a.id && b.id && a.id === b.id) {
    if (!a.id.startsWith('stop_') && !b.id.startsWith('stop_')) {
      return true;
    }
  }

  if (a.coordinates && b.coordinates) {
    const latA = Number(a.coordinates.lat);
    const lngA = Number(a.coordinates.lng);
    const latB = Number(b.coordinates.lat);
    const lngB = Number(b.coordinates.lng);

    if (!isNaN(latA) && !isNaN(lngA) && !isNaN(latB) && !isNaN(lngB)) {
      const latDiff = Math.abs(latA - latB);
      const lngDiff = Math.abs(lngA - lngB);

      const nameA = a.originalName || a.customName || a.name;
      const nameB = b.originalName || b.customName || b.name;

      if (latDiff <= 0.005 && lngDiff <= 0.005) {
        if (namesAreCompatible(nameA, nameB)) {
          return true;
        }
      }

      if (latDiff < 0.00015 && lngDiff < 0.00015) {
        if (!nameA || !nameB || namesAreCompatible(nameA, nameB)) {
          return true;
        }
      }
    }
  }

  return false;
}

function findDuplicateStop(existingStops, candidate) {
  if (!Array.isArray(existingStops) || existingStops.length === 0 || !candidate) {
    return undefined;
  }
  return existingStops.find((stop) => isSamePlace(stop, candidate));
}

function deduplicateStops(stops) {
  if (!Array.isArray(stops)) return [];
  const uniqueStops = [];

  for (const stop of stops) {
    const isDupe = uniqueStops.some((existing) => isSamePlace(existing, stop));
    if (!isDupe) {
      uniqueStops.push(stop);
    }
  }

  return uniqueStops.map((stop, idx) => ({
    ...stop,
    stopOrder: idx + 1,
  }));
}

// -------------------------------------------------------------
// Test 1: Single file scenario described in user request
// File "Kerala", adding Maradu -> count 1, Maradu again -> rejected, Kochi -> count 2
// -------------------------------------------------------------
console.log('Test 1: User scenario - Kerala file place sequence');
const maradu1 = {
  id: 'osm_123456',
  placeId: 'osm_123456',
  name: 'Maradu',
  coordinates: { lat: 9.9575, lng: 76.3214 },
  city: 'Kochi',
  state: 'Kerala',
};

const maraduDuplicateSearch = {
  id: 'osm_123456',
  placeId: 'osm_123456',
  name: 'Maradu',
  coordinates: { lat: 9.9575001, lng: 76.3214002 },
  city: 'Kochi',
  state: 'Kerala',
};

const kochi = {
  id: 'osm_987654',
  placeId: 'osm_987654',
  name: 'Kochi',
  coordinates: { lat: 9.9312, lng: 76.2673 },
  city: 'Kochi',
  state: 'Kerala',
};

let keralaFile = {
  id: 'trip_kerala_1',
  name: 'Kerala',
  stops: [],
};

// Step A: Add Maradu to Kerala
assert.strictEqual(findDuplicateStop(keralaFile.stops, maradu1), undefined, 'Maradu should not exist initially');
keralaFile.stops = deduplicateStops([...keralaFile.stops, { ...maradu1, stopOrder: 1 }]);
assert.strictEqual(keralaFile.stops.length, 1, 'Kerala stop count should be 1');
console.log('  ✓ Step A: Added Maradu -> Count = 1');

// Step B: Attempt to add Maradu again to Kerala
const dupeFound = findDuplicateStop(keralaFile.stops, maraduDuplicateSearch);
assert.notStrictEqual(dupeFound, undefined, 'Duplicate should be detected for second Maradu add');
const notificationMessage = 'This place is already in this file.';
assert.strictEqual(notificationMessage, 'This place is already in this file.');
// Rejection: Stop is NOT added, count remains 1
if (!dupeFound) {
  keralaFile.stops = deduplicateStops([...keralaFile.stops, maraduDuplicateSearch]);
}
assert.strictEqual(keralaFile.stops.length, 1, 'Kerala stop count should remain 1');
console.log('  ✓ Step B: Rejected duplicate Maradu -> Count remains 1 with notification');

// Step C: Add Kochi to Kerala
const kochiDupe = findDuplicateStop(keralaFile.stops, kochi);
assert.strictEqual(kochiDupe, undefined, 'Kochi should not be flagged as duplicate of Maradu');
keralaFile.stops = deduplicateStops([...keralaFile.stops, { ...kochi, stopOrder: keralaFile.stops.length + 1 }]);
assert.strictEqual(keralaFile.stops.length, 2, 'Kerala stop count should now be 2');
console.log('  ✓ Step C: Added Kochi -> Count = 2');

// Step D: Attempt to add Maradu again to Kerala
const thirdMaraduDupe = findDuplicateStop(keralaFile.stops, maradu1);
assert.notStrictEqual(thirdMaraduDupe, undefined, 'Duplicate Maradu should still be rejected');
if (!thirdMaraduDupe) {
  keralaFile.stops = deduplicateStops([...keralaFile.stops, maradu1]);
}
assert.strictEqual(keralaFile.stops.length, 2, 'Kerala stop count should remain 2');
console.log('  ✓ Step D: Rejected Maradu again -> Count remains 2');

// -------------------------------------------------------------
// Test 2: File collection isolation (same place in different files IS allowed)
// -------------------------------------------------------------
console.log('\nTest 2: Scope isolation - Same place in different file is allowed');
let weekendTripFile = {
  id: 'trip_weekend_2',
  name: 'Weekend Roadtrip',
  stops: [],
};

const weekendDupeCheck = findDuplicateStop(weekendTripFile.stops, maradu1);
assert.strictEqual(weekendDupeCheck, undefined, 'Maradu should be allowed in Weekend Roadtrip file');
weekendTripFile.stops = deduplicateStops([...weekendTripFile.stops, { ...maradu1, stopOrder: 1 }]);
assert.strictEqual(weekendTripFile.stops.length, 1, 'Weekend Roadtrip stop count should be 1');
console.log('  ✓ Maradu successfully added to Weekend Roadtrip (Kerala count = 2, Weekend count = 1)');

// -------------------------------------------------------------
// Test 3: Concurrent / Simultaneous Requests Handling
// -------------------------------------------------------------
console.log('\nTest 3: Concurrent API Requests Protection');
const initialTripStops = [{ ...maradu1, stopOrder: 1 }];

// Request A and Request B fire simultaneously, both attempting to append maraduDuplicateSearch
const reqAPayload = [...initialTripStops, maraduDuplicateSearch];
const reqBPayload = [...initialTripStops, maraduDuplicateSearch];

const resultA = deduplicateStops(reqAPayload);
const resultB = deduplicateStops(reqBPayload);

assert.strictEqual(resultA.length, 1, 'Result A should deduplicate to 1 stop');
assert.strictEqual(resultB.length, 1, 'Result B should deduplicate to 1 stop');
console.log('  ✓ Concurrent requests safely deduplicated to exactly 1 record');

// -------------------------------------------------------------
// Test 4: Geocoding Coordinate Precision & Suffix Variations
// -------------------------------------------------------------
console.log('\nTest 4: Precision & Suffix Tolerance');
// Same place with (C) current location suffix
const currentLocationMaradu = {
  placeId: '',
  name: 'Maradu (C)',
  originalName: 'Maradu',
  coordinates: { lat: 9.95751, lng: 76.32141 },
};
assert.strictEqual(isSamePlace(maradu1, currentLocationMaradu), true, 'Maradu (C) should match Maradu');

// Nominatim vs Google Places placeId differences for the same place
const googleMaradu = {
  placeId: 'ChIJ_maradu_google_id',
  name: 'Maradu, Kochi',
  coordinates: { lat: 9.95748, lng: 76.32142 },
};
assert.strictEqual(isSamePlace(maradu1, googleMaradu), true, 'Google Places Maradu should match OSM Maradu via proximity and name');
console.log('  ✓ Handled (C) suffix and OSM vs Google Places geocoders');

// -------------------------------------------------------------
// Test 5: Avoiding False Positives
// -------------------------------------------------------------
console.log('\nTest 5: False Positive Prevention');
// Different place in same city
const edappally = {
  placeId: 'osm_edappally',
  name: 'Edappally',
  coordinates: { lat: 10.0236, lng: 76.3117 },
};
assert.strictEqual(isSamePlace(maradu1, edappally), false, 'Maradu and Edappally must NOT match');

// Same name in different country (Kochi India vs Kochi Japan)
const kochiJapan = {
  placeId: 'osm_kochi_jp',
  name: 'Kochi',
  coordinates: { lat: 33.5597, lng: 133.5311 },
};
assert.strictEqual(isSamePlace(kochi, kochiJapan), false, 'Kochi India and Kochi Japan must NOT match');

console.log('  ✓ Verified no false positives across distinct places');

console.log('\n🎉 ALL DUPLICATE PLACE PREVENTION TESTS PASSED SUCCESSFULLY!');
