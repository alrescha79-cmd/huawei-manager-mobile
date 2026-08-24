import { create } from 'zustand';
import { ConnectedDevice, WiFiSettings } from '@/types';

const equals = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

interface WiFiState {
  connectedDevices: ConnectedDevice[];
  wifiSettings: WiFiSettings | null;

  setConnectedDevices: (devices: ConnectedDevice[]) => void;
  setWiFiSettings: (settings: WiFiSettings) => void;
}

export const useWiFiStore = create<WiFiState>((set, get) => ({
  connectedDevices: [],
  wifiSettings: null,

  setConnectedDevices: (devices) => {
    const prev = get().connectedDevices;
    if (equals(prev, devices)) return;
    set({ connectedDevices: devices });
  },
  setWiFiSettings: (settings) => {
    const prev = get().wifiSettings;
    if (equals(prev, settings)) return;
    set({ wifiSettings: settings });
  },
}));
