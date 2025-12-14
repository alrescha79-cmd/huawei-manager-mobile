# 📱 Huawei Manager Mobile App

Aplikasi mobile untuk mengontrol dan monitoring modem Huawei LTE (B310, B311, B312, dll) dari smartphone.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Development (Linux/macOS)
```bash
npm run setup
```
This will automatically configure firewall for LAN development.

### 3. Start Development Server
```bash
npm run dev
```

### 4. Open on Android
- Install **Expo Go** from Play Store
- Scan QR code from terminal
- Make sure Android & PC on **same WiFi**

### ⚠️ Connection Issues?

**If Android can't connect via LAN:**
```bash
# Option 1: Use tunnel mode (no hot reload)
npm run start:tunnel

# Option 2: Use USB/ADB (with hot reload)
adb reverse tcp:8081 tcp:8081
npm run start:localhost
```

**See full troubleshooting:** [DEVELOPMENT.md](DEVELOPMENT.md)

---

## ✨ Fitur

### Phase 1 (MVP) - ✅ Selesai
- ✅ Login dengan auto-detect IP modem
- ✅ Dashboard monitoring (signal, traffic, network)
- ✅ Manajemen WiFi (connected devices, settings)
- ✅ SMS management (inbox, send, delete)
- ✅ Settings & modem control
- ✅ Dark/Light mode support
- ✅ Apple-style modern UI

## 🛠️ Tech Stack

### Core
- **React Native** (via Expo)
- **TypeScript**
- **expo-router** - File-based routing
- **Zustand** - State management
- **Axios** - HTTP client

### UI/UX
- **react-native-paper** - Material Design components
- **expo-blur** - iOS blur effects
- **react-native-reanimated** - Smooth animations

### Storage & Security
- **expo-secure-store** - Encrypted credential storage
- **expo-network** - Network detection
- **expo-device** - Device info

### Utilities
- **dayjs** - Date formatting
- **react-native-toast-message** - Toast notifications
- **victory-native** - Charts (prepared)

## 📁 Struktur Folder

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
│   ├── api.service.ts     # Base API client
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
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── InfoRow.tsx
│   └── SignalBar.tsx
├── theme/                 # Design system
│   └── index.ts
├── types/                 # TypeScript types
│   └── modem.types.ts
└── utils/                 # Helper functions
    ├── helpers.ts
    └── storage.ts
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm atau yarn
- Expo Go app di smartphone (untuk testing)

### Installation

1. Clone repository
```bash
git clone https://github.com/alrescha79-cmd/huawaei-manager-mobile.git
cd huawei-manager-mobile
```

2. Install dependencies
```bash
npm install
```

3. Start development server
```bash
npm start
```

4. Scan QR code dengan Expo Go

### Build untuk Production

```bash
# Android
npx expo build:android

# iOS (requires macOS)
npx expo build:ios
```

## 📱 Cara Penggunaan

1. **Koneksi ke Modem**
   - Pastikan smartphone terhubung ke WiFi modem Huawei
   - Buka aplikasi
   - App akan auto-detect IP modem (default: 192.168.8.1)
   - Login dengan username/password modem

2. **Dashboard (Home)**
   - Lihat status koneksi real-time
   - Monitor kekuatan sinyal (RSSI, RSRP, RSRQ, SINR)
   - Cek traffic usage (download/upload)
   - Pull to refresh untuk update data

3. **WiFi Management**
   - Lihat daftar device yang terhubung
   - Kick/disconnect device
   - Toggle WiFi on/off
   - Lihat WiFi settings (SSID, Channel, Band)

4. **SMS** (jika modem support)
   - Baca SMS masuk
   - Kirim SMS baru
   - Hapus SMS
   - Lihat statistik SMS

5. **Settings**
   - Lihat info modem (IMEI, Serial, versi)
   - Reboot modem
   - Logout
   - Toggle dark mode
   - About app

## ⚙️ Konfigurasi

### Modem IP Address
Default IP yang dicoba:
- 192.168.8.1 (default Huawei)
- 192.168.1.1
- 192.168.100.1

Bisa diubah manual di login screen.

### API Endpoints
Semua endpoint menggunakan Huawei LTE API standard:
- `/api/user/login` - Login
- `/api/device/information` - Info modem
- `/api/device/signal` - Signal strength
- `/api/monitoring/traffic-statistics` - Traffic
- `/api/wlan/host-list` - Connected devices
- dll.

## 🎨 Design System

### Colors
#### Light Mode
- Background: `#F2F2F7`
- Card: `#FFFFFF`
- Primary: `#007AFF`

#### Dark Mode
- Background: `#000000`
- Card: `#1C1C1E`
- Primary: `#0A84FF`

### Typography
Mengikuti SF Pro style Apple:
- Large Title: 34pt
- Title 1: 28pt
- Headline: 17pt
- Body: 17pt
- Caption: 12pt

## ⚠️ Known Limitations

1. **SMS Support**
   - Tidak semua modem Huawei mendukung SMS via API
   - Firmware tertentu mungkin tidak berfungsi

2. **Band Lock**
   - Belum diimplementasi (Phase 3)
   - Tergantung firmware modem

3. **CORS & Network**
   - App harus terhubung ke WiFi modem
   - Tidak bisa remote access via internet

## 🔧 Troubleshooting

### Login Gagal
- Pastikan terhubung ke WiFi modem
- Cek IP modem di browser (buka http://192.168.8.1)
- Pastikan username/password benar

### Data Tidak Muncul
- Pull to refresh
- Restart modem
- Cek koneksi WiFi
- Logout dan login kembali

### SMS Tidak Berfungsi
- Cek apakah modem support SMS
- Beberapa model/firmware tidak support

## 📝 TODO / Roadmap

### Phase 2 (Coming Soon)
- [ ] Grafik traffic realtime
- [ ] Push notifications untuk SMS
- [ ] Export data/logs
- [ ] Multi-language support

### Phase 3 (Future)
- [ ] Band lock & selection
- [ ] Advanced signal metrics
- [ ] Auto-reconnect
- [ ] Widget support

## 🤝 Contributing

Contributions welcome! Please:
1. Fork repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open Pull Request

## 📄 License

MIT License - see LICENSE file

## 👨‍💻 Developer

Huawei Manager Team

---

**Note**: Aplikasi ini independent project dan tidak berafiliasi dengan Huawei Technologies.
