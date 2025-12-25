
# 📂 Devtools Documentation

**Huawei LTE Modem – API Reverse Engineering Tools**

---

## 🧭 Tujuan

Folder `devtools/` berisi **alat bantu development** untuk:

* Menganalisis API Web UI modem Huawei LTE
* Melakukan reverse-engineering endpoint GET & POST

⚠️ **Folder ini hanya untuk DEVELOPMENT & RESEARCH**

---

## 📁 Struktur Folder

```
devtools/
  ├── get-logger.js
  ├── post-logger.js
  ├── logger.js
  ├── readme.md
  └── endpoints.json
```

---

## 📄 Penjelasan File

### `get-logger.js`

* Script browser (DevTools Console)
* Memonitor **GET request** ke endpoint Huawei (`/api/`)
* Menggunakan **whitelist endpoint penting**
* Output:

  * URL
  * Response body (XML)
---

### `post-logger.js`

* Script browser (DevTools Console)
* Memonitor **POST request** ke endpoint Huawei (`/api/`)
* Output:

  * URL
  * Request body (XML)
  * Response body

---

### `logger.js`

* Script browser (DevTools Console)
* Memonitor **GET & POST request** ke endpoint Huawei (`/api/`)
* Output:

  * URL
  * Request body (XML)
  * Response body

---

### `endpoints.json`

* Daftar endpoint Huawei yang telah terverifikasi
* Digunakan sebagai referensi implementasi API
* Format:

```json
{
  "signal": "/api/device/signal",
  "status": "/api/monitoring/status",
  "traffic": "/api/monitoring/traffic-statistics"
}
```

---

## 🛠️ Cara Penggunaan

1. Login ke Web UI modem Huawei
2. Buka **Browser DevTools → Console**
3. Paste script dari:

   * `get-logger.js` **atau**
   * `post-logger.js`
4. Lakukan aksi di Web UI
5. Catat endpoint & response yang relevan
6. Simpan hasil ke `endpoints.json`

---

## 🔐 Catatan Teknis Huawei API

* Format data: **XML**
* Autentikasi:

  * Cookie session
  * `__RequestVerificationToken`
* Beberapa endpoint melakukan polling otomatis

---

## 📱 Hubungan dengan Aplikasi React Native

Data dari `devtools/` digunakan untuk:

* Menentukan endpoint resmi
* Membuat service layer API
* Menyusun flow fitur (monitoring & control)
* Menghindari trial-error di mobile app

