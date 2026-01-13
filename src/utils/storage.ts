import * as SecureStore from 'expo-secure-store';
import { ModemCredentials } from '@/types';

const CREDENTIALS_KEY = 'modem_credentials';
const SESSION_STATE_KEY = 'session_state';

export interface SessionState {
  lastSuccessfulLogin: number;
  lastSessionActivity: number;
  sessionHealthy: boolean;
}

export const saveCredentials = async (credentials: ModemCredentials): Promise<void> => {
  try {
    await SecureStore.setItemAsync(CREDENTIALS_KEY, JSON.stringify(credentials));
  } catch (error) {
    console.error('Error saving credentials:', error);
    throw error;
  }
};

export const getCredentials = async (): Promise<ModemCredentials | null> => {
  try {
    const credentials = await SecureStore.getItemAsync(CREDENTIALS_KEY);
    return credentials ? JSON.parse(credentials) : null;
  } catch (error) {
    console.error('Error getting credentials:', error);
    return null;
  }
};

export const deleteCredentials = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
    await SecureStore.deleteItemAsync(SESSION_STATE_KEY);
  } catch (error) {
    console.error('Error deleting credentials:', error);
    throw error;
  }
};

export const saveSessionState = async (state: SessionState): Promise<void> => {
  try {
    await SecureStore.setItemAsync(SESSION_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Error saving session state:', error);
  }
};

export const getSessionState = async (): Promise<SessionState | null> => {
  try {
    const state = await SecureStore.getItemAsync(SESSION_STATE_KEY);
    return state ? JSON.parse(state) : null;
  } catch (error) {
    console.error('Error getting session state:', error);
    return null;
  }
};

export const updateSessionActivity = async (): Promise<void> => {
  try {
    const currentState = await getSessionState();
    const now = Date.now();

    await saveSessionState({
      lastSuccessfulLogin: currentState?.lastSuccessfulLogin || now,
      lastSessionActivity: now,
      sessionHealthy: true,
    });
  } catch (error) {
    console.error('Error updating session activity:', error);
  }
};

export const markSessionUnhealthy = async (): Promise<void> => {
  try {
    const currentState = await getSessionState();
    if (currentState) {
      await saveSessionState({
        ...currentState,
        sessionHealthy: false,
      });
    }
  } catch (error) {
    console.error('Error marking session unhealthy:', error);
  }
};

const SESSION_TIMEOUT_MS = 5 * 60 * 1000;

export const isSessionLikelyValid = async (): Promise<boolean> => {
  try {
    const state = await getSessionState();
    if (!state) return false;

    const timeSinceActivity = Date.now() - state.lastSessionActivity;
    return state.sessionHealthy && timeSinceActivity < SESSION_TIMEOUT_MS;
  } catch (error) {
    return false;
  }
};

import AsyncStorage from '@react-native-async-storage/async-storage';
import { SignalInfo, NetworkInfo, TrafficStats, ModemStatus, WanInfo, MobileDataStatus } from '@/types';

const MODEM_DATA_CACHE_KEY = 'modem_data_cache';

export interface CachedModemData {
  signalInfo: SignalInfo | null;
  networkInfo: NetworkInfo | null;
  trafficStats: TrafficStats | null;
  modemStatus: ModemStatus | null;
  wanInfo: WanInfo | null;
  mobileDataStatus: MobileDataStatus | null;
  cachedAt: number;
}

export const saveModemDataCache = async (data: Omit<CachedModemData, 'cachedAt'>): Promise<void> => {
  try {
    const cacheData: CachedModemData = {
      ...data,
      cachedAt: Date.now(),
    };
    await AsyncStorage.setItem(MODEM_DATA_CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Error saving modem data cache:', error);
  }
};

export const getModemDataCache = async (): Promise<CachedModemData | null> => {
  try {
    const cached = await AsyncStorage.getItem(MODEM_DATA_CACHE_KEY);
    if (!cached) return null;

    const data = JSON.parse(cached) as CachedModemData;

    const cacheAge = Date.now() - data.cachedAt;
    const MAX_CACHE_AGE = 24 * 60 * 60 * 1000; // 24 hours

    if (cacheAge > MAX_CACHE_AGE) {
      await AsyncStorage.removeItem(MODEM_DATA_CACHE_KEY);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error loading modem data cache:', error);
    return null;
  }
};

export const clearModemDataCache = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(MODEM_DATA_CACHE_KEY);
  } catch (error) {
    console.error('Error clearing modem data cache:', error);
  }
};
