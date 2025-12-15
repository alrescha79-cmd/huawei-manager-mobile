import { create } from 'zustand';
import { ModemInfo, SignalInfo, NetworkInfo, TrafficStats, ModemStatus, WanInfo, MobileDataStatus } from '@/types';

interface ModemState {
  modemInfo: ModemInfo | null;
  signalInfo: SignalInfo | null;
  networkInfo: NetworkInfo | null;
  trafficStats: TrafficStats | null;
  modemStatus: ModemStatus | null;
  wanInfo: WanInfo | null;
  mobileDataStatus: MobileDataStatus | null;
  isLoading: boolean;
  error: string | null;

  setModemInfo: (info: ModemInfo) => void;
  setSignalInfo: (info: SignalInfo) => void;
  setNetworkInfo: (info: NetworkInfo) => void;
  setTrafficStats: (stats: TrafficStats) => void;
  setModemStatus: (status: ModemStatus) => void;
  setWanInfo: (info: WanInfo) => void;
  setMobileDataStatus: (status: MobileDataStatus) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useModemStore = create<ModemState>((set) => ({
  modemInfo: null,
  signalInfo: null,
  networkInfo: null,
  trafficStats: null,
  modemStatus: null,
  wanInfo: null,
  mobileDataStatus: null,
  isLoading: false,
  error: null,

  setModemInfo: (info) => set({ modemInfo: info }),
  setSignalInfo: (info) => set({ signalInfo: info }),
  setNetworkInfo: (info) => set({ networkInfo: info }),
  setTrafficStats: (stats) => set({ trafficStats: stats }),
  setModemStatus: (status) => set({ modemStatus: status }),
  setWanInfo: (info) => set({ wanInfo: info }),
  setMobileDataStatus: (status) => set({ mobileDataStatus: status }),
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
    isLoading: false,
    error: null,
  }),
}));
