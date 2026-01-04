# Remote Push Notifications

This app supports remote push notifications via Expo Push Notification service.

## How It Works

1. When the app starts and notification permissions are granted, an **Expo Push Token** is generated
2. The token is stored locally and logged to the console
3. You can use this token to send notifications from any server or tool

## Getting the Push Token

The token is logged to console when app starts:
```
===========================================
📱 EXPO PUSH TOKEN:
ExponentPushToken[xxxxxxxxxxxxxx]
===========================================
```

You can also get it programmatically:
```typescript
import { getExpoPushToken } from '@/services/notification.service';

const token = await getExpoPushToken();
```

## Sending Notifications

### Option 1: Expo Push Tool (Easiest)
Visit: https://expo.dev/notifications

1. Enter your Expo Push Token
2. Fill in title and message
3. Click Send

### Option 2: cURL Command
```bash
curl -X POST https://exp.host/--/api/v2/push/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "ExponentPushToken[xxxxxxxxxxxxxx]",
    "title": "App Update Available!",
    "body": "Version 2.0 is now available with new features.",
    "sound": "default",
    "channelId": "app-updates"
  }'
```

### Option 3: Node.js Script
```javascript
const fetch = require('node-fetch');

async function sendPushNotification(tokens, title, body) {
  const messages = tokens.map(token => ({
    to: token,
    title,
    body,
    sound: 'default',
    channelId: 'app-updates'
  }));

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages)
  });
}

// Usage
sendPushNotification(
  ['ExponentPushToken[xxx]', 'ExponentPushToken[yyy]'],
  'New Update!',
  'Check out the latest version'
);
```

## Channel IDs

| Channel ID | Purpose |
|------------|---------|
| `usage-alerts` | Data usage warnings |
| `ip-change` | IP address changes |
| `app-updates` | App updates & announcements |

## Important Notes

1. **Development Build Required**: Push tokens only work on development/release builds, not Expo Go
2. **EAS Project ID**: Requires EAS project setup for token generation
3. **Token Storage**: Tokens are unique per device and should be stored in a database for mass notifications

## Sending to All Users

For mass notifications, you'll need to:
1. Set up a database (Firebase, Supabase, etc.)
2. Store each user's push token when they install the app
3. Query all tokens and send notifications in batches

The free Expo Push service supports up to 100 tokens per request.
