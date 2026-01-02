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
| Primary | `#2563EB` |
| Background | `#F0F2F5` |
| Background Gradient | `['#F8FAFC', '#E2E8F0', '#CBD5E1']` |
| Card | `rgba(255, 255, 255, 0.50)` |
| Text | `#0F172A` |
| Text Secondary | `#64748B` |
| Border | `rgba(255, 255, 255, 0.6)` |
| Success | `#10B981` |
| Warning | `#F59E0B` |
| Error | `#EF4444` |
| Tab Bar | `rgba(255, 255, 255, 0.9)` |

### Dark Mode
| Element | Color |
|---------|-------|
| Primary | `#3B82F6` |
| Background | `#111111` |
| Background Gradient | `['#111111', '#1A1A1A', '#222222']` |
| Card | `rgba(255, 255, 255, 0.08)` |
| Text | `#FFFFFF` |
| Text Secondary | `#AAAAAA` |
| Border | `rgba(255, 255, 255, 0.04)` |
| Success | `#32D74B` |
| Warning | `#FF9F0A` |
| Error | `#FF453A` |
| Tab Bar | `#1C1C1E` |

## Glassmorphism

### Blur Intensity
| Element | Value |
|---------|-------|
| Card | 40 |
| Modal | 50 |
| Overlay | 40 |
| Alert | 40 |
| Light | 25 |
| Heavy | 60 |

### Background Opacity
| Mode | Card | Modal | Overlay | Alert |
|------|------|-------|---------|-------|
| Dark | `rgba(10, 10, 10, 0.4)` | `rgba(10, 10, 10, 0.6)` | `rgba(10, 10, 10, 0.5)` | `rgba(28, 28, 30, 1.0)` |
| Light | `rgba(255, 255, 255, 0.4)` | `rgba(255, 255, 255, 0.6)` | `rgba(255, 255, 255, 0.5)` | `rgba(255, 255, 255, 0.98)` |

## Spacing
| Token | Value |
|-------|-------|
| xs | 4px |
| sm | 8px |
| md | 16px |
| lg | 24px |
| xl | 32px |
| xxl | 48px |

## Border Radius
| Token | Value |
|-------|-------|
| sm | 8px |
| md | 12px |
| lg | 16px |
| xl | 20px |
| round | 999px |

## Typography
Following SF Pro style (Apple):

| Style | Size | Weight | Line Height |
|-------|------|--------|-------------|
| Large Title | 34pt | 700 | 41 |
| Title 1 | 28pt | 700 | 34 |
| Title 2 | 22pt | 600 | 28 |
| Title 3 | 20pt | 600 | 25 |
| Headline | 17pt | 600 | 22 |
| Body | 17pt | 400 | 22 |
| Callout | 16pt | 400 | 21 |
| Subheadline | 15pt | 400 | 20 |
| Footnote | 13pt | 400 | 18 |
| Caption 1 | 12pt | 400 | 16 |
| Caption 2 | 11pt | 400 | 13 |
