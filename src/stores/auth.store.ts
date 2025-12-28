import { create } from 'zustand';
import { ModemCredentials } from '@/types';
import { saveCredentials, getCredentials, deleteCredentials } from '@/utils/storage';
import { ModemAPIClient } from '@/services/api.service';

interface AuthState {
  isAuthenticated: boolean;
  credentials: ModemCredentials | null;
  isLoading: boolean;
  isAutoLogging: boolean;
  isRelogging: boolean; // Flag to prevent multiple re-login attempts
  sessionExpired: boolean; // Flag to indicate session needs re-login
  error: string | null;

  login: (credentials: ModemCredentials) => Promise<void>;
  logout: () => Promise<void>;
  loadCredentials: () => Promise<void>;
  autoLogin: () => Promise<boolean>;
  setError: (error: string | null) => void;
  requestRelogin: () => void; // Request re-login from any tab
  setRelogging: (value: boolean) => void; // Set re-logging state
  clearSessionExpired: () => void; // Clear session expired flag
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  credentials: null,
  isLoading: false,
  isAutoLogging: false,
  isRelogging: false,
  sessionExpired: false,
  error: null,

  login: async (credentials: ModemCredentials) => {
    set({ isLoading: true, error: null });
    try {
      const credentialsWithTimestamp = {
        ...credentials,
        lastLogin: Date.now(),
      };
      await saveCredentials(credentialsWithTimestamp);
      set({
        isAuthenticated: true,
        credentials: credentialsWithTimestamp,
        isLoading: false,
        sessionExpired: false,
        isRelogging: false,
      });
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
}));

