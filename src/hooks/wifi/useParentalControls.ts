import { useState } from 'react';
import { WiFiService } from '@/services/wifi.service';
import { ThemedAlertHelper, ToastHelper } from '@/components';

interface UseParentalControlsProps {
  wifiService: WiFiService | null;
  t: (key: string) => string;
  handleRefresh: () => void;
  parentalProfiles: {
    id: string;
    name: string;
    deviceMacs: string[];
    startTime: string;
    endTime: string;
    activeDays: number[];
    enabled: boolean;
  }[];
  setParentalProfiles: React.Dispatch<React.SetStateAction<any[]>>;
  parentalControlEnabled: boolean;
  setParentalControlEnabled: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useParentalControls({ 
  wifiService, 
  t, 
  handleRefresh, 
  parentalProfiles, 
  setParentalProfiles,
  parentalControlEnabled,
  setParentalControlEnabled
}: UseParentalControlsProps) {
  const [isTogglingParental, setIsTogglingParental] = useState(false);
  const [isParentalExpanded, setIsParentalExpanded] = useState(false);
  
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<string | null>(null);
  const [profileName, setProfileName] = useState('');
  const [profileStartTime, setProfileStartTime] = useState('08:00');
  const [profileEndTime, setProfileEndTime] = useState('22:00');
  const [profileDays, setProfileDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [profileDevices, setProfileDevices] = useState<string[]>([]);
  const [profileEnabled, setProfileEnabled] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [initialProfileValues, setInitialProfileValues] = useState<{
    name: string;
    startTime: string;
    endTime: string;
    days: number[];
    devices: string[];
    enabled: boolean;
  } | null>(null);

  const handleToggleParentalControl = async (enabled: boolean) => {
    if (!wifiService || isTogglingParental) return;
    if (enabled && parentalProfiles.length === 0) {
      ToastHelper.error(t('parentalControl.noProfiles'));
      return;
    }
    setIsTogglingParental(true);
    try {
      await wifiService.toggleParentalControl(enabled);
      setParentalControlEnabled(enabled);
    } catch (error) {
      ToastHelper.error(t('common.error'));
    } finally {
      setIsTogglingParental(false);
    }
  };

  const openAddProfileModal = () => {
    setEditingProfile(null);
    setProfileName('');
    setProfileStartTime('08:00');
    setProfileEndTime('22:00');
    setProfileDays([1, 2, 3, 4, 5]);
    setProfileDevices([]);
    setProfileEnabled(true);
    setInitialProfileValues({
      name: '',
      startTime: '08:00',
      endTime: '22:00',
      days: [1, 2, 3, 4, 5],
      devices: [],
      enabled: true,
    });
    setShowProfileModal(true);
  };

  const openEditProfileModal = (profile: typeof parentalProfiles[0]) => {
    setEditingProfile(profile.id);
    setProfileName(profile.name);
    setProfileStartTime(profile.startTime);
    setProfileEndTime(profile.endTime);
    setProfileDays([...profile.activeDays]);
    setProfileDevices([...profile.deviceMacs]);
    setProfileEnabled(profile.enabled);
    setInitialProfileValues({
      name: profile.name,
      startTime: profile.startTime,
      endTime: profile.endTime,
      days: [...profile.activeDays],
      devices: [...profile.deviceMacs],
      enabled: profile.enabled,
    });
    setShowProfileModal(true);
  };

  const hasProfileChanges = () => {
    if (!initialProfileValues) return false;
    const daysChanged = JSON.stringify([...profileDays].sort()) !== JSON.stringify([...initialProfileValues.days].sort());
    const devicesChanged = JSON.stringify([...profileDevices].sort()) !== JSON.stringify([...initialProfileValues.devices].sort());
    return (
      profileName !== initialProfileValues.name ||
      profileStartTime !== initialProfileValues.startTime ||
      profileEndTime !== initialProfileValues.endTime ||
      daysChanged ||
      devicesChanged ||
      profileEnabled !== initialProfileValues.enabled
    );
  };

  const handleCloseProfileModal = () => {
    if (hasProfileChanges()) {
      ThemedAlertHelper.alert(
        t('common.unsavedChanges'),
        t('common.discardChangesMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.discard'), style: 'destructive', onPress: () => setShowProfileModal(false) }
        ]
      );
    } else {
      setShowProfileModal(false);
    }
  };

  const toggleProfileDay = (day: number) => {
    setProfileDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
  };

  const toggleProfileDevice = (mac: string) => {
    setProfileDevices(prev =>
      prev.includes(mac)
        ? prev.filter(m => m !== mac)
        : [...prev, mac]
    );
  };

  const handleSaveProfile = async () => {
    if (!wifiService || isSavingProfile) return;

    if (!profileName.trim()) {
      ToastHelper.error(t('parentalControl.profileNameRequired'));
      return;
    }

    if (profileDays.length === 0) {
      ToastHelper.error(t('parentalControl.selectAtLeastOneDay'));
      return;
    }

    setIsSavingProfile(true);
    try {
      const profileData = {
        name: profileName.trim(),
        deviceMacs: profileDevices,
        startTime: profileStartTime,
        endTime: profileEndTime,
        activeDays: profileDays,
        enabled: profileEnabled,
      };

      if (editingProfile) {
        await wifiService.updateParentalControlProfile({ id: editingProfile, ...profileData });
      } else {
        await wifiService.createParentalControlProfile(profileData);
      }

      ToastHelper.success(t('parentalControl.profileSaved'));
      setShowProfileModal(false);
      handleRefresh();
    } catch (error) {
      ToastHelper.error(t('common.error'));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleDeleteProfile = (profileId: string, profileName: string) => {
    ThemedAlertHelper.alert(
      t('parentalControl.deleteProfile'),
      t('parentalControl.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await wifiService?.deleteParentalControlProfile(profileId);
              ToastHelper.success(t('parentalControl.profileDeleted'));
              handleRefresh();
            } catch (error) {
              ToastHelper.error(t('common.error'));
            }
          },
        },
      ]
    );
  };
  
  const getDayName = (day: number): string => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return t(`parentalControl.${days[day]}`);
  };

  return {
    isTogglingParental,
    isParentalExpanded,
    setIsParentalExpanded,
    showProfileModal,
    setShowProfileModal,
    editingProfile,
    profileName,
    setProfileName,
    profileStartTime,
    setProfileStartTime,
    profileEndTime,
    setProfileEndTime,
    profileDays,
    profileDevices,
    profileEnabled,
    setProfileEnabled,
    isSavingProfile,
    showStartTimePicker,
    setShowStartTimePicker,
    showEndTimePicker,
    setShowEndTimePicker,
    handleToggleParentalControl,
    openAddProfileModal,
    openEditProfileModal,
    handleCloseProfileModal,
    toggleProfileDay,
    toggleProfileDevice,
    handleSaveProfile,
    handleDeleteProfile,
    getDayName,
  };
}
