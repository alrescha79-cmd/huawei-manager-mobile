import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ModemInfo, SignalInfo, NetworkInfo, TrafficStats, ModemStatus, WanInfo, MobileDataStatus } from '@/types';
import { saveModemDataCache, getModemDataCache, clearModemDataCache } from '@/utils/storage';

const PREVIOUS_WAN_IP_KEY = 'previous_wan_ip';

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
  setPreviousWanIp: (ip: string | null) => void;
  loadPreviousWanIp: () => Promise<void>;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;

  loadFromCache: () => Promise<boolean>;
  saveToCache: () => Promise<void>;
  clearCache: () => Promise<void>;
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
    } catch (e) {
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

    if (currentIp && newIp && currentIp !== newIp) {
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
    isLoading: false,
    isUsingCache: false,
    error: null,
  }),
}));
