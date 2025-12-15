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

      console.log('[API] Got fresh token:', this.sessionToken.substring(0, 20) + '...');
      console.log('[API] Got session:', this.sessionCookie.substring(0, 50) + '...');
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
    console.log('[API] Password hash (hex):', passwordHashHex);

    // Step 2: Base64 encode the HEX string (not the raw bytes!)
    const base64PasswordHash = this.hexToBase64(passwordHashHex);
    console.log('[API] Password hash base64(hex):', base64PasswordHash);

    // Step 3: Combine username + base64(hexHash) + token
    const combined = username + base64PasswordHash + token;
    console.log('[API] Combined string:', combined.substring(0, 50) + '...');

    // Step 4: SHA256 hash of combined -> HEX string
    const finalHashHex = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      combined,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
    console.log('[API] Final hash (hex):', finalHashHex);

    // Step 5: Base64 encode the final HEX string
    const finalBase64 = this.hexToBase64(finalHashHex);
    console.log('[API] Final base64:', finalBase64);

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

  async login(username: string, password: string): Promise<boolean> {
    try {
      console.log('[API] ========== LOGIN START (Browser Headers) ==========');
      const baseUrl = `http://${this.baseURL}`;

      // Browser-like headers matching actual working request
      const browserHeaders = {
        'Accept': '*/*',
        'Accept-Language': 'en,en-US;q=0.9,id;q=0.8',
        'DNT': '1',
        'Host': this.baseURL,
        'Referer': `http://${this.baseURL}/html/content.html`,
        'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36',
        'X-Requested-With': 'XMLHttpRequest',
        '_ResponseSource': 'Broswer',
      };

      // Step 1: Get token and session
      console.log('[API] Step 1: Getting token/session from SesTokInfo...');
      const tokenXml = await this.xmlHttpRequest('GET', `${baseUrl}/api/webserver/SesTokInfo`, null, browserHeaders);
      console.log('[API] SesTokInfo response:', tokenXml);

      const token = parseXMLValue(tokenXml, 'TokInfo');
      const sesInfo = parseXMLValue(tokenXml, 'SesInfo');

      if (!token) {
        console.error('[API] Failed to get token from modem');
        return false;
      }

      // Use SesInfo directly as SessionID
      const session = sesInfo.includes('SessionID=') ? sesInfo : `SessionID=${sesInfo}`;

      console.log('[API] Token:', token);
      console.log('[API] Session:', session);

      // Step 2: Encode password
      const passwordType = '4';
      console.log('[API] Step 2: Encoding password (password_type:', passwordType, ')...');
      const encodedPassword = await this.encodePassword(password, username, token);
      console.log('[API] Encoded password:', encodedPassword);

      // Step 3: Build and send login request with ALL browser headers
      const loginXML = `<?xml version="1.0" encoding="UTF-8"?>
<request>
  <Username>${username}</Username>
  <Password>${encodedPassword}</Password>
  <password_type>${passwordType}</password_type>
</request>`;

      console.log('[API] Step 3: Sending login request with browser headers...');
      console.log('[API] Login XML:', loginXML);

      // Combine browser headers with login-specific headers
      const loginHeaders = {
        ...browserHeaders,
        '__RequestVerificationToken': token,
        'Content-Type': 'application/xml',
        'Cookie': session,
      };

      console.log('[API] Request headers:', JSON.stringify(loginHeaders, null, 2));

      const responseData = await this.xmlHttpRequest('POST', `${baseUrl}/api/user/login`, loginXML, loginHeaders);

      console.log('[API] Login response:', responseData);

      // Huawei modem returns 200 even on failed login
      // Check the XML response for error or success

      // Check for error response
      if (responseData.includes('<error>')) {
        const errorCode = parseXMLValue(responseData, 'code');
        const errorMessage = parseXMLValue(responseData, 'message');
        console.error('[API] Login failed with error code:', errorCode, 'message:', errorMessage);

        // Common error codes:
        // 108001: Username or password error
        // 108002: User already logged in
        // 108003: User not exist
        // 108006: User has been locked
        // 108007: Login timeout
        // 125003: Token verification failed

        if (errorCode === '108002') {
          // Already logged in - treat as success
          console.log('[API] User already logged in, treating as success');
          return true;
        }

        return false;
      }

      // Check for success response (usually contains "OK" or empty response)
      if (responseData.includes('<response>OK</response>') ||
        responseData.includes('<response/>') ||
        responseData.includes('<?xml version="1.0" encoding="UTF-8"?><response>OK</response>') ||
        responseData.trim() === 'OK') {

        // Note: Cookie and token are captured in xmlHttpRequest helper automatically
        console.log('[API] Login successful!');
        return true;
      }

      console.error('[API] Unknown login response format:', responseData);
      return false;
    } catch (error: any) {
      console.error('[API] Login error:', error);

      // Check if error response contains XML with error code
      if (error.response?.data) {
        const errorData = error.response.data;
        console.log('[API] Error response data:', errorData);

        if (typeof errorData === 'string' && errorData.includes('<error>')) {
          const errorCode = parseXMLValue(errorData, 'code');
          console.error('[API] Login failed with error code:', errorCode);

          if (errorCode === '108002') {
            // Already logged in
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

  async post(endpoint: string, data: string): Promise<string> {
    try {
      const { token } = await this.getToken();

      const response = await this.client.post(endpoint, data, {
        headers: {
          '__RequestVerificationToken': token,
          'Cookie': this.sessionCookie || '',
        },
      });

      return response.data;
    } catch (error) {
      console.error(`Error posting to ${endpoint}:`, error);
      throw error;
    }
  }
}
