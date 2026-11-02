/**
 * Google Identity Services (GIS) Client Integration
 * Handles official Google OAuth 2.0 / OpenID Connect popup flows in the browser.
 */

interface GoogleAccounts {
  accounts: {
    oauth2: {
      initTokenClient: (config: {
        client_id: string;
        scope: string;
        prompt?: string;
        callback: (response: any) => void;
        error_callback?: (error: any) => void;
      }) => {
        requestAccessToken: () => void;
      };
      initCodeClient: (config: {
        client_id: string;
        scope: string;
        ux_mode?: 'popup' | 'redirect';
        callback: (response: any) => void;
        error_callback?: (error: any) => void;
      }) => {
        requestCode: () => void;
      };
    };
    id: {
      initialize: (config: any) => void;
      prompt: (notification?: any) => void;
      renderButton: (parent: HTMLElement, options: any) => void;
    };
  };
}

let gisScriptPromise: Promise<void> | null = null;

function getGoogleGlobal(): GoogleAccounts | undefined {
  return typeof window !== 'undefined' ? (window as any).google : undefined;
}

/**
 * Dynamically loads the official Google Identity Services client script
 */
export function loadGoogleIdentityServices(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  const google = getGoogleGlobal();
  if (google?.accounts?.oauth2 || google?.accounts?.id) {
    return Promise.resolve();
  }

  if (gisScriptPromise) {
    return gisScriptPromise;
  }

  gisScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () =>
        reject(new Error('Failed to load Google Identity Services library.'))
      );
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(
        new Error(
          'Failed to load Google Identity Services script. Please check your network connection.'
        )
      );
    document.head.appendChild(script);
  });

  return gisScriptPromise;
}

export interface GoogleAuthResponse {
  accessToken?: string;
  credential?: string;
  code?: string;
}

/**
 * Triggers official Google OAuth popup using Google Identity Services.
 * Returns verified access token or credential to send to the central backend.
 */
export async function triggerGoogleSignInPopup(): Promise<GoogleAuthResponse> {
  const configuredId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const clientId = (configuredId && configuredId.trim() !== '' && configuredId !== 'your_google_client_id_here')
    ? configuredId.trim()
    : '995930596730-c05cc5jf07cvlt2j5pm1jnte3ipt0bj0.apps.googleusercontent.com';

  if (!clientId) {
    throw new Error(
      'Google Sign-In is not configured. Please set VITE_GOOGLE_CLIENT_ID in your Vercel / environment configuration.'
    );
  }

  await loadGoogleIdentityServices();

  const google = getGoogleGlobal();
  if (!google?.accounts?.oauth2) {
    throw new Error('Google Identity Services library failed to initialize.');
  }

  return new Promise((resolve, reject) => {
    try {
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId.trim(),
        scope: 'openid email profile',
        prompt: 'select_account',
        callback: (response: any) => {
          if (response.error) {
            if (response.error === 'popup_closed_by_user' || response.error === 'access_denied') {
              reject(new Error('Google sign-in was canceled before completion.'));
            } else {
              reject(new Error(response.error_description || `Google Sign-In failed: ${response.error}`));
            }
            return;
          }

          if (!response.access_token) {
            reject(new Error('No access token received from Google.'));
            return;
          }

          resolve({ accessToken: response.access_token });
        },
        error_callback: (err: any) => {
          if (err?.type === 'popup_closed') {
            reject(new Error('Google sign-in was canceled before completion.'));
          } else if (err?.type === 'popup_failed_to_open') {
            reject(
              new Error(
                'Google sign-in popup was blocked by your browser. Please allow popups and try again.'
              )
            );
          } else {
            reject(new Error(err?.message || 'Failed to open Google Sign-In popup.'));
          }
        },
      });

      tokenClient.requestAccessToken();
    } catch (err: any) {
      reject(err);
    }
  });
}
