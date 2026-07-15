import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Keyboard,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useTranslation } from '@/i18n';
import { MeshGradientBackground } from '../MeshGradientBackground';
import { ThemedSwitch } from '../ThemedSwitch';
import { ThemedAlertHelper } from '../ThemedAlert';
import { SelectionModal } from '../SelectionModal';
import { ModalButton } from '../ModalButton';
import { ModalHeader } from '../ModalHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatMacAddress } from '@/utils/helpers';

const TIME_OPTIONS = [
    '00:00', '00:30', '01:00', '01:30', '02:00', '02:30', '03:00', '03:30',
    '04:00', '04:30', '05:00', '05:30', '06:00', '06:30', '07:00', '07:30',
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
    '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30',
];

interface Device {
    macAddress: string;
    hostName?: string;
}

interface ParentalProfileModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: () => void;
    editingProfile: string | null;
    profileName: string;
    setProfileName: (name: string) => void;
    profileStartTime: string;
    setProfileStartTime: (time: string) => void;
    profileEndTime: string;
    setProfileEndTime: (time: string) => void;
    profileDays: number[];
    toggleProfileDay: (day: number) => void;
    profileDevices: string[];
    toggleProfileDevice: (mac: string) => void;
    profileEnabled: boolean;
    setProfileEnabled: (enabled: boolean) => void;
    isSavingProfile: boolean;
    connectedDevices: Device[];
    getDayName: (day: number) => string;
}

export function ParentalProfileModal({
    visible,
    onClose,
    onSave,
    editingProfile,
    profileName,
    setProfileName,
    profileStartTime,
    setProfileStartTime,
    profileEndTime,
    setProfileEndTime,
    profileDays,
    toggleProfileDay,
    profileDevices,
    toggleProfileDevice,
    profileEnabled,
    setProfileEnabled,
    isSavingProfile,
    connectedDevices,
    getDayName,
}: ParentalProfileModalProps) {
    const { colors, isDark, typography, glassmorphism } = useTheme();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();

    const [showStartTimePicker, setShowStartTimePicker] = useState(false);
    const [showEndTimePicker, setShowEndTimePicker] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [initialValues, setInitialValues] = useState<{
        name: string; startTime: string; endTime: string;
        days: number[]; devices: string[]; enabled: boolean;
    } | null>(null);

    useEffect(() => {
        if (visible) {
            const init = {
                name: profileName,
                startTime: profileStartTime,
                endTime: profileEndTime,
                days: [...profileDays],
                devices: [...profileDevices],
                enabled: profileEnabled,
            };
            setInitialValues(init);
            setHasChanges(false);
        }
    }, [visible]);

    useEffect(() => {
        if (!initialValues) return;
        const daysChanged = JSON.stringify([...profileDays].sort()) !== JSON.stringify([...initialValues.days].sort());
        const devicesChanged = JSON.stringify([...profileDevices].sort()) !== JSON.stringify([...initialValues.devices].sort());
        setHasChanges(
            profileName !== initialValues.name ||
            profileStartTime !== initialValues.startTime ||
            profileEndTime !== initialValues.endTime ||
            daysChanged || devicesChanged ||
            profileEnabled !== initialValues.enabled
        );
    }, [profileName, profileStartTime, profileEndTime, profileDays, profileDevices, profileEnabled, initialValues]);

    const handleClose = () => {
        if (hasChanges) {
            ThemedAlertHelper.alert(t('common.unsavedChanges'), t('common.discardChangesMessage'), [
                { text: t('common.cancel'), style: 'cancel' },
                { text: t('common.discard'), style: 'destructive', onPress: onClose },
            ]);
        } else {
            onClose();
        }
    };

    const cardBg = isDark ? glassmorphism.background.dark.card : glassmorphism.background.light.card;
    const innerBg = isDark ? glassmorphism.innerBackground.dark : glassmorphism.innerBackground.light;
    const cardBorder = isDark ? glassmorphism.border.dark : glassmorphism.border.light;
    const disabledOpacity = 0.4;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleClose}
        >
            <MeshGradientBackground style={styles.modalContainer}>
                <ModalHeader
                    title={editingProfile ? t('parentalControl.editProfile') : t('parentalControl.addProfile')}
                    onClose={handleClose}
                />

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <ScrollView
                        style={styles.modalContent}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Toggle Section */}
                        <View style={[styles.toggleCard, {
                            backgroundColor: cardBg,
                            borderColor: profileEnabled ? colors.primary + '40' : cardBorder,
                            borderWidth: 1,
                        }]}>
                            <View style={styles.toggleLeft}>
                                <View style={[styles.toggleIcon, {
                                    backgroundColor: profileEnabled ? colors.primary + '18' : innerBg,
                                }]}>
                                    <MaterialIcons
                                        name={profileEnabled ? 'check-circle' : 'cancel'}
                                        size={20}
                                        color={profileEnabled ? colors.primary : colors.textSecondary}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[typography.headline, { color: colors.text, fontSize: 15 }]}>
                                        {t('parentalControl.profileActive')}
                                    </Text>
                                    <Text style={[typography.caption1, { color: colors.textSecondary, marginTop: 2 }]}>
                                        {profileEnabled ? t('parentalControl.enabled') : t('parentalControl.disabled')}
                                    </Text>
                                </View>
                            </View>
                            <ThemedSwitch value={profileEnabled} onValueChange={setProfileEnabled} />
                        </View>

                        {/* Form Sections */}
                        <View style={{ opacity: profileEnabled ? 1 : disabledOpacity }} pointerEvents={profileEnabled ? 'auto' : 'none'}>

                            {/* Profile Name */}
                            <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                                <View style={styles.sectionHeader}>
                                    <View style={[styles.sectionIcon, { backgroundColor: colors.primary + '15' }]}>
                                        <MaterialIcons name="person" size={16} color={colors.primary} />
                                    </View>
                                    <Text style={[typography.headline, { color: colors.text, fontSize: 14 }]}>
                                        {t('parentalControl.profileName')}
                                    </Text>
                                </View>
                                <TextInput
                                    style={[styles.input, { backgroundColor: innerBg, borderColor: cardBorder, color: colors.text }]}
                                    value={profileName}
                                    onChangeText={setProfileName}
                                    placeholder={t('parentalControl.enterProfileName')}
                                    placeholderTextColor={colors.textSecondary}
                                />
                            </View>

                            {/* Time Range */}
                            <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                                <View style={styles.sectionHeader}>
                                    <View style={[styles.sectionIcon, { backgroundColor: colors.primary + '15' }]}>
                                        <MaterialIcons name="schedule" size={16} color={colors.primary} />
                                    </View>
                                    <Text style={[typography.headline, { color: colors.text, fontSize: 14 }]}>
                                        {t('parentalControl.timeRange')}
                                    </Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <TouchableOpacity
                                        style={[styles.timeButton, { backgroundColor: innerBg, borderColor: cardBorder }]}
                                        onPress={() => setShowStartTimePicker(true)}
                                    >
                                        <MaterialIcons name="schedule" size={18} color={colors.primary} />
                                        <Text style={[typography.headline, { color: colors.text, marginLeft: 8, fontSize: 15 }]}>{profileStartTime}</Text>
                                    </TouchableOpacity>
                                    <MaterialIcons name="arrow-forward" size={20} color={colors.textSecondary} style={{ marginHorizontal: 12 }} />
                                    <TouchableOpacity
                                        style={[styles.timeButton, { backgroundColor: innerBg, borderColor: cardBorder }]}
                                        onPress={() => setShowEndTimePicker(true)}
                                    >
                                        <MaterialIcons name="schedule" size={18} color={colors.primary} />
                                        <Text style={[typography.headline, { color: colors.text, marginLeft: 8, fontSize: 15 }]}>{profileEndTime}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Active Days */}
                            <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                                <View style={styles.sectionHeader}>
                                    <View style={[styles.sectionIcon, { backgroundColor: colors.primary + '15' }]}>
                                        <MaterialIcons name="date-range" size={16} color={colors.primary} />
                                    </View>
                                    <Text style={[typography.headline, { color: colors.text, fontSize: 14 }]}>{t('parentalControl.activeDays')}</Text>
                                </View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    {[1, 2, 3, 4, 5, 6, 0].map(day => {
                                        const isSelected = profileDays.includes(day);
                                        return (
                                            <TouchableOpacity key={day} onPress={() => toggleProfileDay(day)}
                                                style={[styles.dayButton, { backgroundColor: isSelected ? colors.primary : innerBg, borderColor: isSelected ? colors.primary : cardBorder }]}>
                                                <Text style={[typography.caption1, { color: isSelected ? '#fff' : colors.textSecondary, fontWeight: isSelected ? '600' : '400' }]}>
                                                    {getDayName(day).substring(0, 3)}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            {/* Select Devices */}
                            <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                                <View style={styles.sectionHeader}>
                                    <View style={[styles.sectionIcon, { backgroundColor: colors.primary + '15' }]}>
                                        <MaterialIcons name="devices" size={16} color={colors.primary} />
                                    </View>
                                    <Text style={[typography.headline, { color: colors.text, fontSize: 14 }]}>{t('parentalControl.selectDevices')}</Text>
                                </View>
                                {connectedDevices.length === 0 ? (
                                    <View style={[styles.deviceItem, { backgroundColor: innerBg, borderColor: cardBorder, justifyContent: 'center' }]}>
                                        <Text style={[typography.body, { color: colors.textSecondary }]}>{t('parentalControl.noConnectedDevices')}</Text>
                                    </View>
                                ) : (
                                    connectedDevices.map(device => {
                                        const isSelected = profileDevices.includes(device.macAddress);
                                        return (
                                            <TouchableOpacity key={device.macAddress} onPress={() => toggleProfileDevice(device.macAddress)}
                                                style={[styles.deviceItem, { backgroundColor: isSelected ? colors.primary + '15' : innerBg, borderColor: isSelected ? colors.primary : cardBorder }]}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[typography.body, { color: colors.text, fontWeight: '500' }]}>{device.hostName || 'Unknown Device'}</Text>
                                                    <Text style={[typography.caption1, { color: colors.textSecondary }]}>{formatMacAddress(device.macAddress)}</Text>
                                                </View>
                                                <MaterialIcons name={isSelected ? 'check-circle' : 'radio-button-unchecked'} size={24} color={isSelected ? colors.primary : colors.textSecondary} />
                                            </TouchableOpacity>
                                        );
                                    })
                                )}
                            </View>

                            <View style={{ height: 16 }} />
                        </View>
                    </ScrollView>

                    {/* Footer */}
                    <View style={[styles.footer, {
                        backgroundColor: isDark ? 'rgba(17,17,17,0.95)' : 'rgba(240,242,245,0.95)',
                        borderTopColor: cardBorder,
                        paddingBottom: insets.bottom > 0 ? insets.bottom + 16 : 24,
                    }]}>
                        {hasChanges ? (
                            <ModalButton title={t('parentalControl.saveProfile')} variant="primary" loading={isSavingProfile} onPress={() => { Keyboard.dismiss(); onSave(); }} />
                        ) : (
                            <ModalButton title={t('common.cancel')} variant="secondary" onPress={() => { Keyboard.dismiss(); setTimeout(() => onClose(), 150); }} />
                        )}
                    </View>
                </KeyboardAvoidingView>
            </MeshGradientBackground>

            {/* Time Picker Modals */}
            <SelectionModal visible={showStartTimePicker} title={t('parentalControl.startTime')} options={TIME_OPTIONS.map(time => ({ label: time, value: time }))} selectedValue={profileStartTime} onSelect={(val) => { setProfileStartTime(val); setShowStartTimePicker(false); }} onClose={() => setShowStartTimePicker(false)} />
            <SelectionModal visible={showEndTimePicker} title={t('parentalControl.endTime')} options={TIME_OPTIONS.map(time => ({ label: time, value: time }))} selectedValue={profileEndTime} onSelect={(val) => { setProfileEndTime(val); setShowEndTimePicker(false); }} onClose={() => setShowEndTimePicker(false)} />
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
    },
    modalContent: {
        flex: 1,
        padding: 16,
    },
    toggleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
    },
    toggleLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 12,
    },
    toggleIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        marginBottom: 12,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 14,
    },
    sectionIcon: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    input: {
        height: 48,
        borderRadius: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        fontSize: 16,
    },
    timeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
    },
    dayButton: {
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderRadius: 10,
        borderWidth: 1,
        minWidth: 42,
        alignItems: 'center',
        justifyContent: 'center',
    },
    deviceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 8,
    },
    footer: {
        padding: 16,
        paddingBottom: 40,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
});
