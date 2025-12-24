import axios, { AxiosInstance } from 'axios';
import { parseXMLValue } from '@/utils/helpers';
import * as Crypto from 'expo-crypto';

export class ModemAPIClient {
  private client: AxiosInstance;
  private sessionToken: string = '';
  private sessionCookie: string = '';
  private tokenExpiry: number = 0;

  constructor(private baseURL: string) {
    this.client = axios.create({
      baseURL: `http://${baseURL}`,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Accept': '*/*',
        'Accept-Language': 'en,en-US;q=0.9,id;q=0.8',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': `http://${baseURL}/html/content.html`,
        'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36',
      },
    });

    // Add response interceptor to capture session tokens and cookies
    this.client.interceptors.response.use((response) => {
      const token = response.headers['__requestverificationtoken'];
      if (token) {
        this.sessionToken = token;
        this.tokenExpiry = Date.now() + 30000; // 30 seconds validity
      }

      // Capture session cookie
      const cookie = response.headers['set-cookie'];
      if (cookie) {
        this.sessionCookie = Array.isArray(cookie) ? cookie[0] : cookie;
      }

      return response;
    });
  }

  private async getToken(forceRefresh: boolean = false): Promise<{ token: string; session: string }> {
    // Refresh token if expired or about to expire (within 10 seconds)
    const shouldRefresh = forceRefresh || !this.sessionToken || Date.now() > (this.tokenExpiry - 10000);

    if (!shouldRefresh) {
      return { token: this.sessionToken, session: this.sessionCookie };
    }

    try {
      const response = await this.client.get('/api/webserver/SesTokInfo');

      // Parse token from XML
      this.sessionToken = parseXMLValue(response.data, 'TokInfo');
      const sesInfo = parseXMLValue(response.data, 'SesInfo').trim();
      // Increase token validity to 2 minutes (modem sessions typically last longer)
      this.tokenExpiry = Date.now() + 120000;

      // IMPORTANT: Prioritize Set-Cookie header first (matches working bot-hmonn)
      let session = '';
      const setCookie = response.headers['set-cookie'];
      if (setCookie && (Array.isArray(setCookie) ? setCookie.length > 0 : true)) {
        const sessionCookie = Array.isArray(setCookie)
          ? setCookie.find((c: string) => c.includes('SessionID'))
          : setCookie;
        if (sessionCookie) {
          const match = sessionCookie.match(/SessionID=([^;]+)/);
          if (match) {
            session = `SessionID=${match[1]}`;
          }
        }
      }

      // Fallback to SesInfo if Set-Cookie was empty
      if (!session && sesInfo) {
        session = sesInfo.includes('SessionID=')
          ? sesInfo
          : `SessionID=${sesInfo}`;
      }

      this.sessionCookie = session;

      return { token: this.sessionToken, session: this.sessionCookie };
    } catch (error) {
      console.error('[API] Error getting token:', error);
      throw error;
    }
  }

  private async encodePassword(password: string, username: string, token: string): Promise<string> {
    // Huawei modem password encoding (password_type 4):
    // Step 1: SHA256 hash of password -> HEX string
    const passwordHashHex = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      password,
      { encoding: Crypto.CryptoEncoding.HEX }
    );

    // Step 2: Base64 encode the HEX string (not the raw bytes!)
    const base64PasswordHash = this.hexToBase64(passwordHashHex);

    // Step 3: Combine username + base64(hexHash) + token
    const combined = username + base64PasswordHash + token;

    // Step 4: SHA256 hash of combined -> HEX string
    const finalHashHex = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      combined,
      { encoding: Crypto.CryptoEncoding.HEX }
    );

    // Step 5: Base64 encode the final HEX string
    const finalBase64 = this.hexToBase64(finalHashHex);

    return finalBase64;
  }

  private hexToBase64(hex: string): string {
    // Convert hex string to base64 by treating the hex as a string (not bytes)
    // This matches Node.js Buffer.from(hexString).toString('base64')
    // which encodes the ASCII characters of the hex string, not the binary values
    const bytes = new Uint8Array(hex.length);
    for (let i = 0; i < hex.length; i++) {
      bytes[i] = hex.charCodeAt(i);
    }
    // Convert to base64 using btoa with binary string
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private xmlHttpRequest(
    method: string,
    url: string,
    body: string | null = null,
    headers: Record<string, string> = {}
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(method, url, true);
      xhr.withCredentials = true; // Important for cookie handling

      for (const key in headers) {
        xhr.setRequestHeader(key, headers[key]);
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // Capture session cookie from response headers
          const setCookieHeader = xhr.getResponseHeader('Set-Cookie');
          if (setCookieHeader) {
            const sessionCookie = setCookieHeader.split(';')[0]; // Take the first part before ;
            if (sessionCookie && sessionCookie.includes('SessionID=')) {
              this.sessionCookie = sessionCookie;
            }
          }

          // Capture token from response headers
          const tokenHeader = xhr.getResponseHeader('__RequestVerificationToken');
          if (tokenHeader) {
            this.sessionToken = tokenHeader;
            this.tokenExpiry = Date.now() + 30000; // 30 seconds validity
          }

          resolve(xhr.responseText);
        } else {
          reject(new Error(`Request failed with status ${xhr.status}: ${xhr.statusText}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error or request failed'));
      };

      if (body) {
        xhr.send(body);
      } else {
        xhr.send();
      }
    });
  }

  // Check if already logged in by testing a protected endpoint
  async isLoggedIn(): Promise<boolean> {
    try {
      // Try to access device info - this requires authentication
      const response = await this.client.get('/api/device/information', {
        timeout: 5000,
        headers: {
          'Cookie': this.sessionCookie || '',
        },
      });

      const data = typeof response.data === 'string' ? response.data : '';

      // If we get device info without error, we're logged in
      if (data.includes('<DeviceName>') || data.includes('<response>')) {
        if (!data.includes('<error>')) {
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  async login(username: string, password: string): Promise<boolean> {
    try {
      // First, check if we're already logged in (from WebView or previous session)
      const alreadyLoggedIn = await this.isLoggedIn();
      if (alreadyLoggedIn) {
        return true;
      }

      // Step 1: Get fresh token and session using axios
      const tokenResponse = await this.client.get('/api/webserver/SesTokInfo');

      const token = parseXMLValue(tokenResponse.data, 'TokInfo');
      const sesInfo = parseXMLValue(tokenResponse.data, 'SesInfo');

      if (!token) {
        return false;
      }

      // Extract session from response - use SesInfo directly
      // Note: In React Native, Set-Cookie headers may not be accessible
      let session = '';
      if (sesInfo) {
        session = sesInfo.includes('SessionID=') ? sesInfo : `SessionID=${sesInfo}`;
      }

      // Step 2: Encode password
      const passwordType = '4';
      const encodedPassword = await this.encodePassword(password, username, token);

      // Step 3: Build login XML
      const loginXML = `<?xml version="1.0" encoding="UTF-8"?>
<request>
  <Username>${username}</Username>
  <Password>${encodedPassword}</Password>
  <password_type>${passwordType}</password_type>
</request>`;

      // Step 4: Send login request using axios
      const loginResponse = await this.client.post('/api/user/login', loginXML, {
        headers: {
          '__RequestVerificationToken': token,
          'Content-Type': 'application/xml',
          'Cookie': session,
        },
      });

      const responseData = typeof loginResponse.data === 'string'
        ? loginResponse.data
        : JSON.stringify(loginResponse.data);

      // Check for error response
      if (responseData.includes('<error>')) {
        const errorCode = parseXMLValue(responseData, 'code');

        // 108002: User already logged in - treat as success
        if (errorCode === '108002') {
          this.sessionToken = token;
          this.sessionCookie = session;
          this.tokenExpiry = Date.now() + 120000;
          return true;
        }

        return false;
      }

      // Check for success response
      if (responseData.includes('<response>OK</response>') ||
        responseData.includes('<response/>') ||
        responseData.includes('<?xml version="1.0" encoding="UTF-8"?><response>OK</response>') ||
        responseData.trim() === 'OK') {
        this.sessionToken = token;
        this.sessionCookie = session;
        this.tokenExpiry = Date.now() + 120000;
        return true;
      }

      return false;
    } catch (error: any) {
      // Check if error response contains XML with error code
      if (error.response?.data) {
        const errorData = typeof error.response.data === 'string'
          ? error.response.data
          : JSON.stringify(error.response.data);

        if (errorData.includes('<error>')) {
          const errorCode = parseXMLValue(errorData, 'code');

          if (errorCode === '108002') {
            // Already logged in - treat as success
            return true;
          }
        }
      }

      return false;
    }
  }

  async logout(): Promise<boolean> {
    try {
      const { token } = await this.getToken();

      const logoutData = `<?xml version="1.0" encoding="UTF-8"?>
        <request>
          <Logout>1</Logout>
        </request>`;

      const response = await this.client.post('/api/user/logout', logoutData, {
        headers: {
          '__RequestVerificationToken': token,
        },
      });

      return response.status === 200;
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  async get(endpoint: string): Promise<string> {
    try {
      // Always refresh session before GET requests to keep session alive
      await this.getToken();

      const response = await this.client.get(endpoint, {
        headers: {
          'Cookie': this.sessionCookie || '',
        },
      });

      return response.data;
    } catch (error) {
      console.error(`Error getting ${endpoint}:`, error);
      throw error;
    }
  }

  async post(endpoint: string, data: string, retryCount = 0): Promise<string> {
    try {
      // Always force refresh token before POST - modem requires fresh token for each POST
      const { token } = await this.getToken(true);  // Force refresh

      const response = await this.client.post(endpoint, data, {
        headers: {
          '__RequestVerificationToken': token,
          'Cookie': this.sessionCookie || '',
        },
      });

      // Check if response contains session/token errors
      const responseData = typeof response.data === 'string' ? response.data : '';

      // Error 125003 = Session expired, 125002 = Wrong token
      if (responseData.includes('<code>125003</code>') || responseData.includes('<code>125002</code>')) {
        // Clear session to force re-login
        this.sessionToken = '';
        this.sessionCookie = '';
        this.tokenExpiry = 0;

        // Throw error with specific message for UI to handle
        const errorCode = responseData.includes('125003') ? '125003' : '125002';
        throw new Error(`Session expired (${errorCode}). Please re-login.`);
      }

      // Error 100005 = Parameter error (may need different handling)
      if (responseData.includes('<code>100005</code>')) {
        throw new Error('Parameter error (100005). The request format may be incorrect.');
      }

      return response.data;
    } catch (error) {
      console.error(`POST error to ${endpoint}:`, error);
      throw error;
    }
  }
}
