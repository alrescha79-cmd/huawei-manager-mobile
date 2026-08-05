# 🎯 Design Philosophy

Aplikasi ini mengusung tema **macOS + iOS + Android** sebagai gaya visual utama. Perpaduan ini menghasilkan tampilan yang:

- **macOS** — Glassmorphism (blur + transparansi), rounded corners besar, card-based layout, depth layering
- **iOS** — SF Pro typography, haptic feedback patterns, sheet/modal presentation, tab bar navigation
- **Android** — Material icons, Android Home Screen Widgets, AdMob integration

Hasil akhir: antarmuka modern yang terasa native di semua platform, dengan estetika frosted glass yang konsisten baik di light maupun dark mode.

---

# 🛠️ Tech Stack

## Core
- **React Native** (via Expo SDK 54)
- **TypeScript** - Type safety
- **expo-router** - File-based routing
- **Zustand** - State management
- **Axios** - HTTP client

## UI/UX
- **@expo/vector-icons** - Material/Ionicons icon set
- **expo-blur** - iOS blur effects
- **react-native-reanimated** - Smooth animations
- **react-native-svg** - Charts & gauges
- **react-native-text-ticker** - Marquee text
- **expo-linear-gradient / expo-blur** - Mesh gradient backgrounds

## Storage & Security
- **expo-secure-store** - Encrypted credential storage
- **expo-network** - Network detection
- **expo-device** - Device info

## Utilities
- **dayjs** - Date formatting
- **Custom Toast** (`src/components/Toast.tsx`) - Toast notifications
- **expo-crypto** + **crypto-js** - SHA256/PBKDF2 hashing for login
- **Custom i18n** (`src/i18n/` + `en.json`/`id.json`) - Multi-language support

## Native Integrations
- **react-native-android-widget** - Android Home Screen Widgets
- **react-native-google-mobile-ads** - AdMob integration

---

# 📁 Project Structure

```
src/
├── app/                    # Expo Router screens
│   ├── (tabs)/             # Tab navigation
│   │   ├── home.tsx        # Dashboard screen
│   │   ├── wifi.tsx        # WiFi management screen
│   │   ├── sms.tsx         # SMS management screen
│   │   ├── settings/       # Settings stack (lan, system, modem, ...)
│   │   └── _layout.tsx     # Tab navigation layout
│   ├── login.tsx           # Login screen
│   └── _layout.tsx         # Root layout (auth guard, overlays, notifications)
├── components/             # Reusable components
│   ├── home/               # Dashboard cards
│   ├── wifi/               # WiFi management components
│   ├── sms/                # SMS management components
│   ├── settings/           # Settings components
│   ├── GlobalOverlays.tsx  # Alert/toast/update/changelog overlays
│   └── ...
├── hooks/                  # Custom React Hooks
│   ├── home/               # useHomeData, useHomeAuth, useHomeActions
│   ├── wifi/               # useWiFiSettings, useWiFiDevices, ...
│   ├── sms/                # useSMSData, useSMSActions, ...
│   ├── settings/           # useSystemSettings, useLanSettings, ...
│   ├── useLogin.ts
│   └── useNotificationRouting.ts
├── i18n/                   # Internationalization
│   ├── index.ts            # useTranslation hook
│   ├── en.json
│   └── id.json
├── services/               # API & business logic
│   ├── api.service.ts      # Base API client with session/token auth
│   ├── direct-auth.service.ts  # SCRAM login
│   ├── modem.service.ts    # Modem operations
│   ├── wifi.service.ts     # WiFi operations
│   ├── sms.service.ts      # SMS operations
│   ├── network.service.ts  # Network detection
│   └── ...
├── stores/                 # Zustand stores
│   ├── auth.store.ts
│   ├── modem.store.ts
│   ├── wifi.store.ts
│   ├── sms.store.ts
│   ├── theme.store.ts
│   ├── debug.store.ts
│   └── modem-profile.store.ts
├── theme/                  # Design system
│   └── index.ts
├── types/                  # TypeScript types
│   └── modem.types.ts
├── utils/                  # Helper functions
│   ├── helpers.ts
│   ├── formatters.ts
│   ├── huawei-error.ts
│   └── storage.ts
└── widget/                 # Android Home Screen Widgets
    ├── ModemStatusWidget.tsx
    ├── widget-data.service.ts
    └── widget-task-handler.tsx
```

---

# 🎨 Design System — macOS + iOS + Android Fusion

Tampilan menggabungkan elemen terbaik dari tiga ekosistem:
- **Frosted glass / glassmorphism** khas macOS (blur layer + transparansi)
- **Typography & spacing** khas iOS (SF Pro scale, generous whitespace)
- **Component library** dari Material icons + custom design system
- **Native widgets & ads** untuk platform Android

## Colors

### Accent Colors
| Name | Light | Dark |
|---------|-------|-------|
| Blue | `#007AFF` | `#0A84FF`|
| Green | `#34C759` | `#30D158`|
| Indigo | `#5856D6` | `#5E5CE6`|
| Orange | `#FF9500` | `#FF9F0A`|
| Pink | `#FF2D55` | `#FF375F`|
| Purple | `#AF52DE` | `#BF5AF2`|
| Red | `#FF3B30` | `#FF453A`|
| Teal | `#5AC8FA` | `#64D2FF`|
| Yellow | `#FFCC00` | `#FFD60A`|

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

## Glassmorphism (macOS-inspired)

Efek frosted glass yang menjadi ciri khas macOS — memberikan kedalaman visual dan hierarchy antar layer. Digunakan pada card, modal, overlay, dan alert.

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

## Spacing (iOS Human Interface Guidelines)
| Token | Value |
|-------|-------|
| xs | 4px |
| sm | 8px |
| md | 16px |
| lg | 24px |
| xl | 32px |
| xxl | 48px |

## Border Radius (macOS/iOS Rounded Corners)
| Token | Value |
|-------|-------|
| sm | 8px |
| md | 12px |
| lg | 16px |
| xl | 20px |
| round | 999px |

## Typography (iOS SF Pro Scale)

Mengikuti skala tipografi SF Pro dari Apple untuk konsistensi visual khas iOS:

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
