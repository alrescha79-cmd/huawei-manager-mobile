import { useState, useEffect } from 'react';
import { WiFiService } from '@/services/wifi.service';
import { ThemedAlertHelper, ToastHelper } from '@/components';

interface UseGuestWiFiProps {
  wifiService: WiFiService | null;
  t: (key: string) => string;
  handleRefresh: () => void;
}

export function useGuestWiFi({ wifiService, t, handleRefresh }: UseGuestWiFiProps) {
  const [guestWifiEnabled, setGuestWifiEnabled] = useState(false);
  const [isTogglingGuest, setIsTogglingGuest] = useState(false);
  const [guestWifiSsid, setGuestWifiSsid] = useState('');
  const [guestWifiPassword, setGuestWifiPassword] = useState('');
  const [guestWifiSecurity, setGuestWifiSecurity] = useState('OPEN');
  const [guestWifiDuration, setGuestWifiDuration] = useState('0');
  const [isSavingGuestSettings, setIsSavingGuestSettings] = useState(false);
  const [showGuestSecurityDropdown, setShowGuestSecurityDropdown] = useState(false);
  const [showGuestDurationDropdown, setShowGuestDurationDropdown] = useState(false);
  
  const [guestTimeRemaining, setGuestTimeRemaining] = useState(0);
  const [isTimeRemainingActive, setIsTimeRemainingActive] = useState(false);
  const [isExtendingTime, setIsExtendingTime] = useState(false);

  useEffect(() => {
    if (!guestWifiEnabled || !isTimeRemainingActive || guestTimeRemaining <= 0) return;

    const timer = setInterval(() => {
      setGuestTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [guestWifiEnabled, isTimeRemainingActive, guestTimeRemaining]);

  const handleToggleGuestWiFi = async (enabled: boolean) => {
    if (!wifiService || isTogglingGuest) return;

    setIsTogglingGuest(true);
    try {
      await wifiService.toggleGuestWiFi(enabled);
      setGuestWifiEnabled(enabled);
      ToastHelper.success(enabled ? t('wifi.guestWifiEnabled') : t('wifi.guestWifiDisabled'));
      // Refresh data to update time remaining display
      if (enabled) {
        setTimeout(() => handleRefresh(), 500);
      }
    } catch (error) {
      ToastHelper.error(t('alerts.failedToggleGuestWifi'));
    } finally {
      setIsTogglingGuest(false);
    }
  };

  const handleSaveGuestSettings = async () => {
    if (!wifiService || isSavingGuestSettings) return;

    setIsSavingGuestSettings(true);
    try {
      await wifiService.updateGuestWiFiSettings({
        enabled: guestWifiEnabled,
        ssid: guestWifiSsid,
        password: guestWifiPassword,
        securityMode: guestWifiSecurity,
        duration: guestWifiDuration,
      });
      ToastHelper.success(t('wifi.guestSettingsSaved'));
      handleRefresh();
    } catch (error) {
      ToastHelper.error(t('alerts.failedSaveGuestWifi'));
    } finally {
      setIsSavingGuestSettings(false);
    }
  };

  const handleExtendGuestTime = async () => {
    if (!wifiService || isExtendingTime) return;

    setIsExtendingTime(true);
    try {
      await wifiService.extendGuestWiFiTime();
      const timeRemaining = await wifiService.getGuestTimeRemaining();
      setGuestTimeRemaining(timeRemaining.remainingSeconds);
      ThemedAlertHelper.alert(t('common.success'), t('wifi.timeExtended'));
    } catch (error) {
      ThemedAlertHelper.alert(t('common.error'), t('wifi.failedExtendTime'));
    } finally {
      setIsExtendingTime(false);
    }
  };

  const formatTimeRemaining = (seconds: number): string => {
    if (seconds <= 0) return '00d 00h 00m 00s';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${days.toString().padStart(2, '0')}d ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  };

  return {
    guestWifiEnabled,
    setGuestWifiEnabled,
    isTogglingGuest,
    guestWifiSsid,
    setGuestWifiSsid,
    guestWifiPassword,
    setGuestWifiPassword,
    guestWifiSecurity,
    setGuestWifiSecurity,
    guestWifiDuration,
    setGuestWifiDuration,
    isSavingGuestSettings,
    showGuestSecurityDropdown,
    setShowGuestSecurityDropdown,
    showGuestDurationDropdown,
    setShowGuestDurationDropdown,
    guestTimeRemaining,
    setGuestTimeRemaining,
    isTimeRemainingActive,
    setIsTimeRemainingActive,
    isExtendingTime,
    handleToggleGuestWiFi,
    handleSaveGuestSettings,
    handleExtendGuestTime,
    formatTimeRemaining,
  };
}
