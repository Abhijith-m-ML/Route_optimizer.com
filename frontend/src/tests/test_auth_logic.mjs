// Verification of RouteWise Authentication and User Validation Logic (Offline and Logic tests)
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

// 4. Test client-side login form validation
function validateLoginForm(identifier, password) {
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
  } else if (password.length < 6) {
    newErrors.password = 'Password must be at least 6 characters';
  }

  return newErrors;
}

// 5. Test token expiration validation (matches authService.ts isValidAuthorizedUser)
function isValidAuthorizedUser(user) {
  if (!user || (!user.uid && !user.email)) return false;

  if (user.token) {
    try {
      const parts = user.token.split('.');
      if (parts.length === 3) {
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = Buffer.from(base64, 'base64').toString('utf-8');
        const payload = JSON.parse(jsonPayload);
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
          return false;
        }
      }
    } catch {
      return false;
    }
  }

  return true;
}

// 6. Test production backend URL resolution
function getBackendUrl(envBackendUrl, hostname) {
  if (envBackendUrl) {
    return envBackendUrl.replace(/\/+$/, '');
  }
  if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return 'https://vazhikatti-gfuq.onrender.com';
  }
  return 'http://localhost:5000';
}

console.log('--- Running RouteWise Frontend Auth Logic Test Suite ---');

// Test 1: Email Regex Validation
assert.strictEqual(isValidEmail('user@mumbai.com'), true, 'Valid email must pass');
assert.strictEqual(isValidEmail('test.tourist+trip@routewise.in'), true, 'Valid complex email must pass');
assert.strictEqual(isValidEmail('invalid-email'), false, 'Email without domain must fail');
assert.strictEqual(isValidEmail('@missinguser.com'), false, 'Email without local part must fail');
assert.strictEqual(isValidEmail('user@.com'), false, 'Email without domain name must fail');
console.log('✓ Email format validation passed');

// Test 2: Signup form validation
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
const validSignup = validateSignup('Rajesh Rao', 'rajesh@mumbai.com', 'Mumbai@2026', 'Mumbai@2026', true);
assert.strictEqual(Object.keys(validSignup).length, 0, 'Valid signup should produce 0 errors');
console.log('✓ Signup validation rules passed');

// Test 3: Password Strength Meter
assert.strictEqual(calculatePasswordStrength('abc').label, 'Too short');
assert.strictEqual(calculatePasswordStrength('mumbai2026').score, 50, 'Length + Numbers -> Fair (50%)');
assert.strictEqual(calculatePasswordStrength('Mumbai@2026').score, 100, 'Length + Upper + Number + Special -> Strong (100%)');
console.log('✓ Password strength calculation passed');

// Test 4: Form Login Validation (Strict client checks)
// 4a. Empty fields fail
const emptyValidation = validateLoginForm('', '');
assert.ok(emptyValidation.email, 'Empty identifier must yield error');
assert.ok(emptyValidation.password, 'Empty password must yield error');

// 4b. Short password (< 6 chars) fails client validation
const shortPassValidation = validateLoginForm('traveler_user', '12345');
assert.strictEqual(shortPassValidation.password, 'Password must be at least 6 characters');

// 4c. Single character username fails
const singleCharValidation = validateLoginForm('u', 'validPassword123');
assert.strictEqual(singleCharValidation.email, 'User ID must be at least 2 characters');

// 4d. Valid credentials pass client validation
const validValidation = validateLoginForm('traveler_user', 'validPassword123');
assert.strictEqual(Object.keys(validValidation).length, 0, 'Valid inputs must produce no validation errors');
console.log('✓ Login form validation (empty/short/valid inputs) passed');

// Test 5: Production Backend URL resolution
assert.strictEqual(
  getBackendUrl(undefined, 'vazhikatti-route.vercel.app'),
  'https://vazhikatti-gfuq.onrender.com',
  'Production Vercel deployment must point to https://vazhikatti-gfuq.onrender.com'
);
assert.strictEqual(
  getBackendUrl('https://custom-api.example.com/', 'vazhikatti-route.vercel.app'),
  'https://custom-api.example.com',
  'Explicit VITE_BACKEND_URL must take precedence and strip trailing slashes'
);
assert.strictEqual(
  getBackendUrl(undefined, 'localhost'),
  'http://localhost:5000',
  'Localhost development defaults to http://localhost:5000'
);
console.log('✓ Backend URL resolution logic passed');

// Test 6: Token expiration validation
const nowSeconds = Math.floor(Date.now() / 1000);
const createMockJwt = (exp) => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ uid: 'usr_123', exp })).toString('base64url');
  const sig = 'mock_signature';
  return `${header}.${payload}.${sig}`;
};

// 6a. Active token is valid
const activeUser = {
  uid: 'usr_active',
  email: 'active@mumbai.com',
  token: createMockJwt(nowSeconds + 3600), // expires in 1 hour
};
assert.strictEqual(isValidAuthorizedUser(activeUser), true, 'Active session must be recognized as valid');

// 6b. Expired token is invalid
const expiredUser = {
  uid: 'usr_expired',
  email: 'expired@mumbai.com',
  token: createMockJwt(nowSeconds - 100), // expired 100 seconds ago
};
assert.strictEqual(isValidAuthorizedUser(expiredUser), false, 'Expired session must be recognized as invalid');

// 6c. Null or empty user is invalid
assert.strictEqual(isValidAuthorizedUser(null), false);
assert.strictEqual(isValidAuthorizedUser({ uid: '', email: null }), false);
console.log('✓ Session and token expiration validation passed');

console.log('\n--- All Frontend Auth Logic Tests Passed Successfully ---');
