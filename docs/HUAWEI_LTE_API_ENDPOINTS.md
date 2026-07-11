# Huawei LTE API — Pemetaan Endpoint Lengkap

> **Sumber:** Reverse Engineering    
> **Base URL:** `http://<router-ip>`  
> **Format request/response:** XML  
> **Autentikasi:** Wajib login dulu, semua request butuh header `__RequestVerificationToken`

---


---

## 👤 Module: `user`

| Full Endpoint | Method | Keterangan |
|---|---|---|
| `/api/user/state-login` | GET | Cek status login & ambil `password_type` |
| `/api/user/login` | POST(set) | Login — body: `Username`, `Password`, `password_type` |
| `/api/user/logout` | POST(set) | Logout — body: `Logout: 1` |
| `/api/user/challenge_login` | GET | Challenge untuk SCRAM-SHA-256 |
| `/api/user/authentication_login` | GET | Info autentikasi login |
| `/api/user/hilink_login` | GET | HiLink login |
| `/api/user/history-login` | GET | Riwayat login |
| `/api/user/heartbeat` | GET | Keepalive sesi aktif |
| `/api/user/remind` | GET | Ambil pesan pengingat |
| `/api/user/remind` | POST(set) | Set pengingat — body: `remindstate` |
| `/api/user/password` | GET | Info password |
| `/api/user/pwd` | GET | Pwd info |
| `/api/user/pwd` | POST(set) | Set pwd — body: `module`, `nonce` |
| `/api/user/web-feature-switch` | GET | Status fitur web |
| `/api/user/input_event` | GET | Event input (reverse engineered) |
| `/api/user/screen_state` | GET | State layar (reverse engineered) |
| `/api/user/session` | GET | Info sesi (reverse engineered) |
| `/api/user/second_login` | GET | Login kedua |
| `/api/user/remember-pwd` | GET | Status remember password |
| `/api/user/rule` | GET | Rule pengguna |

---

## 📱 Module: `device`

| Full Endpoint | Method | Keterangan |
|---|---|---|
| `/api/device/information` | GET | Info lengkap perangkat |
| `/api/device/basic_information` | GET | Info dasar perangkat |
| `/api/device/basic_information` | POST(set) | Set info dasar / restore default — body: `restore_default_status` |
| `/api/device/basicinformation` | GET | Info dasar (endpoint alternatif) |
| `/api/device/autorun-version` | GET | Versi autorun |
| `/api/device/device-feature-switch` | GET | Status fitur switch perangkat |
| `/api/device/usb-tethering-switch` | GET | Status USB tethering |
| `/api/device/boot_time` | GET | Waktu boot perangkat |
| `/api/device/signal` | GET | Info sinyal perangkat |
| `/api/device/control` | POST(set) | Kontrol power — body: `Control` (1=reboot, 4=shutdown) |
| `/api/device/antenna_status` | GET | Status antena |
| `/api/device/antenna_settings` | GET | Setelan antena |
| `/api/device/antenna_settings` | POST(set) | Set tipe antena — body: `antenna_type` (AUTO/INTERNAL/EXTERNAL) |
| `/api/device/antenna_type` | GET | Tipe antena aktif |
| `/api/device/antenna_set_type` | GET | Tipe antena yang di-set |
| `/api/device/logsetting` | GET | Pengaturan log |
| `/api/device/logport` | GET | Port log |
| `/api/device/datalock` | GET | Status data lock |
| `/api/device/vendorname` | POST(get) | Nama vendor — body: `language` |
| `/api/device/mode` | POST(set) | Set mode — body: `mode` (debug/telnet/production) |
| `/api/device/compresslogfile` | GET | Link arsip file log |

---

## 📊 Module: `monitoring`

| Full Endpoint | Method | Keterangan |
|---|---|---|
| `/api/monitoring/status` | GET | Status utama router + info sinyal |
| `/api/monitoring/converged-status` | GET | Status konvergensi router |
| `/api/monitoring/check-notifications` | GET | Cek notifikasi baru |
| `/api/monitoring/traffic-statistics` | GET | Statistik traffic real-time |
| `/api/monitoring/month_statistics` | GET | Statistik bulanan LTE |
| `/api/monitoring/month_statistics_wlan` | GET | Statistik bulanan WLAN |
| `/api/monitoring/start_date` | GET | Tanggal mulai monitoring LTE |
| `/api/monitoring/start_date` | POST(set) | Set monitoring LTE — body: `StartDay`, `DataLimit`, `MonthThreshold` |
| `/api/monitoring/start_date_wlan` | GET | Tanggal mulai monitoring WLAN |
| `/api/monitoring/start_date_wlan` | POST(set) | Set monitoring WLAN — body: `StartDay`, `DataLimit`, `MonthThreshold` |
| `/api/monitoring/clear-traffic` | POST(set) | Reset statistik traffic — body: `ClearTraffic: 1` |
| `/api/monitoring/wifi-month-setting` | GET | Setting bulan WiFi |
| `/api/monitoring/daily-data-limit` | GET | Batas data harian |
| `/api/monitoring/statistic-feature-switch` | GET | Status fitur statistik |
| `/api/monitoring/onekey_diag` | GET | Status one-click diagnostik |

---

## 💬 Module: `sms`

| Full Endpoint | Method | Keterangan |
|---|---|---|
| `/api/sms/sms-count` | GET | Jumlah SMS di storage |
| `/api/sms/sms-count-contact` | GET | Jumlah SMS per kontak |
| `/api/sms/sms-feature-switch` | GET | Status fitur SMS |
| `/api/sms/splitinfo-sms` | GET | Info SMS multipart |
| `/api/sms/send-status` | GET | Status pengiriman SMS terakhir |
| `/api/sms/get-cbsnewslist` | GET | List CBS news |
| `/api/sms/split-sms` | GET | Info split SMS |
| `/api/sms/recover-sms` | GET | Recovery SMS |
| `/api/sms/copy-sms` | GET | Salin SMS |
| `/api/sms/move-sms` | GET | Pindah SMS |
| `/api/sms/config` | GET | Konfigurasi SMS default |
| `/api/sms/config` | POST(set) | Set konfigurasi — body: `SaveMode`, `Validity`, `Sca`, `SendType`, `Priority` |
| `/api/sms/sms-list` | POST(get) | List SMS — body: `PageIndex`, `ReadCount`, `BoxType`, `SortType`, `Ascending`, `UnreadPreferred` |
| `/api/sms/sms-list-contact` | POST(get) | List SMS per kontak — body: `pageindex`, `readcount` |
| `/api/sms/sms-list-pdu` | POST(get) | List SMS format PDU — body: `PageIndex`, `ReadCount`, `BoxType` |
| `/api/sms/send-sms` | POST(set) | Kirim SMS — body: `Index`, `Phones`, `Sca`, `Content`, `Length`, `Reserved`, `Date` |
| `/api/sms/send-sms-pdu` | POST(set) | Kirim SMS format PDU — body: `Index`, `PDU`, `Length`, `SaveMode`, dll |
| `/api/sms/save-sms` | POST(set) | Simpan SMS sebagai draft |
| `/api/sms/delete-sms` | POST(set) | Hapus SMS — body: `Index` |
| `/api/sms/set-read` | POST(set) | Tandai SMS sudah dibaca — body: `Index` |
| `/api/sms/backup-sim` | POST(set) | Backup SMS ke SIM — body: `IsMove`, `Date` |
| `/api/sms/cancel-send` | POST(set) | Batalkan pengiriman SMS |

---

## 🌐 Module: `net`

| Full Endpoint | Method | Keterangan |
|---|---|---|
| `/api/net/current-plmn` | GET | PLMN (operator) yang sedang aktif |
| `/api/net/net-mode` | GET | Mode jaringan saat ini (2G/3G/4G) |
| `/api/net/net-mode` | POST(set) | Set mode jaringan — body: `NetworkMode`, `NetworkBand`, `LTEBand` |
| `/api/net/network` | GET | Info jaringan |
| `/api/net/network` | POST(set) | Set jaringan — body: `NetworkMode`, `NetworkBand` |
| `/api/net/register` | GET | Status registrasi jaringan |
| `/api/net/register` | POST(set) | Set registrasi manual/auto — body: `Mode`, `Plmn`, `Rat` |
| `/api/net/net-mode-list` | GET | Daftar mode jaringan yang tersedia |
| `/api/net/plmn-list` | GET | Daftar PLMN/operator yang tersedia |
| `/api/net/net-feature-switch` | GET | Status fitur jaringan |
| `/api/net/cell-info` | GET | Info sel jaringan aktif |
| `/api/net/csps_state` | GET | State CSPS |
| `/api/net/reconnect` | POST(set) | Reconnect ke jaringan — body: `ReconnectAction: 1` |

---

## 📶 Module: `wlan`

| Full Endpoint | Method | Keterangan |
|---|---|---|
| `/api/wlan/wifi-feature-switch` | GET | Status fitur WiFi |
| `/api/wlan/basic-settings` | GET | Setelan dasar WiFi (SSID, dll) |
| `/api/wlan/basic-settings` | POST(set) | Set WiFi — body: `WifiSsid`, `WifiHide`, `WifiRestart` |
| `/api/wlan/security-settings` | GET | Setelan keamanan WiFi |
| `/api/wlan/security-settings` | POST(set) | Set keamanan — body: `WifiAuthmode`, `WifiWpapsk`, `WifiWpaencryptionmodes`, dll |
| `/api/wlan/multi-basic-settings` | GET | Setelan multi-SSID |
| `/api/wlan/multi-basic-settings` | POST(set) | Set multi-SSID — body: `Ssids.Ssid[]`, `WifiRestart` |
| `/api/wlan/multi-security-settings` | GET | Keamanan multi-SSID |
| `/api/wlan/multi-security-settings-ex` | GET | Keamanan multi-SSID (extended) |
| `/api/wlan/multi-switch-settings` | GET | Switch settings multi-SSID |
| `/api/wlan/multi-macfilter-settings` | GET | MAC filter multi-SSID |
| `/api/wlan/multi-macfilter-settings` | POST(set) | Set MAC filter multi-SSID |
| `/api/wlan/multi-macfilter-settings-ex` | GET | MAC filter multi-SSID (extended) |
| `/api/wlan/mac-filter` | GET | MAC filter WiFi |
| `/api/wlan/mac-filter` | POST(set) | Set MAC filter — body: `wifihostname`, `WifiMacFilterMac` |
| `/api/wlan/host-list` | GET | Daftar perangkat terhubung |
| `/api/wlan/station-information` | GET | Info station WiFi |
| `/api/wlan/handover-setting` | GET | Setelan handover WiFi/3G |
| `/api/wlan/handover-setting` | POST(set) | Set handover — body: `Handover` |
| `/api/wlan/wps` | GET | Status WPS |
| `/api/wlan/wps-appin` | GET | WPS APP PIN |
| `/api/wlan/wps-appin` | POST(set) | Set WPS APP PIN — body: `wpsappintype`, `wpsappin` |
| `/api/wlan/wps-pbc` | GET | WPS Push Button |
| `/api/wlan/wps-pbc` | POST(set) | Trigger WPS PBC — body: `WPSMode`, `ssidindex` |
| `/api/wlan/wps-switch` | GET | Status switch WPS |
| `/api/wlan/wps-switch` | POST(set) | Toggle WPS — body: `appinenable` |
| `/api/wlan/status-switch-settings` | GET | Status switch settings |
| `/api/wlan/oled-showpassword` | GET | Tampilkan password di OLED |
| `/api/wlan/wifiprofile` | GET | Profil WiFi |
| `/api/wlan/wififrequence` | GET | Frekuensi WiFi |
| `/api/wlan/wifiscanresult` | GET | Hasil scan WiFi |
| `/api/wlan/wlandbho` | GET | WLAN DBHO info |
| `/api/wlan/wlan-guide-settings` | GET | Setelan wizard WLAN |
| `/api/wlan/wlan-guide-settings` | POST(set) | Set wizard WLAN (encrypted) |
| `/api/wlan/wlanintelligent` | GET | WLAN intelligent settings |
| `/api/wlan/guesttime-setting` | GET | Setelan waktu guest network |

---

## 📞 Module: `dialup`

| Full Endpoint | Method | Keterangan |
|---|---|---|
| `/api/dialup/mobile-dataswitch` | GET | Status toggle modem LTE |
| `/api/dialup/mobile-dataswitch` | POST(set) | Toggle modem LTE — body: `dataswitch` (0=off, 1=on) |
| `/api/dialup/connection` | GET | Setelan koneksi |
| `/api/dialup/connection` | POST(set) | Set koneksi — body: `RoamAutoConnectEnable`, `MaxIdelTime`, `ConnectMode`, `MTU` |
| `/api/dialup/profiles` | GET | Daftar profil dial-up (APN) |
| `/api/dialup/profiles` | POST(set) | Buat/update/hapus/set default profil APN |
| `/api/dialup/auto-apn` | GET | Setelan auto APN |
| `/api/dialup/dialup-feature-switch` | GET | Status fitur dial-up |
| `/api/dialup/dial` | POST(set) | Mulai koneksi dial-up — body: `Action: 1` |

---

## 🔄 Module: `online-update`

| Full Endpoint | Method | Keterangan |
|---|---|---|
| `/api/online-update/status` | GET | Status update firmware |
| `/api/online-update/check-new-version` | GET | Cek versi firmware baru |
| `/api/online-update/check-new-version` | POST(set) | Trigger cek versi baru |
| `/api/online-update/url-list` | GET | Daftar URL update |
| `/api/online-update/ack-newversion` | GET | Status acknowledge versi baru |
| `/api/online-update/ack-newversion` | POST(set) | Acknowledge versi baru — body: `userAckNewVersion` |
| `/api/online-update/cancel-downloading` | GET | Status cancel download |
| `/api/online-update/cancel-downloading` | POST(set) | Cancel download firmware |
| `/api/online-update/upgrade-messagebox` | GET | Pesan upgrade |
| `/api/online-update/upgrade-messagebox` | POST(set) | Set pesan upgrade — body: `messagebox` |
| `/api/online-update/configuration` | GET | Konfigurasi online update |
| `/api/online-update/autoupdate-config` | GET | Konfigurasi auto-update |
| `/api/online-update/autoupdate-config` | POST(set) | Set auto-update — body: `auto_update`, `ui_download` |
| `/api/online-update/redirect_cancel` | GET | Cancel redirect update |

---

## 📒 Module: `pb` (Phonebook)

| Full Endpoint | Method | Keterangan |
|---|---|---|
| `/api/pb/pb-count` | GET | Jumlah kontak |
| `/api/pb/pb-list` | POST(get) | List kontak — body: `PageIndex`, `ReadCount`, `GroupID`, `Storage` |
| `/api/pb/delete-pb` | POST(set) | Hapus kontak — body: `Index`, `Storage` |

---

## 🔒 Module: `pin`

| Full Endpoint | Method | Keterangan |
|---|---|---|
| `/api/pin/status` | GET | Status PIN SIM |
| `/api/pin/simlock` | GET | Status SIM lock |
| `/api/pin/operate` | POST(set) | Operasi PIN — body: `OperateType`, `CurrentPin`, `NewPin`, `PukCode` |

---

## 📡 Module: `app`

| Full Endpoint | Method | Keterangan |
|---|---|---|
| `/api/app/operatorinfo` | GET | Info operator — param: `lang` |
| `/api/app/privacypolicy` | GET | Privacy policy — param: `lang` |
| `/api/app/privacypolicy` | POST(get) | Terima/tolak privacy policy — body: `data.Approve` |

---

## 🌍 Module-module Lainnya

| Full Endpoint | Method | Keterangan |
|---|---|---|
| `/api/bluetooth/settings` | GET | Setelan Bluetooth |
| `/api/bluetooth/settings` | POST(set) | Set Bluetooth |
| `/api/cradle/status-info` | GET | Info status cradle |
| `/api/cradle/feature-switch` | GET | Feature switch cradle |
| `/api/cradle/basic-info` | GET | Info dasar cradle |
| `/api/cradle/factory-mac` | GET | Factory MAC cradle |
| `/api/ddns/ddns-list` | GET | Daftar DDNS |
| `/api/ddns/ddns-list` | POST(set) | Set DDNS |
| `/api/dhcp/settings` | GET | Setelan DHCP |
| `/api/dhcp/settings` | POST(set) | Set DHCP |
| `/api/dhcp/static-addr-info` | GET | Info alamat IP statis |
| `/api/dhcp/static-addr-info` | POST(set) | Set alamat IP statis |
| `/api/diagnosis/traceroute` | GET | Status traceroute |
| `/api/diagnosis/traceroute` | POST(set) | Jalankan traceroute — body: `host`, `timeout`, `maxHops` |
| `/api/global/module-switch` | GET | Status modul switch global |
| `/api/host/info` | GET | Info host |
| `/api/lan/ethernet-switch-info` | GET | Info switch LAN Ethernet |
| `/api/language/current-language` | GET | Bahasa aktif |
| `/api/language/current-language` | POST(set) | Set bahasa |
| `/api/led/nightmode` | GET | Status night mode LED |
| `/api/led/nightmode` | POST(set) | Set night mode LED |
| `/api/log/logfile` | GET | File log |
| `/api/mlog/mobile-logger` | GET | Mobile logger |
| `/api/ntwk/celllock` | GET | Status cell lock |
| `/api/ntwk/celllock` | POST(set) | Set cell lock |
| `/api/ota/status` | GET | Status OTA update |
| `/api/redirection/homepage` | GET | Homepage redirection |
| `/api/sdcard/sdcard-info` | GET | Info SD Card |
| `/api/sdcard/sdcard-list` | GET | List file SD Card |
| `/api/security/mac-filter` | GET | MAC filter keamanan |
| `/api/security/mac-filter` | POST(set) | Set MAC filter keamanan |
| `/api/security/bridgemode` | GET | Status bridge mode |
| `/api/sntp/sntpsettings` | GET | Setelan SNTP |
| `/api/staticroute/static-route-list` | GET | Daftar rute statis |
| `/api/statistic/statistics_item_type` | GET | Tipe item statistik |
| `/api/syslog/querylog` | GET | Query syslog |
| `/api/system/deviceinfo` | GET | Info sistem perangkat |
| `/api/system/upgrade-device-cfg` | POST(set) | Upgrade konfigurasi perangkat |
| `/api/time/timeout` | GET | Timeout sesi |
| `/api/timerule/timerule` | GET | Aturan timer |
| `/api/usbprinter/printerinfo` | GET | Info USB printer |
| `/api/usbstorage/storageinfo` | GET | Info USB storage |
| `/api/ussd/status` | GET | Status USSD |
| `/api/ussd/send` | POST(set) | Kirim USSD — body: `content`, `codeType` |
| `/api/vsim/status` | GET | Status vSIM |
| `/api/voice/voip-account` | GET | Info akun VoIP |
| `/api/voice/voip-account` | POST(set) | Set akun VoIP |
| `/api/vpn/basic-info` | GET | Info VPN |
| `/api/vpn/basic-info` | POST(set) | Set VPN |
| `/api/webserver/token` | GET | Token web server |

---

