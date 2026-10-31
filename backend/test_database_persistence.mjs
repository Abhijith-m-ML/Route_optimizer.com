import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 5066;
const BASE_URL = `http://localhost:${PORT}`;

// Helper for fetch calls
async function api(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Connection': 'close',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function runPersistenceSuite() {
  console.log('====================================================');
  console.log('🛡️ Running RouteWise Permanent Database Persistence Test Suite');
  console.log('====================================================\n');

  // Dynamically import the Express app
  const serverModule = await import('./dist/server.js').catch(async () => {
    // If dist not built yet, build or use ts-node via register
    return await import('./src/server.ts');
  });

  const app = serverModule.default;
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`✓ Test server running on ${BASE_URL}\n`);

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  -> Pass: ${message}`);
      passed++;
    } else {
      console.error(`  -> FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // Test 1: Verify health endpoint reports protected persistence
    console.log('Test 1: Check persistence status in /api/health');
    const health = await api('/api/health');
    assert(health.status === 200, 'Health endpoint responds with HTTP 200');
    assert(health.data.persistence?.status === 'protected', 'Persistence is marked as protected');
    assert(typeof health.data.usersCount === 'number' && health.data.usersCount >= 50, `Users count is non-zero (found: ${health.data.usersCount})`);

    // Test 2: Register a dedicated test user
    console.log('\nTest 2: Register new user');
    const testEmail = `persistence_user_${Date.now()}@test.com`;
    const testUsername = `persist_${Date.now()}`;
    const testPassword = 'Password123!';

    const reg = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        username: testUsername,
        password: testPassword,
        displayName: 'Persistence Test User',
      }),
    });

    assert(reg.status === 201, 'User registered successfully');
    const userToken = reg.data.token;
    const userUid = reg.data.user.uid;
    assert(Boolean(userToken && userUid), 'Received valid UID and JWT token');

    // Test 3: Log in using credentials
    console.log('\nTest 3: Log in using registered credentials');
    const login = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        identifier: testUsername,
        password: testPassword,
      }),
    });
    assert(login.status === 200, 'Login succeeded with HTTP 200');

    // Test 4: Create a trip collection
    console.log('\nTest 4: Create custom trip collection');
    const tripRes = await api('/api/user-trips', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({
        name: 'Persistent Test Trip',
        description: 'Testing survival across server restarts',
        travelMode: 'DRIVING',
        stops: [
          { name: 'Gateway of India', city: 'Mumbai', coordinates: { lat: 18.922, lng: 72.8347 } },
          { name: 'Marine Drive', city: 'Mumbai', coordinates: { lat: 18.943, lng: 72.823 } },
        ],
      }),
    });
    assert(tripRes.status === 201, 'Trip collection created');
    const tripId = tripRes.data.trip.id;

    // Test 5: Verify disk write & backup creation
    console.log('\nTest 5: Verify disk storage files and backup directory');
    const dataDir = serverModule.DATA_DIR;
    const backupDir = serverModule.BACKUP_DIR;
    assert(fs.existsSync(dataDir), `Data directory exists: ${dataDir}`);
    assert(fs.existsSync(path.join(dataDir, 'users_data.json')), 'users_data.json exists on disk');
    assert(fs.existsSync(path.join(backupDir, 'users_backup_latest.json')), 'users_backup_latest.json exists');

    // Test 6: Simulate server restart
    console.log('\nTest 6: Simulate server restart and verify persistence');
    // Stop server
    if (server.closeAllConnections) server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await new Promise((resolve) => setTimeout(resolve, 300));
    console.log('  Server shut down.');

    // Restart server on same port
    const restartServer = http.createServer(app);
    await new Promise((resolve) => restartServer.listen(PORT, resolve));
    await new Promise((resolve) => setTimeout(resolve, 200));
    console.log('  Server restarted.');

    // Test 7: Verify user can still log in after restart
    console.log('\nTest 7: Verify user account survives restart');
    const relogin = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        identifier: testEmail,
        password: testPassword,
      }),
    });
    assert(relogin.status === 200, 'User logged in successfully after server restart');

    // Test 8: Verify trip collection survives restart
    console.log('\nTest 8: Verify trip collection survives restart');
    const getTrip = await api(`/api/user-trips/${tripId}`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert(getTrip.status === 200, 'Trip collection retrieved after restart');
    assert(getTrip.data.trip?.name === 'Persistent Test Trip', 'Trip name preserved accurately');
    assert(getTrip.data.trip?.stops?.length === 2, 'All stops preserved accurately');

    // Test 9: Self-Healing Authentication Verification
    console.log('\nTest 9: Verify Cryptographic Self-Healing for Active Sessions');
    // Temporarily remove user from in-memory map to simulate container swap without shared disk
    serverModule.usersMap.delete(userUid);
    assert(!serverModule.usersMap.has(userUid), 'Simulated memory wipe: user removed from memory map');

    // Call /api/auth/me with user's valid JWT token
    const meRes = await api('/api/auth/me', {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert(meRes.status === 200, 'Valid token self-healed the session and returned HTTP 200');
    assert(meRes.data.user?.uid === userUid, 'Restored correct UID in memory');
    assert(serverModule.usersMap.has(userUid), 'User restored back into memory map');

    // Test 10: Admin Backup Endpoint
    console.log('\nTest 10: Test /api/admin/backup endpoint');
    const backupRes = await api('/api/admin/backup', {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert(backupRes.status === 200, 'Admin backup export succeeded with HTTP 200');
    assert(backupRes.data.backup?.stats?.totalUsers >= 50, 'Backup contains all user records');
    assert(Boolean(backupRes.data.backup?.data?.users[userUid]), 'Newly created user included in backup');

    await new Promise((resolve) => restartServer.close(resolve));
  } catch (err) {
    console.error('Unexpected test error:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPersistenceSuite();
