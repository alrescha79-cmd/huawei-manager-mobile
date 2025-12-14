import { create } from 'zustand';
import { ModemCredentials } from '@/types';
import { saveCredentials, getCredentials, deleteCredentials } from '@/utils/storage';

interface AuthState {
  isAuthenticated: boolean;
  credentials: ModemCredentials | null;
  isLoading: boolean;
  error: string | null;
  
  login: (credentials: ModemCredentials) => Promise<void>;
  logout: () => Promise<void>;
  loadCredentials: () => Promise<void>;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  credentials: null,
  isLoading: false,
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
        isLoading: false 
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
        isLoading: false 
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
}));
