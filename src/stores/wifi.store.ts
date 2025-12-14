import { create } from 'zustand';
import { ConnectedDevice, WiFiSettings } from '@/types';

interface WiFiState {
  connectedDevices: ConnectedDevice[];
  wifiSettings: WiFiSettings | null;
  isLoading: boolean;
  error: string | null;

  setConnectedDevices: (devices: ConnectedDevice[]) => void;
  setWiFiSettings: (settings: WiFiSettings) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useWiFiStore = create<WiFiState>((set) => ({
  connectedDevices: [],
  wifiSettings: null,
  isLoading: false,
  error: null,

  setConnectedDevices: (devices) => set({ connectedDevices: devices }),
  setWiFiSettings: (settings) => set({ wifiSettings: settings }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  
  reset: () => set({
    connectedDevices: [],
    wifiSettings: null,
    isLoading: false,
    error: null,
  }),
}));
