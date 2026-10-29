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

import { getBackendUrl } from './tripService';

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
export async function registerWithEmail(
  email: string,
  pass: string,
  displayName: string
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
      photoURL: credential.user.photoURL,
    };
    saveDemoUser(authUser);
    return authUser;
  }

  // 2. Real Central Backend Registration
  const backendUrl = getBackendUrl();
  let res: Response;
  try {
    res = await fetch(`${backendUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password: pass, displayName }),
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
    const normalizedEmail = isEmail ? trimmedId : `${trimmedId.toLowerCase()}@routewise.in`;
    const displayName = isEmail ? trimmedId.split('@')[0] : trimmedId;
    const persistenceType = rememberMe ? browserLocalPersistence : browserSessionPersistence;
    await setPersistence(auth, persistenceType);
    const credential = await signInWithEmailAndPassword(auth, normalizedEmail, pass);
    const authUser: AuthUser = {
      uid: credential.user.uid,
      email: credential.user.email,
      displayName: credential.user.displayName || displayName,
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
  const backendUrl = getBackendUrl();
  let res: Response;
  try {
    res = await fetch(`${backendUrl}/api/auth/login`, {
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
 * Verify current session with the backend
 */
export async function verifyBackendSession(token: string): Promise<boolean> {
  try {
    const backendUrl = getBackendUrl();
    const res = await fetch(`${backendUrl}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Sign in or sign up with Google popup.
 * If Firebase is not configured, logs in with a Google demo user profile.
 */
export async function signInWithGoogle(): Promise<AuthUser> {
  if (!isFirebaseConfigured || !auth) {
    // Seamless local fallback
    await new Promise((resolve) => setTimeout(resolve, 400));
    const demoUser: AuthUser = {
      uid: 'google_demo_101',
      email: 'traveler.mumbai@gmail.com',
      displayName: 'Mumbai Traveler',
      photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
      isDemo: true,
    };
    saveDemoUser(demoUser);
    return demoUser;
  }

  const credential = await signInWithPopup(auth, googleProvider);
  return {
    uid: credential.user.uid,
    email: credential.user.email,
    displayName: credential.user.displayName,
    photoURL: credential.user.photoURL,
  };
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
