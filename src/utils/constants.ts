/**
 * App Configuration Constants
 */

export const MODEM_CONFIG = {
  DEFAULT_IPS: ['192.168.8.1', '192.168.1.1', '192.168.100.1'],
  DEFAULT_USERNAME: 'admin',
  DEFAULT_PASSWORD: '',
  CONNECTION_TIMEOUT: 10000, // 10 seconds
  REFRESH_INTERVAL: 5000, // 5 seconds
};

export const API_ENDPOINTS = {
  LOGIN: '/api/user/login',
  LOGOUT: '/api/user/logout',
  TOKEN: '/api/webserver/token',
  DEVICE_INFO: '/api/device/information',
  SIGNAL: '/api/device/signal',
  STATUS: '/api/monitoring/status',
  TRAFFIC: '/api/monitoring/traffic-statistics',
  NETWORK: '/api/net/current-plmn',
  WIFI_HOSTS: '/api/wlan/host-list',
  WIFI_SETTINGS: '/api/wlan/basic-settings',
  WIFI_SWITCH: '/api/wlan/wifi-switch',
  SMS_LIST: '/api/sms/sms-list',
  SMS_COUNT: '/api/sms/sms-count',
  SMS_SEND: '/api/sms/send-sms',
  SMS_DELETE: '/api/sms/delete-sms',
  SMS_READ: '/api/sms/set-read',
  DEVICE_CONTROL: '/api/device/control',
};

export const APP_CONFIG = {
  NAME: 'Huawei Manager',
  VERSION: '1.0.0',
  DEVELOPER: 'Huawei Manager Team',
};

export const STORAGE_KEYS = {
  CREDENTIALS: 'modem_credentials',
  THEME_MODE: 'theme_mode',
  LANGUAGE: 'language',
};
