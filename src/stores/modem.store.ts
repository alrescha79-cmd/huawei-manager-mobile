import { create } from 'zustand';
import { ModemInfo, SignalInfo, NetworkInfo, TrafficStats, ModemStatus } from '@/types';

interface ModemState {
  modemInfo: ModemInfo | null;
  signalInfo: SignalInfo | null;
  networkInfo: NetworkInfo | null;
  trafficStats: TrafficStats | null;
  modemStatus: ModemStatus | null;
  isLoading: boolean;
  error: string | null;

  setModemInfo: (info: ModemInfo) => void;
  setSignalInfo: (info: SignalInfo) => void;
  setNetworkInfo: (info: NetworkInfo) => void;
  setTrafficStats: (stats: TrafficStats) => void;
  setModemStatus: (status: ModemStatus) => void;
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
  isLoading: false,
  error: null,

  setModemInfo: (info) => set({ modemInfo: info }),
  setSignalInfo: (info) => set({ signalInfo: info }),
  setNetworkInfo: (info) => set({ networkInfo: info }),
  setTrafficStats: (stats) => set({ trafficStats: stats }),
  setModemStatus: (status) => set({ modemStatus: status }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  
  reset: () => set({
    modemInfo: null,
    signalInfo: null,
    networkInfo: null,
    trafficStats: null,
    modemStatus: null,
    isLoading: false,
    error: null,
  }),
}));
