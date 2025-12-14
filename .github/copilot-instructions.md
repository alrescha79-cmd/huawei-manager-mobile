# 📱 Huawei Manager Mobile App

**Tech Stack & Blueprint (React Native + Expo)**

## 🎯 Tujuan Aplikasi

Aplikasi mobile untuk **mengontrol modem Huawei LTE (B310,B311, dll)** dari smartphone:

* Login ke modem via WiFi lokal
* Monitoring trafik & sinyal
* Kontrol WiFi, SMS, dan advanced settings
* UI modern ala Apple (clean, blur, minimal)

---

## 🧱 Tech Stack (WAJIB & Disarankan)

### Core

* **React Native (Expo)**
* **TypeScript**
* **expo-router** → tab & navigation
* **huawei-lte-api** → komunikasi modem

### UI / UX (Apple-style)

* **react-native-paper** *(Material 3 + iOS friendly)*
  atau
* **@shopify/restyle** + custom design system
* **expo-blur** → efek iOS
* **react-native-reanimated**
* **react-native-svg** + **victory-native** / **react-native-chart-kit** (grafik)

### State & Storage

* **Zustand** → global state
* **expo-secure-store** → simpan username/password modem
* **expo-network** → deteksi network & IP gateway
* **expo-device**

### Utility

* **axios**
* **dayjs**
* **react-native-toast-message**

---

## 🌐 Arsitektur Akses Modem (PENTING)

> ⚠️ **huawei-lte-api tidak bisa dipanggil langsung dari RN**
> karena keterbatasan network & CORS

### Solusi Wajib (2 Opsi)

### ✅ Opsi 1 — Embedded Local API (RECOMMENDED)

* App → **Local Service (JS Service di background / Node-like layer)**
* Semua request modem melalui satu abstraction layer

```
UI (React Native)
   ↓
ModemService.ts
   ↓
huawei-lte-api
   ↓
Huawei Modem (192.168.x.1)
```

### 🟡 Opsi 2 — Companion Local Server (Advanced)

* Jalankan tiny local server (Bun/Node) di router / device lain
* App hanya konsumsi REST API

---

## 🔐 Login & Auto Detect IP

### Flow Login Awal

1. App cek:

   * Apakah terhubung ke WiFi
   * Deteksi **Gateway IP** (biasanya `192.168.8.1`)
2. Jika ditemukan:

   * Tampilkan form login
3. Setelah sukses:

   * Simpan credential di `SecureStore`
   * Auto-login berikutnya

### Data yang Disimpan (Secure)

```ts
{
  modemIp: "192.168.8.1",
  username: "admin",
  password: "********",
  lastLogin: timestamp
}
```

---

## 🧭 Struktur Navigasi (Tab)

Gunakan **Bottom Tabs (iOS-style)**

```
├── Home
├── WiFi
├── SMS
└── Settings
```

---

## 🏠 1. Home Tab (Dashboard)

### Informasi Ditampilkan

* Status koneksi
* IP publik & lokal
* Operator & network type (4G/4G+/5G)
* Signal strength:

  * RSSI
  * RSRP
  * RSRQ
  * SINR

### Grafik

* 📊 **Traffic realtime**

  * Download / Upload (kbps → Mbps)
* 📈 **Pemakaian harian / bulanan**

### UI Style

* Card rounded (radius 16–20)
* Blur background (iOS)
* Icon SF Symbols-like

---

## 📶 2. WiFi Tab

### Fitur

* Daftar device terhubung:

  * MAC Address
  * IP
  * Hostname
  * Durasi koneksi
* Konfigurasi WiFi:

  * SSID
  * Password
  * Channel
  * Band (2.4 / 5 GHz)
  * Enable / Disable WiFi

### Action

* Kick device
* Refresh list

---

## ✉️ 3. SMS Tab (Jika Modem Support)

### Fitur

* Inbox / Outbox
* Read / Delete SMS
* Kirim SMS
* Notifikasi SMS masuk

### UI

* Bubble chat style (iOS Messages-like)
* Swipe to delete

---

## ⚙️ 4. Settings Tab (Lengkap & Advanced)

### Section: Modem

* Login ulang
* Logout
* Reboot modem
* Change password

### Section: Network

* Set LTE Band (manual / auto)
* Lock band
* Antenna type (internal / external)
* Network mode (4G only / Auto)

### Section: App

* Theme:

  * System
  * Light
  * Dark
* Refresh interval
* Language

### Section: Debug (Optional)

* Raw API response
* Export log

---

## 🎨 Apple-Style Design Guideline

### Warna

* Light:

  * Background: `#F2F2F7`
  * Card: `#FFFFFF`
* Dark:

  * Background: `#000000`
  * Card: `#1C1C1E`

### Typography

* SF Pro–like
* Font weight dominan:

  * Regular
  * Semibold

### Animasi

* Subtle
* Ease-in-out
* Tidak berlebihan

---

## 📂 Struktur Folder (Disarankan)

```
src/
├── app/                // expo-router
│   ├── (tabs)/
│   │   ├── home.tsx
│   │   ├── wifi.tsx
│   │   ├── sms.tsx
│   │   └── settings.tsx
│   └── login.tsx
├── services/
│   ├── modem.service.ts
│   ├── auth.service.ts
│   └── wifi.service.ts
├── stores/
│   ├── auth.store.ts
│   ├── modem.store.ts
│   └── theme.store.ts
├── components/
├── theme/
├── utils/
└── types/
```

---

## 🚀 Roadmap Pengembangan

### Phase 1 (MVP)

* Login
* Home dashboard
* Auto detect IP
* Light/Dark mode

### Phase 2

* WiFi management
* SMS
* Grafik realtime

### Phase 3

* Band lock
* Advanced signal metrics
* Notifikasi

---

## ⚠️ Catatan Penting Huawei B312

* Tidak semua firmware support:

  * SMS
  * Band lock
* Perlu handle **error & fallback**
* Beberapa endpoint perlu token (`__RequestVerificationToken`)

---
