# Huawei Modem API Reference

Dokumentasi endpoint Huawei LTE API yang digunakan aplikasi ini.

---

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

### Get CSRF Token
```
GET /api/webserver/token
```
Response:
```xml
<response>
  <token>ytnlWoj5BfwZz70dS8uX9uIc0NCPLIlqLb2Ype0fidnc23aLk6b20yzWNkYm4dYY</token>
</response>
```

### Login (Password Type 4)
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

### SCRAM Challenge Login
```
POST /api/user/challenge_login
```
Body:
```xml
<request>
  <username>admin</username>
  <firstnonce>random_64_char_hex</firstnonce>
  <mode>1</mode>
</request>
```
Response:
```xml
<response>
  <salt>hex_salt</salt>
  <servernonce>clientnonce+servernonce</servernonce>
  <iterations>100</iterations>
</response>
```

### SCRAM Authentication Login
```
POST /api/user/authentication_login
```
Body:
```xml
<request>
  <clientproof>hex_client_proof</clientproof>
  <finalnonce>server_nonce</finalnonce>
</request>
```

### Check Login State
```
GET /api/user/state-login
```
Response contains `<State>0</State>` if logged in, `-1` if not.

### Logout
```
POST /api/user/logout
```
Body:
```xml
<request>
  <Logout>1</Logout>
</request>
```

---

## Device Information

### Get Device Info
```
GET /api/device/information
```
Returns: DeviceName, SerialNumber, IMEI, HardwareVersion, SoftwareVersion, WanIPAddress, etc.

### Get Signal Info
```
GET /api/device/signal
```
Returns: RSSI, RSRP, RSRQ, SINR, PCI, Cell ID, Band, ulbandwidth, dlbandwidth, etc.

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

### Get Antenna Type
```
GET /api/device/antenna_set_type
```

### Set Antenna Type
```
POST /api/device/antenna_set_type
```
Body:
```xml
<request>
  <antenna_set_type>0</antenna_set_type>  <!-- 0=auto, 1=internal, 2=external -->
</request>
```

---

## Monitoring

### Get Status
```
GET /api/monitoring/status
```
Returns: ConnectionStatus, SignalIcon, CurrentNetworkType, CurrentNetworkTypeEx, SimStatus, WifiStatus, CurrentWifiUser, etc.

### Get Traffic Statistics
```
GET /api/monitoring/traffic-statistics
```
Returns: CurrentDownloadRate, CurrentUploadRate, TotalDownload, TotalUpload, CurrentConnectTime, etc.

### Get Monthly Statistics
```
GET /api/monitoring/month_statistics
```
Returns: CurrentMonthDownload, CurrentMonthUpload, MonthDuration, MonthLastClearTime, etc.

### Get Monthly Data Settings
```
GET /api/monitoring/start_date
```
Returns: StartDay, DataLimit, MonthThreshold, SetMonthData, trafficmaxlimit, etc.

### Set Monthly Data Settings
```
POST /api/monitoring/start_date
```
Body:
```xml
<request>
  <StartDay>01</StartDay>
  <DataLimit>500GB</DataLimit>
  <MonthThreshold>90</MonthThreshold>
  <SetMonthData>1</SetMonthData>  <!-- 0=disabled, 1=enabled -->
</request>
```

---

## Network

### Get Current PLMN
```
GET /api/net/current-plmn
```
Returns: FullName (operator name), CurrentNetworkType, etc.

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
  <LTEBand>7FFFFFFFFFFFFFFF</LTEBand>  <!-- Hexmask for bands -->
</request>
```

### Trigger PLMN Scan (IP Change)
```
GET /api/net/plmn-list
```
Triggers network re-registration which usually results in new IP address.

---

## Mobile Data (Dialup)

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

### Get Connection Settings
```
GET /api/dialup/connection
```

### Set Connection Settings
```
POST /api/dialup/connection
```

### Get APN Retry Settings
```
GET /api/dialup/apn-retry
```

### Set APN Retry Settings
```
POST /api/dialup/apn-retry
```

---

## WiFi

### Get Connected Devices (XML)
```
GET /api/wlan/host-list
```
Returns XML with `<Host>` elements containing MacAddress, IpAddress, HostName, AssociatedTime, etc.

### Get Connected Devices (JSON)
```
GET /api/system/HostInfo
```
Returns JSON array with detailed host info including AssociatedTime (connection duration in seconds).

### Get WiFi Settings
```
GET /api/wlan/basic-settings
```
Returns: WifiSsid, WifiPsk, WifiSecurity, WifiEnable, etc.

### Set WiFi Settings
```
POST /api/wlan/basic-settings
```

### Get Multi-SSID Settings
```
GET /api/wlan/multi-basic-settings
```
Returns settings for both main and guest WiFi networks.

### Set Multi-SSID Settings
```
POST /api/wlan/multi-basic-settings
```

### Get Guest WiFi Time Settings
```
GET /api/wlan/guesttime-setting
```

### Set Guest WiFi Time Settings
```
POST /api/wlan/guesttime-setting
```

### Toggle WiFi
```
POST /api/wlan/wifi-switch
```

### Get MAC Filter Settings
```
GET /api/wlan/multi-macfilter-settings-ex
```

### Set MAC Filter (Block/Unblock)
```
POST /api/wlan/multi-macfilter-settings
```

---

## LAN

### Change Device Name
```
POST /api/lan/changedevicename
```
Body:
```xml
<request>
  <ID>InternetGatewayDevice.LANDevice.1.Hosts.Host.20.</ID>
  <ActualName>NewDeviceName</ActualName>
</request>
```

---

## SMS

### Get SMS List
```
POST /api/sms/sms-list
```
Body:
```xml
<request>
  <PageIndex>1</PageIndex>
  <ReadCount>20</ReadCount>
  <BoxType>1</BoxType>  <!-- 1=inbox, 2=outbox -->
  <SortType>0</SortType>
  <Ascending>0</Ascending>
  <UnreadPreferred>0</UnreadPreferred>
</request>
```

### Get SMS Count
```
GET /api/sms/sms-count
```

### Send SMS
```
POST /api/sms/send-sms
```
Body:
```xml
<request>
  <Index>-1</Index>
  <Phones><Phone>+62xxx</Phone></Phones>
  <Sca></Sca>
  <Content>Message text</Content>
  <Length>-1</Length>
  <Reserved>1</Reserved>
  <Date>-1</Date>
</request>
```

### Delete SMS
```
POST /api/sms/delete-sms
```
Body:
```xml
<request>
  <Index>40000</Index>
</request>
```

### Mark SMS as Read
```
POST /api/sms/set-read
```

---

## Parental Control (Time Rules)

### Get Time Rules
```
GET /api/timerule/timerule
```

### Set Time Rules
```
POST /api/timerule/timerule
```

---

## Diagnosis

### Ping Test
```
POST /api/diagnosis/diagnose_ping
```
Body:
```xml
<request>
  <Host>google.com</Host>
  <Timeout>5000</Timeout>
</request>
```

---

## Common Headers

All authenticated requests require:
- `__RequestVerificationToken`: Token from SesTokInfo or token endpoint
- `Cookie`: Session ID from SesTokInfo (format: `SessionID=xxx`)
- `Content-Type`: `application/xml` for POST requests
- `X-Requested-With`: `XMLHttpRequest`

## Password Encoding (Type 4)

1. SHA256 hash of password → hex string
2. Base64 encode the hex string
3. Combine: `username + base64(hexHash) + token`
4. SHA256 hash of combined → hex string
5. Base64 encode final hex string

## Error Codes

| Code | Description |
|------|-------------|
| 100002 | No permission / Not logged in |
| 100005 | Parameter error |
| 108002 | User already logged in |
| 125002 | Wrong token / CSRF error |
| 125003 | Session expired / Invalid session |

---

## Notes

- Response format is XML unless specified otherwise (e.g., HostInfo returns JSON)
- Some endpoints may require specific modem firmware versions
- LTEBand values are hexadecimal bitmasks representing enabled bands
