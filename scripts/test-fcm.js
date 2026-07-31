#!/usr/bin/env node
/**
 * Test FCM HTTP v1 API locally
 * Usage: node scripts/test-fcm.js
 * Requires: hm-mobile-1a0d0-firebase-adminsdk-fbsvc-cf2e9c0f03.json in project root
 */

const fs = require('fs');
const crypto = require('crypto');
const https = require('https');
const path = require('path');

const SA_PATH = path.join(__dirname, '..', 'hm-mobile-1a0d0-firebase-adminsdk-fbsvc-cf2e9c0f03.json');
const PROJECT_ID = 'hm-mobile-1a0d0';

function httpsRequest(options, body) {
    return new Promise((resolve, reject) => {
        const req = https.request({ ...options, port: 443 }, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
        });
        req.on('error', reject);
        req.on('socket', socket => {
            socket.on('error', err => {
                console.error('Socket error:', err.message);
            });
        });
        if (body) req.write(body);
        req.end();
    });
}

async function getAccessToken(serviceAccount) {
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = {
        iss: serviceAccount.client_email,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
    };

    const base64url = obj => Buffer.from(JSON.stringify(obj)).toString('base64url');
    const unsigned = `${base64url(header)}.${base64url(payload)}`;
    const signature = crypto.createSign('RSA-SHA256').update(unsigned).sign(serviceAccount.private_key, 'base64url');
    const jwt = `${unsigned}.${signature}`;

    const postBody = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`;

    const res = await httpsRequest({
        hostname: 'oauth2.googleapis.com',
        path: '/token',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postBody),
        },
    }, postBody);

    if (res.status !== 200) {
        throw new Error(`Token exchange failed ${res.status}: ${res.body}`);
    }

    const json = JSON.parse(res.body);
    return json.access_token;
}

async function sendFCM(accessToken, title, body) {
    const fcmPayload = {
        message: {
            topic: 'all_users',
            notification: { title, body },
            android: {
                priority: 'high',
                notification: {
                    channelId: 'app-updates',
                },
            },
            data: {
                route: '/(tabs)/home',
                type: 'test-notification',
            },
        },
    };

    const postBody = JSON.stringify(fcmPayload);

    const res = await httpsRequest({
        hostname: 'fcm.googleapis.com',
        path: `/v1/projects/${PROJECT_ID}/messages:send`,
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postBody),
        },
    }, postBody);

    return res;
}

async function main() {
    console.log(`Testing FCM HTTP v1 API for project ${PROJECT_ID}`);

    if (!fs.existsSync(SA_PATH)) {
        console.error(`Service account file not found: ${SA_PATH}`);
        process.exit(1);
    }

    const sa = JSON.parse(fs.readFileSync(SA_PATH, 'utf-8'));
    console.log(`Service account: ${sa.client_email}`);

    console.log('Getting access token...');
    const token = await getAccessToken(sa);
    console.log('Access token obtained:', token.substring(0, 20) + '...');

    const title = process.env.TITLE || 'Test Notification';
    const body = process.env.BODY || 'Hello from FCM HTTP v1 API!';

    console.log(`Sending notification: ${title} - ${body}`);
    const res = await sendFCM(token, title, body);

    console.log(`Response HTTP ${res.status}`);
    console.log(res.body);

    if (res.status === 200) {
        const json = JSON.parse(res.body);
        console.log(`Success! Message ID: ${json.name}`);
    } else {
        console.error('Failed to send');
        process.exit(1);
    }
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
