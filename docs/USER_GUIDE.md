# 📱 User Guide

## Getting Started

### 1. Connect to Modem WiFi
Pastikan smartphone terhubung ke WiFi modem Huawei.

### 2. Login
- Buka aplikasi
- App akan auto-detect IP modem (default: `192.168.8.1`)
- Masukkan username/password modem
- Klik **Login**

---

## Features

### 🏠 Dashboard (Home)
- **Connection Status** - Status koneksi internet
- **Mobile Data Toggle** - On/off data seluler
- **Signal Strength** - RSSI, RSRP, RSRQ, SINR dalam visual gauge
- **Traffic Statistics** - Download/Upload realtime dengan speedometer
- **Network Info** - Operator, network type (4G/LTE), IP address
- **Pull to refresh** - Swipe down untuk update data

### 📶 WiFi Management
- **Connected Devices** - Lihat semua device yang terhubung
- **Device Details** - MAC address, IP address, hostname
- **Kick Device** - Disconnect device dari WiFi
- **WiFi Settings** - Enable/disable WiFi, lihat SSID

### 💬 SMS Management
- **Inbox** - Baca SMS masuk
- **Send SMS** - Kirim SMS baru
- **Delete SMS** - Hapus SMS
- **SMS Count** - Statistik inbox/unread

### ⚙️ Settings
- **Modem Information** - Device name, IMEI, serial number, firmware
- **System Settings**:
  - Antenna Mode (Auto/Internal/External)
  - Network Type (Auto/4G/3G/2G)
  - LTE Band Selection
- **App Settings** - Theme (Light/Dark/System), Language
- **Modem Control** - Reboot modem, Logout

### 📱 Android Home Screen Widgets
- **Modem Status Widget** - Pantau status koneksi, sinyal, dan penggunaan data langsung dari home screen.
- Auto-refresh widget setiap jam atau manual via tombol refresh di widget.

### 💰 Ad-Supported (Free Version)
- Aplikasi ini didukung oleh iklan (AdMob).
- Pengguna yang menggunakan ad-blocker mungkin perlu menonaktifkan ad-blocker untuk mendukung pengembangan (opsional).

---

## Modem IP Configuration

Default IPs yang dicoba otomatis:
| Priority | IP Address |
|----------|------------|
| 1 | `192.168.8.1` (Huawei default) |
| 2 | `192.168.1.1` |
| 3 | `192.168.100.1` |

Bisa diubah manual di login screen jika berbeda.

---

## Troubleshooting

> [!NOTE]
> **❌ Login Gagal**
> 1. Pastikan terhubung ke WiFi modem
> 2. Cek IP modem di browser: `http://192.168.8.1`
> 3. Pastikan username/password benar
> 4. Coba WebView login jika error terus

> [!TIP]
> **❌ Data Tidak Muncul**
> 1. Pull to refresh (swipe down)
> 2. Logout dan login kembali
> 3. Restart modem
> 4. Cek koneksi WiFi

> [!WARNING]
> **❌ SMS Tidak Berfungsi**
> - Tidak semua modem Huawei mendukung SMS via API
> - Beberapa firmware tidak support

> [!IMPORTANT]
> **❌ Band Lock Tidak Tersimpan**
> - Perubahan band membutuhkan modem restart
> - Tidak semua modem support band lock

---

## 🐞 Lapor Bug & Feedback

Menemukan bug atau punya saran?

- **Via GitHub Issues (Disarankan)**:
  Buat laporan teknis di [**halaman Issues GitHub kami**](https://github.com/alrescha79-cmd/huawei-manager-mobile/issues/new?assignees=alrescha79-cmd&labels=bug&projects=&template=bug_report.md).
  Sertakan model modem, versi firmware, dan screenshot jika bisa.

- **Via Formulir Web**:
  Kirim feedback cepat melalui [**formulir online ini**](https://hm.cakson.my.id/#support).

---

## Known Limitations

1. **SMS Support** - Tergantung model dan firmware modem
2. **Remote Access** - Hanya bisa digunakan saat terhubung ke WiFi modem
3. **Band Lock** - Dukungan bervariasi tergantung firmware
