/**
 * Test Suite: Custom Trip Collections & Multi-Trip Management System
 * Tests user-created trips, case-insensitive duplicate prevention per user,
 * multi-user isolation, editing, deletion, sharing, and importing into recipient collections.
 */

import http from 'http';
import assert from 'assert';
import app from './dist/server.js';

const PORT = 5056;
let server;

function startServer() {
  return new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(PORT, () => {
      console.log(`✓ Test server running on http://localhost:${PORT}`);
      resolve();
    });
  });
}

function stopServer() {
  return new Promise((resolve) => {
    server.close(() => {
      resolve();
    });
  });
}

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request({ ...options, port: PORT, host: 'localhost' }, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = body ? JSON.parse(body) : null;
        } catch (e) {
          parsed = body;
        }
        resolve({ status: res.statusCode, data: parsed, headers: res.headers });
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

const postJson = (path, data, token) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return request({ path, method: 'POST', headers }, data);
};

const putJson = (path, data, token) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return request({ path, method: 'PUT', headers }, data);
};

const getJson = (path, token) => {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return request({ path, method: 'GET', headers });
};

const deleteJson = (path, token) => {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return request({ path, method: 'DELETE', headers });
};

async function runTests() {
  console.log('====================================================');
  console.log('🚀 Running Custom Trip Collections API Test Suite');
  console.log('====================================================\n');

  await startServer();

  try {
    const timestamp = Date.now();

    // Register User A
    const userARes = await postJson('/api/auth/register', {
      email: `usera_${timestamp}@test.com`,
      username: `userA_${timestamp}`,
      password: 'Password123!',
      displayName: 'User A',
    });
    assert.strictEqual(userARes.status, 201);
    const tokenA = userARes.data.token;
    const uidA = userARes.data.user.uid;

    // Register User B
    const userBRes = await postJson('/api/auth/register', {
      email: `userb_${timestamp}@test.com`,
      username: `userB_${timestamp}`,
      password: 'Password123!',
      displayName: 'User B',
    });
    assert.strictEqual(userBRes.status, 201);
    const tokenB = userBRes.data.token;
    const uidB = userBRes.data.user.uid;

    console.log('Scenario 1: User A creates a new trip collection "Mumbai Trip"');
    const createTrip1 = await postJson(
      '/api/user-trips',
      {
        name: 'Mumbai Trip',
        description: 'Iconic places in Mumbai and nearby',
        travelMode: 'DRIVING',
        stops: [
          { name: 'Gateway of India', city: 'Mumbai', state: 'Maharashtra', coordinates: { lat: 18.922, lng: 72.8347 } },
          { name: 'Marine Drive', city: 'Mumbai', state: 'Maharashtra', coordinates: { lat: 18.943, lng: 72.823 } },
        ],
      },
      tokenA
    );
    assert.strictEqual(createTrip1.status, 201);
    assert.strictEqual(createTrip1.data.success, true);
    assert.strictEqual(createTrip1.data.trip.name, 'Mumbai Trip');
    assert.strictEqual(createTrip1.data.trip.stops.length, 2);
    const trip1Id = createTrip1.data.trip.id;
    console.log('  -> Pass: Trip "Mumbai Trip" created with ID:', trip1Id);

    console.log('Scenario 2: Reject duplicate trip name for the same user (case-insensitive)');
    const dupRes = await postJson(
      '/api/user-trips',
      {
        name: 'mumbai trip', // differing only in case
        description: 'Duplicate attempt',
      },
      tokenA
    );
    assert.strictEqual(dupRes.status, 400);
    assert.ok(dupRes.data.error.includes('already have a trip named "mumbai trip"'));
    console.log('  -> Pass: Case-insensitive duplicate trip name rejected with HTTP 400');

    console.log('Scenario 3: Allow different user B to create a trip with the same name "Mumbai Trip"');
    const userBTrip = await postJson(
      '/api/user-trips',
      {
        name: 'Mumbai Trip',
        description: 'User B Mumbai exploration',
      },
      tokenB
    );
    assert.strictEqual(userBTrip.status, 201);
    assert.strictEqual(userBTrip.data.trip.name, 'Mumbai Trip');
    assert.strictEqual(userBTrip.data.trip.userId, uidB);
    console.log('  -> Pass: Different user B successfully created their own "Mumbai Trip"');

    console.log('Scenario 4: User A creates a second trip "Kerala Vacation"');
    const createTrip2 = await postJson(
      '/api/user-trips',
      {
        name: 'Kerala Vacation',
        description: 'Backwaters and hills',
        stops: [
          { name: 'Fort Kochi', city: 'Kochi', state: 'Kerala', coordinates: { lat: 9.9658, lng: 76.2421 } },
          { name: 'Munnar Tea Gardens', city: 'Munnar', state: 'Kerala', coordinates: { lat: 10.0889, lng: 77.0595 } },
        ],
      },
      tokenA
    );
    assert.strictEqual(createTrip2.status, 201);
    const trip2Id = createTrip2.data.trip.id;
    console.log('  -> Pass: Second trip created for User A');

    console.log('Scenario 5: User A retrieves their trips');
    const listTripsRes = await getJson('/api/user-trips', tokenA);
    assert.strictEqual(listTripsRes.status, 200);
    assert.strictEqual(listTripsRes.data.trips.length, 2);
    const tripNames = listTripsRes.data.trips.map((t) => t.name);
    assert.ok(tripNames.includes('Mumbai Trip'));
    assert.ok(tripNames.includes('Kerala Vacation'));
    console.log('  -> Pass: User A trips list retrieved successfully (count: 2)');

    console.log('Scenario 6: Update / Rename trip');
    const updateRes = await putJson(
      `/api/user-trips/${trip1Id}`,
      {
        name: 'Mumbai & Goa Adventure',
        description: 'Updated route',
      },
      tokenA
    );
    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.data.trip.name, 'Mumbai & Goa Adventure');
    console.log('  -> Pass: Trip renamed successfully to "Mumbai & Goa Adventure"');

    console.log('Scenario 7: Share specific trip');
    const shareTripRes = await postJson(
      '/api/trips/share',
      {
        tripId: trip1Id,
        ownerName: 'User A',
      },
      tokenA
    );
    assert.strictEqual(shareTripRes.status, 201);
    assert.ok(shareTripRes.data.shareId);
    assert.strictEqual(shareTripRes.data.tripName, 'Mumbai & Goa Adventure');
    const shareId = shareTripRes.data.shareId;
    console.log('  -> Pass: Specific trip shared with shareId:', shareId);

    console.log('Scenario 8: Preview shared trip publicly without auth');
    const previewRes = await getJson(`/api/trips/share/${shareId}`);
    assert.strictEqual(previewRes.status, 200);
    assert.strictEqual(previewRes.data.share.tripName, 'Mumbai & Goa Adventure');
    assert.strictEqual(previewRes.data.share.stops.length, 2);
    console.log('  -> Pass: Public share preview verified');

    console.log('Scenario 9: Import shared trip into User B account');
    const importRes = await postJson(
      '/api/trips/import',
      {
        shareId,
      },
      tokenB
    );
    assert.strictEqual(importRes.status, 201);
    assert.strictEqual(importRes.data.trip.name, 'Mumbai & Goa Adventure');
    assert.strictEqual(importRes.data.trip.userId, uidB);
    assert.strictEqual(importRes.data.trip.stops.length, 2);
    console.log('  -> Pass: User B imported shared trip into their collections');

    console.log('Scenario 10: Import same trip again — test automatic duplicate naming');
    const importAgainRes = await postJson(
      '/api/trips/import',
      {
        shareId,
      },
      tokenB
    );
    assert.strictEqual(importAgainRes.status, 201);
    assert.strictEqual(importAgainRes.data.trip.name, 'Mumbai & Goa Adventure (2)');
    console.log('  -> Pass: Second import automatically handled duplicate name with "Mumbai & Goa Adventure (2)"');

    console.log('Scenario 11: Delete trip');
    const deleteRes = await deleteJson(`/api/user-trips/${trip2Id}`, tokenA);
    assert.strictEqual(deleteRes.status, 200);
    const listAfterDelete = await getJson('/api/user-trips', tokenA);
    assert.strictEqual(listAfterDelete.data.trips.length, 1);
    assert.strictEqual(listAfterDelete.data.trips[0].name, 'Mumbai & Goa Adventure');
    console.log('  -> Pass: Deleted trip removed cleanly without affecting remaining trips');

    console.log('\n====================================================');
    console.log('🎉 ALL 11 CUSTOM TRIP COLLECTION TESTS PASSED!');
    console.log('====================================================\n');
  } finally {
    await stopServer();
  }
}

runTests().catch((err) => {
  console.error('\n❌ Trip Collection test failure:', err);
  if (server) server.close();
  process.exit(1);
});

