import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '../config/firebase';
import { triggerGoogleSignInPopup } from './googleAuth';

import { getBackendUrl, getBackendCandidateUrls } from './tripService';
export { getBackendUrl, getBackendCandidateUrls };

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  username?: string;
  isDemo?: boolean;
  token?: string;
}

const AUTH_STORAGE_KEY = 'routewise_user_session';

/**
 * Check if the user object has valid credentials and has not expired
 */
export function isValidAuthorizedUser(user: AuthUser | null): boolean {
  if (!user || (!user.uid && !user.email)) return false;

  // Check token expiration if JWT token is stored
  if (user.token) {
    try {
      const parts = user.token.split('.');
      if (parts.length === 3) {
        // Base64Url decode without external library
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const payload = JSON.parse(jsonPayload);
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
          return false; // Token expired
        }
      }
    } catch {
      // In case of unparseable token format, consider invalid
      return false;
    }
  }

  return true;
}

/**
 * Retrieve active session from localStorage if present and valid
 */
export function getSavedDemoUser(): AuthUser | null {
  try {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!saved) return null;
    const user: AuthUser = JSON.parse(saved);
    if (isValidAuthorizedUser(user)) {
      return user;
    }
    clearDemoUser();
    return null;
  } catch {
    clearDemoUser();
    return null;
  }
}

/**
 * Save user session to localStorage (NEVER stores passwords)
 */
export function saveDemoUser(user: AuthUser): void {
  try {
    // Ensure passwords or raw secrets are never persisted
    const safeUser: AuthUser = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      username: user.username,
      photoURL: user.photoURL || null,
      isDemo: user.isDemo,
      token: user.token,
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(safeUser));
  } catch {}
}

/**
 * Clear user session from localStorage
 */
export function clearDemoUser(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {}
}

/**
 * Maps raw Firebase authentication error codes to user-friendly messages
 */
export function getAuthErrorMessage(error: unknown): string {
  if (!error) return 'An unknown error occurred.';

  const errObj = error as { code?: string; message?: string };
  const code = errObj.code || '';

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
      return errObj.message || 'Authentication failed. Please check your credentials and try again.';
  }
}

/**
 * Register a new user with email, password, and display name.
 * Connects to the central backend API and returns authenticated user with token.
 * Throws an error on duplicate registrations or validation failures.
 */
/**
 * Attempt a fetch against candidate backend URLs with automatic fallback.
 * Allows seamless connection to local backend or cloud backend.
 */
async function fetchWithBackendCandidates(
  path: string,
  options: RequestInit,
  timeoutMs: number = 10000
): Promise<Response> {
  const candidateUrls = getBackendCandidateUrls();
  let lastError: any = null;

  for (const baseUrl of candidateUrls) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(`${baseUrl}${path}`, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timer);
      return res;
    } catch (err: any) {
      console.warn(`[RouteWise Auth] Attempt to ${baseUrl}${path} failed:`, err?.message || err);
      lastError = err;
    }
  }

  throw lastError || new Error('Unable to connect to the authentication server.');
}

export async function registerWithEmail(
  email: string,
  pass: string,
  displayName: string,
  username?: string
): Promise<AuthUser> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) {
    throw new Error('Email address is required.');
  }
  if (!pass) {
    throw new Error('Password is required.');
  }
  if (pass.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  // 1. Firebase Auth (if configured)
  if (isFirebaseConfigured && auth) {
    const credential = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
    if (displayName && credential.user) {
      await updateProfile(credential.user, { displayName });
    }
    const authUser: AuthUser = {
      uid: credential.user.uid,
      email: credential.user.email,
      displayName: credential.user.displayName || displayName,
      username: username?.trim() || email.trim().split('@')[0],
      photoURL: credential.user.photoURL,
    };
    saveDemoUser(authUser);
    return authUser;
  }

  // 2. Real Central Backend Registration
  let res: Response;
  try {
    res = await fetchWithBackendCandidates('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        password: pass,
        displayName,
        username: username?.trim() || undefined,
      }),
    });
  } catch (err: any) {
    console.error('[RouteWise Auth] Registration connection failed:', err);
    throw new Error('Unable to connect to the authentication server. Please check your internet connection and try again.');
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const msg = data?.error || `Registration failed (Status ${res.status}).`;
    throw new Error(msg);
  }

  if (!data?.success || !data?.user) {
    throw new Error('Registration failed. Invalid response from authentication server.');
  }

  const authUser: AuthUser = {
    uid: data.user.uid,
    email: data.user.email,
    displayName: data.user.displayName || displayName,
    username: data.user.username,
    token: data.token,
    photoURL: null,
  };

  saveDemoUser(authUser);
  return authUser;
}

/**
 * Sign in existing user with email/ID and password.
 * Connects to the central backend API and strictly validates credentials.
 * Rejects invalid credentials and never creates dummy users.
 */
export async function loginWithEmail(
  identifier: string,
  pass: string,
  rememberMe: boolean = true
): Promise<AuthUser> {
  const trimmedId = identifier.trim();
  if (!trimmedId) {
    throw new Error('User ID or Email is required.');
  }
  if (!pass) {
    throw new Error('Password is required.');
  }

  // 1. Firebase Auth (if configured)
  if (isFirebaseConfigured && auth) {
    const isEmail = trimmedId.includes('@');
    const normalizedEmail = isEmail ? trimmedId.toLowerCase() : `${trimmedId}@routewise.in`;
    const displayName = isEmail ? trimmedId.split('@')[0] : trimmedId;
    const persistenceType = rememberMe ? browserLocalPersistence : browserSessionPersistence;
    await setPersistence(auth, persistenceType);
    const credential = await signInWithEmailAndPassword(auth, normalizedEmail, pass);
    const authUser: AuthUser = {
      uid: credential.user.uid,
      email: credential.user.email,
      displayName: credential.user.displayName || displayName,
      username: isEmail ? credential.user.email?.split('@')[0] : trimmedId,
      photoURL: credential.user.photoURL,
    };
    if (rememberMe) {
      saveDemoUser(authUser);
    } else {
      clearDemoUser();
    }
    return authUser;
  }

  // 2. Real Central Backend Login
  let res: Response;
  try {
    res = await fetchWithBackendCandidates('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: trimmedId, password: pass }),
    });
  } catch (err: any) {
    console.error('[RouteWise Auth] Login connection failed:', err);
    throw new Error('Unable to connect to the authentication server. Please check your internet connection and verify the backend is running.');
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const defaultMsg = res.status === 401
      ? 'Invalid credentials. Please verify your username/email and password.'
      : `Authentication failed (Status ${res.status}).`;
    const msg = data?.error || defaultMsg;
    throw new Error(msg);
  }

  if (!data?.success || !data?.user) {
    throw new Error('Authentication failed. Invalid response from server.');
  }

  const authUser: AuthUser = {
    uid: data.user.uid,
    email: data.user.email,
    displayName: data.user.displayName || data.user.username || trimmedId,
    username: data.user.username,
    token: data.token,
    photoURL: null,
  };

  if (rememberMe) {
    saveDemoUser(authUser);
  } else {
    clearDemoUser();
  }

  return authUser;
}

/**
 * Verify current session with the backend.
 * Returns:
 * - true: Session confirmed valid by backend.
 * - false: Session explicitly expired or invalid (safe to clear).
 * - null: Backend cold-starting, rate-limited, or network offline (PRESERVE local session!).
 */
export async function verifyBackendSession(token: string): Promise<boolean | null> {
  if (!token) return false;

  // Check client-side expiration first
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const payload = JSON.parse(jsonPayload);
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return false; // Token has expired
      }
    }
  } catch {
    return false;
  }

  try {
    const res = await fetchWithBackendCandidates(
      '/api/auth/me',
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      8000
    );

    if (res.ok) {
      return true;
    }

    // 401 Unauthorized handling
    if (res.status === 401) {
      try {
        const body = await res.json();
        if (body?.error && (body.error.includes('expired') || body.error.includes('Invalid or expired token'))) {
          return false;
        }
      } catch {}
      // Preserve session if server returned generic 401 during boot/sync
      return null;
    }

    // 500, 502, 503, 504: server waking up on Render
    // NEVER invalidate session while server is starting
    return null;
  } catch {
    // Network offline or cold-start timeout - preserve session
    return null;
  }
}

/**
 * Sign in or register using official Google OAuth 2.0 / OpenID Connect.
 * Uses Google Identity Services to open Google's secure popup,
 * verifies the token on the central backend, links or creates the database account,
 * and issues the application's authenticated session token.
 */
export async function signInWithGoogle(): Promise<AuthUser> {
  // 1. If Firebase is configured with real credentials, allow Firebase Google auth
  if (isFirebaseConfigured && auth) {
    try {
      const credential = await signInWithPopup(auth, googleProvider);
      const idToken = await credential.user.getIdToken();

      // Forward Google ID token to central backend for verification and account registration
      const res = await fetchWithBackendCandidates(
        '/api/auth/google',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        },
        12000
      );

      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && data?.user && data?.token) {
        const authUser: AuthUser = {
          uid: data.user.uid,
          email: data.user.email,
          displayName: data.user.displayName || credential.user.displayName,
          username: data.user.username,
          token: data.token,
          photoURL: data.user.photoURL || credential.user.photoURL,
          isDemo: false,
        };
        saveDemoUser(authUser);
        return authUser;
      }
    } catch (fbErr: any) {
      if (fbErr?.code === 'auth/popup-closed-by-user') {
        throw new Error('Google sign-in was canceled before completion.');
      }
      if (fbErr?.code === 'auth/popup-blocked') {
        throw new Error('Google sign-in popup was blocked by your browser. Please allow popups and try again.');
      }
      console.warn('[RouteWise Auth] Firebase popup fallback failed, trying direct Google Identity Services:', fbErr);
    }
  }

  // 2. Direct Official Google Identity Services OAuth 2.0 Flow
  const googleTokens = await triggerGoogleSignInPopup();

  // Send to backend for official token verification, account registration, and session token issuance
  let res: Response;
  try {
    res = await fetchWithBackendCandidates(
      '/api/auth/google',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: googleTokens.accessToken,
          credential: googleTokens.credential,
          code: googleTokens.code,
        }),
      },
      12000
    );
  } catch (netErr: any) {
    console.error('[RouteWise Auth] Backend Google auth connection failed:', netErr);
    throw new Error('Unable to connect to the authentication server. Please check your internet connection.');
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const errorMsg = data?.error || `Google authentication failed (Status ${res.status}).`;
    throw new Error(errorMsg);
  }

  if (!data?.success || !data?.token || !data?.user) {
    throw new Error('Google authentication failed. Invalid response from authentication server.');
  }

  const authUser: AuthUser = {
    uid: data.user.uid,
    email: data.user.email,
    displayName: data.user.displayName || data.user.username,
    username: data.user.username,
    token: data.token,
    photoURL: data.user.photoURL || null,
    isDemo: false,
  };

  saveDemoUser(authUser);
  return authUser;
}

/**
 * Quick 1-click Demo Login helper
 */
export async function quickDemoLogin(): Promise<AuthUser> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const demoUser: AuthUser = {
    uid: 'demo_guest_user',
    email: 'guest.traveler@routewise.in',
    displayName: 'Aarav (Guest Traveler)',
    photoURL: null,
    isDemo: true,
  };
  saveDemoUser(demoUser);
  return demoUser;
}

/**
 * Sign out current user
 */
export async function logout(): Promise<void> {
  clearDemoUser();
  if (auth && isFirebaseConfigured) {
    await signOut(auth);
  }
}

/**
 * Send password reset email
 */
export async function requestPasswordReset(email: string): Promise<void> {
  if (!isFirebaseConfigured || !auth) {
    // Simulate brief network delay and success
    await new Promise((resolve) => setTimeout(resolve, 400));
    return;
  }

  return sendPasswordResetEmail(auth, email);
}
