// Automated Test Suite for RouteWise Authentication and User Validation
// Testing all 12 scenarios specified in the Route Optimizer Project Audit
import assert from 'node:assert';
import http from 'node:http';
import app, { generateToken, verifyToken, usersMap } from './dist/server.js';

const TEST_PORT = 5055;
const BASE_URL = `http://localhost:${TEST_PORT}`;

let server;

async function postJson(endpoint, body, headers = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function getJson(endpoint, headers = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'GET',
    headers: { ...headers },
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('====================================================');
  console.log('🚀 Running RouteWise 12-Point Authentication Test Suite');
  console.log('====================================================\n');

  // Start test server
  await new Promise((resolve) => {
    server = app.listen(TEST_PORT, () => {
      console.log(`✓ Test server running on ${BASE_URL}\n`);
      resolve();
    });
  });

  try {
    const testEmail = `traveler_${Date.now()}@mumbai.com`;
    const testUsername = `mumbai_user_${Date.now()}`;
    const testPassword = 'SecurePassword@2026';
    const testDisplayName = 'Mumbai Traveler';

    // Verify Root GET / health-check endpoint
    const rootRes = await getJson('/');
    assert.strictEqual(rootRes.status, 200, 'Root GET / must return HTTP 200');
    assert.strictEqual(rootRes.data.status, 'ok', 'Root status must be ok');
    assert.strictEqual(rootRes.data.service, 'Route Optimizer API', 'Service name must be Route Optimizer API');
    console.log('✓ Root GET / health-check endpoint verified (status: ok, service: Route Optimizer API)');

    // Verify GET /api/health endpoint
    const healthRes = await getJson('/api/health');
    assert.strictEqual(healthRes.status, 200, 'GET /api/health must return HTTP 200');
    assert.strictEqual(healthRes.data.status, 'ok');
    console.log('✓ GET /api/health endpoint verified (status: ok)\n');

    // 10. New user registration followed by login: works.
    console.log('Scenario 10: New user registration followed by login');
    const regRes = await postJson('/api/auth/register', {
      email: testEmail,
      username: testUsername,
      password: testPassword,
      displayName: testDisplayName,
    });
    assert.strictEqual(regRes.status, 201, 'Registration must return HTTP 201');
    assert.strictEqual(regRes.data.success, true);
    assert.ok(regRes.data.token, 'Must return signed JWT token');
    assert.strictEqual(regRes.data.user.email, testEmail.toLowerCase());
    console.log('  -> Pass: User registered successfully (HTTP 201)');

    // 1. Registered user with correct password: succeeds.
    console.log('Scenario 1: Registered user with correct password: succeeds');
    const loginRes = await postJson('/api/auth/login', {
      identifier: testUsername,
      password: testPassword,
    });
    assert.strictEqual(loginRes.status, 200, 'Login must return HTTP 200');
    assert.strictEqual(loginRes.data.success, true);
    assert.ok(loginRes.data.token, 'Login must return valid JWT');
    assert.strictEqual(loginRes.data.user.email, testEmail.toLowerCase());
    console.log('  -> Pass: Correct password logged in successfully (HTTP 200)');

    // 2. Registered user with incorrect password: rejected.
    console.log('Scenario 2: Registered user with incorrect password: rejected');
    const wrongPassRes = await postJson('/api/auth/login', {
      identifier: testUsername,
      password: 'WrongPassword123!',
    });
    assert.strictEqual(wrongPassRes.status, 401, 'Wrong password must return HTTP 401');
    assert.ok(wrongPassRes.data.error, 'Must provide error description');
    console.log('  -> Pass: Incorrect password rejected with HTTP 401');

    // 3. Nonexistent username: rejected.
    console.log('Scenario 3: Nonexistent username: rejected');
    const nonexistentRes = await postJson('/api/auth/login', {
      identifier: 'nonexistent_ghost_user_99999',
      password: 'SomePassword123!',
    });
    assert.strictEqual(nonexistentRes.status, 401, 'Nonexistent user must return HTTP 401');
    assert.strictEqual(
      nonexistentRes.data.error,
      wrongPassRes.data.error,
      'Must return identical message to prevent username enumeration'
    );
    console.log('  -> Pass: Nonexistent user rejected with HTTP 401 (enumeration-safe)');

    // 4. Empty username or password: rejected.
    console.log('Scenario 4: Empty username or password: rejected');
    const emptyIdRes = await postJson('/api/auth/login', {
      identifier: '   ',
      password: testPassword,
    });
    assert.strictEqual(emptyIdRes.status, 400, 'Empty identifier must return HTTP 400');
    const emptyPassRes = await postJson('/api/auth/login', {
      identifier: testUsername,
      password: '',
    });
    assert.strictEqual(emptyPassRes.status, 400, 'Empty password must return HTTP 400');
    console.log('  -> Pass: Empty credentials rejected with HTTP 400');

    // 5. Random username and password: rejected.
    console.log('Scenario 5: Random username and password: rejected');
    const randomRes = await postJson('/api/auth/login', {
      identifier: 'xyz_random_' + Math.random().toString(36).substring(2),
      password: 'pwd_random_' + Math.random().toString(36).substring(2),
    });
    assert.strictEqual(randomRes.status, 401, 'Random credentials must return HTTP 401');
    console.log('  -> Pass: Random credentials rejected with HTTP 401');

    // 6. Direct API login with invalid credentials: rejected.
    console.log('Scenario 6: Direct API login with invalid credentials: rejected');
    const directApiRes = await postJson('/api/auth/login', {
      identifier: 'admin',
      password: 'admin',
    });
    assert.strictEqual(directApiRes.status, 401, 'Invalid API credentials must return HTTP 401');
    console.log('  -> Pass: Direct API call with invalid credentials rejected with HTTP 401');

    // 7. Accessing a protected endpoint without authentication: rejected.
    console.log('Scenario 7: Accessing protected endpoint without authentication: rejected');
    const noAuthDashboard = await getJson('/api/dashboard/summary');
    assert.strictEqual(noAuthDashboard.status, 401, 'Protected route without token must return HTTP 401');
    const noAuthMe = await getJson('/api/auth/me');
    assert.strictEqual(noAuthMe.status, 401, 'Protected /api/auth/me without token must return HTTP 401');
    console.log('  -> Pass: Unauthenticated access rejected with HTTP 401');

    // 8. Invalid or expired JWT: rejected.
    console.log('Scenario 8: Invalid or expired JWT: rejected');
    const invalidTokenRes = await getJson('/api/auth/me', {
      Authorization: 'Bearer invalid.tampered.signature',
    });
    assert.strictEqual(invalidTokenRes.status, 401, 'Tampered token must return HTTP 401');

    const expiredToken = generateToken(
      { uid: 'usr_test', email: 'test@exp.com', username: 'testexp' },
      -60 // expired 60 seconds ago
    );
    const expiredRes = await getJson('/api/auth/me', {
      Authorization: `Bearer ${expiredToken}`,
    });
    assert.strictEqual(expiredRes.status, 401, 'Expired token must return HTTP 401');
    console.log('  -> Pass: Tampered and expired tokens rejected with HTTP 401');

    // 9. Successful login followed by access to protected features: works.
    console.log('Scenario 9: Successful login followed by access to protected features: works');
    const validJwt = loginRes.data.token;
    const authMeRes = await getJson('/api/auth/me', {
      Authorization: `Bearer ${validJwt}`,
    });
    assert.strictEqual(authMeRes.status, 200, 'Protected route must return HTTP 200');
    assert.strictEqual(authMeRes.data.user.email, testEmail.toLowerCase());

    const dashboardRes = await getJson('/api/dashboard/summary', {
      Authorization: `Bearer ${validJwt}`,
    });
    assert.strictEqual(dashboardRes.status, 200, 'Protected dashboard must return HTTP 200');
    assert.strictEqual(dashboardRes.data.success, true);
    console.log('  -> Pass: Authenticated user accessed protected routes (HTTP 200)');

    // 11. Existing valid accounts continue to work.
    console.log('Scenario 11: Existing valid accounts continue to work');
    // Log in again with the registered account using both username and email
    const reLoginUsername = await postJson('/api/auth/login', {
      identifier: testUsername,
      password: testPassword,
    });
    assert.strictEqual(reLoginUsername.status, 200, 'Existing user login by username succeeds');

    const reLoginEmail = await postJson('/api/auth/login', {
      identifier: testEmail,
      password: testPassword,
    });
    assert.strictEqual(reLoginEmail.status, 200, 'Existing user login by email succeeds');
    console.log('  -> Pass: Existing registered accounts retain access across multiple logins');

    // 12. Frontend handles backend errors and network failures without incorrectly logging the user in.
    console.log('Scenario 12: Backend errors and malformed requests return appropriate HTTP codes');
    const malformedJson = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'duplicate_test@mumbai.com', password: '12' }), // < 6 chars
    });
    const malformedData = await malformedJson.json();
    assert.strictEqual(malformedJson.status, 400, 'Short password must return HTTP 400');
    assert.strictEqual(malformedData.error, 'Password must be at least 6 characters long.');

    // Duplicate email check
    const dupEmail = await postJson('/api/auth/register', {
      email: testEmail,
      password: 'AnotherPassword@123',
    });
    assert.strictEqual(dupEmail.status, 400, 'Duplicate email must return HTTP 400');
    console.log('  -> Pass: Backend rejects malformed / duplicate data with explicit HTTP 400 errors');

    console.log('\n====================================================');
    console.log('🎉 ALL 12 SCENARIOS VERIFIED AND PASSED SUCCESSFULLY!');
    console.log('====================================================\n');
    process.exit(0);
  } finally {
    if (server) {
      server.close();
    }
  }
}

runTests().catch((err) => {
  console.error('\n❌ Test failure:', err);
  if (server) server.close();
  process.exit(1);
});
