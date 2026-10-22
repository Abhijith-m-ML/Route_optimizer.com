import assert from 'node:assert';

// Haversine formula
function haversineDistanceKm(p1, p2) {
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

function estimateRoadDistanceKm(p1, p2) {
  const straight = haversineDistanceKm(p1, p2);
  return Number((straight * 1.32).toFixed(1));
}

function estimateTravelTimeMinutes(distanceKm, mode = 'DRIVING') {
  let avgSpeedKmh = 23;
  if (mode === 'TRANSIT') avgSpeedKmh = 28;
  if (mode === 'WALKING') avgSpeedKmh = 4.5;
  const hours = distanceKm / avgSpeedKmh;
  const minutes = Math.round(hours * 60) + 4;
  return Math.max(5, minutes);
}

function calculateMPCDistances(origin, destinations, mode = 'DRIVING') {
  if (!origin || destinations.length === 0) return [];

  const rawResults = destinations.map((dest, idx) => {
    const straightDist = Number(haversineDistanceKm(origin.coordinates, dest.coordinates).toFixed(2));
    const roadDist = Number(estimateRoadDistanceKm(origin.coordinates, dest.coordinates).toFixed(1));
    const mins = estimateTravelTimeMinutes(roadDist, mode);
    const assignedLabel = dest.label || String.fromCharCode(66 + idx);

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

  rawResults.sort((a, b) => a.roadDistanceKm - b.roadDistanceKm);
  const closestDistance = rawResults[0]?.roadDistanceKm || 0;

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

function generateMPCSummary(origin, results) {
  if (results.length === 0) return 'Add candidate destinations to compare distances.';
  if (results.length === 1) {
    return `${results[0].destination.name} (${results[0].label}) is ${results[0].roadDistanceKm} km from your standing place (${origin.name}).`;
  }
  const closest = results[0];
  const second = results[1];
  const diffKm = Number((second.roadDistanceKm - closest.roadDistanceKm).toFixed(1));

  return `Point ${closest.label} (${closest.destination.name}) is your NEAREST destination at ${closest.roadDistanceKm} km (~${closest.estimatedMinutes} mins). It is ${diffKm} km closer than Point ${second.label} (${second.destination.name})!`;
}

console.log('--- Running RouteWise MPC (Multi Place Calculator) Test Suite ---');

// Test 1: Origin Point A (Standing location)
const pointA = {
  id: 'point-a',
  name: 'Gateway of India',
  coordinates: { lat: 18.9220, lng: 72.8347 },
  label: 'A',
};

// Test 2: Candidates B (Marine Drive) and C (Bandra Bandstand)
const candidates = [
  {
    id: 'point-b',
    name: 'Marine Drive',
    coordinates: { lat: 18.9432, lng: 72.8230 },
    label: 'B',
  },
  {
    id: 'point-c',
    name: 'Bandra Bandstand',
    coordinates: { lat: 19.0434, lng: 72.8197 },
    label: 'C',
  },
  {
    id: 'point-d',
    name: 'CSMT Railway Terminus',
    coordinates: { lat: 18.9398, lng: 72.8355 },
    label: 'D',
  },
];

const results = calculateMPCDistances(pointA, candidates, 'DRIVING');

// Verify results count
assert.strictEqual(results.length, 3, 'Must compute distances for all 3 candidate points');
console.log('✓ Computed distance results for all candidates');

// Test 3: CSMT (lat 18.9398, lng 72.8355) is ~2.6 km from Gateway of India, Marine Drive is ~3.7 km, Bandra is ~17 km
assert.strictEqual(results[0].isClosest, true, 'Rank #1 must have isClosest = true');
assert.strictEqual(results[0].rank, 1, 'First result must be ranked #1');
assert.strictEqual(results[0].differenceFromClosestKm, 0, 'Rank #1 difference must be 0 km');
assert.ok(results[0].roadDistanceKm < results[1].roadDistanceKm, 'Rank #1 must be shorter than Rank #2');
assert.ok(results[1].roadDistanceKm < results[2].roadDistanceKm, 'Rank #2 must be shorter than Rank #3');
console.log(`✓ Nearest destination identified: Point ${results[0].label} (${results[0].destination.name}) at ${results[0].roadDistanceKm} km`);

// Test 4: Difference calculation
const expectedDiff = Number((results[1].roadDistanceKm - results[0].roadDistanceKm).toFixed(1));
assert.strictEqual(results[1].differenceFromClosestKm, expectedDiff, 'Difference from closest must be exact');
console.log(`✓ Margin calculation confirmed: Point ${results[1].label} is +${results[1].differenceFromClosestKm} km further than closest`);

// Test 5: Summary text generation
const summary = generateMPCSummary(pointA, results);
assert.ok(summary.includes('NEAREST'), 'Summary must highlight the nearest place');
assert.ok(summary.includes(results[0].destination.name), 'Summary must contain closest place name');
assert.ok(summary.includes(results[1].destination.name), 'Summary must contain second place name for comparison');
console.log('✓ Natural language summary generated:', summary);

console.log('--- All 5 MPC Test Suites Passed Successfully ---');
