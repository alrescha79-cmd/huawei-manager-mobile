# 🛠️ Tech Stack

## Core
- **React Native** (via Expo SDK 54)
- **TypeScript** - Type safety
- **expo-router** - File-based routing
- **Zustand** - State management
- **Axios** - HTTP client

## UI/UX
- **react-native-paper** - Material Design components
- **expo-blur** - iOS blur effects
- **react-native-reanimated** - Smooth animations
- **@shopify/react-native-skia** - High-performance graphics
- **victory-native** - Charts & gauges

## Storage & Security
- **expo-secure-store** - Encrypted credential storage
- **expo-network** - Network detection
- **expo-device** - Device info

## Utilities
- **dayjs** - Date formatting
- **react-native-toast-message** - Toast notifications
- **expo-crypto** - SHA256 hashing for login

---

# 📁 Project Structure

```
src/
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Tab navigation
│   │   ├── home.tsx       # Dashboard
│   │   ├── wifi.tsx       # WiFi management
│   │   ├── sms.tsx        # SMS management
│   │   └── settings.tsx   # Settings
│   ├── login.tsx          # Login screen
│   └── _layout.tsx        # Root layout
├── services/              # API & business logic
│   ├── api.service.ts     # Base API client with auth
│   ├── modem.service.ts   # Modem operations
│   ├── wifi.service.ts    # WiFi operations
│   ├── sms.service.ts     # SMS operations
│   └── network.service.ts # Network detection
├── stores/                # Zustand stores
│   ├── auth.store.ts
│   ├── modem.store.ts
│   ├── wifi.store.ts
│   ├── sms.store.ts
│   └── theme.store.ts
├── components/            # Reusable components
│   ├── Card.tsx
│   ├── CardHeader.tsx
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── InfoRow.tsx
│   ├── SignalBar.tsx
│   ├── SignalMeter.tsx
│   ├── SpeedGauge.tsx
│   ├── DataPieChart.tsx
│   └── ThemedAlert.tsx
├── theme/                 # Design system
│   └── index.ts
├── types/                 # TypeScript types
│   └── modem.types.ts
└── utils/                 # Helper functions
    ├── helpers.ts
    └── constants.ts
```

---

# 🎨 Design System

## Colors

### Light Mode
| Element | Color |
|---------|-------|
| Background | `#F2F2F7` |
| Card | `#FFFFFF` |
| Primary | `#007AFF` |
| Text | `#000000` |
| Text Secondary | `#8E8E93` |

### Dark Mode
| Element | Color |
|---------|-------|
| Background | `#000000` |
| Card | `#1C1C1E` |
| Primary | `#0A84FF` |
| Text | `#FFFFFF` |
| Text Secondary | `#8E8E93` |

## Typography
Following SF Pro style (Apple):
- Large Title: 34pt
- Title 1: 28pt
- Headline: 17pt (semibold)
- Body: 17pt
- Caption: 12pt
