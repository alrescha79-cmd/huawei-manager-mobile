import { create } from 'zustand';
import { ConnectedDevice, WiFiSettings } from '@/types';

interface WiFiState {
  connectedDevices: ConnectedDevice[];
  wifiSettings: WiFiSettings | null;

  setConnectedDevices: (devices: ConnectedDevice[]) => void;
  setWiFiSettings: (settings: WiFiSettings) => void;
}

export const useWiFiStore = create<WiFiState>((set) => ({
  connectedDevices: [],
  wifiSettings: null,

  setConnectedDevices: (devices) => set({ connectedDevices: devices }),
  setWiFiSettings: (settings) => set({ wifiSettings: settings }),
}));
