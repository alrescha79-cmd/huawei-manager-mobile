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

> [!WARNING]
> **🇬🇧 EN**  
> Login currently still uses WebView, and changing the WiFi password is not yet functional due to limited information about the encryption method used by the latest Huawei firmware.
>
> **🇮🇩 ID**  
> Saat ini proses login masih menggunakan WebView, dan fitur ganti password WiFi belum berfungsi karena keterbatasan informasi mengenai metode enkripsi yang digunakan oleh firmware Huawei terbaru.



> [!TIP]
> ![Latest Version](https://img.shields.io/github/v/release/alrescha79-cmd/huawei-manager-mobile?label=Latest%20Version&color=brightgreen) ![Downloads](https://img.shields.io/github/downloads/alrescha79-cmd/huawei-manager-mobile/latest/total?style=flat&logo=android&label=Download@Latest&color=)
> 
> **📥 Download di [Github Releases](https://github.com/alrescha79-cmd/huawei-manager-mobile/releases)** Tersedia 3 versi untuk Android


> **arm64-v8a**: Untuk Android 64-bit (Rekomendasi) → [Link Download](https://github.com/alrescha79-cmd/huawei-manager-mobile/releases/latest/download/huawei-manager-arm64-v8a.apk)
> 
> **armeabi-v7a**: Untuk Android 32-bit (Ukuran lebih kecil) → [Link Download](https://github.com/alrescha79-cmd/huawei-manager-mobile/releases/latest/download/huawei-manager-armeabi-v7a.apk)
>
>**universal**: Untuk semua perangkat (Ukuran lebih besar) → [Link Download](https://github.com/alrescha79-cmd/huawei-manager-mobile/releases/latest/download/huawei-manager-universal.apk)
>
>**testing**: Build testing versi terbaru → [Link Download](https://expo.dev/accounts/alrescha79/projects/hm-mobile/builds/2f0fecac-14c2-4965-b702-a7f8e5caeeb3)

> **⚡ Built with Expo SDK 54**

> **📡 Tested on Huawei B312-929 (Orbit Star 2) and Android 15 (Iqoo Z7)**

> [!NOTE]
> **⚠️ Known Issue / Masalah yang Diketahui** 
> 
> **🇬🇧 EN** — SMS feature may not work properly on some devices due to limited modem SMS support.
> 
> **🇮🇩 ID** — Fitur SMS mungkin belum berfungsi sepenuhnya pada beberapa perangkat karena keterbatasan modem yang mendukung SMS.

---

## 📸 Screenshots

<p align="center">
  <em>Light Mode | 🇬🇧 EN</em>
</p>



| Home | WiFi | SMS | Sett |
|:---------:|:----:|:---:|:--------:|
| ![home](https://github.com/user-attachments/assets/8b1aff22-dcf2-4ff7-9886-8260cf1a52ab) | ![wifi](https://github.com/user-attachments/assets/15e11a76-e501-41aa-86bf-c17ee8c9555e) | ![sms](https://github.com/user-attachments/assets/d569df27-5145-4bef-9767-c972e28a22ef) | ![sett](https://github.com/user-attachments/assets/1f53d370-836c-4e34-9be7-dd6c067861d8) |

<p align="center">
  <em>Mode gelap | 🇮🇩 ID</em>
</p>



| Home | WiFi | SMS | Sett |
|:---------:|:----:|:---:|:--------:|
| ![dark_home](https://github.com/user-attachments/assets/575730c6-62cf-44bd-b407-8bfb865e0772) | ![dark_wifi](https://github.com/user-attachments/assets/de1cee1e-f1a6-4470-b59f-114e1ea4a807) | ![dark_sms](https://github.com/user-attachments/assets/0fbb6bb4-6639-4e2e-ab46-eb072bb8edf0) | ![dark_sett](https://github.com/user-attachments/assets/a706b51e-7e25-4d5f-90b0-71a6babebbd9) |

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
| [Devtools](devtools/README.md) | Reverse engineering Web UI |

---

## 🤝 Contributing

Contributions welcome! Silakan buat issue atau pull request.

---

## 🐛 Bug Report

Menemukan bug? Bantu kami memperbaikinya dengan melaporkan issue di GitHub:

[![Report Bug](https://img.shields.io/badge/Report-Bug-red?style=for-the-badge&logo=github)](https://github.com/alrescha79-cmd/huawei-manager-mobile/issues/new?assignees=alrescha79-cmd&labels=bug&projects=&template=bug_report.md&title=%5BBUG%5D+)


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
