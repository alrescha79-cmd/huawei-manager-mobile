import { useState, useRef, useMemo, useEffect } from 'react';
import { WiFiService } from '@/services/wifi.service';
import { ThemedAlertHelper, ToastHelper } from '@/components';

interface UseWiFiSettingsProps {
  wifiSettings: any;
  wifiService: WiFiService | null;
  t: (key: string) => string;
  handleRefresh: () => void;
}

export function useWiFiSettings({ wifiSettings, wifiService, t, handleRefresh }: UseWiFiSettingsProps) {
  const [formSsid, setFormSsid] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formSecurityMode, setFormSecurityMode] = useState('WPA2PSK');
  const [showSecurityDropdown, setShowSecurityDropdown] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isEditExpanded, setIsEditExpanded] = useState(false);

  const isFormInitialized = useRef(false);

  useEffect(() => {
    if (wifiSettings && !isFormInitialized.current) {
      setFormSsid(wifiSettings.ssid || '');
      setFormPassword(wifiSettings.password || '');
      setFormSecurityMode(wifiSettings.securityMode || 'WPA2PSK');
      isFormInitialized.current = true;
    }
  }, [wifiSettings]);

  // Expose a method to reset initialization state if needed
  const resetFormInitialization = () => {
    isFormInitialized.current = false;
  };

  const hasChanges = useMemo(() => {
    if (!wifiSettings) return false;
    return (
      formSsid !== (wifiSettings.ssid || '') ||
      formPassword !== (wifiSettings.password || '') ||
      formSecurityMode !== (wifiSettings.securityMode || 'WPA2PSK')
    );
  }, [formSsid, formPassword, formSecurityMode, wifiSettings]);

  const performToggleWiFi = async (enabled: boolean) => {
    if (!wifiService) return;

    try {
      await wifiService.toggleWiFi(enabled);
      ToastHelper.success(enabled ? t('wifi.wifiEnabled') : t('wifi.wifiDisabled'));
      handleRefresh();
    } catch (error) {
      console.error('[WiFi] toggleWiFi error:', error);

      if (!enabled) {
        ToastHelper.success(t('wifi.wifiDisabledConnectionLost'));
      } else {
        ToastHelper.error(t('alerts.failedToggleWifi'));
      }
    }
  };

  const handleToggleWiFi = async (enabled: boolean) => {
    if (!wifiService) {
      return;
    }

    if (!enabled) {
      ThemedAlertHelper.alert(
        t('wifi.disableWifiTitle'),
        t('wifi.disableWifiWarning'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.confirm'),
            style: 'destructive',
            onPress: async () => {
              await performToggleWiFi(enabled);
            },
          },
        ]
      );
    } else {
      await performToggleWiFi(enabled);
    }
  };

  const doSaveSettings = async (isPasswordChange: boolean) => {
    if (!wifiService) return;
    
    setIsSaving(true);
    try {
      await wifiService.setWiFiSettings({
        ssid: formSsid,
        password: formPassword,
        securityMode: formSecurityMode,
      });

      if (isPasswordChange) {
        ToastHelper.success(t('wifi.passwordChangeSuccess'));
      } else {
        ToastHelper.success(t('wifi.settingsSaved'));
        handleRefresh();
      }
    } catch (error: any) {
      console.error('[WiFi UI] setWiFiSettings error:', error);

      const errorMessage = error?.message || '';
      if (isPasswordChange && (
        errorMessage.includes('Network') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('Failed to fetch')
      )) {
        ToastHelper.info(t('wifi.reconnectWithNewPassword'));
      } else {
        ToastHelper.error(t('alerts.failedSaveWifi'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!wifiService || !hasChanges || isSaving) {
      return;
    }

    const isPasswordChange = formPassword.length >= 8 && formPassword !== (wifiSettings?.password || '');

    if (isPasswordChange) {
      ThemedAlertHelper.alert(
        t('wifi.passwordChangeWarning'),
        t('wifi.passwordChangeMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('wifi.changePassword'),
            style: 'destructive',
            onPress: () => doSaveSettings(true),
          },
        ]
      );
    } else {
      doSaveSettings(false);
    }
  };

  return {
    formSsid,
    setFormSsid,
    formPassword,
    setFormPassword,
    formSecurityMode,
    setFormSecurityMode,
    showSecurityDropdown,
    setShowSecurityDropdown,
    isSaving,
    showPassword,
    setShowPassword,
    isEditExpanded,
    setIsEditExpanded,
    hasChanges,
    handleSaveSettings,
    handleToggleWiFi,
    resetFormInitialization,
  };
}
