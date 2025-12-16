# 📱 Huawei Manager Mobile

<p align="center">
  <img src="assets/logo.png" alt="App Icon" width="120" />
</p>

<div align="center">

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

> **⚡ Built with Expo SDK 54**

> **📡 Tested on Huawei B312-929**

> **📲 Download on [Release](https://github.com/alrescha79-cmd/huawei-manager-mobile/releases)** Tersedia 3 versi untuk Android
 - arm64-v8a: Untuk Android 64-bit [Link Download](https://github.com/alrescha79-cmd/huawei-manager-mobile/releases/download/v1.0.0/huawei-manager-v1.0.0-arm64-v8a.apk)
 - armeabi-v7a: Untuk Android 32-bit [Link Download](https://github.com/alrescha79-cmd/huawei-manager-mobile/releases/download/v1.0.0/huawei-manager-v1.0.0-armeabi-v7a.apk)
 - universal: Untuk semua perangkat [Link Download](https://github.com/alrescha79-cmd/huawei-manager-mobile/releases/download/v1.0.0/huawei-manager-v1.0.0-universal.apk)

---

## ✨ Fitur Utama

| Feature | Description |
|---------|-------------|
| 📊 **Dashboard** | Realtime monitoring signal, traffic, dan status koneksi |
| 📶 **WiFi Management** | Kelola connected devices dan WiFi settings |
| 💬 **SMS** | Baca, kirim, dan hapus SMS (Jika fitur ini tersedia di modem) |
| ⚙️ **Settings** | Antenna mode, network type, band lock, reboot modem |
| 🌙 **Dark Mode** | Support light dan dark theme |
| 🔤 **Language** | Pilih bahasa (Bahasa Indonesia dan Bahasa Inggris) |

---

## 📸 Screenshots

<p align="center">
  <em>Dark Mode</em>
</p>



| Dashboard | WiFi | SMS | Settings |
|:---------:|:----:|:---:|:--------:|
| ![Home](https://github.com/user-attachments/assets/9ff7a9b2-fd4a-45ab-8551-f94448ebb4c5) | ![Wifi](https://github.com/user-attachments/assets/7d6701ac-9437-4122-b2d2-109aa1015b51) | ![sms](https://github.com/user-attachments/assets/02051333-b094-4c52-9baf-a6d0f491cdf9) | ![Settings](https://github.com/user-attachments/assets/cf138be2-fea5-4c2f-a66f-5fc35e5f4616) |

<p align="center">
  <em>Light Mode</em>
</p>



| Dashboard | WiFi | SMS | Settings |
|:---------:|:----:|:---:|:--------:|
| ![Home](https://github.com/user-attachments/assets/9308daf5-d9c2-4c3e-9d62-eaa6a3bb5589) | ![wifi](https://github.com/user-attachments/assets/94f32dae-aaae-4677-9207-c2074003282a) | ![sms](https://github.com/user-attachments/assets/6b8c2297-8369-452e-9fa9-cd77a1fa4d3c) | ![settings](https://github.com/user-attachments/assets/173a9c6e-a49f-4a04-9b98-174369d725f1) |


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

---

## 🤝 Contributing

Contributions welcome! Silakan buat issue atau pull request.

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/alrescha79-cmd">Anggun Caksono</a>
</p>

<p align="center">
  <em>Aplikasi ini adalah proyek independent dan tidak berafiliasi dengan Huawei Technologies.</em>
</p>
