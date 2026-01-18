import * as Network from 'expo-network';

export class NetworkService {
  async getLocalIP(): Promise<string | null> {
    try {
      const ip = await Network.getIpAddressAsync();
      return ip;
    } catch (error) {
      console.error('Error getting local IP:', error);
      return null;
    }
  }

  async getNetworkState(): Promise<Network.NetworkState> {
    try {
      const state = await Network.getNetworkStateAsync();
      return state;
    } catch (error) {
      console.error('Error getting network state:', error);
      throw error;
    }
  }

  async isConnectedToWiFi(): Promise<boolean> {
    try {
      const state = await Network.getNetworkStateAsync();
      return state.type === Network.NetworkStateType.WIFI && state.isConnected === true;
    } catch (error) {
      console.error('Error checking WiFi connection:', error);
      return false;
    }
  }

  async detectGatewayIP(): Promise<string> {
    try {
      const isWiFi = await this.isConnectedToWiFi();

      if (!isWiFi) {
        return '192.168.8.1';
      }

      const commonIPs = ['192.168.8.1', '192.168.1.1', '192.168.100.1'];

      for (const ip of commonIPs) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1000);

          const response = await fetch(`http://${ip}/html/home.html`, {
            method: 'HEAD',
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            return ip;
          }
        } catch {
          continue;
        }
      }

      return '192.168.8.1';
    } catch (error) {
      console.error('Error detecting gateway IP:', error);
      return '192.168.8.1';
    }
  }
  /**
   * Check if modem is reachable at given IP with timeout
   */
  async isModemReachable(modemIp: string, timeoutMs: number = 3000): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(`http://${modemIp}/html/home.html`, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok || response.status === 401 || response.status === 403;
    } catch (error) {
      console.log('[Network] Modem not reachable:', modemIp);
      return false;
    }
  }
}

export const networkService = new NetworkService();
