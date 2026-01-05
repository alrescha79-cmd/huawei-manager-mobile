import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ModemInfo, SignalInfo, NetworkInfo, TrafficStats, ModemStatus, WanInfo, MobileDataStatus } from '@/types';
import { saveModemDataCache, getModemDataCache, clearModemDataCache } from '@/utils/storage';

const PREVIOUS_WAN_IP_KEY = 'previous_wan_ip';

// Monthly data settings interface
export interface MonthlySettings {
  enabled: boolean;
  startDay: number;
  dataLimit: number;
  dataLimitUnit: 'MB' | 'GB';
  monthThreshold: number;
  trafficMaxLimit?: number;
}

interface ModemState {
  modemInfo: ModemInfo | null;
  signalInfo: SignalInfo | null;
  networkInfo: NetworkInfo | null;
  trafficStats: TrafficStats | null;
  modemStatus: ModemStatus | null;
  wanInfo: WanInfo | null;
  mobileDataStatus: MobileDataStatus | null;
  monthlySettings: MonthlySettings | null;
  previousWanIp: string | null;
  isLoading: boolean;
  isUsingCache: boolean; // Flag to indicate showing cached data
  error: string | null;

  setModemInfo: (info: ModemInfo) => void;
  setSignalInfo: (info: SignalInfo) => void;
  setNetworkInfo: (info: NetworkInfo) => void;
  setTrafficStats: (stats: TrafficStats) => void;
  setModemStatus: (status: ModemStatus) => void;
  setWanInfo: (info: WanInfo) => void;
  setMobileDataStatus: (status: MobileDataStatus) => void;
  setMonthlySettings: (settings: MonthlySettings | null) => void;
  setPreviousWanIp: (ip: string | null) => void;
  loadPreviousWanIp: () => Promise<void>;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;

  // Cache functions for invisible auto-login
  loadFromCache: () => Promise<boolean>; // Returns true if cache was loaded
  saveToCache: () => Promise<void>; // Save current state to cache
  clearCache: () => Promise<void>; // Clear cache on logout
  setUsingCache: (value: boolean) => void;
}

export const useModemStore = create<ModemState>((set, get) => ({
  modemInfo: null,
  signalInfo: null,
  networkInfo: null,
  trafficStats: null,
  modemStatus: null,
  wanInfo: null,
  mobileDataStatus: null,
  monthlySettings: null,
  previousWanIp: null,
  isLoading: false,
  isUsingCache: false,
  error: null,

  setModemInfo: (info) => {
    set({ modemInfo: info });
    // Update debug store with modem info
    try {
      const { useDebugStore } = require('./debug.store');
      const debugStore = useDebugStore.getState();
      if (debugStore.debugEnabled) {
        debugStore.setModemInfo({
          ...debugStore.modemInfo,
          modemModel: info.deviceName,
          firmwareVersion: info.softwareVersion,
          imei: info.imei,
        });
      }
    } catch (e) {
      // Silent fail if debug store not available
    }
  },

  setSignalInfo: (info) => {
    set({ signalInfo: info, isUsingCache: false });
    // Auto-save to cache when data is updated
    get().saveToCache();
    // Update debug store with signal info
    try {
      const { useDebugStore } = require('./debug.store');
      const debugStore = useDebugStore.getState();
      if (debugStore.debugEnabled) {
        debugStore.setModemInfo({
          ...debugStore.modemInfo,
          signalStrength: `${info.rssi || info.rsrp || 'N/A'} dBm`,
        });
      }
    } catch (e) {
      // Silent fail if debug store not available
    }
  },

  setNetworkInfo: (info) => {
    set({ networkInfo: info, isUsingCache: false });
    // Update debug store with network info
    try {
      const { useDebugStore } = require('./debug.store');
      const debugStore = useDebugStore.getState();
      if (debugStore.debugEnabled) {
        debugStore.setModemInfo({
          ...debugStore.modemInfo,
          networkOperator: info.fullName || info.networkName,
          connectionStatus: info.currentNetworkType,
        });
      }
    } catch (e) {
      // Silent fail if debug store not available
    }
  },

  setTrafficStats: (stats) => {
    set({ trafficStats: stats, isUsingCache: false });
  },

  setModemStatus: (status) => {
    set({ modemStatus: status, isUsingCache: false });
  },

  setWanInfo: (info) => {
    const currentWanInfo = get().wanInfo;
    const currentIp = currentWanInfo?.wanIPAddress;
    const newIp = info?.wanIPAddress;

    // If IP changed and we had a valid previous IP, save it
    if (currentIp && newIp && currentIp !== newIp) {
      // Save the old IP as previous
      set({ previousWanIp: currentIp });
      AsyncStorage.setItem(PREVIOUS_WAN_IP_KEY, currentIp).catch(console.error);
    }

    set({ wanInfo: info, isUsingCache: false });
  },

  setMobileDataStatus: (status) => {
    set({ mobileDataStatus: status, isUsingCache: false });
  },

  setMonthlySettings: (settings) => set({ monthlySettings: settings }),

  setPreviousWanIp: (ip) => {
    set({ previousWanIp: ip });
    if (ip) {
      AsyncStorage.setItem(PREVIOUS_WAN_IP_KEY, ip).catch(console.error);
    } else {
      AsyncStorage.removeItem(PREVIOUS_WAN_IP_KEY).catch(console.error);
    }
  },

  loadPreviousWanIp: async () => {
    try {
      const savedIp = await AsyncStorage.getItem(PREVIOUS_WAN_IP_KEY);
      if (savedIp) {
        set({ previousWanIp: savedIp });
      }
    } catch (error) {
      console.error('Error loading previous WAN IP:', error);
    }
  },

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setUsingCache: (value) => set({ isUsingCache: value }),

  // Load cached modem data for instant display
  loadFromCache: async () => {
    try {
      const cached = await getModemDataCache();
      if (cached) {
        set({
          signalInfo: cached.signalInfo,
          networkInfo: cached.networkInfo,
          trafficStats: cached.trafficStats,
          modemStatus: cached.modemStatus,
          wanInfo: cached.wanInfo,
          mobileDataStatus: cached.mobileDataStatus,
          isUsingCache: true,
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error loading from cache:', error);
      return false;
    }
  },

  // Save current modem data to cache
  saveToCache: async () => {
    const state = get();
    // Only save if we have valid data (not using cache)
    if (state.signalInfo && !state.isUsingCache) {
      await saveModemDataCache({
        signalInfo: state.signalInfo,
        networkInfo: state.networkInfo,
        trafficStats: state.trafficStats,
        modemStatus: state.modemStatus,
        wanInfo: state.wanInfo,
        mobileDataStatus: state.mobileDataStatus,
      });
    }
  },

  // Clear cache on logout
  clearCache: async () => {
    await clearModemDataCache();
    set({ isUsingCache: false });
  },

  reset: () => set({
    modemInfo: null,
    signalInfo: null,
    networkInfo: null,
    trafficStats: null,
    modemStatus: null,
    wanInfo: null,
    mobileDataStatus: null,
    // Don't reset previousWanIp on reset - keep it for reference
    isLoading: false,
    isUsingCache: false,
    error: null,
  }),
}));
