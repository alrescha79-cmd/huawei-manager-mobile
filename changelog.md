# EN

## v1.1.55
- **5G Network Support** Added full support for 5G NR signal metrics (RSRP, RSRQ, SINR) and multi-band Carrier Aggregation (e.g. B3 + B1 + N40) band display.
- **Enhanced WiFi Devices List** Dynamically reads connection frequencies (2.4 GHz / 5 GHz) and connection types using the HostInfo API. Device icons are now automatically mapped based on VendorClassID (Android, Apple, Windows).
- **Tab Bar & Navigation Polish** Redesigned the CustomTabBar to only show text labels for active tabs. Fixed layout overlap in the SMS tab where buttons were covered by the system navigation dock.
- **Performance & Pre-Release Cleanup** Optimized memory usage by removing unused components, duplicate hooks, types, and dependencies. Improved session recovery for API errors (125002/125003) and cleared redundant development log messages.

## v1.1.50
- **Bug Fixes & Maintenance** Fixes bugs in v1.1.25 reported by users, addition of ads to support app development, and general performance improvements.
- **Multi-Modem Profile Support** Save up to 5 profiles, switch easily from settings or login, and auto-save on successful login.
- **Premium Dashboard Redesign** Complete visual upgrade of Connection Status, Quick Actions, and Signal Info cards with centered alignments and refined layout elements.
- **Background Resource & Ad Optimization** Suspends background updates and widget polling to save battery when backgrounded, with capped App Open ad frequency and improved interstitial flow.

# ID

## v1.1.55
- **Dukungan Jaringan 5G** Penambahan dukungan penuh untuk metrik sinyal 5G NR (RSRP, RSRQ, SINR) dan tampilan Carrier Aggregation multi-band (misal: B3 + B1 + N40).
- **Peningkatan Daftar Perangkat WiFi** Membaca frekuensi (2.4 GHz / 5 GHz) dan tipe koneksi secara dinamis dari API HostInfo. Ikon perangkat kini otomatis menyesuaikan berdasarkan VendorClassID (Android, Apple, Windows).
- **Penyempurnaan Navigasi & Tampilan** Desain ulang CustomTabBar agar hanya menampilkan label teks pada tab aktif. Perbaikan tata letak tab SMS agar tombol FAB dan mode seleksi tidak tertutup oleh navigasi sistem/dock.
- **Optimalisasi Performa & Cleanup Pre-Release** Mengurangi konsumsi memori dengan menghapus file komponen, hook, tipe, dan dependency yang tidak terpakai. Penanganan eror sesi (125002/125003) serta pembersihan debug logs untuk rilis stabil.

## v1.1.50
- **Perbaikan Bug & Pemeliharaan** Perbaikan bug di versi 1.1.25 yang telah dilaporkan pengguna, penambahan iklan untuk mendukung pengembangan aplikasi, serta optimalisasi performa aplikasi secara keseluruhan.
- **Dukungan Multi-Profil Modem** Simpan hingga 5 profil, beralih dengan mudah dari pengaturan atau login, dan simpan otomatis saat berhasil login.
- **Desain Ulang Tampilan Premium** Pembaruan visual total untuk kartu Status Koneksi, Aksi Cepat, dan Informasi Sinyal dengan penataan teks di tengah dan perbaikan tata letak.
- **Optimalisasi Baterai & Frekuensi Iklan** Penghentian otomatis polling latar belakang dan pembaruan widget untuk menghemat baterai, serta penataan jeda iklan agar tidak mengganggu navigasi.
