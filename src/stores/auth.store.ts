import { create } from 'zustand';
import { ModemCredentials } from '@/types';
import {
  saveCredentials,
  getCredentials,
  deleteCredentials,
  saveSessionState,
  isSessionLikelyValid,
  updateSessionActivity
} from '@/utils/storage';
import { ModemAPIClient } from '@/services/api.service';
import { DirectAuthService } from '@/services/direct-auth.service';

// Session keep-alive interval (2 minutes)
const SESSION_KEEPALIVE_INTERVAL_MS = 2 * 60 * 1000;

interface AuthState {
  isAuthenticated: boolean;
  credentials: ModemCredentials | null;
  isLoading: boolean;
  isAutoLogging: boolean;
  isRelogging: boolean; // Flag to prevent multiple re-login attempts
  sessionExpired: boolean; // Flag to indicate session needs re-login
  error: string | null;
  keepAliveIntervalId: NodeJS.Timeout | null; // For session keep-alive

  login: (credentials: ModemCredentials) => Promise<void>;
  logout: () => Promise<void>;
  loadCredentials: () => Promise<void>;
  autoLogin: () => Promise<boolean>;
  setError: (error: string | null) => void;
  requestRelogin: () => void; // Request re-login from any tab
  setRelogging: (value: boolean) => void; // Set re-logging state
  clearSessionExpired: () => void; // Clear session expired flag

  // New session management functions
  tryQuietSessionRestore: () => Promise<boolean>; // Try to restore session silently
  tryDirectApiLogin: () => Promise<boolean>; // Try direct API login without WebView
  startSessionKeepAlive: () => void; // Start background keep-alive
  stopSessionKeepAlive: () => void; // Stop background keep-alive
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  credentials: null,
  isLoading: false,
  isAutoLogging: false,
  isRelogging: false,
  sessionExpired: false,
  error: null,
  keepAliveIntervalId: null,

  login: async (credentials: ModemCredentials) => {
    set({ isLoading: true, error: null });
    try {
      const credentialsWithTimestamp = {
        ...credentials,
        lastLogin: Date.now(),
      };
      await saveCredentials(credentialsWithTimestamp);

      // Save session state on successful login
      await saveSessionState({
        lastSuccessfulLogin: Date.now(),
        lastSessionActivity: Date.now(),
        sessionHealthy: true,
      });

      set({
        isAuthenticated: true,
        credentials: credentialsWithTimestamp,
        isLoading: false,
        sessionExpired: false,
        isRelogging: false,
      });

      // Start session keep-alive
      get().startSessionKeepAlive();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Login failed',
        isLoading: false
      });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      // Stop keep-alive before logout
      get().stopSessionKeepAlive();

      await deleteCredentials();
      set({
        isAuthenticated: false,
        credentials: null,
        isLoading: false,
        sessionExpired: false,
        isRelogging: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Logout failed',
        isLoading: false
      });
      throw error;
    }
  },

  loadCredentials: async () => {
    set({ isLoading: true });
    try {
      const credentials = await getCredentials();
      set({
        credentials,
        isAuthenticated: credentials !== null,
        isLoading: false
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load credentials',
        isLoading: false
      });
    }
  },

  setError: (error: string | null) => {
    set({ error });
  },

  requestRelogin: () => {
    const { isRelogging } = get();
    // Only set sessionExpired if not already relogging
    if (!isRelogging) {
      set({ sessionExpired: true });
    }
  },

  setRelogging: (value: boolean) => {
    set({ isRelogging: value });
  },

  clearSessionExpired: () => {
    set({ sessionExpired: false });
  },

  autoLogin: async () => {
    const { credentials } = get();
    if (!credentials) {
      return false;
    }

    set({ isAutoLogging: true, error: null });
    try {
      const apiClient = new ModemAPIClient(credentials.modemIp);
      const success = await apiClient.login(credentials.username, credentials.password);

      if (success) {
        // Update session state on successful auto-login
        await saveSessionState({
          lastSuccessfulLogin: Date.now(),
          lastSessionActivity: Date.now(),
          sessionHealthy: true,
        });

        // Start session keep-alive
        get().startSessionKeepAlive();
      }

      set({ isAutoLogging: false });
      return success;
    } catch (error) {
      set({
        isAutoLogging: false,
        error: error instanceof Error ? error.message : 'Auto-login failed',
      });
      return false;
    }
  },

  // Try to restore session silently without showing any UI
  // Returns true if session is likely valid, false if re-login is needed
  tryQuietSessionRestore: async () => {
    const { credentials, setRelogging } = get();
    if (!credentials) {
      return false;
    }

    // Set relogging state so UI can respond
    setRelogging(true);

    // First, check if session is likely still valid based on last activity
    const sessionLikelyValid = await isSessionLikelyValid();

    if (sessionLikelyValid) {
      // Session might still be valid, try a quick API call to verify
      try {
        const apiClient = new ModemAPIClient(credentials.modemIp);
        const isLoggedIn = await apiClient.isLoggedIn();

        if (isLoggedIn) {
          // Session is valid, update activity timestamp
          await updateSessionActivity();
          get().startSessionKeepAlive();
          setRelogging(false);
          return true;
        }
      } catch (error) {
        // API call failed, session likely expired
      }
    }

    // SCRAM disabled - still fails with 108006. ModemAPIClient password_type 4 works.
    // TODO: Fix SCRAM client proof calculation
    // try {
    //   console.log('[Auth] Trying Direct SCRAM API login...');
    //   const directAuth = new DirectAuthService(credentials.modemIp);
    //   await directAuth.login(credentials.password, credentials.username);
    //   await saveSessionState({
    //     lastSuccessfulLogin: Date.now(),
    //     lastSessionActivity: Date.now(),
    //     sessionHealthy: true,
    //   });
    //   get().startSessionKeepAlive();
    //   console.log('[Auth] Direct SCRAM login successful!');
    //   return true;
    // } catch (error: any) {
    //   console.log('[Auth] Direct SCRAM login failed:', error.message);
    // }

    // Try ModemAPIClient password_type 4 method (this works!)
    try {
      console.log('[Auth] Trying ModemAPIClient login...');
      const apiClient = new ModemAPIClient(credentials.modemIp);
      const success = await apiClient.login(credentials.username, credentials.password);

      if (success) {
        await saveSessionState({
          lastSuccessfulLogin: Date.now(),
          lastSessionActivity: Date.now(),
          sessionHealthy: true,
        });
        get().startSessionKeepAlive();
        console.log('[Auth] ModemAPIClient login successful!');
        setRelogging(false);
        return true;
      }
    } catch (error) {
      // Direct login failed
    }

    // All silent methods failed, need WebView
    console.log('[Auth] All direct methods failed, WebView required');
    setRelogging(false);
    return false;
  },

  // Try direct API login without WebView (exposed for manual use)
  tryDirectApiLogin: async () => {
    const { credentials } = get();
    if (!credentials) {
      return false;
    }

    try {
      console.log('[Auth] Manual Direct SCRAM API login...');
      const directAuth = new DirectAuthService(credentials.modemIp);
      await directAuth.login(credentials.password, credentials.username);

      await saveSessionState({
        lastSuccessfulLogin: Date.now(),
        lastSessionActivity: Date.now(),
        sessionHealthy: true,
      });
      get().startSessionKeepAlive();
      console.log('[Auth] Manual Direct SCRAM login successful!');
      return true;
    } catch (error: any) {
      console.log('[Auth] Manual Direct SCRAM login failed:', error.message);
      return false;
    }
  },

  // Start background session keep-alive
  startSessionKeepAlive: () => {
    const { credentials, keepAliveIntervalId } = get();

    // Clear existing interval if any
    if (keepAliveIntervalId) {
      clearInterval(keepAliveIntervalId);
    }

    if (!credentials) return;

    // Set up interval to make a lightweight API call to keep session alive
    const intervalId = setInterval(async () => {
      const { credentials: currentCredentials } = get();
      if (!currentCredentials) {
        get().stopSessionKeepAlive();
        return;
      }

      try {
        const apiClient = new ModemAPIClient(currentCredentials.modemIp);
        // Make a lightweight call to refresh the session
        // getToken internally calls /api/webserver/SesTokInfo which keeps session alive
        await apiClient.isLoggedIn();
      } catch (error) {
        // Silent fail - if session expires, the next data fetch will trigger re-login
      }
    }, SESSION_KEEPALIVE_INTERVAL_MS);

    set({ keepAliveIntervalId: intervalId });
  },

  // Stop background session keep-alive
  stopSessionKeepAlive: () => {
    const { keepAliveIntervalId } = get();
    if (keepAliveIntervalId) {
      clearInterval(keepAliveIntervalId);
      set({ keepAliveIntervalId: null });
    }
  },
}));
