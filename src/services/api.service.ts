import axios, { AxiosInstance } from 'axios';
import { parseXMLValue } from '@/utils/helpers';
import { updateSessionActivity, markSessionUnhealthy } from '@/utils/storage';
import * as Crypto from 'expo-crypto';
import CryptoJS from 'crypto-js';

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

    // Add request interceptor to track timing
    this.client.interceptors.request.use((config) => {
      // Store request start time for duration calculation
      (config as any).metadata = { startTime: Date.now() };
      return config;
    });

    // Add response interceptor to capture session tokens, cookies, and log for debug
    this.client.interceptors.response.use(
      (response) => {
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

        // Debug logging - get the store dynamically to avoid circular imports
        this.logDebug(response.config, response.data, undefined);

        return response;
      },
      (error) => {
        // Log errors too
        if (error.config) {
          this.logDebug(error.config, undefined, error.message || 'Request failed');
        }
        return Promise.reject(error);
      }
    );
  }

  // Debug logging helper - called from interceptors
  private logDebug(config: any, responseData: any, errorMessage?: string) {
    try {
      // Dynamically import to avoid circular dependency
      const { useDebugStore } = require('@/stores/debug.store');
      const store = useDebugStore.getState();

      if (store.debugEnabled) {
        const startTime = config.metadata?.startTime || Date.now();
        const duration = Date.now() - startTime;

        store.addLog({
          endpoint: config.url || 'unknown',
          method: config.method?.toUpperCase() || 'GET',
          requestData: config.data ? this.sanitizeData(config.data) : undefined,
          responseData: responseData ? this.sanitizeData(responseData) : undefined,
          error: errorMessage,
          duration,
        });
      }
    } catch (e) {
      // Silent fail if debug store not available
    }
  }

  // Sanitize sensitive data before logging
  private sanitizeData(data: any): any {
    if (typeof data === 'string') {
      // Mask passwords in XML
      return data
        .replace(/<password>.*?<\/password>/gi, '<password>***</password>')
        .replace(/<Password>.*?<\/Password>/gi, '<Password>***</Password>');
    }
    return data;
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
      // Extend token validity to 5 minutes (matches typical modem session timeout)
      this.tokenExpiry = Date.now() + 300000;

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

  // Generate random nonce for SCRAM authentication
  private async generateNonce(): Promise<string> {
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    return Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Convert hex string to byte array
  private hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  }

  // Convert byte array to hex string
  private bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // PBKDF2-SHA256 implementation using crypto-js
  private pbkdf2(password: string, salt: string, iterations: number): Uint8Array {
    const saltWordArray = CryptoJS.enc.Hex.parse(salt);
    const derivedKey = CryptoJS.PBKDF2(password, saltWordArray, {
      keySize: 256 / 32,  // 32 bytes
      iterations: iterations,
      hasher: CryptoJS.algo.SHA256,
    });

    // Convert WordArray to Uint8Array
    const words = derivedKey.words;
    const sigBytes = derivedKey.sigBytes;
    const bytes = new Uint8Array(sigBytes);
    for (let i = 0; i < sigBytes; i++) {
      bytes[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
    }
    return bytes;
  }

  // HMAC-SHA256 using crypto-js
  private hmacSha256(key: Uint8Array, message: string): Uint8Array {
    // Convert Uint8Array to WordArray
    const keyWordArray = CryptoJS.lib.WordArray.create(key as any);
    const hmac = CryptoJS.HmacSHA256(message, keyWordArray);

    // Convert WordArray to Uint8Array
    const words = hmac.words;
    const sigBytes = hmac.sigBytes;
    const bytes = new Uint8Array(sigBytes);
    for (let i = 0; i < sigBytes; i++) {
      bytes[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
    }
    return bytes;
  }

  // XOR two byte arrays
  private xorBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
    const result = new Uint8Array(a.length);
    for (let i = 0; i < a.length; i++) {
      result[i] = a[i] ^ b[i];
    }
    return result;
  }

  // SHA256 hash of byte array using crypto-js
  private sha256Bytes(data: Uint8Array): Uint8Array {
    const wordArray = CryptoJS.lib.WordArray.create(data as any);
    const hash = CryptoJS.SHA256(wordArray);

    // Convert WordArray to Uint8Array
    const words = hash.words;
    const sigBytes = hash.sigBytes;
    const bytes = new Uint8Array(sigBytes);
    for (let i = 0; i < sigBytes; i++) {
      bytes[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
    }
    return bytes;
  }

  // SCRAM authentication login
  async scramLogin(username: string, password: string): Promise<boolean> {
    try {
      // Step 1a: Get session from SesTokInfo first
      const sesResponse = await this.client.get('/api/webserver/SesTokInfo');
      const sesInfo = parseXMLValue(sesResponse.data, 'SesInfo');

      // Extract session cookie
      let session = '';
      if (sesInfo) {
        session = sesInfo.includes('SessionID=') ? sesInfo : `SessionID=${sesInfo}`;
      }

      // Step 1b: Get CSRF token from /api/webserver/token (as shown in notes.txt)
      const tokenResponse = await this.client.get('/api/webserver/token', {
        headers: {
          'Cookie': session,
        },
      });
      const csrfToken = parseXMLValue(tokenResponse.data, 'token');

      if (!csrfToken) {
        console.error('[SCRAM] Failed to get CSRF token');
        return false;
      }

      console.log('[SCRAM] Got token:', csrfToken.substring(0, 10) + '...');

      // Step 2: Generate client nonce
      const clientNonce = await this.generateNonce();

      // Step 3: Send challenge_login with session cookie
      const challengeXml = `<?xml version="1.0" encoding="UTF-8"?><request><username>${username}</username><firstnonce>${clientNonce}</firstnonce><mode>1</mode></request>`;

      const challengeResponse = await this.client.post('/api/user/challenge_login', challengeXml, {
        headers: {
          '__RequestVerificationToken': csrfToken,
          'Content-Type': 'application/xml',
          'Cookie': session,
        },
      });

      const challengeData = typeof challengeResponse.data === 'string' ? challengeResponse.data : JSON.stringify(challengeResponse.data);
      console.log('[SCRAM] Challenge response:', challengeData);

      const salt = parseXMLValue(challengeData, 'salt');
      const serverNonce = parseXMLValue(challengeData, 'servernonce');
      const iterations = parseInt(parseXMLValue(challengeData, 'iterations') || '100');

      console.log('[SCRAM] Parsed - salt:', salt, 'serverNonce:', serverNonce, 'iterations:', iterations);

      if (!salt || !serverNonce) {
        console.error('[SCRAM] Invalid challenge response - missing salt or serverNonce');
        return false;
      }

      // Step 4: Calculate client proof using SCRAM
      // First, hash the password
      const passwordHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password,
        { encoding: Crypto.CryptoEncoding.HEX }
      );

      // PBKDF2 to derive salted password
      const saltedPassword = this.pbkdf2(passwordHash, salt, iterations);

      // Calculate ClientKey = HMAC(SaltedPassword, "Client Key")
      const clientKey = this.hmacSha256(saltedPassword, 'Client Key');

      // Calculate StoredKey = SHA256(ClientKey)
      const storedKey = this.sha256Bytes(clientKey);

      // Auth message = clientNonce + "," + serverNonce + "," + serverNonce
      const authMessage = `${clientNonce},${serverNonce},${serverNonce}`;

      // Calculate ClientSignature = HMAC(StoredKey, AuthMessage)
      const clientSignature = this.hmacSha256(storedKey, authMessage);

      // Calculate ClientProof = ClientKey XOR ClientSignature
      const clientProof = this.xorBytes(clientKey, clientSignature);
      const clientProofHex = this.bytesToHex(clientProof);

      // Step 5: Send authentication_login with session cookie
      const authXml = `<?xml version="1.0" encoding="UTF-8"?><request><clientproof>${clientProofHex}</clientproof><finalnonce>${serverNonce}</finalnonce></request>`;

      const authResponse = await this.client.post('/api/user/authentication_login', authXml, {
        headers: {
          '__RequestVerificationToken': csrfToken,
          'Content-Type': 'application/xml',
          'Cookie': session,
        },
      });

      const authData = typeof authResponse.data === 'string' ? authResponse.data : '';
      console.log('[SCRAM] Auth response:', authData);

      // Check for success
      if (authData.includes('<serversignature>') || authData.includes('<response>')) {
        if (!authData.includes('<error>')) {
          // Update session info
          this.sessionToken = csrfToken;
          this.sessionCookie = session;
          this.tokenExpiry = Date.now() + 120000;
          return true;
        }
      }

      // Check for error
      if (authData.includes('<error>')) {
        const errorCode = parseXMLValue(authData, 'code');
        console.error('[SCRAM] Auth error:', errorCode);
        return false;
      }

      return false;
    } catch (error) {
      console.error('[SCRAM] Login error:', error);
      return false;
    }
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
        console.log('[Login] Already logged in');
        return true;
      }

      console.log('[Login] Trying password_type 4 method...');

      // Step 0: Fetch homepage to establish session cookies (CRITICAL!)
      try {
        await this.client.get('/html/index.html');
        console.log('[Login] Homepage fetched');
      } catch (e) {
        // Ignore error, continue anyway
      }

      // Step 1: Get fresh token and session using axios
      const tokenResponse = await this.client.get('/api/webserver/SesTokInfo');

      const token = parseXMLValue(tokenResponse.data, 'TokInfo');
      const sesInfo = parseXMLValue(tokenResponse.data, 'SesInfo');

      if (!token) {
        console.log('[Login] Failed to get token');
        return false;
      }

      // Format session cookie
      let session = '';
      if (sesInfo) {
        session = sesInfo.includes('SessionID=') ? sesInfo : `SessionID=${sesInfo}`;
        this.sessionCookie = session;
      }

      console.log('[Login] Got token:', token.substring(0, 16) + '...');
      console.log('[Login] Got session:', session.substring(0, 30) + '...');

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

      console.log('[Login] Response:', responseData.substring(0, 150));

      // Check for error response
      if (responseData.includes('<error>')) {
        const errorCode = parseXMLValue(responseData, 'code');
        console.log('[Login] Error code:', errorCode);

        // 108002: User already logged in - treat as success
        if (errorCode === '108002') {
          console.log('[Login] Already logged in, treating as success');
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
        console.log('[Login] Login successful!');
        this.sessionToken = token;
        this.sessionCookie = session;
        this.tokenExpiry = Date.now() + 120000;
        return true;
      }

      console.log('[Login] Unexpected response format');
      return false;
    } catch (error: any) {
      console.log('[Login] Error:', error.message);
      // Check if error response contains XML with error code
      if (error.response?.data) {
        const errorData = typeof error.response.data === 'string'
          ? error.response.data
          : JSON.stringify(error.response.data);

        console.log('[Login] Error response data:', errorData.substring(0, 150));

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

      // Track successful session activity
      updateSessionActivity();

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

        // Mark session as unhealthy for persistence
        markSessionUnhealthy();

        // Throw error with specific message for UI to handle
        const errorCode = responseData.includes('125003') ? '125003' : '125002';
        throw new Error(`Session expired (${errorCode}). Please re-login.`);
      }

      // Error 100005 = Parameter error (may need different handling)
      if (responseData.includes('<code>100005</code>')) {
        throw new Error('Parameter error (100005). The request format may be incorrect.');
      }

      // Track successful session activity
      updateSessionActivity();

      return response.data;
    } catch (error: any) {
      // Don't log session errors - they're handled silently by the app
      const isSessionError = error?.message?.includes('125003') || error?.message?.includes('125002');
      if (!isSessionError) {
        console.error(`POST error to ${endpoint}:`, error);
      }
      throw error;
    }
  }
}
