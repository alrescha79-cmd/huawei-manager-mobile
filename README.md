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
> **Beberapa fitur mungkin belum sepenuhnya berfungsi pada device Anda**

> **⚡ Built with Expo SDK 54**

> **📡 Tested on Huawei B312-929 (Orbit Star 2)**

> [!TIP]
> ![Latest Version](https://img.shields.io/github/v/release/alrescha79-cmd/huawei-manager-mobile?label=Latest%20Version&color=brightgreen)
> 
> **📥 Download di [Github Releases](https://github.com/alrescha79-cmd/huawei-manager-mobile/releases)** Tersedia 3 versi untuk Android


> **arm64-v8a**: Untuk Android 64-bit (Rekomendasi) → [Link Download](https://github.com/alrescha79-cmd/huawei-manager-mobile/releases/latest/download/huawei-manager-arm64-v8a.apk)
> 
> **armeabi-v7a**: Untuk Android 32-bit (Ukuran lebih kecil) → [Link Download](https://github.com/alrescha79-cmd/huawei-manager-mobile/releases/latest/download/huawei-manager-armeabi-v7a.apk)
>
>**universal**: Untuk semua perangkat (Ukuran lebih besar) → [Link Download](https://github.com/alrescha79-cmd/huawei-manager-mobile/releases/latest/download/huawei-manager-universal.apk)

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

## 📸 Screenshots

<p align="center">
  <em>Dark Mode | 🇬🇧 EN</em>
</p>



| Home | WiFi | SMS | Sett |
|:---------:|:----:|:---:|:--------:|
| ![home](https://github.com/user-attachments/assets/26599904-d63a-42ed-a45b-e13c0ac23d43) | ![wifi](https://github.com/user-attachments/assets/a42b5ef0-2d1e-4f44-b1f6-a6c6f39ee722) | ![sms](https://github.com/user-attachments/assets/02051333-b094-4c52-9baf-a6d0f491cdf9) | ![settings](https://github.com/user-attachments/assets/185a3edf-af6a-47b3-88d2-1fe56fddb0a1) |

<p align="center">
  <em>Light Mode| 🇮🇩 ID</em>
</p>



| Home | WiFi | SMS | Sett |
|:---------:|:----:|:---:|:--------:|
| ![home](https://github.com/user-attachments/assets/eff4fd91-d750-4aac-9c37-9e7af39f34ef) | ![wifi](https://github.com/user-attachments/assets/40b126bc-aa33-4813-af4a-8e17fa4687c3) | ![sms](https://github.com/user-attachments/assets/6b8c2297-8369-452e-9fa9-cd77a1fa4d3c) | ![settings](https://github.com/user-attachments/assets/60eb10a8-19ae-4cac-a06f-f07ce9eabbbb) |

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
