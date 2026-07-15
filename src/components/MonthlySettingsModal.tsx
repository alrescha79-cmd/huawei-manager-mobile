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
import { MeshGradientBackground } from './MeshGradientBackground';
import { ThemedSwitch } from './ThemedSwitch';
import { ThemedAlertHelper } from './ThemedAlert';
import { showInterstitial } from '@/services/ad.service';
import { AdNative } from './AdBanner';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ModalButton } from './ModalButton';
import { ModalHeader } from './ModalHeader';



interface MonthlySettingsModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (settings: {
        enabled: boolean;
        startDay: number;
        dataLimit: number;
        dataLimitUnit: 'MB' | 'GB';
        monthThreshold: number;
    }) => Promise<void>;
    initialSettings?: {
        enabled: boolean;
        startDay: number;
        dataLimit: number;
        dataLimitUnit: 'MB' | 'GB';
        monthThreshold: number;
    };
}

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export function MonthlySettingsModal({
    visible,
    onClose,
    onSave,
    initialSettings,
}: MonthlySettingsModalProps) {
    const { colors, isDark, typography, borderRadius, glassmorphism } = useTheme();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();

    const [enabled, setEnabled] = useState(false);
    const [startDay, setStartDay] = useState(1);
    const [dataLimit, setDataLimit] = useState('');
    const [dataLimitUnit, setDataLimitUnit] = useState<'MB' | 'GB'>('GB');
    const [monthThreshold, setMonthThreshold] = useState(90);
    const [isSaving, setIsSaving] = useState(false);
    const [showUnitDropdown, setShowUnitDropdown] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        if (visible && initialSettings) {
            setEnabled(initialSettings.enabled);
            setStartDay(initialSettings.startDay);
            setDataLimit(initialSettings.dataLimit > 0 ? initialSettings.dataLimit.toString() : '');
            setDataLimitUnit(initialSettings.dataLimitUnit);
            setMonthThreshold(initialSettings.monthThreshold);
            setHasChanges(false);
        }
    }, [visible, initialSettings]);

    useEffect(() => {
        if (initialSettings) {
            const changed =
                enabled !== initialSettings.enabled ||
                startDay !== initialSettings.startDay ||
                (parseInt(dataLimit) || 0) !== initialSettings.dataLimit ||
                dataLimitUnit !== initialSettings.dataLimitUnit ||
                monthThreshold !== initialSettings.monthThreshold;
            setHasChanges(changed);
        }
    }, [enabled, startDay, dataLimit, dataLimitUnit, monthThreshold, initialSettings]);

    const handleSave = async () => {
        Keyboard.dismiss();
        setIsSaving(true);
        try {
            await onSave({
                enabled,
                startDay,
                dataLimit: parseInt(dataLimit) || 0,
                dataLimitUnit,
                monthThreshold,
            });
            showInterstitial(() => {
                onClose();
            });
        } catch (error) {
            // Error handled by parent
        } finally {
            setIsSaving(false);
        }
    };

    const handleClose = () => {
        if (hasChanges) {
            ThemedAlertHelper.alert(
                t('common.unsavedChanges'),
                t('common.discardChangesMessage'),
                [
                    { text: t('common.cancel'), style: 'cancel' },
                    { text: t('common.discard'), style: 'destructive', onPress: onClose }
                ]
            );
        } else {
            onClose();
        }
    };

    const numericLimit = parseInt(dataLimit) || 0;
    const thresholdResult = Math.round((numericLimit * monthThreshold) / 100);

    const getThresholdDescription = () => {
        if (numericLimit > 0) {
            return t('home.thresholdDescWithLimit')
                .replace('{{percent}}', monthThreshold.toString())
                .replace('{{limit}}', numericLimit.toString())
                .replace(/\{\{unit\}\}/g, dataLimitUnit)
                .replace('{{result}}', thresholdResult.toString());
        }
        return t('home.thresholdDesc').replace('{{value}}', monthThreshold.toString());
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
                <ModalHeader title={t('home.monthlySettings') || 'Usage Limit'} onClose={handleClose} />

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
                            borderColor: enabled ? colors.primary + '40' : cardBorder,
                            borderWidth: 1,
                        }]}>
                            <View style={styles.toggleLeft}>
                                <View style={[styles.toggleIcon, {
                                    backgroundColor: enabled ? colors.primary + '18' : innerBg,
                                }]}>
                                    <MaterialIcons
                                        name={enabled ? 'notifications-active' : 'notifications-off'}
                                        size={20}
                                        color={enabled ? colors.primary : colors.textSecondary}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[typography.headline, { color: colors.text, fontSize: 15 }]}>
                                        {t('home.enableMonthlyLimit')}
                                    </Text>
                                    <Text style={[typography.caption1, { color: colors.textSecondary, marginTop: 2 }]}>
                                        {enabled ? t('common.enabled') || 'Active' : t('common.disabled')}
                                    </Text>
                                </View>
                            </View>
                            <ThemedSwitch value={enabled} onValueChange={setEnabled} />
                        </View>

                        {/* Form Sections */}
                        <View style={{ opacity: enabled ? 1 : disabledOpacity }} pointerEvents={enabled ? 'auto' : 'none'}>

                            {/* Cycle Start Date */}
                            <View style={[styles.sectionCard, {
                                backgroundColor: cardBg,
                                borderColor: cardBorder,
                            }]}>
                                <View style={styles.sectionHeader}>
                                    <View style={[styles.sectionIcon, { backgroundColor: colors.primary + '15' }]}>
                                        <MaterialIcons name="calendar-today" size={16} color={colors.primary} />
                                    </View>
                                    <Text style={[typography.headline, { color: colors.text, fontSize: 14 }]}>
                                        {t('home.startDate')}
                                    </Text>
                                </View>
                                <View style={[styles.dateCard, { backgroundColor: innerBg, borderColor: cardBorder }]}>
                                    <Text style={[typography.subheadline, { color: colors.text, textAlign: 'center', marginBottom: 12 }]}>
                                        {t('home.everyDate')}{' '}
                                        <Text style={[styles.startDay, { color: colors.primary, backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
                                            {startDay}
                                        </Text>
                                    </Text>
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={styles.dateScrollContainer}
                                    >
                                        {DAYS.map((day) => {
                                            const isSelected = startDay === day;
                                            return (
                                                <TouchableOpacity
                                                    key={day}
                                                    style={[
                                                        styles.dateScrollItem,
                                                        isSelected && {
                                                            backgroundColor: colors.primary,
                                                            width: 48,
                                                            height: 48,
                                                            borderRadius: 24,
                                                            transform: [{ scale: 1.05 }],
                                                        },
                                                        !isSelected && {
                                                            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                                        }
                                                    ]}
                                                    onPress={() => setStartDay(day)}
                                                    activeOpacity={0.7}
                                                >
                                                    <Text style={[
                                                        typography.subheadline,
                                                        {
                                                            color: isSelected ? '#FFF' : colors.textSecondary,
                                                            fontWeight: isSelected ? 'bold' : '500',
                                                            fontSize: isSelected ? 16 : 14,
                                                        }
                                                    ]}>
                                                        {day}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                </View>
                            </View>

                            <AdNative />

                            {/* Monthly Data Plan */}
                            <View style={[styles.sectionCard, {
                                backgroundColor: cardBg,
                                borderColor: cardBorder,
                            }]}>
                                <View style={styles.sectionHeader}>
                                    <View style={[styles.sectionIcon, { backgroundColor: colors.primary + '15' }]}>
                                        <MaterialIcons name="data-usage" size={16} color={colors.primary} />
                                    </View>
                                    <Text style={[typography.headline, { color: colors.text, fontSize: 14 }]}>
                                        {t('home.monthlyDataPlan')}
                                    </Text>
                                </View>
                                <View style={styles.inputRow}>
                                    <TextInput
                                        style={[styles.limitInput, {
                                            backgroundColor: innerBg,
                                            borderColor: cardBorder,
                                            color: colors.text,
                                        }]}
                                        value={dataLimit}
                                        onChangeText={setDataLimit}
                                        placeholder="0"
                                        placeholderTextColor={colors.textSecondary}
                                        keyboardType="numeric"
                                    />
                                    <TouchableOpacity
                                        style={[styles.unitButton, {
                                            backgroundColor: innerBg,
                                            borderColor: cardBorder,
                                        }]}
                                        onPress={() => setShowUnitDropdown(!showUnitDropdown)}
                                    >
                                        <Text style={[typography.headline, { color: colors.text, fontSize: 15 }]}>{dataLimitUnit}</Text>
                                        <MaterialIcons
                                            name={showUnitDropdown ? 'arrow-drop-up' : 'arrow-drop-down'}
                                            size={20}
                                            color={colors.textSecondary}
                                        />
                                    </TouchableOpacity>
                                </View>
                                {showUnitDropdown && (
                                    <View style={[styles.dropdownMenu, {
                                        backgroundColor: colors.card,
                                        borderColor: cardBorder,
                                    }]}>
                                        {(['MB', 'GB'] as const).map((unit) => (
                                            <TouchableOpacity
                                                key={unit}
                                                style={[
                                                    styles.dropdownItem,
                                                    dataLimitUnit === unit && { backgroundColor: colors.primary + '20' }
                                                ]}
                                                onPress={() => {
                                                    setDataLimitUnit(unit);
                                                    setShowUnitDropdown(false);
                                                }}
                                            >
                                                <Text style={[
                                                    typography.subheadline,
                                                    { color: dataLimitUnit === unit ? colors.primary : colors.text, fontWeight: dataLimitUnit === unit ? '600' : '400' }
                                                ]}>{unit}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>

                            {/* Threshold */}
                            <View style={[styles.sectionCard, {
                                backgroundColor: cardBg,
                                borderColor: cardBorder,
                            }]}>
                                <View style={styles.sectionHeader}>
                                    <View style={[styles.sectionIcon, { backgroundColor: colors.warning + '18' }]}>
                                        <MaterialIcons name="warning-amber" size={16} color={colors.warning} />
                                    </View>
                                    <Text style={[typography.headline, { color: colors.text, fontSize: 14 }]}>
                                        {t('home.threshold').replace(' (%)', '')}
                                    </Text>
                                </View>

                                <View style={styles.presetContainer}>
                                    {[50, 70, 80, 90, 95].map((preset) => {
                                        const isSelected = monthThreshold === preset;
                                        return (
                                            <TouchableOpacity
                                                key={preset}
                                                style={[
                                                    styles.presetButton,
                                                    isSelected && {
                                                        backgroundColor: colors.primary,
                                                        borderColor: colors.primary,
                                                    },
                                                    !isSelected && {
                                                        backgroundColor: innerBg,
                                                        borderColor: cardBorder,
                                                    }
                                                ]}
                                                onPress={() => setMonthThreshold(preset)}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={[
                                                    typography.subheadline,
                                                    {
                                                        color: isSelected ? '#FFF' : colors.textSecondary,
                                                        fontWeight: isSelected ? '700' : '500',
                                                    }
                                                ]}>
                                                    {preset}%
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>

                                <View style={[styles.customRow, {
                                    backgroundColor: innerBg,
                                    borderColor: cardBorder,
                                }]}>
                                    <Text style={[typography.subheadline, { color: colors.textSecondary }]}>
                                        {t('common.custom')}
                                    </Text>
                                    <View style={styles.customInputWrapper}>
                                        <TextInput
                                            style={[styles.customInput, { color: colors.text, borderColor: colors.primary }]}
                                            value={monthThreshold.toString()}
                                            onChangeText={(text) => {
                                                const num = parseInt(text) || 0;
                                                setMonthThreshold(Math.min(100, Math.max(0, num)));
                                            }}
                                            keyboardType="numeric"
                                            maxLength={3}
                                            selectTextOnFocus
                                        />
                                        <Text style={[typography.headline, { color: colors.textSecondary }]}>%</Text>
                                    </View>
                                </View>

                                {/* Dynamic Threshold Description */}
                                <View style={[styles.thresholdResult, {
                                    backgroundColor: numericLimit > 0 ? colors.primary + '10' : innerBg,
                                    borderColor: numericLimit > 0 ? colors.primary + '25' : cardBorder,
                                }]}>
                                    <MaterialIcons
                                        name={numericLimit > 0 ? 'check-circle' : 'info-outline'}
                                        size={14}
                                        color={numericLimit > 0 ? colors.primary : colors.textSecondary}
                                    />
                                    <Text style={[typography.caption1, {
                                        color: numericLimit > 0 ? colors.text : colors.textSecondary,
                                        flex: 1,
                                    }]}>
                                        {getThresholdDescription()}
                                    </Text>
                                </View>
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
                            <ModalButton
                                title={t('settings.applyConfiguration')}
                                variant="primary"
                                loading={isSaving}
                                onPress={() => {
                                    Keyboard.dismiss();
                                    handleSave();
                                }}
                            />
                        ) : (
                            <ModalButton
                                title={t('common.cancel')}
                                variant="secondary"
                                onPress={() => {
                                    Keyboard.dismiss();
                                    setTimeout(() => onClose(), 150);
                                }}
                            />
                        )}
                    </View>
                </KeyboardAvoidingView>
            </MeshGradientBackground>
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
    dateCard: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 14,
    },
    dateScrollContainer: {
        paddingVertical: 4,
        paddingHorizontal: 2,
        gap: 6,
    },
    dateScrollItem: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    startDay: {
        fontWeight: 'bold',
        fontSize: 16,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 2,
        borderRadius: 8,
        overflow: 'hidden',
    },
    inputRow: {
        flexDirection: 'row',
        gap: 10,
    },
    limitInput: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        fontSize: 16,
        fontWeight: '600',
    },
    unitButton: {
        height: 48,
        width: 88,
        borderRadius: 12,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    dropdownMenu: {
        marginTop: 6,
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
    },
    dropdownItem: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    presetContainer: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 12,
    },
    presetButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    customRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
    },
    customInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    customInput: {
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center',
        minWidth: 52,
        paddingVertical: 2,
        paddingHorizontal: 8,
        borderWidth: 2,
        borderRadius: 8,
    },
    thresholdResult: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 12,
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
    },
    footer: {
        padding: 16,
        paddingBottom: 40,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
});

export default MonthlySettingsModal;
