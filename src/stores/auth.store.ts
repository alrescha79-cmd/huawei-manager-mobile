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
import { networkService } from '@/services/network.service';

const SESSION_KEEPALIVE_INTERVAL_MS = 2 * 60 * 1000;

interface AuthState {
  isAuthenticated: boolean;
  credentials: ModemCredentials | null;
  isLoading: boolean;
  isAutoLogging: boolean;
  isRelogging: boolean;
  sessionExpired: boolean;
  connectionError: string | null;
  error: string | null;
  keepAliveIntervalId: NodeJS.Timeout | null;

  login: (credentials: ModemCredentials) => Promise<void>;
  logout: () => Promise<void>;
  loadCredentials: () => Promise<void>;
  autoLogin: () => Promise<boolean>;
  setError: (error: string | null) => void;
  requestRelogin: () => void;
  setRelogging: (value: boolean) => void;
  clearSessionExpired: () => void;

  tryQuietSessionRestore: () => Promise<{ success: boolean; error?: 'unreachable' | 'auth_failed' }>;
  tryDirectApiLogin: () => Promise<boolean>;
  startSessionKeepAlive: () => void;
  stopSessionKeepAlive: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  credentials: null,
  isLoading: false,
  isAutoLogging: false,
  isRelogging: false,
  sessionExpired: false,
  connectionError: null,
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
        await saveSessionState({
          lastSuccessfulLogin: Date.now(),
          lastSessionActivity: Date.now(),
          sessionHealthy: true,
        });

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

  tryQuietSessionRestore: async () => {
    const { credentials, setRelogging } = get();
    if (!credentials) {
      return { success: false, error: 'auth_failed' as const };
    }

    setRelogging(true);
    set({ connectionError: null });

    // Check if modem is reachable first (with 3 second timeout)
    console.log('[Auth] Checking modem reachability...');
    const isReachable = await networkService.isModemReachable(credentials.modemIp, 3000);

    if (!isReachable) {
      console.log('[Auth] Modem not reachable at', credentials.modemIp);
      set({ connectionError: 'Modem not reachable' });
      setRelogging(false);
      return { success: false, error: 'unreachable' as const };
    }

    console.log('[Auth] Modem is reachable, checking session...');
    const sessionLikelyValid = await isSessionLikelyValid();

    if (sessionLikelyValid) {
      try {
        const apiClient = new ModemAPIClient(credentials.modemIp);
        const isLoggedIn = await apiClient.isLoggedIn();

        if (isLoggedIn) {
          await updateSessionActivity();
          get().startSessionKeepAlive();
          setRelogging(false);
          return { success: true };
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
        return { success: true };
      }
    } catch (error) {
      // Direct login failed
    }

    console.log('[Auth] All direct methods failed, WebView required');
    setRelogging(false);
    return { success: false, error: 'auth_failed' as const };
  },

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

  startSessionKeepAlive: () => {
    const { credentials, keepAliveIntervalId } = get();

    if (keepAliveIntervalId) {
      clearInterval(keepAliveIntervalId);
    }

    if (!credentials) return;

    const intervalId = setInterval(async () => {
      const { credentials: currentCredentials } = get();
      if (!currentCredentials) {
        get().stopSessionKeepAlive();
        return;
      }

      try {
        const apiClient = new ModemAPIClient(currentCredentials.modemIp);
        await apiClient.isLoggedIn();
      } catch (error) {
      }
    }, SESSION_KEEPALIVE_INTERVAL_MS);

    set({ keepAliveIntervalId: intervalId });
  },

  stopSessionKeepAlive: () => {
    const { keepAliveIntervalId } = get();
    if (keepAliveIntervalId) {
      clearInterval(keepAliveIntervalId);
      set({ keepAliveIntervalId: null });
    }
  },
}));
