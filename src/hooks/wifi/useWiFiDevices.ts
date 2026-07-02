import { useState } from 'react';
import { WiFiService } from '@/services/wifi.service';
import { ConnectedDevice } from '@/types';
import { ThemedAlertHelper } from '@/components';

interface UseWiFiDevicesProps {
  wifiService: WiFiService | null;
  t: (key: string) => string;
  handleRefresh: () => void;
}

export function useWiFiDevices({ wifiService, t, handleRefresh }: UseWiFiDevicesProps) {
  const [blockedDevices, setBlockedDevices] = useState<{ macAddress: string; hostName: string }[]>([]);
  const [isUnblocking, setIsUnblocking] = useState<string | null>(null);
  
  const [selectedDevice, setSelectedDevice] = useState<ConnectedDevice | null>(null);
  const [showDeviceDetailModal, setShowDeviceDetailModal] = useState(false);

  const handleSaveDeviceName = async (deviceId: string, newName: string) => {
    if (!wifiService) return;

    try {
      await wifiService.changeDeviceName(deviceId, newName);
      ThemedAlertHelper.alert(t('common.success'), t('wifi.deviceNameSaved'));
      handleRefresh();
    } catch (error: any) {
      let errorMessage = t('wifi.failedSaveDeviceName');
      if (error?.huaweiErrorCode === '100002') {
        errorMessage = t('alerts.renameNotSupported') || 'Changing device name is not supported on this modem model.';
      }
      ThemedAlertHelper.alert(t('common.error'), errorMessage);
      throw error;
    }
  };

  const handleUnblockDevice = async (macAddress: string) => {
    if (!wifiService || isUnblocking) return;

    setIsUnblocking(macAddress);
    try {
      await wifiService.unblockDevice(macAddress);
      ThemedAlertHelper.alert(t('common.success'), t('wifi.deviceUnblocked'));
      const blocked = await wifiService.getBlockedDevices();
      setBlockedDevices(blocked);
    } catch (error) {
      ThemedAlertHelper.alert(t('common.error'), t('wifi.failedUnblockDevice'));
    } finally {
      setIsUnblocking(null);
    }
  };

  const handleBlockDevice = async (macAddress: string, hostName: string) => {
    if (!wifiService) return;

    ThemedAlertHelper.alert(
      t('wifi.blockDevice'),
      `${t('wifi.blockConfirm')} ${hostName || macAddress}?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('wifi.blockDevice'),
          style: 'destructive',
          onPress: async () => {
            try {
              await wifiService.kickDevice(macAddress);
              ThemedAlertHelper.alert(t('common.success'), t('wifi.deviceBlocked'));
              handleRefresh();
            } catch (error) {
              ThemedAlertHelper.alert(t('common.error'), t('alerts.failedKickDevice'));
            }
          },
        },
      ]
    );
  };

  return {
    blockedDevices,
    setBlockedDevices,
    isUnblocking,
    selectedDevice,
    setSelectedDevice,
    showDeviceDetailModal,
    setShowDeviceDetailModal,
    handleSaveDeviceName,
    handleUnblockDevice,
    handleBlockDevice,
  };
}
