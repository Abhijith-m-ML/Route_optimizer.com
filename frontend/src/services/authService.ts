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

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  isDemo?: boolean;
}

export interface StoredAccount {
  identifier: string;
  email: string;
  password: string;
  displayName: string;
}

const DEMO_STORAGE_KEY = 'routewise_demo_session';
const ACCOUNTS_STORAGE_KEY = 'routewise_registered_accounts';

export const AUTHORIZED_ACCOUNTS: StoredAccount[] = [
  {
    identifier: 'PLUCK',
    email: 'pluck@routewise.in',
    password: 'AAA',
    displayName: 'PLUCK',
  },
];

export function getRegisteredAccounts(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    const custom: StoredAccount[] = raw ? JSON.parse(raw) : [];
    const combined = [...AUTHORIZED_ACCOUNTS];
    for (const item of custom) {
      if (!combined.some((a) => a.identifier.toLowerCase() === item.identifier.toLowerCase())) {
        combined.push(item);
      }
    }
    return combined;
  } catch {
    return AUTHORIZED_ACCOUNTS;
  }
}

export function saveRegisteredAccount(account: StoredAccount): void {
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    const custom: StoredAccount[] = raw ? JSON.parse(raw) : [];
    const index = custom.findIndex(
      (a) =>
        a.identifier.toLowerCase() === account.identifier.toLowerCase() ||
        a.email.toLowerCase() === account.email.toLowerCase()
    );
    if (index >= 0) {
      custom[index] = account;
    } else {
      custom.push(account);
    }
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(custom));
  } catch (err) {
    console.error('Failed to save account:', err);
  }
}

export function isValidAuthorizedUser(user: AuthUser | null): boolean {
  if (!user) return false;
  const accounts = getRegisteredAccounts();
  const userName = (user.displayName || '').trim().toLowerCase();
  const userEmail = (user.email || '').trim().toLowerCase();
  return accounts.some(
    (acc) =>
      acc.identifier.trim().toLowerCase() === userName ||
      acc.email.trim().toLowerCase() === userEmail ||
      acc.identifier.trim().toLowerCase() === userEmail.split('@')[0]
  );
}

/**
 * Retrieve active demo session from localStorage if present and valid
 */
export function getSavedDemoUser(): AuthUser | null {
  try {
    const saved = localStorage.getItem(DEMO_STORAGE_KEY);
    if (!saved) return null;
    const user: AuthUser = JSON.parse(saved);
    if (isValidAuthorizedUser(user)) {
      return user;
    }
    // Remove unauthorized/stale sessions (such as random test logins)
    localStorage.removeItem(DEMO_STORAGE_KEY);
    return null;
  } catch {
    return null;
  }
}

/**
 * Save demo session to localStorage
 */
export function saveDemoUser(user: AuthUser): void {
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(user));
}

/**
 * Clear demo session
 */
export function clearDemoUser(): void {
  localStorage.removeItem(DEMO_STORAGE_KEY);
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
 * If Firebase is not configured, provides a seamless local demo registration.
 */
export async function registerWithEmail(
  email: string,
  pass: string,
  displayName: string
): Promise<AuthUser> {
  if (!isFirebaseConfigured || !auth) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    const accounts = getRegisteredAccounts();
    const cleanEmail = email.trim().toLowerCase();
    const cleanId = email.includes('@') ? email.split('@')[0].toLowerCase() : email.trim().toLowerCase();

    const exists = accounts.some(
      (a) => a.email.toLowerCase() === cleanEmail || a.identifier.toLowerCase() === cleanId
    );
    if (exists) {
      const err = new Error('An account with this email address or ID already exists. Please log in instead.');
      (err as { code?: string }).code = 'auth/email-already-in-use';
      throw err;
    }

    const newAccount: StoredAccount = {
      identifier: email.includes('@') ? email.split('@')[0] : email.trim(),
      email: email.includes('@') ? email.trim() : `${email.trim().toLowerCase()}@routewise.in`,
      password: pass,
      displayName: displayName.trim() || (email.includes('@') ? email.split('@')[0] : email.trim()),
    };
    saveRegisteredAccount(newAccount);

    const demoUser: AuthUser = {
      uid: 'user_' + Date.now(),
      email: newAccount.email,
      displayName: newAccount.displayName,
      photoURL: null,
      isDemo: true,
    };
    saveDemoUser(demoUser);
    return demoUser;
  }

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

/**
 * Sign in existing user with email/ID and password.
 * Strictly verifies credentials against authorized accounts (e.g. PLUCK / AAA)
 * or registered accounts.
 */
export async function loginWithEmail(
  identifier: string,
  pass: string,
  rememberMe: boolean = true
): Promise<AuthUser> {
  const isEmail = identifier.includes('@');
  const normalizedEmail = isEmail ? identifier : `${identifier.toLowerCase()}@routewise.in`;
  const displayName = isEmail ? identifier.split('@')[0] : identifier;

  if (!isFirebaseConfigured || !auth) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    const accounts = getRegisteredAccounts();
    const cleanInputId = identifier.trim().toLowerCase();

    // Find account by either ID or Email (case-insensitive)
    const matchedAccount = accounts.find(
      (acc) =>
        acc.identifier.trim().toLowerCase() === cleanInputId ||
        acc.email.trim().toLowerCase() === cleanInputId
    );

    if (!matchedAccount) {
      const err = new Error('Invalid ID or email address. Please check your credentials and try again.');
      (err as { code?: string }).code = 'auth/user-not-found';
      throw err;
    }

    // Verify exact password match
    if (matchedAccount.password !== pass) {
      const err = new Error('Incorrect password. Please verify your password and try again.');
      (err as { code?: string }).code = 'auth/wrong-password';
      throw err;
    }

    const authorizedUser: AuthUser = {
      uid: 'user_' + matchedAccount.identifier.toLowerCase(),
      email: matchedAccount.email,
      displayName: matchedAccount.displayName,
      photoURL: null,
      isDemo: true,
    };

    if (rememberMe) {
      saveDemoUser(authorizedUser);
    }
    return authorizedUser;
  }

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
