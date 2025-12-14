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
    if (!forceRefresh && this.sessionToken && Date.now() < this.tokenExpiry) {
      return { token: this.sessionToken, session: this.sessionCookie };
    }

    try {
      const response = await this.client.get('/api/webserver/SesTokInfo');

      // Parse token and session info
      this.sessionToken = parseXMLValue(response.data, 'TokInfo');
      const sesInfo = parseXMLValue(response.data, 'SesInfo').trim();
      this.tokenExpiry = Date.now() + 30000;

      // Prefer the SesInfo pair as the cookie to keep token+session in-sync
      if (sesInfo) {
        this.sessionCookie = sesInfo.includes('SessionID=')
          ? sesInfo
          : `SessionID=${sesInfo}`;
      }

      // Fallback: try Set-Cookie header if SesInfo was empty
      if (!this.sessionCookie) {
        const setCookie = response.headers['set-cookie'];
        if (setCookie) {
          const sessionCookie = Array.isArray(setCookie)
            ? setCookie.find((c: string) => c.includes('SessionID'))
            : setCookie;
          if (sessionCookie) {
            const match = sessionCookie.match(/SessionID=([^;]+)/);
            if (match) {
              this.sessionCookie = `SessionID=${match[1]}`;
            }
          }
        }
      }

      console.log('[API] Got fresh token:', this.sessionToken.substring(0, 20) + '...');
      console.log('[API] Got session:', this.sessionCookie.substring(0, 50) + '...');
      return { token: this.sessionToken, session: this.sessionCookie };
    } catch (error) {
      console.error('[API] Error getting token:', error);
      throw error;
    }
  }

  private async encodePassword(password: string, username: string, token: string): Promise<string> {
    // Step 1: SHA256 hash of password -> base64
    const passwordHashBase64 = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      password,
      { encoding: Crypto.CryptoEncoding.BASE64 }
    );
    console.log('[API] Password hash base64:', passwordHashBase64);

    // Step 2: Combine username + base64Hash + token
    const combined = username + passwordHashBase64 + token;
    console.log('[API] Combined string:', combined);

    // Step 3: SHA256 hash the combined string -> base64
    const finalBase64 = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      combined,
      { encoding: Crypto.CryptoEncoding.BASE64 }
    );
    console.log('[API] Final base64:', finalBase64);

    return finalBase64;
  }

  async login(username: string, password: string): Promise<boolean> {
    try {
      console.log('[API] ========== LOGIN START ==========');
      
      // Step 1: Get initial token and session (use pair from same response)
      console.log('[API] Step 1: Getting token/session from SesTokInfo...');
      const { token: loginToken, session: loginSession } = await this.getToken(true);
      console.log('[API] Token:', loginToken);
      console.log('[API] Session:', loginSession);
      
      // Step 2: Password type (assume 4 for modern firmware)
      const passwordType = '4';
      console.log('[API] Password type:', passwordType);
      
      // Step 3: Encode password with SHA256
      console.log('[API] Step 3: Encoding password...');
      console.log('[API] Original password:', password);
      const encodedPassword = await this.encodePassword(password, username, loginToken);
      console.log('[API] Encoded password:', encodedPassword);
      
      const loginData = `<?xml version="1.0" encoding="UTF-8"?>
<request>
<Username>${username}</Username>
<Password>${encodedPassword}</Password>
<password_type>${passwordType}</password_type>
</request>`;

      console.log('[API] Step 4: Sending login request...');
      console.log('[API] Login XML:', loginData);
      
      const response = await this.client.post('/api/user/login', loginData, {
        headers: {
          '__RequestVerificationToken': loginToken,
          'Cookie': loginSession,
          'Origin': `http://${this.baseURL}`,
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        validateStatus: () => true,
      });

      console.log('[API] Login response status:', response.status);
      console.log('[API] Login response data:', response.data);

      // Huawei modem returns 200 even on failed login
      // Check the XML response for error or success
      const responseData = response.data;
      
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
        
        // Save session from response cookie
        const setCookie = response.headers['set-cookie'];
        if (setCookie) {
          const sessionCookie = Array.isArray(setCookie)
            ? setCookie.find((c: string) => c.includes('SessionID'))
            : setCookie;
          if (sessionCookie) {
            const match = sessionCookie.match(/SessionID=([^;]+)/);
            if (match) {
              this.sessionCookie = `SessionID=${match[1]}`;
            }
          }
        }
        
        // Save token from response headers
        const respToken = response.headers['__requestverificationtoken'];
        if (respToken) {
          this.sessionToken = respToken;
          console.log('[API] Got new token from login response');
        }
        
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
