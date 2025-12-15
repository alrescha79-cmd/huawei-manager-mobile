# Huawei Modem API Reference

Dokumentasi endpoint Huawei LTE API yang digunakan aplikasi ini.

## Authentication

### Get Session Token
```
GET /api/webserver/SesTokInfo
```
Response:
```xml
<response>
  <SesInfo>SessionID=xxx</SesInfo>
  <TokInfo>token123</TokInfo>
</response>
```

### Login
```
POST /api/user/login
```
Body:
```xml
<request>
  <Username>admin</Username>
  <Password>base64_encoded_hash</Password>
  <password_type>4</password_type>
</request>
```

### Logout
```
POST /api/user/logout
```

---

## Device Information

### Get Device Info
```
GET /api/device/information
```
Returns: DeviceName, SerialNumber, IMEI, HardwareVersion, SoftwareVersion, etc.

### Get Signal Info
```
GET /api/device/signal
```
Returns: RSSI, RSRP, RSRQ, SINR, PCI, Cell ID, Band, etc.

### Reboot Device
```
POST /api/device/control
```
Body:
```xml
<request>
  <Control>1</Control>
</request>
```

---

## Monitoring

### Get Status
```
GET /api/monitoring/status
```
Returns: ConnectionStatus, SignalIcon, CurrentNetworkType, SimStatus, etc.

### Get Traffic Statistics
```
GET /api/monitoring/traffic-statistics
```
Returns: CurrentDownloadRate, CurrentUploadRate, TotalDownload, TotalUpload, etc.

### Get Monthly Statistics
```
GET /api/monitoring/month_statistics
```
Returns: CurrentMonthDownload, CurrentMonthUpload, etc.

---

## Network

### Get Current PLMN
```
GET /api/net/current-plmn
```
Returns: FullName (operator), CurrentNetworkType, etc.

### Get Network Mode
```
GET /api/net/net-mode
```
Returns: NetworkMode, NetworkBand, LTEBand

### Set Network Mode
```
POST /api/net/net-mode
```
Body:
```xml
<request>
  <NetworkMode>03</NetworkMode>  <!-- 00=Auto, 01=2G, 02=3G, 03=4G -->
  <NetworkBand>3FFFFFFF</NetworkBand>
  <LTEBand>7FFFFFFFFFFFFFFF</LTEBand>
</request>
```

### Trigger PLMN Scan (IP Change)
```
GET /api/net/plmn-list
```

---

## Mobile Data

### Get Data Switch Status
```
GET /api/dialup/mobile-dataswitch
```

### Toggle Mobile Data
```
POST /api/dialup/mobile-dataswitch
```
Body:
```xml
<request>
  <dataswitch>1</dataswitch>  <!-- 0=off, 1=on -->
</request>
```

---

## WiFi

### Get WiFi Settings
```
GET /api/wlan/basic-settings
```

### Get Connected Devices
```
GET /api/wlan/host-list
```

### Toggle WiFi
```
POST /api/wlan/wifi-switch
```

### Kick Device
```
POST /api/wlan/kick-device
```

---

## SMS

### Get SMS List
```
POST /api/sms/sms-list
```

### Get SMS Count
```
GET /api/sms/sms-count
```

### Send SMS
```
POST /api/sms/send-sms
```

### Delete SMS
```
POST /api/sms/delete-sms
```

---

## Antenna

### Get Antenna Type
```
GET /api/device/antenna_type
```

### Set Antenna Type
```
POST /api/device/antenna_type
```
Body:
```xml
<request>
  <antenna_type>0</antenna_type>  <!-- 0=auto, 1=internal, 2=external -->
</request>
```

---

## Notes

- Semua request memerlukan header:
  - `__RequestVerificationToken`: Token dari SesTokInfo
  - `Cookie`: Session ID dari SesTokInfo
- Password di-hash dengan SHA256 dan di-encode base64
- Response dalam format XML
