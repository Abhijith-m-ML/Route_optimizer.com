import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 5077;
const BASE_URL = `http://localhost:${PORT}`;

async function api(endpoint, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Connection: 'close',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function runGoogleOAuthSuite() {
  console.log('====================================================');
  console.log('🔐 Running RouteWise Google OAuth 2.0 Security Test Suite');
  console.log('====================================================\n');

  // Import backend application
  const serverModule = await import('./dist/server.js');
  const app = serverModule.default;
  const usersMap = serverModule.usersMap;

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
    // Test 1: Verify health check reports Google OAuth endpoint
    console.log('Test 1: Health endpoint Google OAuth status');
    const health = await api('/api/health');
    assert(health.status === 200, 'Health endpoint returns HTTP 200');
    assert(typeof health.data.googleOAuth === 'object', 'Health endpoint reports googleOAuth configuration object');

    // Test 2: Reject empty Google authentication request
    console.log('\nTest 2: Reject empty Google authentication request');
    const emptyAuth = await api('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    assert(emptyAuth.status === 400, 'Empty request rejected with HTTP 400');
    assert(emptyAuth.data?.error?.includes('requires'), 'Error explains required credential fields');

    // Test 3: Reject unverified or forged Google token
    console.log('\nTest 3: Reject unverified or forged Google token');
    const forgedAuth = await api('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken: 'forged.fake.token.123' }),
    });
    assert(forgedAuth.status === 401 || forgedAuth.status === 500, `Forged token rejected with HTTP ${forgedAuth.status}`);

    // Test 4: Verify email_verified requirement
    console.log('\nTest 4: Reject Google account if email is unverified');
    // Simulate a Google verification response with email_verified: false
    const origVerify = serverModule.googleAuthVerifier.verifyGoogleToken;
    serverModule.googleAuthVerifier.verifyGoogleToken = async () => ({
      sub: 'google_unverified_sub_1',
      email: 'unverified_person@gmail.com',
      email_verified: false,
      name: 'Unverified Person',
    });

    const unverifiedAuth = await api('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential: 'simulated_unverified_token' }),
    });
    assert(unverifiedAuth.status === 400, 'Unverified Google email rejected with HTTP 400');
    assert(unverifiedAuth.data?.error?.includes('not verified'), 'Explicit error message for unverified email');

    // Test 5: New Google User Registration & Login
    console.log('\nTest 5: Register brand-new Google user via verified identity');
    const googleSub1 = 'google_user_sub_' + Date.now();
    const googleEmail1 = `google_traveler_${Date.now()}@gmail.com`;

    serverModule.googleAuthVerifier.verifyGoogleToken = async () => ({
      sub: googleSub1,
      email: googleEmail1,
      email_verified: true,
      name: 'Aarav Google Explorer',
      picture: 'https://lh3.googleusercontent.com/a/test_pic_1',
    });

    const newGoogleAuth = await api('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential: 'valid_google_token_1' }),
    });

    assert(newGoogleAuth.status === 201, 'New Google user created with HTTP 201 Created');
    assert(Boolean(newGoogleAuth.data?.token), 'Received application JWT token');
    assert(newGoogleAuth.data?.user?.email === googleEmail1, 'Correct email returned');
    assert(newGoogleAuth.data?.user?.photoURL === 'https://lh3.googleusercontent.com/a/test_pic_1', 'Google avatar URL preserved');
    const user1Token = newGoogleAuth.data?.token;
    const user1Uid = newGoogleAuth.data?.user?.uid;

    // Verify stored record
    const storedUser1 = usersMap.get(user1Uid);
    assert(storedUser1?.googleId === googleSub1, 'Google sub identifier stored accurately in database');
    assert(storedUser1?.passwordHash === '', 'Google account has no plain/fake password');

    // Test 6: Existing Google User logs in again
    console.log('\nTest 6: Existing Google user logs in again');
    const existingGoogleAuth = await api('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential: 'valid_google_token_1' }),
    });
    assert(existingGoogleAuth.status === 200, 'Existing Google user logged in with HTTP 200');
    assert(existingGoogleAuth.data?.user?.uid === user1Uid, 'Returned identical existing UID (no duplicate created)');

    // Test 7: Prevent duplicate accounts
    console.log('\nTest 7: Verify total user count only incremented by 1');
    const matchingUsers = Array.from(usersMap.values()).filter(u => u.email === googleEmail1);
    assert(matchingUsers.length === 1, `Exactly 1 user account exists for ${googleEmail1}`);

    // Test 8: Safe Account Linking with existing password account
    console.log('\nTest 8: Safe Account Linking: Existing password user logs in with matching verified Google email');
    const existingPasswordEmail = `hybrid_traveler_${Date.now()}@mumbai.com`;
    const existingPasswordUser = `hybrid_${Date.now()}`;
    const rawPassword = 'SecurePassword123!';

    // First register with username & password
    const passReg = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: existingPasswordEmail,
        username: existingPasswordUser,
        password: rawPassword,
        displayName: 'Hybrid Traveler',
      }),
    });
    assert(passReg.status === 201, 'Password user registered successfully');
    const originalUid = passReg.data.user.uid;

    // Now user logs in with Google having the SAME verified email address
    const googleSub2 = 'google_linked_sub_' + Date.now();
    serverModule.googleAuthVerifier.verifyGoogleToken = async () => ({
      sub: googleSub2,
      email: existingPasswordEmail,
      email_verified: true,
      name: 'Hybrid Traveler (Google)',
      picture: 'https://lh3.googleusercontent.com/a/test_pic_2',
    });

    const linkRes = await api('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential: 'valid_google_token_2' }),
    });
    assert(linkRes.status === 200, 'Google login succeeded with HTTP 200 for existing email');
    assert(linkRes.data?.user?.uid === originalUid, 'Preserved original account UID');
    
    // Check that database record now has googleId linked and passwordHash is still intact!
    const linkedUser = usersMap.get(originalUid);
    assert(linkedUser?.googleId === googleSub2, 'googleId linked to existing record');
    assert(Boolean(linkedUser?.passwordHash && linkedUser.passwordHash.length > 20), 'Original password hash preserved intact');
    assert(linkedUser?.authProvider === 'linked', 'authProvider marked as linked');

    // Test 9: Existing password login still works on linked account
    console.log('\nTest 9: Verify user can still authenticate with their original password');
    const passLogin = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        identifier: existingPasswordUser,
        password: rawPassword,
      }),
    });
    assert(passLogin.status === 200, 'Password login still succeeds on linked account');

    // Test 10: Google SSO account without password is protected from password guessing
    console.log('\nTest 10: Reject password login attempt on Google-only account without password');
    const googleOnlyPassLogin = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        identifier: googleEmail1,
        password: 'RandomPassword123!',
      }),
    });
    assert(googleOnlyPassLogin.status === 401, 'Password login rejected with HTTP 401');
    assert(googleOnlyPassLogin.data?.error?.includes('Google Sign-In'), 'Helpful guidance directing user to Google Sign-In');

    // Test 11: Access protected routes using issued Google session JWT
    console.log('\nTest 11: Access protected endpoints with Google user session');
    const meRes = await api('/api/auth/me', {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    assert(meRes.status === 200, 'Protected /api/auth/me accessed with Google session token');
    assert(meRes.data?.user?.email === googleEmail1, 'Correct user identity verified');

    // Test 12: Reject unauthenticated access to protected routes
    console.log('\nTest 12: Reject unauthenticated access to protected endpoints');
    const unauthMe = await api('/api/auth/me');
    assert(unauthMe.status === 401, 'Unauthenticated request rejected with HTTP 401');

    // Clean up
    serverModule.googleAuthVerifier.verifyGoogleToken = origVerify;
    if (server.closeAllConnections) server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
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

runGoogleOAuthSuite();
