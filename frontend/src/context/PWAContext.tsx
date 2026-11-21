import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  isRunningStandalone,
  isIOSDevice,
  isIOSSafari,
  isAndroidDevice,
  canTriggerNativeInstall,
  promptNativeInstall,
  onInstallPromptChange,
  registerServiceWorker,
  applyAppUpdate,
} from '../services/pwaService';

export interface PWAContextType {
  isInstalled: boolean;
  canInstall: boolean;
  isIOS: boolean;
  isIOSSafari: boolean;
  isAndroid: boolean;
  hasUpdate: boolean;
  isInstallModalOpen: boolean;
  openInstallModal: () => void;
  closeInstallModal: () => void;
  promptInstall: () => Promise<void>;
  applyUpdate: () => void;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

export const PWAProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [canInstall, setCanInstall] = useState<boolean>(false);
  const [hasUpdate, setHasUpdate] = useState<boolean>(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);

  const isIOS = isIOSDevice();
  const isSafari = isIOSSafari();
  const isAndroid = isAndroidDevice();

  useEffect(() => {
    // 1. Initial check for standalone state
    const standalone = isRunningStandalone();
    setIsInstalled(standalone);
    setCanInstall(canTriggerNativeInstall());

    // 2. Listen for display-mode media query changes (when user installs)
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayChange = (e: MediaQueryListEvent) => {
      setIsInstalled(e.matches);
      if (e.matches) {
        setCanInstall(false);
      }
    };
    mediaQuery.addEventListener?.('change', handleDisplayChange);

    // 3. Listen for install prompt readiness changes
    const unsubscribePrompt = onInstallPromptChange(() => {
      const isStandalone = isRunningStandalone();
      setIsInstalled(isStandalone);
      setCanInstall(canTriggerNativeInstall());
    });

    // 4. Register Service Worker with update detection
    registerServiceWorker(() => {
      setHasUpdate(true);
    });

    return () => {
      mediaQuery.removeEventListener?.('change', handleDisplayChange);
      unsubscribePrompt();
    };
  }, []);

  const openInstallModal = useCallback(() => {
    setIsInstallModalOpen(true);
  }, []);

  const closeInstallModal = useCallback(() => {
    setIsInstallModalOpen(false);
  }, []);

  const promptInstall = useCallback(async () => {
    if (canTriggerNativeInstall()) {
      const choice = await promptNativeInstall();
      if (choice?.outcome === 'accepted') {
        setIsInstalled(true);
        setCanInstall(false);
        setIsInstallModalOpen(false);
      }
    } else {
      // If native prompt is unavailable (e.g. iOS or manual browser), open the visual guide modal
      setIsInstallModalOpen(true);
    }
  }, []);

  const handleApplyUpdate = useCallback(() => {
    applyAppUpdate();
  }, []);

  return (
    <PWAContext.Provider
      value={{
        isInstalled,
        canInstall,
        isIOS,
        isIOSSafari: isSafari,
        isAndroid,
        hasUpdate,
        isInstallModalOpen,
        openInstallModal,
        closeInstallModal,
        promptInstall,
        applyUpdate: handleApplyUpdate,
      }}
    >
      {children}
    </PWAContext.Provider>
  );
};

export function usePWA(): PWAContextType {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
}
