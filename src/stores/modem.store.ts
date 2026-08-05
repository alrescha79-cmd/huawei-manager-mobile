import { create } from 'zustand';
import { ModemInfo, SignalInfo, NetworkInfo, TrafficStats, ModemStatus, WanInfo, MobileDataStatus } from '@/types';
import { saveModemDataCache, getModemDataCache } from '@/utils/storage';

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
  isLoading: boolean;
  isUsingCache: boolean;
  error: string | null;

  setModemInfo: (info: ModemInfo) => void;
  setSignalInfo: (info: SignalInfo) => void;
  setNetworkInfo: (info: NetworkInfo) => void;
  setTrafficStats: (stats: TrafficStats) => void;
  setModemStatus: (status: ModemStatus) => void;
  setWanInfo: (info: WanInfo) => void;
  setMobileDataStatus: (status: MobileDataStatus) => void;
  setMonthlySettings: (settings: MonthlySettings | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  loadFromCache: () => Promise<boolean>;
  saveToCache: () => Promise<void>;
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
  isLoading: false,
  isUsingCache: false,
  error: null,

  setModemInfo: (info) => {
    set({ modemInfo: info });
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
    } catch {
      // Silent fail if debug store not available
    }
  },

  setSignalInfo: (info) => {
    set({ signalInfo: info, isUsingCache: false });
    get().saveToCache();
    try {
      const { useDebugStore } = require('./debug.store');
      const debugStore = useDebugStore.getState();
      if (debugStore.debugEnabled) {
        debugStore.setModemInfo({
          ...debugStore.modemInfo,
          signalStrength: `${info.rssi || info.rsrp || 'N/A'} dBm`,
        });
      }
    } catch {
      // Silent fail if debug store not available
    }
  },

  setNetworkInfo: (info) => {
    set({ networkInfo: info, isUsingCache: false });
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
    } catch {
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
    set({ wanInfo: info, isUsingCache: false });
  },

  setMobileDataStatus: (status) => {
    set({ mobileDataStatus: status, isUsingCache: false });
  },

  setMonthlySettings: (settings) => set({ monthlySettings: settings }),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

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

  saveToCache: async () => {
    const state = get();
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

}));
