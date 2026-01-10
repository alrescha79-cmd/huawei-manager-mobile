/**
 * Direct API Authentication Service for Huawei Modems
 * Implements SCRAM-SHA-256 authentication without WebView
 * Based on: https://github.com/alrescha79-cmd/huawei-lte-api-ts/tree/feat/modernize-to-v2.0.0
 */

import CryptoJS from 'crypto-js';
import * as Crypto from 'expo-crypto';

export interface DirectAuthSession {
    sessionId: string;
    token: string;
    isAuthenticated: boolean;
    expiresAt?: number;
}

// Singleton lock to prevent concurrent login attempts
let isLoginInProgress = false;
let cachedSession: DirectAuthSession | null = null;

/**
 * DirectAuthService - Implements SCRAM-SHA-256 authentication
 * for direct API access to Huawei modems
 * Uses native fetch for proper header handling in React Native
 */
export class DirectAuthService {
    private baseUrl: string;
    private csrfToken: string = '';
    private sessionCookie: string = '';

    constructor(modemIp: string) {
        this.baseUrl = `http://${modemIp}`;
    }

    /**
     * Get current session if valid
     */
    getSession(): DirectAuthSession | null {
        return cachedSession;
    }

    /**
     * Parse XML value from response
     */
    private parseXMLValue(xml: string, tag: string): string | null {
        const regex = new RegExp(`<${tag}>([^<]*)</${tag}>`);
        const match = xml.match(regex);
        return match ? match[1] : null;
    }

    /**
     * Make XMLHttpRequest - browser-like behavior
     */
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

            // Set headers to match browser behavior
            xhr.setRequestHeader('Accept', 'application/xml, text/xml, */*');
            xhr.setRequestHeader('Accept-Language', 'en-US,en;q=0.9');

            if (method === 'POST') {
                xhr.setRequestHeader('Content-Type', 'application/xml; charset=UTF-8');
            }

            // Set CSRF token
            if (this.csrfToken) {
                xhr.setRequestHeader('__RequestVerificationToken', this.csrfToken);
            }

            // Set session cookie
            if (this.sessionCookie) {
                xhr.setRequestHeader('Cookie', this.sessionCookie);
            }

            xhr.onload = () => {
                // Try to get new token from response header
                const newToken = xhr.getResponseHeader('__RequestVerificationToken');
                if (newToken) {
                    console.log('[DirectAuth] New token from response');
                    this.csrfToken = newToken;
                }

                // Try to get session from Set-Cookie header
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

    /**
     * Initialize session - MUST fetch homepage first to establish cookies
     * Then get token from SesTokInfo or /api/webserver/token
     */
    private async initSession(): Promise<void> {
        console.log('[DirectAuth] Fetching homepage to establish session...');

        // Step 1: Fetch homepage to establish session cookies (CRITICAL!)
        try {
            await this.xmlRequest('GET', '/html/index.html');
            console.log('[DirectAuth] Homepage fetched');
        } catch (e) {
            // Try root path
            await this.xmlRequest('GET', '/');
        }

        // Step 2: Get session from SesTokInfo
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

    /**
     * Refresh CSRF token
     */
    private async refreshToken(): Promise<void> {
        const data = await this.xmlRequest('GET', '/api/webserver/token');
        const token = this.parseXMLValue(data, 'token');

        if (token) {
            this.csrfToken = token;
            console.log('[DirectAuth] Refreshed token:', token.substring(0, 16) + '...');
        }
    }

    /**
     * Generate random nonce (hex string)
     */
    private async generateNonce(length: number = 32): Promise<string> {
        const randomBytes = await Crypto.getRandomBytesAsync(length);
        return Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Convert hex string to Uint8Array
     */
    private hexToBytes(hex: string): Uint8Array {
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
            bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
        }
        return bytes;
    }

    /**
     * Convert Uint8Array to hex string
     */
    private bytesToHex(bytes: Uint8Array): string {
        return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * PBKDF2-SHA256
     */
    private pbkdf2(password: string, salt: Uint8Array, iterations: number): Uint8Array {
        const saltWordArray = CryptoJS.lib.WordArray.create(salt as any);

        const key = CryptoJS.PBKDF2(password, saltWordArray, {
            keySize: 256 / 32,
            iterations: iterations,
            hasher: CryptoJS.algo.SHA256,
        });

        return this.hexToBytes(key.toString(CryptoJS.enc.Hex));
    }

    /**
     * HMAC-SHA256
     */
    private hmacSha256(key: Uint8Array, message: string): Uint8Array {
        const keyWordArray = CryptoJS.lib.WordArray.create(key as any);
        const hmac = CryptoJS.HmacSHA256(message, keyWordArray);
        return this.hexToBytes(hmac.toString(CryptoJS.enc.Hex));
    }

    /**
     * SHA256 hash
     */
    private sha256(data: Uint8Array): Uint8Array {
        const wordArray = CryptoJS.lib.WordArray.create(data as any);
        const hash = CryptoJS.SHA256(wordArray);
        return this.hexToBytes(hash.toString(CryptoJS.enc.Hex));
    }

    /**
     * XOR two byte arrays
     */
    private xorBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
        const length = Math.min(a.length, b.length);
        const result = new Uint8Array(length);
        for (let i = 0; i < length; i++) {
            result[i] = a[i] ^ b[i];
        }
        return result;
    }

    /**
     * Calculate SCRAM client proof
     * Password is hashed with SHA256 first, then used in PBKDF2
     */
    private async calculateScramProof(
        password: string,
        clientNonce: string,
        serverNonce: string,
        salt: string,
        iterations: number
    ): Promise<string> {
        // Step 1: Hash password with SHA256 first (like api.service.ts scramLogin)
        const passwordHash = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            password,
            { encoding: Crypto.CryptoEncoding.HEX }
        );
        console.log('[DirectAuth] Password hashed, using for PBKDF2');

        // Step 2: PBKDF2 with hashed password
        const saltBytes = this.hexToBytes(salt);
        const saltedPassword = this.pbkdf2(passwordHash, saltBytes, iterations);

        // Step 3: ClientKey = HMAC(SaltedPassword, "Client Key")
        const clientKey = this.hmacSha256(saltedPassword, 'Client Key');

        // Step 4: StoredKey = SHA256(ClientKey)
        const storedKey = this.sha256(clientKey);

        // Step 5: AuthMessage
        const authMessage = `${clientNonce},${serverNonce},${serverNonce}`;

        // Step 6: ClientSignature = HMAC(StoredKey, AuthMessage)
        const clientSignature = this.hmacSha256(storedKey, authMessage);

        // Step 7: ClientProof = ClientKey XOR ClientSignature
        const clientProof = this.xorBytes(clientKey, clientSignature);

        return this.bytesToHex(clientProof);
    }

    /**
     * Main SCRAM-SHA-256 Login with singleton lock
     */
    async login(password: string, username: string = 'admin'): Promise<DirectAuthSession> {
        // Check if login already in progress
        if (isLoginInProgress) {
            console.log('[DirectAuth] Login already in progress, waiting...');
            // Wait for existing login to complete
            while (isLoginInProgress) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            if (cachedSession) {
                return cachedSession;
            }
        }

        // Check if we have a valid cached session
        if (cachedSession && cachedSession.expiresAt && cachedSession.expiresAt > Date.now()) {
            console.log('[DirectAuth] Using cached session');
            return cachedSession;
        }

        isLoginInProgress = true;

        try {
            console.log('[DirectAuth] Starting SCRAM login...');

            // Step 1: Initialize session
            await this.initSession();

            // Step 2: Generate client nonce
            const clientNonce = await this.generateNonce(32);
            console.log('[DirectAuth] Client nonce:', clientNonce.substring(0, 16) + '...');

            // Step 3: Send challenge_login
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

            // Step 4: Calculate client proof
            const clientProof = await this.calculateScramProof(password, clientNonce, serverNonce, salt, iterations);
            console.log('[DirectAuth] Client proof calculated, using token:', this.csrfToken.substring(0, 16) + '...');

            // Step 5: Send authentication_login
            // NOTE: Use the token from challenge response header (already updated), no refresh needed
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

            // Refresh token for future use
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

    /**
     * Clear session
     */
    clearSession(): void {
        cachedSession = null;
        this.csrfToken = '';
        this.sessionCookie = '';
    }
}

// Factory function
export function getDirectAuthService(modemIp: string): DirectAuthService {
    return new DirectAuthService(modemIp);
}

export function clearDirectAuthService(): void {
    cachedSession = null;
    isLoginInProgress = false;
}
