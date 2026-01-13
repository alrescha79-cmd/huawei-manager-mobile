import CryptoJS from 'crypto-js';
import * as Crypto from 'expo-crypto';

export interface DirectAuthSession {
    sessionId: string;
    token: string;
    isAuthenticated: boolean;
    expiresAt?: number;
}

let isLoginInProgress = false;
let cachedSession: DirectAuthSession | null = null;


export class DirectAuthService {
    private baseUrl: string;
    private csrfToken: string = '';
    private sessionCookie: string = '';

    constructor(modemIp: string) {
        this.baseUrl = `http://${modemIp}`;
    }

    getSession(): DirectAuthSession | null {
        return cachedSession;
    }

    private parseXMLValue(xml: string, tag: string): string | null {
        const regex = new RegExp(`<${tag}>([^<]*)</${tag}>`);
        const match = xml.match(regex);
        return match ? match[1] : null;
    }

    private xmlRequest(
        method: 'GET' | 'POST',
        endpoint: string,
        body?: string
    ): Promise<string> {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open(method, `${this.baseUrl}${endpoint}`, true);
            xhr.timeout = 30000;
            xhr.withCredentials = true;

            xhr.setRequestHeader('Accept', 'application/xml, text/xml, */*');
            xhr.setRequestHeader('Accept-Language', 'en-US,en;q=0.9');

            if (method === 'POST') {
                xhr.setRequestHeader('Content-Type', 'application/xml; charset=UTF-8');
            }

            if (this.csrfToken) {
                xhr.setRequestHeader('__RequestVerificationToken', this.csrfToken);
            }

            if (this.sessionCookie) {
                xhr.setRequestHeader('Cookie', this.sessionCookie);
            }

            xhr.onload = () => {
                const newToken = xhr.getResponseHeader('__RequestVerificationToken');
                if (newToken) {
                    console.log('[DirectAuth] New token from response');
                    this.csrfToken = newToken;
                }

                const setCookie = xhr.getResponseHeader('Set-Cookie');
                if (setCookie && setCookie.includes('SessionID=')) {
                    const match = setCookie.match(/SessionID=([^;]+)/);
                    if (match) {
                        this.sessionCookie = `SessionID=${match[1]}`;
                        console.log('[DirectAuth] Updated session cookie');
                    }
                }

                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(xhr.responseText);
                } else {
                    reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
                }
            };

            xhr.onerror = () => reject(new Error('Network error'));
            xhr.ontimeout = () => reject(new Error('Request timeout'));

            xhr.send(body || null);
        });
    }

    private async initSession(): Promise<void> {
        console.log('[DirectAuth] Fetching homepage to establish session...');

        try {
            await this.xmlRequest('GET', '/html/index.html');
            console.log('[DirectAuth] Homepage fetched');
        } catch (e) {
            await this.xmlRequest('GET', '/');
        }

        const sesData = await this.xmlRequest('GET', '/api/webserver/SesTokInfo');

        const sesInfo = this.parseXMLValue(sesData, 'SesInfo');
        const tokInfo = this.parseXMLValue(sesData, 'TokInfo');

        if (!sesInfo) {
            throw new Error('Failed to get session info');
        }

        this.sessionCookie = sesInfo.includes('SessionID=') ? sesInfo : `SessionID=${sesInfo}`;

        if (tokInfo) {
            this.csrfToken = tokInfo;
        }

        console.log('[DirectAuth] Session:', this.sessionCookie.substring(0, 30) + '...');
        console.log('[DirectAuth] Token:', this.csrfToken.substring(0, 16) + '...');
    }

    private async refreshToken(): Promise<void> {
        const data = await this.xmlRequest('GET', '/api/webserver/token');
        const token = this.parseXMLValue(data, 'token');

        if (token) {
            this.csrfToken = token;
            console.log('[DirectAuth] Refreshed token:', token.substring(0, 16) + '...');
        }
    }

    private async generateNonce(length: number = 32): Promise<string> {
        const randomBytes = await Crypto.getRandomBytesAsync(length);
        return Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    private hexToBytes(hex: string): Uint8Array {
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
            bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
        }
        return bytes;
    }

    private bytesToHex(bytes: Uint8Array): string {
        return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    private pbkdf2(password: string, salt: Uint8Array, iterations: number): Uint8Array {
        const saltWordArray = CryptoJS.lib.WordArray.create(salt as any);

        const key = CryptoJS.PBKDF2(password, saltWordArray, {
            keySize: 256 / 32,
            iterations: iterations,
            hasher: CryptoJS.algo.SHA256,
        });

        return this.hexToBytes(key.toString(CryptoJS.enc.Hex));
    }

    private hmacSha256(key: Uint8Array, message: string): Uint8Array {
        const keyWordArray = CryptoJS.lib.WordArray.create(key as any);
        const hmac = CryptoJS.HmacSHA256(message, keyWordArray);
        return this.hexToBytes(hmac.toString(CryptoJS.enc.Hex));
    }

    private sha256(data: Uint8Array): Uint8Array {
        const wordArray = CryptoJS.lib.WordArray.create(data as any);
        const hash = CryptoJS.SHA256(wordArray);
        return this.hexToBytes(hash.toString(CryptoJS.enc.Hex));
    }

    private xorBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
        const length = Math.min(a.length, b.length);
        const result = new Uint8Array(length);
        for (let i = 0; i < length; i++) {
            result[i] = a[i] ^ b[i];
        }
        return result;
    }

    private async calculateScramProof(
        password: string,
        clientNonce: string,
        serverNonce: string,
        salt: string,
        iterations: number
    ): Promise<string> {
        const passwordHash = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            password,
            { encoding: Crypto.CryptoEncoding.HEX }
        );
        console.log('[DirectAuth] Password hashed, using for PBKDF2');

        const saltBytes = this.hexToBytes(salt);
        const saltedPassword = this.pbkdf2(passwordHash, saltBytes, iterations);

        const clientKey = this.hmacSha256(saltedPassword, 'Client Key');

        const storedKey = this.sha256(clientKey);

        const authMessage = `${clientNonce},${serverNonce},${serverNonce}`;

        const clientSignature = this.hmacSha256(storedKey, authMessage);
        const clientProof = this.xorBytes(clientKey, clientSignature);

        return this.bytesToHex(clientProof);
    }

    /**
     */
    async login(password: string, username: string = 'admin'): Promise<DirectAuthSession> {
        if (isLoginInProgress) {
            console.log('[DirectAuth] Login already in progress, waiting...');
            while (isLoginInProgress) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            if (cachedSession) {
                return cachedSession;
            }
        }

        if (cachedSession && cachedSession.expiresAt && cachedSession.expiresAt > Date.now()) {
            console.log('[DirectAuth] Using cached session');
            return cachedSession;
        }

        isLoginInProgress = true;

        try {
            console.log('[DirectAuth] Starting SCRAM login...');

            await this.initSession();

            const clientNonce = await this.generateNonce(32);
            console.log('[DirectAuth] Client nonce:', clientNonce.substring(0, 16) + '...');

            const challengeXml = `<?xml version="1.0" encoding="UTF-8"?><request><username>${username}</username><firstnonce>${clientNonce}</firstnonce><mode>1</mode></request>`;
            const challengeData = await this.xmlRequest('POST', '/api/user/challenge_login', challengeXml);

            console.log('[DirectAuth] Challenge response:', challengeData.substring(0, 150));

            if (challengeData.includes('<error>')) {
                const errorCode = this.parseXMLValue(challengeData, 'code');
                throw new Error(`Challenge failed: ${errorCode}`);
            }

            const salt = this.parseXMLValue(challengeData, 'salt');
            const serverNonce = this.parseXMLValue(challengeData, 'servernonce');
            const iterations = parseInt(this.parseXMLValue(challengeData, 'iterations') || '100', 10);

            if (!salt || !serverNonce) {
                throw new Error('Invalid challenge response');
            }

            console.log('[DirectAuth] Salt:', salt.substring(0, 16) + '..., iterations:', iterations);

            const clientProof = await this.calculateScramProof(password, clientNonce, serverNonce, salt, iterations);
            console.log('[DirectAuth] Client proof calculated, using token:', this.csrfToken.substring(0, 16) + '...');

            const authXml = `<?xml version="1.0" encoding="UTF-8"?><request><clientproof>${clientProof}</clientproof><finalnonce>${serverNonce}</finalnonce></request>`;
            const authData = await this.xmlRequest('POST', '/api/user/authentication_login', authXml);

            console.log('[DirectAuth] Auth response:', authData.substring(0, 150));

            if (authData.includes('<error>')) {
                const errorCode = this.parseXMLValue(authData, 'code');
                throw new Error(`Authentication failed: ${errorCode}`);
            }

            if (!authData.includes('<serversignature>')) {
                throw new Error('No server signature in response');
            }

            console.log('[DirectAuth] Login successful!');

            await this.refreshToken();

            cachedSession = {
                sessionId: this.sessionCookie,
                token: this.csrfToken,
                isAuthenticated: true,
                expiresAt: Date.now() + 10 * 60 * 1000,
            };

            return cachedSession;
        } catch (error: any) {
            console.error('[DirectAuth] Login error:', error.message);
            cachedSession = null;
            throw error;
        } finally {
            isLoginInProgress = false;
        }
    }

    clearSession(): void {
        cachedSession = null;
        this.csrfToken = '';
        this.sessionCookie = '';
    }
}

export function getDirectAuthService(modemIp: string): DirectAuthService {
    return new DirectAuthService(modemIp);
}

export function clearDirectAuthService(): void {
    cachedSession = null;
    isLoginInProgress = false;
}
