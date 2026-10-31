import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../config/firebase';
import {
  registerWithEmail,
  loginWithEmail,
  signInWithGoogle,
  quickDemoLogin,
  logout as authLogout,
  requestPasswordReset,
  getAuthErrorMessage,
  getSavedDemoUser,
  clearDemoUser,
  verifyBackendSession,
  type AuthUser,
} from '../services/authService';

export interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isConfigured: boolean;
  login: (email: string, pass: string, rememberMe?: boolean) => Promise<AuthUser>;
  signup: (email: string, pass: string, displayName: string, username?: string) => Promise<AuthUser>;
  loginWithGoogle: () => Promise<AuthUser>;
  loginDemo: () => Promise<AuthUser>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  formatAuthError: (error: unknown) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // If Firebase is configured, listen to Firebase Auth changes
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        if (currentUser) {
          setUser({
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      });

      return () => unsubscribe();
    }

    // Otherwise, check for local session
    const savedDemo = getSavedDemoUser();
    if (savedDemo) {
      setUser(savedDemo);
      // Asynchronously verify token with backend if present
      if (savedDemo.token && !savedDemo.isDemo) {
        verifyBackendSession(savedDemo.token).then((isValid) => {
          // Only invalidate session if the token is explicitly rejected (HTTP 401)
          // Keep session if backend is warming up or device is temporarily offline
          if (isValid === false) {
            clearDemoUser();
            setUser(null);
          }
        });
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, pass: string, rememberMe: boolean = true) => {
    const authUser = await loginWithEmail(email, pass, rememberMe);
    setUser(authUser);
    return authUser;
  };

  const signup = async (email: string, pass: string, displayName: string, username?: string) => {
    const authUser = await registerWithEmail(email, pass, displayName, username);
    setUser(authUser);
    return authUser;
  };

  const loginWithGoogle = async () => {
    const authUser = await signInWithGoogle();
    setUser(authUser);
    return authUser;
  };

  const loginDemo = async () => {
    const authUser = await quickDemoLogin();
    setUser(authUser);
    return authUser;
  };

  const logout = async () => {
    await authLogout();
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    return requestPasswordReset(email);
  };

  const value: AuthContextType = {
    user,
    loading,
    isConfigured: isFirebaseConfigured,
    login,
    signup,
    loginWithGoogle,
    loginDemo,
    logout,
    resetPassword,
    formatAuthError: getAuthErrorMessage,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
