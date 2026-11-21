/**
 * Vazhikatti PWA Service
 * Handles Service Worker registration, updates, installation prompts (Android beforeinstallprompt),
 * iOS Safari Add to Home Screen detection, and standalone state.
 */

export interface PWAInstallChoice {
  outcome: 'accepted' | 'dismissed';
  platform: string;
}

// Track beforeinstallprompt event globally across module
let deferredPrompt: any = null;
let promptListeners: Set<() => void> = new Set();
let isAppInstalled = false;

// Initialize global event listeners immediately
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    // Prevent default mini-infobar from appearing automatically on mobile
    e.preventDefault();
    deferredPrompt = e;
    promptListeners.forEach((listener) => listener());
    console.log('[Vazhikatti PWA] beforeinstallprompt event captured and deferred');
  });

  window.addEventListener('appinstalled', () => {
    isAppInstalled = true;
    deferredPrompt = null;
    promptListeners.forEach((listener) => listener());
    console.log('[Vazhikatti PWA] Application was successfully installed');
  });
}

/**
 * Checks whether the app is currently running in standalone (installed) mode
 */
export function isRunningStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.startsWith('android-app://') ||
    isAppInstalled
  );
}

/**
 * Checks whether the current device is running Apple iOS (iPhone/iPad/iPod)
 */
export function isIOSDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(ua);
  const isIpadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return isIos || isIpadOs;
}

/**
 * Checks whether the user is on mobile Safari (where Add to Home Screen works on iOS)
 */
export function isIOSSafari(): boolean {
  if (!isIOSDevice()) return false;
  const ua = navigator.userAgent.toLowerCase();
  const isNotChrome = !ua.includes('crios');
  const isNotFirefox = !ua.includes('fxios');
  const isNotOpera = !ua.includes('opios');
  const isSafari = ua.includes('safari') && !ua.includes('edgiOS');
  return isSafari && isNotChrome && isNotFirefox && isNotOpera;
}

/**
 * Checks whether the current device is Android
 */
export function isAndroidDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return /android/.test(navigator.userAgent.toLowerCase());
}

/**
 * Returns whether an installation prompt is available
 */
export function canTriggerNativeInstall(): boolean {
  return Boolean(deferredPrompt && !isRunningStandalone());
}

/**
 * Triggers the browser's native beforeinstallprompt dialog
 */
export async function promptNativeInstall(): Promise<PWAInstallChoice | null> {
  if (!deferredPrompt) {
    return null;
  }
  try {
    const promptEvent = deferredPrompt;
    await promptEvent.prompt();
    const choiceResult: PWAInstallChoice = await promptEvent.userChoice;
    if (choiceResult.outcome === 'accepted') {
      deferredPrompt = null;
      isAppInstalled = true;
    }
    promptListeners.forEach((listener) => listener());
    return choiceResult;
  } catch (err) {
    console.warn('[Vazhikatti PWA] Prompt install exception:', err);
    return null;
  }
}

/**
 * Registers callback for install prompt readiness changes
 */
export function onInstallPromptChange(callback: () => void): () => void {
  promptListeners.add(callback);
  return () => {
    promptListeners.delete(callback);
  };
}

/**
 * Registers the Service Worker and sets up update listeners
 */
export function registerServiceWorker(onUpdateFound?: () => void): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    const swUrl = '/sw.js';

    navigator.serviceWorker
      .register(swUrl, { scope: '/' })
      .then((registration) => {
        console.log('[Vazhikatti PWA] Service Worker registered with scope:', registration.scope);

        // Check for updates periodically (every 1 hour)
        setInterval(() => {
          registration.update().catch(() => {});
        }, 60 * 60 * 1000);

        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // New update available
                console.log('[Vazhikatti PWA] New update is available');
                onUpdateFound?.();
              } else {
                // Content cached for offline use for the first time
                console.log('[Vazhikatti PWA] Content is cached for offline use');
              }
            }
          });
        });
      })
      .catch((error) => {
        console.warn('[Vazhikatti PWA] Service Worker registration failed:', error);
      });
  });

  // Reload window when new service worker takes over
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

/**
 * Forces the waiting Service Worker to activate and update the app
 */
export function applyAppUpdate(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    window.location.reload();
    return;
  }

  navigator.serviceWorker.getRegistration().then((reg) => {
    if (reg && reg.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  });
}
