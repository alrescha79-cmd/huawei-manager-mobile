import { ModemAPIClient } from './api.service';
import { ConnectedDevice, WiFiSettings } from '@/types';
import { parseXMLValue } from '@/utils/helpers';
import * as Crypto from 'expo-crypto';
import CryptoJS from 'crypto-js';

export class WiFiService {
  private apiClient: ModemAPIClient;

  constructor(modemIp: string) {
    this.apiClient = new ModemAPIClient(modemIp);
  }

  async getConnectedDevices(): Promise<ConnectedDevice[]> {
    try {
      const response = await this.apiClient.get('/api/wlan/host-list');

      const devices: ConnectedDevice[] = [];

      if (typeof response === 'string') {
        const hostsXML = response.match(/<Host>([\s\S]*?)<\/Host>/g);
        if (hostsXML) {
          hostsXML.forEach((hostXML) => {
            const hostName = parseXMLValue(hostXML, 'HostName');
            const actualName = parseXMLValue(hostXML, 'ActualName');
            const displayName = actualName || hostName;

            devices.push({
              macAddress: parseXMLValue(hostXML, 'MacAddress'),
              ipAddress: parseXMLValue(hostXML, 'IpAddress'),
              hostName: displayName,
              id: parseXMLValue(hostXML, 'ID'),
              associatedTime: parseXMLValue(hostXML, 'AssociatedTime') || '0',
              isBlock: parseXMLValue(hostXML, 'IsBlock') === '1',
            });
          });
        }
      }

      // Try to get AssociatedTime from HostInfo API
      try {
        const hostInfoResponse = await this.apiClient.get('/api/system/HostInfo');
        let hostInfoList: any[] = [];

        if (typeof hostInfoResponse === 'string') {
          hostInfoList = JSON.parse(hostInfoResponse);
        } else if (Array.isArray(hostInfoResponse)) {
          hostInfoList = hostInfoResponse;
        }

        if (Array.isArray(hostInfoList)) {
          // Create a map of MAC address to AssociatedTime
          const timeMap = new Map<string, number>();
          hostInfoList.forEach((host: any) => {
            if (host.MACAddress && host.AssociatedTime) {
              timeMap.set(host.MACAddress.toUpperCase(), host.AssociatedTime);
            }
          });

          // Update devices with AssociatedTime
          devices.forEach((device) => {
            const time = timeMap.get(device.macAddress.toUpperCase());
            if (time) {
              device.associatedTime = String(time);
            }
          });
        }
      } catch (hostInfoError) {
        // Ignore error, keep original AssociatedTime
      }

      return devices;
    } catch (error) {
      console.error('Error getting connected devices:', error);
      throw error;
    }
  }

  async getWiFiSettings(): Promise<WiFiSettings> {
    try {
      // Use multi-basic-settings which returns password with auth headers
      const response = await this.apiClient.get('/api/wlan/multi-basic-settings');

      // Parse the first Ssid block (main WiFi, Index 0)
      const ssidMatch = response.match(/<Ssid>([\s\S]*?)<\/Ssid>/);
      const mainSsid = ssidMatch ? ssidMatch[0] : response;

      return {
        ssid: parseXMLValue(mainSsid, 'WifiSsid'),
        password: parseXMLValue(mainSsid, 'WifiWpapsk') || parseXMLValue(mainSsid, 'WifiWepKey1'),
        wifiEnable: parseXMLValue(mainSsid, 'WifiEnable') === '1',
        channel: parseXMLValue(response, 'WifiChannel'),
        band: parseXMLValue(response, 'WifiBand'),
        maxAssoc: parseXMLValue(response, 'WifiMaxassoc'),
        wifiMode: parseXMLValue(response, 'WifiMode'),
        securityMode: parseXMLValue(mainSsid, 'WifiAuthmode'),
        encryptionMode: parseXMLValue(mainSsid, 'WifiWpaencryptionmodes'),
      };
    } catch (error) {
      console.error('Error getting WiFi settings:', error);
      throw error;
    }
  }

  /**
   * WiFi password encoder - escape special XML entities like modem web interface
   */
  private wifiEncode(str: string): string {
    const entities: Record<string, string> = {
      '&': '&amp;',
      "'": '&apos;',
      '"': '&quot;',
      '<': '&lt;',
      '>': '&gt;',
      '/': '&#x2F;',
      '(': '&#40;',
      ')': '&#41;',
    };
    return str.replace(/([&'"<>/()])/g, (_, char) => entities[char] || char);
  }

  /**
   * SHA-1 hash implementation for OAEP padding
   */
  private sha1(data: Uint8Array): Uint8Array {
    // Using CryptoJS for SHA-1
    const wordArray = CryptoJS.lib.WordArray.create(data as any);
    const hash = CryptoJS.SHA1(wordArray);
    const hashHex = hash.toString(CryptoJS.enc.Hex);
    return this.hexToBytes(hashHex);
  }

  /**
   * Helper: hex string to Uint8Array
   */
  private hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  }

  /**
   * Helper: bytes to hex string
   */
  private bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * MGF1 (Mask Generation Function) for OAEP
   */
  private mgf1(seed: Uint8Array, length: number): Uint8Array {
    const mask = new Uint8Array(length);
    let offset = 0;
    let counter = 0;

    while (offset < length) {
      const counterBytes = new Uint8Array(4);
      counterBytes[0] = (counter >> 24) & 0xff;
      counterBytes[1] = (counter >> 16) & 0xff;
      counterBytes[2] = (counter >> 8) & 0xff;
      counterBytes[3] = counter & 0xff;

      const input = new Uint8Array(seed.length + 4);
      input.set(seed);
      input.set(counterBytes, seed.length);

      const hash = this.sha1(input);
      const copyLen = Math.min(hash.length, length - offset);
      mask.set(hash.subarray(0, copyLen), offset);
      offset += copyLen;
      counter++;
    }

    return mask;
  }

  /**
   * OAEP padding with SHA-1 for RSA encryption
   * Implements RSAES-OAEP as per PKCS#1 v2.1
   */
  private oaepPad(message: Uint8Array, keySize: number): Uint8Array {
    const hLen = 20; // SHA-1 output length in bytes
    const maxMsgLen = keySize - 2 * hLen - 2;

    if (message.length > maxMsgLen) {
      throw new Error('Message too long for OAEP padding');
    }

    // lHash = Hash(L) where L is empty string
    const lHash = this.sha1(new Uint8Array(0));

    // PS = zero padding
    const psLen = keySize - message.length - 2 * hLen - 2;

    // DB = lHash || PS || 0x01 || M
    const db = new Uint8Array(keySize - hLen - 1);
    db.set(lHash, 0);
    // PS is already zeros
    db[hLen + psLen] = 0x01;
    db.set(message, hLen + psLen + 1);

    // Generate random seed
    const seed = new Uint8Array(hLen);
    for (let i = 0; i < hLen; i++) {
      seed[i] = Math.floor(Math.random() * 256);
    }

    // dbMask = MGF(seed, k - hLen - 1)
    const dbMask = this.mgf1(seed, db.length);

    // maskedDB = DB xor dbMask
    const maskedDB = new Uint8Array(db.length);
    for (let i = 0; i < db.length; i++) {
      maskedDB[i] = db[i] ^ dbMask[i];
    }

    // seedMask = MGF(maskedDB, hLen)
    const seedMask = this.mgf1(maskedDB, hLen);

    // maskedSeed = seed xor seedMask
    const maskedSeed = new Uint8Array(hLen);
    for (let i = 0; i < hLen; i++) {
      maskedSeed[i] = seed[i] ^ seedMask[i];
    }

    // EM = 0x00 || maskedSeed || maskedDB
    const em = new Uint8Array(keySize);
    em[0] = 0x00;
    em.set(maskedSeed, 1);
    em.set(maskedDB, 1 + hLen);

    return em;
  }

  /**
   * Encrypt WiFi password using modem's RSA public key with OAEP SHA-1 padding
   * Based on modem web interface analysis - uses rsapadingtype=1 (OAEP)
   * Flow: wifiEncode -> base64 -> RSA-OAEP-SHA1
   */
  private async encryptWifiPassword(password: string): Promise<string> {
    try {
      // Get RSA public key from modem
      const pubkeyResponse = await this.apiClient.get('/api/webserver/publickey');
      const encPubKeyE = parseXMLValue(pubkeyResponse, 'encpubkeye') || '010001';
      const encPubKeyN = parseXMLValue(pubkeyResponse, 'encpubkeyn') || '';

      console.log('[WiFi DEBUG] Public Key E:', encPubKeyE);
      console.log('[WiFi DEBUG] Public Key N length:', encPubKeyN.length);

      if (!encPubKeyN) {
        console.log('[WiFi DEBUG] No public key found, returning plain password');
        return password;
      }

      // RSA key is 2048 bits = 256 bytes
      const keySize = 256;

      // Step 1: WiFi encode (escape XML entities)
      const encodedPassword = this.wifiEncode(password);
      console.log('[WiFi DEBUG] WiFi encoded password:', encodedPassword);

      // Step 2: Base64 encode
      const b64Password = btoa(encodedPassword);
      console.log('[WiFi DEBUG] Base64 password:', b64Password);

      // Step 3: Convert to bytes for OAEP padding
      const dataBytes = new TextEncoder().encode(b64Password);
      console.log('[WiFi DEBUG] Data bytes length:', dataBytes.length);

      // Step 4: Apply OAEP SHA-1 padding
      const paddedMessage = this.oaepPad(dataBytes, keySize);
      console.log('[WiFi DEBUG] OAEP padded message length:', paddedMessage.length);

      // Convert to hex
      const dataHex = this.bytesToHex(paddedMessage);

      // RSA modular exponentiation
      const n = BigInt('0x' + encPubKeyN);
      const e = BigInt('0x' + encPubKeyE);
      const m = BigInt('0x' + dataHex);

      const modPow = (base: bigint, exp: bigint, mod: bigint): bigint => {
        let result = 1n;
        base = base % mod;
        while (exp > 0n) {
          if (exp % 2n === 1n) {
            result = (result * base) % mod;
          }
          exp = exp / 2n;
          base = (base * base) % mod;
        }
        return result;
      };

      const cipher = modPow(m, e, n);
      const encryptedHex = cipher.toString(16).padStart(512, '0');
      console.log('[WiFi DEBUG] Encrypted hex length:', encryptedHex.length);
      console.log('[WiFi DEBUG] Encrypted hex (first 64 chars):', encryptedHex.substring(0, 64));

      return encryptedHex;
    } catch (error) {
      console.error('[WiFi] Error encrypting password:', error);
      return password;
    }
  }

  async setWiFiSettings(settings: Partial<WiFiSettings>): Promise<boolean> {
    try {
      // Get current settings from multi-basic-settings
      const currentResponse = await this.apiClient.get('/api/wlan/multi-basic-settings');

      // Parse the first Ssid block (main WiFi, Index 0)
      const ssidMatch = currentResponse.match(/<Ssid>([\s\S]*?)<\/Ssid>/);
      if (!ssidMatch) {
        throw new Error('Could not parse current WiFi settings');
      }

      const currentSsid = ssidMatch[0];

      // Parse current values
      const currentIndex = parseXMLValue(currentSsid, 'Index') || '0';
      const currentWifiMac = parseXMLValue(currentSsid, 'WifiMac') || '';
      const currentID = parseXMLValue(currentSsid, 'ID') || 'InternetGatewayDevice.X_Config.Wifi.Radio.1.Ssid.1.';
      const currentBroadcast = parseXMLValue(currentSsid, 'WifiBroadcast') || '0';
      const currentEnable = parseXMLValue(currentSsid, 'WifiEnable') || '1';
      const currentWepKeyIndex = parseXMLValue(currentSsid, 'WifiWepKeyIndex') || '1';
      const currentGuestNetwork = parseXMLValue(currentSsid, 'wifiisguestnetwork') || '0';
      const currentGuestOffTime = parseXMLValue(currentSsid, 'wifiguestofftime') || '4';

      // Map security mode from form value to API value
      const securityModeMap: Record<string, string> = {
        'WPA2PSK': 'WPA2-PSK',
        'WPAPSK': 'WPA-PSK',
        'WPA': 'WPA-PSK',
        'WPA2': 'WPA2-PSK',
        'OPEN': 'OPEN',
        'WPA2-PSK': 'WPA2-PSK',
        'WPA-PSK': 'WPA-PSK',
      };

      // Use new values if provided, otherwise keep current
      const newSsid = settings.ssid || parseXMLValue(currentSsid, 'WifiSsid') || '';
      const rawAuthMode = settings.securityMode || parseXMLValue(currentSsid, 'WifiAuthmode') || 'WPA2-PSK';
      const newAuthMode = securityModeMap[rawAuthMode] || rawAuthMode;
      const newWpaEncryption = parseXMLValue(currentSsid, 'WifiWpaencryptionmodes') || 'AES';

      // Build the request based on auth mode
      let requestBody: string;

      if (newAuthMode === 'OPEN') {
        // For OPEN auth mode, use WifiBasicencryptionmodes=NONE
        requestBody = `<?xml version="1.0" encoding="UTF-8"?>
          <request>
            <Ssids>
              <Ssid>
                <WifiWep128Key1></WifiWep128Key1>
                <Index>${currentIndex}</Index>
                <WifiAuthmode>OPEN</WifiAuthmode>
                <WifiWepKeyIndex>${currentWepKeyIndex}</WifiWepKeyIndex>
                <WifiBroadcast>${currentBroadcast}</WifiBroadcast>
                <WifiWep128Key3></WifiWep128Key3>
                <WifiMac>${currentWifiMac}</WifiMac>
                <WifiSsid>${newSsid}</WifiSsid>
                <wifiisguestnetwork>${currentGuestNetwork}</wifiisguestnetwork>
                <wifiguestofftime>${currentGuestOffTime}</wifiguestofftime>
                <WifiWep128Key4></WifiWep128Key4>
                <ID>${currentID}</ID>
                <wifisupportsecmodelist></wifisupportsecmodelist>
                <WifiEnable>${currentEnable}</WifiEnable>
                <WifiWep128Key2></WifiWep128Key2>
                <WifiBasicencryptionmodes>NONE</WifiBasicencryptionmodes>
              </Ssid>
            </Ssids>
            <WifiRestart>1</WifiRestart>
          </request>`;
      } else {
        // For WPA2-PSK and other auth modes - encrypt password if provided
        // Use RSA encryption with only WifiWpapsk field (like Guest WiFi uses single field)
        let encryptedPsk = '';

        if (settings.password && settings.password.length >= 8) {
          encryptedPsk = await this.encryptWifiPassword(settings.password);
          console.log('[WiFi DEBUG] Using RSA encrypted password');
        }

        // Build password fields - use only WifiWpapsk (not MixWifiWpapsk)
        const pskFields = encryptedPsk ? `
                <WifiWpapsk>${encryptedPsk}</WifiWpapsk>` : '';

        console.log('[WiFi DEBUG] Encrypted PSK length:', encryptedPsk.length);

        requestBody = `<?xml version="1.0" encoding="UTF-8"?>
          <request>
            <Ssids>
              <Ssid>
                <WifiWep128Key1></WifiWep128Key1>
                <Index>${currentIndex}</Index>
                <WifiAuthmode>${newAuthMode}</WifiAuthmode>
                <WifiWepKeyIndex>${currentWepKeyIndex}</WifiWepKeyIndex>
                <WifiWpaencryptionmodes>${newWpaEncryption}</WifiWpaencryptionmodes>
                <WifiBroadcast>${currentBroadcast}</WifiBroadcast>
                <WifiWep128Key3></WifiWep128Key3>${pskFields}
                <WifiMac>${currentWifiMac}</WifiMac>
                <WifiSsid>${newSsid}</WifiSsid>
                <wifiisguestnetwork>${currentGuestNetwork}</wifiisguestnetwork>
                <wifiguestofftime>${currentGuestOffTime}</wifiguestofftime>
                <WifiWep128Key4></WifiWep128Key4>
                <ID>${currentID}</ID>
                <wifisupportsecmodelist></wifisupportsecmodelist>
                <WifiEnable>${currentEnable}</WifiEnable>
                <WifiWep128Key2></WifiWep128Key2>
              </Ssid>
            </Ssids>
            <WifiRestart>1</WifiRestart>
          </request>`;
      }

      console.log('[WiFi DEBUG] Request body (first 500 chars):', requestBody.substring(0, 500));
      console.log('[WiFi DEBUG] Encrypted PSK included:', requestBody.includes('MixWifiWpapsk'));

      const response = await this.apiClient.post('/api/wlan/multi-basic-settings', requestBody);
      console.log('[WiFi DEBUG] API Response:', response);

      // Check for error in response
      const errorCode = parseXMLValue(response, 'code');
      if (errorCode && errorCode !== '0') {
        console.log('[WiFi DEBUG] Error code detected:', errorCode);
        throw new Error(`API error: ${errorCode}`);
      }

      console.log('[WiFi DEBUG] WiFi settings saved successfully');
      return true;
    } catch (error) {
      console.error('[WiFi] Error setting WiFi settings:', error);
      throw error;
    }
  }

  async getGuestWiFiSettings(): Promise<{
    enabled: boolean;
    ssid: string;
    password: string;
    securityMode: string;
    duration: string;
  }> {
    try {
      const response = await this.apiClient.get('/api/wlan/multi-basic-settings');

      // Parse nested Ssid structure - Index 1 is Guest WiFi
      const ssidMatches = response.match(/<Ssid>([\s\S]*?)<\/Ssid>/g);

      if (ssidMatches) {
        for (const ssidXml of ssidMatches) {
          const index = parseXMLValue(ssidXml, 'Index');
          const isGuest = parseXMLValue(ssidXml, 'wifiisguestnetwork') === '1';

          if (index === '1' || isGuest) {
            return {
              enabled: parseXMLValue(ssidXml, 'WifiEnable') === '1',
              ssid: parseXMLValue(ssidXml, 'WifiSsid') || '',
              password: parseXMLValue(ssidXml, 'WifiWpapsk') || '',
              securityMode: parseXMLValue(ssidXml, 'WifiAuthmode') || 'OPEN',
              duration: parseXMLValue(ssidXml, 'wifiguestofftime') || '0',
            };
          }
        }
      }

      return { enabled: false, ssid: '', password: '', securityMode: 'OPEN', duration: '0' };
    } catch (error) {
      console.error('Error getting guest WiFi settings:', error);
      return { enabled: false, ssid: '', password: '', securityMode: 'OPEN', duration: '0' };
    }
  }

  async getGuestTimeRemaining(): Promise<{
    remainingSeconds: number;
    isActive: boolean;
  }> {
    try {
      const response = await this.apiClient.get('/api/wlan/guesttime-setting');
      const remaintime = parseXMLValue(response, 'remaintime') || '0';
      const isvalidtime = parseXMLValue(response, 'isvalidtime') || '0';

      return {
        remainingSeconds: parseInt(remaintime, 10) || 0,
        isActive: isvalidtime === '1',
      };
    } catch (error) {
      console.error('Error getting guest time remaining:', error);
      return { remainingSeconds: 0, isActive: false };
    }
  }

  async extendGuestWiFiTime(): Promise<boolean> {
    try {
      const data = `<?xml version="1.0" encoding="UTF-8"?><request><extendtime>30</extendtime></request>`;
      const response = await this.apiClient.post('/api/wlan/guesttime-setting', data);

      if (response.includes('<error>')) {
        throw new Error('Failed to extend guest WiFi time');
      }
      return true;
    } catch (error) {
      console.error('Error extending guest WiFi time:', error);
      throw error;
    }
  }

  async toggleGuestWiFi(enable: boolean): Promise<boolean> {
    return this.updateGuestWiFiSettings({ enabled: enable });
  }

  async updateGuestWiFiSettings(settings: {
    enabled?: boolean;
    ssid?: string;
    password?: string;
    securityMode?: string;
    duration?: string;
  }): Promise<boolean> {
    try {
      // First get current settings to preserve ALL values
      const currentResponse = await this.apiClient.get('/api/wlan/multi-basic-settings');

      // Parse both SSIDs from current settings
      const ssidMatches = currentResponse.match(/<Ssid>([\s\S]*?)<\/Ssid>/g);
      if (!ssidMatches || ssidMatches.length < 2) {
        throw new Error('Could not find SSIDs in settings');
      }

      // Extract values from main SSID (Index 0)
      const mainSsid = ssidMatches[0];
      const mainIndex = parseXMLValue(mainSsid, 'Index') || '0';
      const mainAuthmode = parseXMLValue(mainSsid, 'WifiAuthmode') || 'WPA2-PSK';
      const mainWepKeyIndex = parseXMLValue(mainSsid, 'WifiWepKeyIndex') || '1';
      const mainEncrypt = parseXMLValue(mainSsid, 'WifiWpaencryptionmodes') || 'AES';
      const mainBroadcast = parseXMLValue(mainSsid, 'WifiBroadcast') || '0';
      const mainMac = parseXMLValue(mainSsid, 'WifiMac') || '';
      const mainIsGuest = parseXMLValue(mainSsid, 'wifiisguestnetwork') || '0';
      const mainOfftime = parseXMLValue(mainSsid, 'wifiguestofftime') || '4';
      const mainId = parseXMLValue(mainSsid, 'ID') || '';
      const mainEnable = parseXMLValue(mainSsid, 'WifiEnable') || '1';

      // Extract current values from guest SSID (Index 1)
      const guestSsidXml = ssidMatches[1];
      const guestIndex = parseXMLValue(guestSsidXml, 'Index') || '1';
      const guestWepKeyIndex = parseXMLValue(guestSsidXml, 'WifiWepKeyIndex') || '1';
      const guestBroadcast = parseXMLValue(guestSsidXml, 'WifiBroadcast') || '0';
      const guestMac = parseXMLValue(guestSsidXml, 'WifiMac') || '';
      const guestId = parseXMLValue(guestSsidXml, 'ID') || '';

      // Use provided values or fall back to current
      const guestEnabled = settings.enabled !== undefined ? (settings.enabled ? '1' : '0') : parseXMLValue(guestSsidXml, 'WifiEnable') || '0';
      const guestSsidName = settings.ssid !== undefined ? settings.ssid : parseXMLValue(guestSsidXml, 'WifiSsid') || '';
      const guestAuthmode = settings.securityMode !== undefined ? settings.securityMode : parseXMLValue(guestSsidXml, 'WifiAuthmode') || 'OPEN';
      const guestPassword = settings.password !== undefined ? settings.password : parseXMLValue(guestSsidXml, 'WifiWpapsk') || '';
      const guestOfftime = settings.duration !== undefined ? settings.duration : parseXMLValue(guestSsidXml, 'wifiguestofftime') || '0';
      const guestBasicEncrypt = guestAuthmode === 'OPEN' ? 'NONE' : '';
      const guestWpaEncrypt = guestAuthmode !== 'OPEN' ? 'AES' : '';

      // Build the full request with both SSIDs
      const updateData = `<?xml version="1.0" encoding="UTF-8"?>
<request>
<Ssids>
<Ssid>
<Index>${mainIndex}</Index>
<WifiAuthmode>${mainAuthmode}</WifiAuthmode>
<WifiWepKeyIndex>${mainWepKeyIndex}</WifiWepKeyIndex>
<WifiWpaencryptionmodes>${mainEncrypt}</WifiWpaencryptionmodes>
<WifiBroadcast>${mainBroadcast}</WifiBroadcast>
<WifiMac>${mainMac}</WifiMac>
<wifiisguestnetwork>${mainIsGuest}</wifiisguestnetwork>
<wifiguestofftime>${mainOfftime}</wifiguestofftime>
<ID>${mainId}</ID>
<wifisupportsecmodelist></wifisupportsecmodelist>
<WifiEnable>${mainEnable}</WifiEnable>
</Ssid>
<Ssid>
<Index>${guestIndex}</Index>
<WifiSsid>${guestSsidName}</WifiSsid>
<WifiAuthmode>${guestAuthmode}</WifiAuthmode>
<WifiWepKeyIndex>${guestWepKeyIndex}</WifiWepKeyIndex>
<WifiBroadcast>${guestBroadcast}</WifiBroadcast>
<WifiMac>${guestMac}</WifiMac>
${guestBasicEncrypt ? `<WifiBasicencryptionmodes>${guestBasicEncrypt}</WifiBasicencryptionmodes>` : ''}
${guestWpaEncrypt ? `<WifiWpaencryptionmodes>${guestWpaEncrypt}</WifiWpaencryptionmodes>` : ''}
${guestPassword ? `<WifiWpapsk>${guestPassword}</WifiWpapsk>` : ''}
<wifiisguestnetwork>1</wifiisguestnetwork>
<wifiguestofftime>${guestOfftime}</wifiguestofftime>
<ID>${guestId}</ID>
<wifisupportsecmodelist></wifisupportsecmodelist>
<WifiEnable>${guestEnabled}</WifiEnable>
</Ssid>
</Ssids>
<WifiRestart>1</WifiRestart>
<modify_guest_ssid>1</modify_guest_ssid>
</request>`;

      const response = await this.apiClient.post('/api/wlan/multi-basic-settings', updateData);

      if (response.includes('<error>')) {
        const errorCode = response.match(/<code>(\d+)<\/code>/)?.[1];
        throw new Error(`Guest WiFi update failed: ${errorCode}`);
      }

      return true;
    } catch (error) {
      console.error('Error updating guest WiFi settings:', error);
      throw error;
    }
  }
  // Block device internet access using MAC filter
  async kickDevice(macAddress: string): Promise<boolean> {
    try {
      // Block device by adding MAC to blacklist
      const data = `<?xml version="1.0" encoding="UTF-8"?>
<request>
<Ssids>
<Ssid>
<WifiMacFilterStatus>2</WifiMacFilterStatus>
<Index>0</Index>
<WifiMacFilterMac0>${macAddress}</WifiMacFilterMac0>
<wifihostname0></wifihostname0>
</Ssid>
</Ssids>
</request>`;

      const response = await this.apiClient.post('/api/wlan/multi-macfilter-settings', data);

      if (response.includes('<error>')) {
        throw new Error('Failed to block device');
      }

      return true;
    } catch (error) {
      console.error('Error blocking device:', error);
      throw error;
    }
  }

  // Unblock device to restore internet access
  async unblockDevice(macAddress: string): Promise<boolean> {
    try {
      // Unblock device by removing MAC from blacklist (empty value)
      const data = `<?xml version="1.0" encoding="UTF-8"?>
<request>
<Ssids>
<Ssid>
<WifiMacFilterMac0></WifiMacFilterMac0>
<wifihostname0></wifihostname0>
<WifiMacFilterStatus>2</WifiMacFilterStatus>
<Index>0</Index>
</Ssid>
</Ssids>
</request>`;

      const response = await this.apiClient.post('/api/wlan/multi-macfilter-settings', data);

      if (response.includes('<error>')) {
        throw new Error('Failed to unblock device');
      }

      return true;
    } catch (error) {
      console.error('Error unblocking device:', error);
      throw error;
    }
  }

  // Get list of blocked devices
  async getBlockedDevices(): Promise<{ macAddress: string; hostName: string }[]> {
    try {
      const response = await this.apiClient.get('/api/wlan/multi-macfilter-settings-ex');
      const blockedDevices: { macAddress: string; hostName: string }[] = [];

      // Parse blocked devices from wifimacblacklist tag
      // Format: <WifiMacFilterMac0>MAC</WifiMacFilterMac0><wifihostname0>NAME</wifihostname0>
      for (let i = 0; i < 16; i++) {
        const macTag = `WifiMacFilterMac${i}`;
        const hostTag = `wifihostname${i}`;

        const macMatch = response.match(new RegExp(`<${macTag}>([^<]*)</${macTag}>`));
        const hostMatch = response.match(new RegExp(`<${hostTag}>([^<]*)</${hostTag}>`));

        if (macMatch && macMatch[1] && macMatch[1].trim() !== '') {
          blockedDevices.push({
            macAddress: macMatch[1].trim(),
            hostName: hostMatch ? hostMatch[1].trim() : '',
          });
        }
      }

      return blockedDevices;
    } catch (error) {
      console.error('Error getting blocked devices:', error);
      return [];
    }
  }

  async toggleWiFi(enable: boolean): Promise<boolean> {
    try {
      // Endpoint: /api/wlan/status-switch-settings
      const postData = `<?xml version="1.0" encoding="UTF-8"?>
        <request>
          <radios>
            <radio>
              <wifienable>${enable ? '1' : '0'}</wifienable>
              <index>0</index>
              <ID>InternetGatewayDevice.X_Config.Wifi.Radio.1.</ID>
            </radio>
          </radios>
          <WifiRestart>1</WifiRestart>
        </request>`;

      const response = await this.apiClient.post('/api/wlan/status-switch-settings', postData);

      // Check for error code in response
      const errorCode = parseXMLValue(response, 'code');
      if (errorCode && errorCode !== '0') {
        throw new Error(`API error: ${errorCode}`);
      }

      return true;
    } catch (error) {
      console.error('[WiFi] Error toggling WiFi:', error);
      throw error;
    }
  }

  // ============ Parental Control ============

  async getParentalControlEnabled(): Promise<boolean> {
    try {
      const response = await this.apiClient.get('/api/timerule/timerule');
      // Check if there are any enabled rules
      const rulesXML = response.match(/<TimeControlRule>([\s\S]*?)<\/TimeControlRule>/g);
      if (rulesXML) {
        return rulesXML.some(rule => parseXMLValue(rule, 'Enable') === '1');
      }
      return false;
    } catch (error) {
      console.error('Error getting parental control status:', error);
      return false;
    }
  }

  async toggleParentalControl(enable: boolean): Promise<boolean> {
    // This modem doesn't have a global toggle - each rule has its own enable
    // For now, just return true
    return true;
  }

  async getParentalControlProfiles(): Promise<{
    id: string;
    name: string;
    deviceMacs: string[];
    deviceNames: string[];
    startTime: string;
    endTime: string;
    activeDays: number[];
    enabled: boolean;
  }[]> {
    try {
      const response = await this.apiClient.get('/api/timerule/timerule');

      const profiles: {
        id: string;
        name: string;
        deviceMacs: string[];
        deviceNames: string[];
        startTime: string;
        endTime: string;
        activeDays: number[];
        enabled: boolean;
      }[] = [];

      const rulesXML = response.match(/<TimeControlRule>([\s\S]*?)<\/TimeControlRule>/g);

      if (rulesXML) {
        rulesXML.forEach((ruleXML, index) => {

          // Parse device MACs - look for DevicesMAC inside DevicesMACs
          const macsMatch = ruleXML.match(/<DevicesMAC>([^<]+)<\/DevicesMAC>/g);
          const deviceMacs = macsMatch ? macsMatch.map(m => m.replace(/<\/?DevicesMAC>/g, '')) : [];

          // Parse device names
          const namesMatch = ruleXML.match(/<DevicesName>([^<]+)<\/DevicesName>/g);
          const deviceNames = namesMatch ? namesMatch.map(m => m.replace(/<\/?DevicesName>/g, '')) : [];

          const weekEnable = parseXMLValue(ruleXML, 'WeekEnable') || '0000000';
          const id = parseXMLValue(ruleXML, 'ID') || `rule_${index}`;

          profiles.push({
            id: id,
            name: deviceNames[0] || `Rule ${index + 1}`,
            deviceMacs: deviceMacs,
            deviceNames: deviceNames,
            startTime: parseXMLValue(ruleXML, 'StartTime') || '00:00',
            endTime: parseXMLValue(ruleXML, 'EndTime') || '23:59',
            activeDays: this.parseDaysString(weekEnable),
            enabled: parseXMLValue(ruleXML, 'Enable') === '1',
          });
        });
      }

      return profiles;
    } catch (error) {
      console.error('Error getting parental control profiles:', error);
      return [];
    }
  }

  async createParentalControlProfile(profile: {
    name: string;
    deviceMacs: string[];
    deviceNames?: string[];
    startTime: string;
    endTime: string;
    activeDays: number[];
    enabled: boolean;
  }): Promise<boolean> {
    try {

      // Build DevicesMAC elements
      const deviceMacsXml = profile.deviceMacs.map(mac => `<DevicesMAC>${mac}</DevicesMAC>`).join('');

      // Build DevicesName elements
      const deviceNamesXml = (profile.deviceNames || [profile.name]).map(name => `<DevicesName>${name}</DevicesName>`).join('');

      // WeekEnable format: 7 digits for Sun-Sat (0=disabled, 1=enabled)
      const weekEnable = this.daysToString(profile.activeDays);

      const data = `<?xml version="1.0" encoding="UTF-8"?>
<request>
<TimeControlRules>
<TimeControlRule>
<Action>create</Action>
<Enable>${profile.enabled ? '1' : '0'}</Enable>
<TimeMode>1</TimeMode>
<ID></ID>
<DevicesMACs>${deviceMacsXml}</DevicesMACs>
<DevicesNames>${deviceNamesXml}</DevicesNames>
<WeekEnable>${weekEnable}</WeekEnable>
<StartTime>${profile.startTime}</StartTime>
<EndTime>${profile.endTime}</EndTime>
</TimeControlRule>
</TimeControlRules>
</request>`;


      const response = await this.apiClient.post('/api/timerule/timerule', data);

      if (response.includes('<error>')) {
        const errorCode = response.match(/<code>(\d+)<\/code>/)?.[1];
        throw new Error(`Failed to create profile: error ${errorCode}`);
      }

      return true;
    } catch (error) {
      console.error('[DEBUG] createParentalControlProfile: Error:', error);
      throw error;
    }
  }

  async updateParentalControlProfile(profile: {
    id: string;
    name: string;
    deviceMacs: string[];
    deviceNames?: string[];
    startTime: string;
    endTime: string;
    activeDays: number[];
    enabled: boolean;
  }): Promise<boolean> {
    try {

      // Web interface uses DELETE + CREATE for editing (not modify)
      // Step 1: Delete the old rule
      await this.deleteParentalControlProfile(profile.id);

      // Step 2: Create new rule with updated settings
      await this.createParentalControlProfile({
        name: profile.name,
        deviceMacs: profile.deviceMacs.filter((mac, index, self) => self.indexOf(mac) === index), // Remove duplicates
        deviceNames: profile.deviceNames,
        startTime: profile.startTime,
        endTime: profile.endTime,
        activeDays: profile.activeDays,
        enabled: profile.enabled,
      });

      return true;
    } catch (error) {
      console.error('[DEBUG] updateParentalControlProfile: Error:', error);
      throw error;
    }
  }

  // Toggle enable/disable for a rule without changing other settings
  async toggleParentalControlProfileEnabled(profile: {
    id: string;
    name: string;
    deviceMacs: string[];
    deviceNames?: string[];
    startTime: string;
    endTime: string;
    activeDays: number[];
    enabled: boolean;
  }): Promise<boolean> {
    try {

      // Build DevicesMAC elements - remove duplicates
      const uniqueMacs = profile.deviceMacs.filter((mac, index, self) => self.indexOf(mac) === index);
      const deviceMacsXml = uniqueMacs.map(mac => `<DevicesMAC>${mac}</DevicesMAC>`).join('');

      // Build DevicesName elements
      const deviceNamesXml = (profile.deviceNames || [profile.name]).map(name => `<DevicesName>${name}</DevicesName>`).join('');

      const weekEnable = this.daysToString(profile.activeDays);

      const data = `<?xml version="1.0" encoding="UTF-8"?>
<request>
<TimeControlRules>
<TimeControlRule>
<Action>update</Action>
<Enable>${profile.enabled ? '1' : '0'}</Enable>
<TimeMode>1</TimeMode>
<ID>${profile.id}</ID>
<DevicesMACs>${deviceMacsXml}</DevicesMACs>
<DevicesNames>${deviceNamesXml}</DevicesNames>
<WeekEnable>${weekEnable}</WeekEnable>
<StartTime>${profile.startTime}</StartTime>
<EndTime>${profile.endTime}</EndTime>
</TimeControlRule>
</TimeControlRules>
</request>`;


      const response = await this.apiClient.post('/api/timerule/timerule', data);

      if (response.includes('<error>')) {
        const errorCode = response.match(/<code>(\d+)<\/code>/)?.[1];
        throw new Error(`Failed to toggle profile: error ${errorCode}`);
      }

      return true;
    } catch (error) {
      console.error('[DEBUG] toggleParentalControlProfileEnabled: Error:', error);
      throw error;
    }
  }

  async deleteParentalControlProfile(profileId: string): Promise<boolean> {
    try {

      const data = `<?xml version="1.0" encoding="UTF-8"?>
<request>
<TimeControlRules>
<TimeControlRule>
<Action>delete</Action>
<ID>${profileId}</ID>
</TimeControlRule>
</TimeControlRules>
</request>`;


      const response = await this.apiClient.post('/api/timerule/timerule', data);

      if (response.includes('<error>')) {
        const errorCode = response.match(/<code>(\d+)<\/code>/)?.[1];
        throw new Error(`Failed to delete profile: error ${errorCode}`);
      }

      return true;
    } catch (error) {
      console.error('[DEBUG] deleteParentalControlProfile: Error:', error);
      throw error;
    }
  }

  // Helper methods for parental control
  private parseDaysString(daysString: string): number[] {
    // Format: "1010101" where each position is a day (Sun=0 to Sat=6)
    const days: number[] = [];
    for (let i = 0; i < daysString.length && i < 7; i++) {
      if (daysString[i] === '1') {
        days.push(i);
      }
    }
    return days;
  }

  private daysToString(days: number[]): string {
    // Convert array of day numbers to "1010101" format
    let result = '';
    for (let i = 0; i < 7; i++) {
      result += days.includes(i) ? '1' : '0';
    }
    return result;
  }

  // Change device name via API
  async changeDeviceName(deviceId: string, newName: string): Promise<boolean> {
    try {
      const data = `<?xml version="1.0" encoding="UTF-8"?><request><ID>${deviceId}</ID><ActualName>${newName}</ActualName></request>`;

      const response = await this.apiClient.post('/api/lan/changedevicename', data);

      if (response.includes('<error>')) {
        const errorCode = response.match(/<code>(\d+)<\/code>/)?.[1];
        throw new Error(`Failed to change device name: error ${errorCode}`);
      }

      return true;
    } catch (error) {
      console.error('Error changing device name:', error);
      throw error;
    }
  }
}

