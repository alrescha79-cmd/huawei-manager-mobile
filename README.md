# 📱 Huawei Manager Mobile

<p align="center">
  <img src="assets/logo.png" alt="App Icon" width="120" />
</p>

<div align="center">

![GitHub Downloads](https://img.shields.io/github/downloads/alrescha79-cmd/huawei-manager-mobile/total?style=flat&logo=android&label=Downloads&color=blue)
![GitHub Stars](https://img.shields.io/github/stars/alrescha79-cmd/huawei-manager-mobile?style=flat&logo=github&label=Stars&color=yellow)
![GitHub Forks](https://img.shields.io/github/forks/alrescha79-cmd/huawei-manager-mobile?style=flat&logo=github&label=Forks&color=green)

[![Last Commit](https://img.shields.io/github/last-commit/alrescha79-cmd/huawei-manager-mobile?logo=github)](https://github.com/alrescha79-cmd/huawei-manager-mobile)
![Last PR](https://img.shields.io/github/issues-pr-closed-raw/alrescha79-cmd/huawei-manager-mobile?label=PR%20Closed&logo=github)
![Last Release](https://img.shields.io/github/v/release/alrescha79-cmd/huawei-manager-mobile?label=Last%20Release&logo=github-actions)
![Release Date](https://img.shields.io/github/release-date/alrescha79-cmd/huawei-manager-mobile?logo=github-actions&label=Release%20Date)

![Expo](https://img.shields.io/badge/Expo-54.0.29-000020?logo=expo&logoColor=white)
![React](https://img.shields.io/badge/React-19.1.0-61DAFB?logo=react&logoColor=black)
![React Native](https://img.shields.io/badge/React_Native-0.81.5-20232A?logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.2-3178C6?logo=typescript&logoColor=white)

![Android](https://img.shields.io/badge/Android-Supported-3DDC84?logo=android&logoColor=white)
![iOS](https://img.shields.io/badge/iOS-Supported-000000?logo=apple&logoColor=white)
![Web](https://img.shields.io/badge/Web-Supported-4285F4?logo=googlechrome&logoColor=white)

</div>

<p align="center">
  <strong>Mobile app cross-platform untuk mengontrol dan monitoring modem Huawei LTE</strong>
</p>

<p align="center">
  Mendukung seri B310, B311, B312, E5573, E5577, dan modem Huawei LTE lainnya
</p>

---


> [!TIP]
> ![Latest Version](https://img.shields.io/github/v/release/alrescha79-cmd/huawei-manager-mobile?label=Latest%20Version&color=brightgreen) ![Downloads](https://img.shields.io/github/downloads/alrescha79-cmd/huawei-manager-mobile/latest/total?style=flat&logo=android&label=Download@Latest&color=)
> 
> **📥 Lihat Changelog dan Download di [Github Releases](https://github.com/alrescha79-cmd/huawei-manager-mobile/releases/latest)** Tersedia 3 versi untuk Android

> **![Downloads arm64-v8a](https://img.shields.io/github/downloads/alrescha79-cmd/huawei-manager-mobile/latest/huawei-manager-arm64-v8a.apk?style=flat&logo=android&label=Downloads&color=)** Untuk Android 64-bit (Rekomendasi) → [Link Download](https://github.com/alrescha79-cmd/huawei-manager-mobile/releases/latest/download/huawei-manager-arm64-v8a.apk)
> 
> **![Downloads armeabi-v7a](https://img.shields.io/github/downloads/alrescha79-cmd/huawei-manager-mobile/latest/huawei-manager-armeabi-v7a.apk?style=flat&logo=android&label=Downloads&color=)** Untuk Android 32-bit (Ukuran lebih kecil) → [Link Download](https://github.com/alrescha79-cmd/huawei-manager-mobile/releases/latest/download/huawei-manager-armeabi-v7a.apk)
>
>**![Downloads universal](https://img.shields.io/github/downloads/alrescha79-cmd/huawei-manager-mobile/latest/huawei-manager-universal.apk?style=flat&logo=android&label=Downloads&color=)** Untuk semua perangkat (Ukuran lebih besar) → [Link Download](https://github.com/alrescha79-cmd/huawei-manager-mobile/releases/latest/download/huawei-manager-universal.apk)


> **⚡ Built with Expo SDK 54**

> **📡 Tested on Huawei B312-929 (Orbit Star 2) and Android 15 (Iqoo Z7)**

> [!NOTE]
> **⚠️ Known Issue / Masalah yang Diketahui** 
> 
> **🇬🇧 EN** — SMS feature may not work properly on some devices due to limited modem SMS support.
> 
> **🇮🇩 ID** — Fitur SMS mungkin belum berfungsi sepenuhnya pada beberapa perangkat karena keterbatasan modem yang mendukung SMS.

---

## 📸 App Preview

![dark](docs/screenshots/dark-en.png)
![dark](docs/screenshots/dark-en-1.png)
![light](docs/screenshots/light-id.png)

---

## ✨ Fitur Utama

| Feature | Description |
|---------|-------------|
| 📊 **Dashboard** | Realtime monitoring signal, traffic, dan status koneksi |
| 📶 **WiFi Management** | Kelola connected devices dan WiFi settings |
| 💬 **SMS** | Baca, kirim, dan hapus SMS (Jika fitur ini tersedia di modem) |
| ⚙️ **Settings** | Antenna mode, network type, band lock, reboot modem |
| 👨‍👩‍👧‍👦 **Parental Control** | Batasi penggunaan perangkat |
| 📱 **Profile APN** | Kelola APN settings |
| 🖧 **Ethernet** | Kelola Ethernet settings |
| 📟 **Widget** | Widget untuk monitoring signal, traffic, dan status koneksi |
| 🌙 **Dark Mode** | Support light dan dark theme |
| 🔤 **Language** | Pilih bahasa (Bahasa Indonesia dan Bahasa Inggris) |
| 📱 **More Features** | Masih banyak fitur yang akan ditambahkan |

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- Expo CLI
- Android device dengan Expo Go

### Installation
```bash
# Clone repository
git clone https://github.com/alrescha79-cmd/huawei-manager-mobile.git
cd huawei-manager-mobile

# Install dependencies
npm install

# Start development
npm run dev
```

### Build APK Using EAS Build
```bash
eas build --profile preview --platform android
```

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [Development Guide](docs/DEVELOPMENT.md) | Setup development environment |
| [Architecture](docs/ARCHITECTURE.md) | Tech stack & project structure |
| [User Guide](docs/USER_GUIDE.md) | Cara penggunaan aplikasi |
| [API Reference](docs/API_REFERENCE.md) | Huawei modem API endpoints |
| [Debugging Guide](docs/DEBUGGING.md) | Cara mengirim laporan bug dengan log |
| [Push Notifications](docs/push-notifications.md) | Setup push notifications |
| [Devtools](devtools/README.md) | Reverse engineering Web UI |

---

## 🤝 Contributing

Contributions welcome! Silakan buat issue atau pull request.

---

## 🐛 Bug Report & Debugging

Menemukan bug? Bantu kami memperbaikinya dengan mengirim laporan lengkap!

### 📱 Dari Aplikasi (In-App Debug Mode)
1. Buka **Settings** > **Debug Mode**
2. Aktifkan toggle **Enable Debug Mode**
3. Gunakan aplikasi seperti biasa
4. Tap **Send Debug Report** untuk kirim via Email/GitHub

### 🌐 Dari Browser (Untuk masalah Login)
Jika tidak bisa login ke aplikasi, gunakan browser DevTools:
1. Buka web modem di browser (`http://192.168.8.1`)
2. Tekan F12 > Console
3. Paste script dari **[Panduan Debugging](docs/DEBUGGING.md)**
4. Ketik `downloadAPILogs()` dan kirim file-nya

### 📤 Kirim Laporan
[![Report Bug](https://img.shields.io/badge/🐛_Report_Bug-red?style=for-the-badge&logo=github)](https://github.com/alrescha79-cmd/huawei-manager-mobile/issues/new?assignees=alrescha79-cmd&labels=bug&projects=&template=bug_report.md&title=%5BBUG%5D+)
[![Feature Request](https://img.shields.io/badge/💡_Feature_Request-blue?style=for-the-badge&logo=github)](https://github.com/alrescha79-cmd/huawei-manager-mobile/issues/new?assignees=alrescha79-cmd&labels=enhancement&projects=&template=feature_request.md&title=%5BFEATURE%5D+)

> **Tip**: Sertakan file debug log untuk mempercepat proses investigasi bug!


---

## 📄 License

MIT License - see [LICENSE](LICENSE)

---

## 📈 Download History

![Download Chart](stats/chart.svg)

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/alrescha79-cmd">Anggun Caksono</a>
</p>

<p align="center">
  <em>Aplikasi ini adalah proyek independent dan tidak berafiliasi dengan Huawei Technologies.</em>
</p>
