# Development Guide

## 🚨 **IMPORTANT: Android Connection Issues**

### Problem: Cannot connect via LAN mode
**Current Status:** `npm dev` doesn't work on Android, only `npx expo start --tunnel` works but NO hot reload.

### ✅ **SOLUTION 1: LAN Mode (RECOMMENDED - WITH HOT RELOAD)**

#### Quick Fix:
```bash
# 1. Allow firewall (Ubuntu/Linux)
sudo ufw allow 8081/tcp
sudo ufw allow 19000:19001/tcp

# 2. Start in LAN mode
npm run dev

# 3. Scan QR code from Expo Go
# Should show: exp://192.168.1.11:8081
```

#### Requirements:
- ✅ PC & Android on **same WiFi network**
- ✅ Firewall port 8081 open
- ✅ No VPN active on PC

#### Benefits:
- ✅ **Hot reload works!**
- ✅ Fast development
- ✅ Auto-refresh on code changes

---

### ✅ **SOLUTION 2: USB/ADB Mode (ALTERNATIVE WITH HOT RELOAD)**

```bash
# 1. Connect USB cable & enable USB debugging on Android
adb devices

# 2. Forward ports
adb reverse tcp:8081 tcp:8081
adb reverse tcp:19000 tcp:19000

# 3. Start localhost mode
npm run start:localhost

# 4. Reload app on phone
```

#### Benefits:
- ✅ Hot reload works
- ✅ No WiFi needed
- ✅ No firewall issues

---

### ✅ **SOLUTION 3: Tunnel Mode (FALLBACK - NO HOT RELOAD)**

```bash
npm run start:tunnel
```

#### When to use:
- Different networks
- Cannot configure firewall
- Quick testing

#### Limitations:
- ❌ **NO hot reload** - must press `r` to reload manually
- ⚠️ Slower performance

---

## Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI
- Expo Go app (for testing on physical device)
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

## Setup

1. **Clone & Install**
```bash
git clone <repo-url>
cd hm-mobile
npm install
```

2. **Environment Setup**
No environment variables needed for basic operation.

## Running the App

### 🔥 **Recommended Development Commands**

```bash
# BEST: LAN mode with hot reload (same WiFi)
npm run dev

# Alternative: USB connection
npm run start:localhost    # After adb reverse setup

# Fallback: Tunnel mode (no hot reload)
npm run start:tunnel

# Other commands
npm run start:clear        # Clear cache and start
npm run android           # Auto-open Android emulator/device
npm run android:tunnel    # Open Android with tunnel
```

### Available Scripts

| Command | Mode | Hot Reload | Use Case |
|---------|------|------------|----------|
| `npm run dev` | LAN | ✅ Yes | Daily development (same WiFi) |
| `npm run start:lan` | LAN | ✅ Yes | Same as dev |
| `npm run start:localhost` | Localhost | ✅ Yes | USB/ADB connection |
| `npm run start:tunnel` | Tunnel | ❌ No | Different networks |
| `npm run start:clear` | Default | ✅ Yes | Clear cache first |
| `npm run android` | Auto | ✅ Depends | Auto-open Android |

### Development Mode
```bash
# Start Expo dev server (LAN mode recommended)
npm run dev

# Or specific platform
npm run android  # Requires Android emulator or device
npm run ios      # Requires macOS and iOS simulator
npm run web      # Web version (limited functionality)
```

### Testing on Physical Device

#### Option 1: LAN Mode (Recommended)
1. Connect PC & Android to **same WiFi**
2. Run `npm run dev`
3. Scan QR code with Expo Go
4. ✅ Hot reload works!

#### Option 2: USB Mode
1. Enable USB debugging on Android
2. Connect USB cable
3. Run `adb reverse tcp:8081 tcp:8081`
4. Run `npm run start:localhost`
5. Open app in Expo Go
6. ✅ Hot reload works!

#### Option 3: Tunnel Mode
1. Run `npm run start:tunnel`
2. Scan QR code with Expo Go
3. ❌ Manual reload: Press `r` in terminal after code changes

## Project Structure

```
src/
├── app/                    # Expo Router screens (file-based routing)
│   ├── (tabs)/            # Bottom tab navigation
│   │   ├── _layout.tsx    # Tab layout configuration
│   │   ├── home.tsx       # Dashboard screen
│   │   ├── wifi.tsx       # WiFi management
│   │   ├── sms.tsx        # SMS management
│   │   └── settings.tsx   # Settings screen
│   ├── _layout.tsx        # Root layout with auth guard
│   ├── index.tsx          # Entry point (redirects)
│   └── login.tsx          # Login screen
│
├── components/            # Reusable UI components
│   ├── Button.tsx         # Custom button
│   ├── Card.tsx           # Card with blur support
│   ├── InfoRow.tsx        # Key-value display row
│   ├── Input.tsx          # Text input with validation
│   ├── SignalBar.tsx      # Signal strength indicator
│   └── index.ts           # Component exports
│
├── services/              # Business logic & API
│   ├── api.service.ts     # Base HTTP client (Axios)
│   ├── modem.service.ts   # Modem API operations
│   ├── wifi.service.ts    # WiFi management
│   ├── sms.service.ts     # SMS operations
│   └── network.service.ts # Network detection
│
├── stores/                # State management (Zustand)
│   ├── auth.store.ts      # Authentication state
│   ├── modem.store.ts     # Modem data state
│   ├── wifi.store.ts      # WiFi state
│   ├── sms.store.ts       # SMS state
│   └── theme.store.ts     # App theme preferences
│
├── theme/                 # Design system
│   └── index.ts           # Colors, typography, spacing
│
├── types/                 # TypeScript definitions
│   ├── modem.types.ts     # Modem-related types
│   └── index.ts           # Type exports
│
└── utils/                 # Helper functions
    ├── helpers.ts         # Formatting utilities
    └── storage.ts         # Secure storage helpers
```

## Key Technologies

### Core
- **React Native** - Mobile framework
- **Expo** - Development platform
- **TypeScript** - Type safety
- **expo-router** - File-based navigation

### State Management
- **Zustand** - Lightweight state management
- **expo-secure-store** - Encrypted storage

### UI
- **react-native-paper** - Material Design components
- **expo-blur** - Blur effects (iOS-style)
- **react-native-reanimated** - Animations

### HTTP
- **Axios** - HTTP client
- Custom API wrapper for Huawei modem

## API Integration

### Huawei Modem API
The app communicates with Huawei LTE modem via XML-based HTTP API.

**Base URL**: `http://{modemIP}` (default: 192.168.8.1)

**Key Endpoints**:
- `/api/user/login` - Authentication
- `/api/device/information` - Device info
- `/api/device/signal` - Signal strength
- `/api/monitoring/status` - Connection status
- `/api/monitoring/traffic-statistics` - Data usage
- `/api/wlan/host-list` - Connected devices
- `/api/sms/sms-list` - SMS inbox

**Authentication**:
- Session-based with token verification
- Token retrieved from `/api/webserver/token`
- Token sent in `__RequestVerificationToken` header

## State Flow

```
Component → Store → Service → API → Modem
                ↓
            Update UI
```

### Example: Load Signal Info
```typescript
// Component
const { signalInfo, setSignalInfo } = useModemStore();

// Service
const modemService = new ModemService(modemIp);
const signal = await modemService.getSignalInfo();

// Store
setSignalInfo(signal);

// UI auto-updates via Zustand
```

## Styling Guide

### Apple-Inspired Design
- Clean, minimal interface
- Generous white space
- Subtle shadows and blur
- System font weights

### Colors
```typescript
Light Mode:
- Background: #F2F2F7
- Card: #FFFFFF
- Primary: #007AFF

Dark Mode:
- Background: #000000
- Card: #1C1C1E
- Primary: #0A84FF
```

### Typography
```typescript
largeTitle: 34pt
title1: 28pt
headline: 17pt (semibold)
body: 17pt
caption: 12pt
```

## Testing

### Unit Tests (TODO)
```bash
npm test
```

### Manual Testing Checklist
- [ ] Login with correct credentials
- [ ] Login with wrong credentials
- [ ] Auto-detect modem IP
- [ ] View signal strength
- [ ] View traffic stats
- [ ] View connected devices
- [ ] Kick device
- [ ] Toggle WiFi
- [ ] Read SMS
- [ ] Send SMS
- [ ] Logout
- [ ] Reboot modem
- [ ] Toggle dark mode

## Common Issues

### Cannot connect to modem
- Ensure WiFi is connected to modem
- Check modem IP (try 192.168.8.1, 192.168.1.1)
- Verify modem is accessible via browser

### SMS not working
- Some modems don't support SMS API
- Check firmware version
- Feature may be disabled

### Type errors
```bash
npx tsc --noEmit
```

### Build errors
```bash
# Clear cache
npx expo start -c

# Reinstall dependencies
rm -rf node_modules
npm install
```

## Build for Production

### EAS Build (Recommended)
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
eas build:configure

# Build for Android
eas build --platform android

# Build for iOS
eas build --platform ios
```

### Local Build
```bash
# Android APK
npx expo build:android

# iOS IPA (requires macOS)
npx expo build:ios
```

## Contributing

1. Fork repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit PR

### Code Style
- Use TypeScript
- Follow ESLint rules
- Write meaningful comments
- Keep functions small and focused

---

## 🐛 Troubleshooting Guide

See detailed troubleshooting steps above for:
- ✅ Connection issues (LAN/Tunnel/USB)
- ✅ Firewall configuration
- ✅ Network diagnostics
- ✅ Hot reload problems
- ✅ Metro bundler crashes

**Quick fixes:**
```bash
npm run dev              # Try LAN mode first
npm run start:tunnel     # If LAN fails
adb reverse tcp:8081 tcp:8081 && npm run start:localhost  # USB mode
```

## License

MIT
