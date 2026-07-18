# EN

## v1.1.65
- **Global Toast Notifications** Replaced most native alerts with a custom global toast notification system for non-blocking success/error/info feedback.
- **Signal Bubble Monitoring** Added a floating Signal Bubble for quick monitoring of signal quality and internet speed without leaving the current screen.
- **Expanded Quick Actions** Added more shortcut buttons to Quick Actions, making common modem and network controls faster to access from the home dashboard.
- **Redesigned SpeedTest Modal** Complete visual upgrade of SpeedTest modal with new layout elements and improved user experience.
- **Enhanced Usage Cards** Added toggle to switch between used/remaining quota display on monthly usage cards, and daily limit indicator with progress bar on daily usage card. Traffic stats now features a collapsible speed gauge for better space management.
- **Settings Update Improvements** Improved the Settings > Update flow for a clearer update-checking experience, better release information display, and smoother navigation.
- **Unified Modal Design System** Introduced consistent design across all modals: shared ModalHeader for uniform title/close button, ModalButton with primary/secondary/danger/outline variants, and glassmorphism card layout for settings modals. Applied to MonthlySettings, Parental Profile, Band Selection, Device Detail, APN, Profile Edit, Changelog, and Update modals.
- **GitHub WebView** Added a WebView screen for browsing GitHub links inside the app.
- **Minor Bug Fixes** Fixed several minor bugs across the app for improved stability and a smoother experience.

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

## v1.1.65
- **Notifikasi Toast Global** Mengganti sebagian besar alert bawaan dengan sistem notifikasi toast global kustom untuk feedback sukses/error/info yang tidak memblokir.
- **Monitoring Signal Bubble** Menambahkan Signal Bubble melayang untuk memantau kualitas sinyal dan kecepatan internet dengan cepat tanpa perlu berpindah dari layar yang sedang dibuka.
- **Penambahan Tombol Quick Actions** Menambahkan lebih banyak tombol pintasan pada Quick Actions agar kontrol modem dan jaringan yang sering digunakan bisa diakses lebih cepat dari dashboard utama.
- **SpeedTest Modal Redesign** Desain ulang SpeedTest modal dengan layout yang lebih baik dan user experience yang lebih baik.
- **Peningkatan Kartu Penggunaan** Menambahkan toggle untuk beralih antara tampilan kuota terpakai/sisa pada kartu penggunaan bulanan, dan indikator batas harian dengan progress bar pada kartu penggunaan harian. Traffic stats kini memiliki speed gauge yang dapat dilipat untuk pengelolaan ruang yang lebih baik.
- **Perbaikan Settings > Update** Menyempurnakan alur Settings > Update agar proses pengecekan pembaruan lebih jelas, informasi rilis lebih mudah dibaca, dan navigasi terasa lebih lancar.
- **Sistem Desain Modal Konsisten** Perancangan ulang seluruh modal dengan desain yang konsisten: ModalHeader bersama untuk judul/tombol close yang seragam, ModalButton dengan varian primary/secondary/danger/outline, dan tata letak kartu glassmorphism untuk modal pengaturan. Diterapkan pada modal MonthlySettings, Profil Parental, Pemilihan Band, Detail Perangkat, APN, Edit Profil, Changelog, dan Pembaruan.
- **WebView GitHub** Menambahkan layar WebView untuk membuka halaman GitHub di dalam aplikasi.
- **Perbaikan Bug Minor** Memperbaiki beberapa bug minor di berbagai bagian aplikasi untuk meningkatkan stabilitas dan pengalaman yang lebih lancar.

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
