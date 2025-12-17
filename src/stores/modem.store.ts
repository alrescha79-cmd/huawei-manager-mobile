import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ModemInfo, SignalInfo, NetworkInfo, TrafficStats, ModemStatus, WanInfo, MobileDataStatus } from '@/types';

const PREVIOUS_WAN_IP_KEY = 'previous_wan_ip';

interface ModemState {
  modemInfo: ModemInfo | null;
  signalInfo: SignalInfo | null;
  networkInfo: NetworkInfo | null;
  trafficStats: TrafficStats | null;
  modemStatus: ModemStatus | null;
  wanInfo: WanInfo | null;
  mobileDataStatus: MobileDataStatus | null;
  previousWanIp: string | null;
  isLoading: boolean;
  error: string | null;

  setModemInfo: (info: ModemInfo) => void;
  setSignalInfo: (info: SignalInfo) => void;
  setNetworkInfo: (info: NetworkInfo) => void;
  setTrafficStats: (stats: TrafficStats) => void;
  setModemStatus: (status: ModemStatus) => void;
  setWanInfo: (info: WanInfo) => void;
  setMobileDataStatus: (status: MobileDataStatus) => void;
  setPreviousWanIp: (ip: string | null) => void;
  loadPreviousWanIp: () => Promise<void>;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useModemStore = create<ModemState>((set, get) => ({
  modemInfo: null,
  signalInfo: null,
  networkInfo: null,
  trafficStats: null,
  modemStatus: null,
  wanInfo: null,
  mobileDataStatus: null,
  previousWanIp: null,
  isLoading: false,
  error: null,

  setModemInfo: (info) => set({ modemInfo: info }),
  setSignalInfo: (info) => set({ signalInfo: info }),
  setNetworkInfo: (info) => set({ networkInfo: info }),
  setTrafficStats: (stats) => set({ trafficStats: stats }),
  setModemStatus: (status) => set({ modemStatus: status }),

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

    set({ wanInfo: info });
  },

  setMobileDataStatus: (status) => set({ mobileDataStatus: status }),

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
    error: null,
  }),
}));

