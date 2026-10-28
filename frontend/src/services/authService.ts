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
}

const AUTH_STORAGE_KEY = 'routewise_user_session';

export function isValidAuthorizedUser(user: AuthUser | null): boolean {
  return Boolean(user && (user.uid || user.email));
}

/**
 * Retrieve active session from localStorage if present
 */
export function getSavedDemoUser(): AuthUser | null {
  try {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!saved) return null;
    const user: AuthUser = JSON.parse(saved);
    if (isValidAuthorizedUser(user)) {
      return user;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Save user session to localStorage
 */
export function saveDemoUser(user: AuthUser): void {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  } catch {}
}

/**
 * Clear user session
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

  const firebaseError = error as { code?: string; message?: string };
  const code = firebaseError.code || '';

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
      return firebaseError.message || 'Authentication failed. Please try again.';
  }
}

/**
 * Register a new user with email, password, and display name.
 * Connects to the central backend API so accounts work across all devices (laptop, phone, etc.).
 */
export async function registerWithEmail(
  email: string,
  pass: string,
  displayName: string
): Promise<AuthUser> {
  if (isFirebaseConfigured && auth) {
    const credential = await createUserWithEmailAndPassword(auth, email, pass);
    if (displayName && credential.user) {
      await updateProfile(credential.user, { displayName });
    }
    return {
      uid: credential.user.uid,
      email: credential.user.email,
      displayName: credential.user.displayName,
      photoURL: credential.user.photoURL,
    };
  }

  // Real Central Backend Registration (Cross-device sync)
  const backendUrl = getBackendUrl();
  const res = await fetch(`${backendUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass, displayName }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to create account. Please try again.');
  }

  const authUser: AuthUser = {
    uid: data.user.uid,
    email: data.user.email,
    displayName: data.user.displayName || displayName,
    username: data.user.username,
    photoURL: null,
  };

  saveDemoUser(authUser);
  return authUser;
}

/**
 * Sign in existing user with email/ID and password.
 * Connects to the central backend API so credentials work on laptop, phone, and tablet.
 */
export async function loginWithEmail(
  identifier: string,
  pass: string,
  rememberMe: boolean = true
): Promise<AuthUser> {
  const isEmail = identifier.includes('@');
  const normalizedEmail = isEmail ? identifier : `${identifier.toLowerCase()}@routewise.in`;
  const displayName = isEmail ? identifier.split('@')[0] : identifier;

  if (isFirebaseConfigured && auth) {
    const persistenceType = rememberMe ? browserLocalPersistence : browserSessionPersistence;
    await setPersistence(auth, persistenceType);
    const credential = await signInWithEmailAndPassword(auth, normalizedEmail, pass);
    return {
      uid: credential.user.uid,
      email: credential.user.email,
      displayName: credential.user.displayName || displayName,
      photoURL: credential.user.photoURL,
    };
  }

  // Real Central Backend Login
  const backendUrl = getBackendUrl();
  const res = await fetch(`${backendUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password: pass }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Invalid credentials. Please verify your email/ID and password.');
  }

  const authUser: AuthUser = {
    uid: data.user.uid,
    email: data.user.email,
    displayName: data.user.displayName || data.user.username || displayName,
    username: data.user.username,
    photoURL: null,
  };

  if (rememberMe) {
    saveDemoUser(authUser);
  }

  return authUser;
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
