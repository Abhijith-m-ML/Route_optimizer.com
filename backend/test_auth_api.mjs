// Automated Test Suite for RouteWise Authentication and User Validation
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
  console.log('🚀 Running RouteWise Backend Authentication Tests');
  console.log('====================================================\n');

  // Start test server
  await new Promise((resolve) => {
    server = app.listen(TEST_PORT, () => {
      console.log(`✓ Test server running on ${BASE_URL}\n`);
      resolve();
    });
  });

  try {
    // Test Case 0: Health check
    const health = await getJson('/api/health');
    assert.strictEqual(health.status, 200, 'Health endpoint must return 200');
    assert.strictEqual(health.data.status, 'ok', 'Health status must be ok');
    console.log('✓ Health check passed');

    // Test Case 1: Register a new user
    const testEmail = `traveler_${Date.now()}@mumbai.com`;
    const testUsername = `traveler_${Date.now()}`;
    const testPassword = 'SecureMumbaiPassword@123';
    const testDisplayName = 'Mumbai Explorer';

    const regRes = await postJson('/api/auth/register', {
      email: testEmail,
      username: testUsername,
      password: testPassword,
      displayName: testDisplayName,
    });

    assert.strictEqual(regRes.status, 201, 'Registration must return HTTP 201');
    assert.strictEqual(regRes.data.success, true, 'Registration success flag must be true');
    assert.ok(regRes.data.token, 'Registration must return an authentication token');
    assert.strictEqual(regRes.data.user.email, testEmail.toLowerCase());
    assert.strictEqual(regRes.data.user.username, testUsername.toLowerCase());
    console.log('✓ New user registration succeeded with HTTP 201 and valid token');

    // Test Case 2: Correct registered username and password -> login succeeds (HTTP 200)
    const loginRes = await postJson('/api/auth/login', {
      identifier: testUsername,
      password: testPassword,
    });

    assert.strictEqual(loginRes.status, 200, 'Login with correct credentials must return HTTP 200');
    assert.strictEqual(loginRes.data.success, true);
    assert.ok(loginRes.data.token, 'Login must return a valid auth token');
    assert.strictEqual(loginRes.data.user.email, testEmail.toLowerCase());
    console.log('✓ Correct registered username and password -> login succeeds with HTTP 200');

    // Test Case 2b: Login using email address instead of username
    const loginEmailRes = await postJson('/api/auth/login', {
      identifier: testEmail,
      password: testPassword,
    });
    assert.strictEqual(loginEmailRes.status, 200, 'Login with email must return HTTP 200');
    assert.strictEqual(loginEmailRes.data.success, true);
    console.log('✓ Correct registered email and password -> login succeeds with HTTP 200');

    // Test Case 3: Correct username with an incorrect password -> login fails (HTTP 401)
    const wrongPassRes = await postJson('/api/auth/login', {
      identifier: testUsername,
      password: 'WrongPassword123!',
    });
    assert.strictEqual(wrongPassRes.status, 401, 'Wrong password must return HTTP 401');
    assert.strictEqual(wrongPassRes.data.success, undefined);
    assert.ok(wrongPassRes.data.error, 'Must return error message');
    console.log('✓ Correct username with incorrect password -> login rejected with HTTP 401');

    // Test Case 4: Nonexistent username -> login fails (HTTP 401)
    const nonexistentRes = await postJson('/api/auth/login', {
      identifier: 'completely_nonexistent_user_99999',
      password: 'AnyPassword123',
    });
    assert.strictEqual(nonexistentRes.status, 401, 'Nonexistent user must return HTTP 401');
    assert.strictEqual(nonexistentRes.data.error, wrongPassRes.data.error, 
      'CRITICAL: Nonexistent user and wrong password must return identical error message to prevent user enumeration'
    );
    console.log('✓ Nonexistent username -> login rejected with HTTP 401 (enumeration protected)');

    // Test Case 5: Empty username or password -> validation error (HTTP 400)
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
    console.log('✓ Empty username or password -> validation error with HTTP 400');

    // Test Case 6: Random username and random password -> login fails (HTTP 401)
    const randomRes = await postJson('/api/auth/login', {
      identifier: 'random_xyz_' + Math.random().toString(36),
      password: 'random_pass_' + Math.random().toString(36),
    });
    assert.strictEqual(randomRes.status, 401, 'Random credentials must return HTTP 401');
    console.log('✓ Random username and random password -> login rejected with HTTP 401');

    // Test Case 7: Accessing a protected dashboard API without a valid session or token -> access denied (HTTP 401)
    const noTokenRes = await getJson('/api/dashboard/summary');
    assert.strictEqual(noTokenRes.status, 401, 'Accessing protected route without token must return HTTP 401');
    console.log('✓ Accessing protected API without token -> access denied with HTTP 401');

    // Test Case 8: Expired or invalid token -> access denied (HTTP 401)
    const invalidTokenRes = await getJson('/api/dashboard/summary', {
      Authorization: 'Bearer invalid.bogus.token.here',
    });
    assert.strictEqual(invalidTokenRes.status, 401, 'Invalid token must return HTTP 401');

    // Create an expired token (-10 seconds)
    const expiredToken = generateToken({ uid: 'usr_test', email: 'test@exp.com', username: 'testexp' }, -10);
    const expiredRes = await getJson('/api/dashboard/summary', {
      Authorization: `Bearer ${expiredToken}`,
    });
    assert.strictEqual(expiredRes.status, 401, 'Expired token must return HTTP 401');
    console.log('✓ Invalid or expired token -> access denied with HTTP 401');

    // Test Case 9: Accessing protected API WITH valid token -> succeeds (HTTP 200)
    const validToken = loginRes.data.token;
    const authMeRes = await getJson('/api/auth/me', {
      Authorization: `Bearer ${validToken}`,
    });
    assert.strictEqual(authMeRes.status, 200, 'Protected /api/auth/me with valid token must return HTTP 200');
    assert.strictEqual(authMeRes.data.user.email, testEmail.toLowerCase());

    const dashboardRes = await getJson('/api/dashboard/summary', {
      Authorization: `Bearer ${validToken}`,
    });
    assert.strictEqual(dashboardRes.status, 200, 'Protected /api/dashboard/summary with valid token must return HTTP 200');
    assert.strictEqual(dashboardRes.data.success, true);
    console.log('✓ Accessing protected API with valid token -> succeeded with HTTP 200');

    // Test Case 10: Duplicate registration prevention
    const dupRes = await postJson('/api/auth/register', {
      email: testEmail,
      username: 'other_username',
      password: 'AnotherPassword123',
    });
    assert.strictEqual(dupRes.status, 400, 'Duplicate email registration must return HTTP 400');

    const dupUsernameRes = await postJson('/api/auth/register', {
      email: 'completely_different_email@mumbai.com',
      username: testUsername,
      password: 'AnotherPassword123',
    });
    assert.strictEqual(dupUsernameRes.status, 400, 'Duplicate username registration must return HTTP 400');
    console.log('✓ Duplicate registration prevention passed (duplicate email & username rejected with HTTP 400)');

    // Test Case 11: Registration validation checks (short password, invalid email format)
    const shortPassRes = await postJson('/api/auth/register', {
      email: 'shortpass@mumbai.com',
      password: '123',
    });
    assert.strictEqual(shortPassRes.status, 400, 'Password under 6 chars must return HTTP 400');

    const invalidEmailRes = await postJson('/api/auth/register', {
      email: 'not-an-email-at-all',
      password: 'ValidPassword123',
    });
    assert.strictEqual(invalidEmailRes.status, 400, 'Invalid email format must return HTTP 400');
    console.log('✓ Registration validation rules enforced (short password & malformed email rejected)');

    console.log('\n====================================================');
    console.log('🎉 ALL 11 BACKEND AUTHENTICATION TEST CASES PASSED!');
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
