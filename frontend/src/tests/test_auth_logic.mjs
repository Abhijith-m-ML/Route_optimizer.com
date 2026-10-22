// Verification of RouteWise Stage 2 Authentication Logic (Offline tests)
import assert from 'node:assert';

// 1. Test error code mapping function logic
function getAuthErrorMessage(error) {
  if (!error) return 'An unknown error occurred.';
  const code = error.code || '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password. Please verify your credentials and try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists. Please log in instead.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters with good strength.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address format.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/too-many-requests':
      return 'Access to this account has been temporarily disabled due to many failed login attempts. Please reset your password or try again later.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in was canceled before completion.';
    case 'auth/popup-blocked':
      return 'Sign-in popup was blocked by your browser. Please allow popups and try again.';
    case 'auth/operation-not-allowed':
      return 'This sign-in provider is not enabled in your Firebase Console. Please enable Email/Password or Google Sign-In.';
    case 'auth/network-request-failed':
      return 'Network connection error. Please check your connection and try again.';
    case 'auth/not-configured':
      return 'Firebase Authentication is not configured. Please supply your credentials in the frontend/.env file.';
    default:
      return error.message || 'Authentication failed. Please try again.';
  }
}

// 2. Test email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isValidEmail(email) {
  return emailRegex.test(email.trim());
}

// 3. Test password strength calculator
function calculatePasswordStrength(password) {
  if (!password) return { score: 0, label: 'Empty' };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  switch (score) {
    case 1: return { score: 25, label: 'Weak' };
    case 2: return { score: 50, label: 'Fair' };
    case 3: return { score: 75, label: 'Good' };
    case 4: return { score: 100, label: 'Strong' };
    default: return { score: 15, label: 'Too short' };
  }
}

// Run assertions
console.log('--- Running RouteWise Auth Logic Test Suite ---');

// Test 1: Email Regex Validation
assert.strictEqual(isValidEmail('user@mumbai.com'), true, 'Valid email must pass');
assert.strictEqual(isValidEmail('test.tourist+trip@routewise.in'), true, 'Valid complex email must pass');
assert.strictEqual(isValidEmail('invalid-email'), false, 'Email without domain must fail');
assert.strictEqual(isValidEmail('@missinguser.com'), false, 'Email without local part must fail');
assert.strictEqual(isValidEmail('user@.com'), false, 'Email without domain name must fail');
console.log('✓ Email format validation passed');

// Test 2: Password Mismatch Validation
function validateSignup(name, email, pass, confirmPass, terms) {
  const errors = {};
  if (!name.trim()) errors.name = 'Required';
  if (!isValidEmail(email)) errors.email = 'Invalid';
  if (pass.length < 8) errors.password = 'Min 8';
  if (pass !== confirmPass) errors.confirmPassword = 'Mismatch';
  if (!terms) errors.terms = 'Must accept terms';
  return errors;
}

const mismatchResult = validateSignup('Raj', 'raj@mumbai.com', 'Mumbai@2026', 'DifferentPass', true);
assert.strictEqual(mismatchResult.confirmPassword, 'Mismatch', 'Password mismatch must be detected');
console.log('✓ Password mismatch detection passed');

const validSignup = validateSignup('Rajesh Rao', 'rajesh@mumbai.com', 'Mumbai@2026', 'Mumbai@2026', true);
assert.strictEqual(Object.keys(validSignup).length, 0, 'Valid signup should produce 0 errors');
console.log('✓ Valid signup inputs passed');

// Test 3: Password Strength Meter
assert.strictEqual(calculatePasswordStrength('abc').label, 'Too short');
assert.strictEqual(calculatePasswordStrength('mumbai2026').score, 50, 'Length + Numbers -> Fair (50%)');
assert.strictEqual(calculatePasswordStrength('Mumbai@2026').score, 100, 'Length + Upper + Number + Special -> Strong (100%)');
console.log('✓ Password strength calculation passed');

// Test 4: Firebase Error Mapping
assert.strictEqual(
  getAuthErrorMessage({ code: 'auth/invalid-credential' }),
  'Invalid email or password. Please verify your credentials and try again.'
);
assert.strictEqual(
  getAuthErrorMessage({ code: 'auth/email-already-in-use' }),
  'An account with this email address already exists. Please log in instead.'
);
assert.strictEqual(
  getAuthErrorMessage({ code: 'auth/not-configured' }),
  'Firebase Authentication is not configured. Please supply your credentials in the frontend/.env file.'
);
console.log('✓ Firebase error code mapping passed');

// Test 5: Custom User ID and Password Validation (PLUCK / AAA)
function validateLoginForm(identifier, password, isConfigured) {
  const newErrors = {};
  const trimmed = identifier.trim();
  if (!trimmed) {
    newErrors.email = 'User ID or Email is required';
  } else if (trimmed.includes('@') && !isValidEmail(trimmed)) {
    newErrors.email = 'Please enter a valid email address';
  } else if (!trimmed.includes('@') && trimmed.length < 2) {
    newErrors.email = 'User ID must be at least 2 characters';
  }

  if (!password) {
    newErrors.password = 'Password is required';
  } else if (isConfigured && password.length < 6) {
    newErrors.password = 'Password must be at least 6 characters';
  }

  return newErrors;
}

function normalizeUserAuth(identifier) {
  const isEmail = identifier.includes('@');
  const normalizedEmail = isEmail ? identifier : `${identifier.toLowerCase()}@routewise.in`;
  const displayName = isEmail ? identifier.split('@')[0] : identifier;
  return { isEmail, normalizedEmail, displayName };
}

// Check PLUCK with password AAA in demo mode (isConfigured = false)
const pluckValidation = validateLoginForm('PLUCK', 'AAA', false);
assert.strictEqual(Object.keys(pluckValidation).length, 0, 'PLUCK and AAA must pass login validation in demo mode');

const pluckUser = normalizeUserAuth('PLUCK');
assert.strictEqual(pluckUser.displayName, 'PLUCK', 'Display name should match user ID');
assert.strictEqual(pluckUser.normalizedEmail, 'pluck@routewise.in', 'Normalized email should have default domain');

// Check that invalid single character ID fails
const singleCharValidation = validateLoginForm('A', 'AAA', false);
assert.strictEqual(singleCharValidation.email, 'User ID must be at least 2 characters');

// Check that standard email login still works seamlessly
const emailValidation = validateLoginForm('traveler@gmail.com', 'secret123', false);
assert.strictEqual(Object.keys(emailValidation).length, 0, 'Standard email login should pass');

console.log('✓ Custom User ID (PLUCK) and password (AAA) login validation passed');

// Test 6: Strict Credential Verification and Unauthorized Rejection
const AUTHORIZED_ACCOUNTS = [
  {
    identifier: 'PLUCK',
    email: 'pluck@routewise.in',
    password: 'AAA',
    displayName: 'PLUCK',
  },
];

function mockLogin(accounts, identifier, pass) {
  const cleanId = identifier.trim().toLowerCase();
  const matched = accounts.find(
    (a) => a.identifier.trim().toLowerCase() === cleanId || a.email.trim().toLowerCase() === cleanId
  );
  if (!matched) {
    const err = new Error('Invalid ID or email address. Please check your credentials and try again.');
    err.code = 'auth/user-not-found';
    throw err;
  }
  if (matched.password !== pass) {
    const err = new Error('Incorrect password. Please verify your password and try again.');
    err.code = 'auth/wrong-password';
    throw err;
  }
  return {
    uid: 'user_' + matched.identifier.toLowerCase(),
    email: matched.email,
    displayName: matched.displayName,
    isDemo: true,
  };
}

function isValidAuthorizedUser(accounts, user) {
  if (!user) return false;
  const userName = (user.displayName || '').trim().toLowerCase();
  const userEmail = (user.email || '').trim().toLowerCase();
  return accounts.some(
    (acc) =>
      acc.identifier.trim().toLowerCase() === userName ||
      acc.email.trim().toLowerCase() === userEmail ||
      acc.identifier.trim().toLowerCase() === userEmail.split('@')[0]
  );
}

// 6a. Authorized login with PLUCK and AAA succeeds
const successUser = mockLogin(AUTHORIZED_ACCOUNTS, 'PLUCK', 'AAA');
assert.strictEqual(successUser.displayName, 'PLUCK');
assert.strictEqual(successUser.email, 'pluck@routewise.in');

// 6b. Case-insensitive ID 'pluck' succeeds
const lowerUser = mockLogin(AUTHORIZED_ACCOUNTS, 'pluck', 'AAA');
assert.strictEqual(lowerUser.displayName, 'PLUCK');

// 6c. Unauthorized ID 'svdv' with password '....' MUST BE REJECTED
assert.throws(
  () => mockLogin(AUTHORIZED_ACCOUNTS, 'svdv', '....'),
  (err) => err.code === 'auth/user-not-found',
  'Random credentials like svdv must be rejected'
);

// 6d. Correct ID 'PLUCK' with wrong password 'BBB' MUST BE REJECTED
assert.throws(
  () => mockLogin(AUTHORIZED_ACCOUNTS, 'PLUCK', 'BBB'),
  (err) => err.code === 'auth/wrong-password',
  'Wrong password for PLUCK must be rejected'
);

// 6e. Invalidate bogus session like 'svdv'
assert.strictEqual(isValidAuthorizedUser(AUTHORIZED_ACCOUNTS, { displayName: 'svdv', email: 'svdv@routewise.in' }), false);
assert.strictEqual(isValidAuthorizedUser(AUTHORIZED_ACCOUNTS, { displayName: 'PLUCK', email: 'pluck@routewise.in' }), true);

console.log('✓ Strict credential rejection (svdv rejected, PLUCK / AAA verified) passed');

console.log('--- All 6 Offline Test Suites Passed Successfully ---');
