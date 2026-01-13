import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    ScrollView,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Keyboard,
    StatusBar,
    Pressable,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useTranslation } from '@/i18n';
import { MeshGradientBackground } from './MeshGradientBackground';
import { ThemedSwitch } from './ThemedSwitch';
import { ThemedAlertHelper } from './ThemedAlert';

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
    const { colors, isDark } = useTheme();
    const { t } = useTranslation();

    const [enabled, setEnabled] = useState(false);
    const [startDay, setStartDay] = useState(1);
    const [dataLimit, setDataLimit] = useState('');
    const [dataLimitUnit, setDataLimitUnit] = useState<'MB' | 'GB'>('GB');
    const [monthThreshold, setMonthThreshold] = useState(90);
    const [isSaving, setIsSaving] = useState(false);
    const [showUnitDropdown, setShowUnitDropdown] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [keyboardVisible, setKeyboardVisible] = useState(false);

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
            setKeyboardVisible(true);
        });
        const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
            setTimeout(() => setKeyboardVisible(false), 100);
        });

        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, []);

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
            onClose();
        } catch (error) {
            // Error handled by parent
        } finally {
            setIsSaving(false);
        }
    };

    const [sliderWidth, setSliderWidth] = useState(0);

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

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleClose}
        >
            <MeshGradientBackground style={styles.modalContainer}>
                {/* Header */}
                <View style={[styles.modalHeader, { borderBottomColor: colors.border, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 16 : 16 }]}>
                    <Text style={[styles.title, { color: colors.text }]}>
                        {t('home.monthlySettings') || 'Usage Limit'}
                    </Text>
                    <TouchableOpacity onPress={handleClose}>
                        <Ionicons name="close-circle" size={32} color={colors.primary} />
                    </TouchableOpacity>
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                >
                    <ScrollView style={styles.modalContent} contentContainerStyle={{ paddingBottom: 20 }} keyboardShouldPersistTaps="handled">

                        <View style={[styles.toggleBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                            <Text style={[styles.label, { color: colors.text, fontSize: 16 }]}>
                                {t('home.enableMonthlyLimit')}
                            </Text>
                            <ThemedSwitch
                                value={enabled}
                                onValueChange={setEnabled}
                            />
                        </View>

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('home.startDate')}</Text>
                            <View style={[styles.dateCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
                                <Text style={[styles.dateHeaderStr, { color: colors.text }]}>
                                    {t('home.everyDate')} <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 18 }}>{startDay}</Text>
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
                                                    isSelected && styles.dateScrollItemSelected,
                                                    isSelected && { backgroundColor: colors.primary },
                                                    !isSelected && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
                                                ]}
                                                onPress={() => setStartDay(day)}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={[
                                                    styles.dateScrollText,
                                                    isSelected && styles.dateScrollTextSelected,
                                                    { color: isSelected ? '#FFF' : colors.textSecondary }
                                                ]}>
                                                    {day}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </View>
                        </View>

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('home.monthlyDataPlan')}</Text>
                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text, flex: 1 }]}
                                    value={dataLimit}
                                    onChangeText={setDataLimit}
                                    placeholder="0"
                                    placeholderTextColor={colors.textSecondary}
                                    keyboardType="numeric"
                                />
                                <TouchableOpacity
                                    style={[styles.unitDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}
                                    onPress={() => setShowUnitDropdown(!showUnitDropdown)}
                                >
                                    <Text style={[styles.unitText, { color: colors.text }]}>{dataLimitUnit}</Text>
                                    <MaterialIcons name="arrow-drop-down" size={24} color={colors.text} />
                                </TouchableOpacity>
                            </View>
                            {showUnitDropdown && (
                                <View style={[styles.dropdownMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                    {(['MB', 'GB'] as const).map((unit) => (
                                        <TouchableOpacity
                                            key={unit}
                                            style={[styles.dropdownItem, dataLimitUnit === unit && { backgroundColor: colors.primary + '30' }]}
                                            onPress={() => {
                                                setDataLimitUnit(unit);
                                                setShowUnitDropdown(false);
                                            }}
                                        >
                                            <Text style={{ color: colors.text }}>{unit}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('home.threshold').replace(' (%)', '')}</Text>

                            <View style={styles.presetContainer}>
                                {[50, 70, 80, 90, 95].map((preset) => {
                                    const isSelected = monthThreshold === preset;
                                    return (
                                        <TouchableOpacity
                                            key={preset}
                                            style={[
                                                styles.presetButton,
                                                isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                                                !isSelected && { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', borderColor: colors.border }
                                            ]}
                                            onPress={() => setMonthThreshold(preset)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[
                                                styles.presetText,
                                                { color: isSelected ? '#FFF' : colors.textSecondary }
                                            ]}>
                                                {preset}%
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <View style={[styles.customInputRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: colors.border }]}>
                                <Text style={[styles.customLabel, { color: colors.textSecondary }]}>
                                    {t('common.custom') || 'Custom'}
                                </Text>
                                <View style={styles.customInputWrapper}>
                                    <TextInput
                                        style={[styles.customTextInput, { color: colors.text, borderColor: colors.primary }]}
                                        value={monthThreshold.toString()}
                                        onChangeText={(text) => {
                                            const num = parseInt(text) || 0;
                                            setMonthThreshold(Math.min(100, Math.max(0, num)));
                                        }}
                                        keyboardType="numeric"
                                        maxLength={3}
                                        selectTextOnFocus
                                    />
                                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>%</Text>
                                </View>
                            </View>

                            <Text style={[styles.description, { color: colors.textSecondary }]}>
                                {t('home.thresholdDesc').replace('{{value}}', monthThreshold.toString())}
                            </Text>
                        </View>

                    </ScrollView>

                    <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
                        {hasChanges ? (
                            <TouchableOpacity
                                style={[
                                    styles.applyButton,
                                    { backgroundColor: colors.primary }
                                ]}
                                onPress={() => {
                                    Keyboard.dismiss();
                                    handleSave();
                                }}
                                disabled={isSaving}
                                activeOpacity={0.8}
                            >
                                {isSaving ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <Text style={styles.applyButtonText}>
                                        {t('settings.applyConfiguration')}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                style={[
                                    styles.applyButton,
                                    { backgroundColor: colors.textSecondary }
                                ]}
                                onPress={() => {
                                    Keyboard.dismiss();
                                    setTimeout(() => onClose(), 150);
                                }}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.applyButtonText}>
                                    {t('common.cancel')}
                                </Text>
                            </TouchableOpacity>
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
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    modalContent: {
        flex: 1,
        padding: 20,
    },
    toggleBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
    },
    label: {
        fontWeight: '600',
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    dateCard: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
    },
    dateHeaderStr: {
        textAlign: 'center',
        fontSize: 14,
        marginBottom: 12,
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        justifyContent: 'center',
    },
    dayItem: {
        width: 36,
        height: 36,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayText: {
        fontSize: 14,
        fontWeight: '500',
    },
    dateScrollContainer: {
        paddingVertical: 8,
        paddingHorizontal: 4,
        gap: 8,
    },
    dateScrollItem: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dateScrollItemSelected: {
        width: 52,
        height: 52,
        borderRadius: 26,
        transform: [{ scale: 1.1 }],
    },
    dateScrollText: {
        fontSize: 14,
        fontWeight: '500',
    },
    dateScrollTextSelected: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    input: {
        height: 50,
        borderRadius: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        fontSize: 16,
    },
    unitDropdown: {
        height: 50,
        width: 100,
        borderRadius: 12,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    unitText: {
        fontSize: 16,
        fontWeight: 'bold',
        marginRight: 4,
    },
    dropdownMenu: {
        marginTop: 8,
        borderRadius: 12,
        borderWidth: 1,
        alignSelf: 'flex-end',
        width: 100,
        position: 'absolute',
        top: 60,
        right: 0,
        zIndex: 100,
    },
    dropdownItem: {
        padding: 12,
        alignItems: 'center',
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
    },
    thresholdInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        gap: 4,
    },
    thresholdInput: {
        fontSize: 18,
        fontWeight: 'bold',
        minWidth: 40,
        textAlign: 'right',
        padding: 0,
    },
    sliderTrack: {
        height: 32,
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 8,
    },
    sliderFill: {
        height: '100%',
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    sliderKnob: {
        width: 4,
        height: 20,
        backgroundColor: '#FFF',
        borderRadius: 2,
        marginRight: 6,
    },
    description: {
        fontSize: 12,
        marginTop: 8,
    },
    footer: {
        padding: 20,
        paddingBottom: 40,
        borderTopWidth: 1,
    },
    applyButton: {
        height: 50,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    applyButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    presetContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
        marginBottom: 16,
    },
    presetButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    presetText: {
        fontSize: 15,
        fontWeight: '600',
    },
    customInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    customLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    customInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    customTextInput: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        minWidth: 60,
        paddingVertical: 4,
        paddingHorizontal: 12,
        borderWidth: 2,
        borderRadius: 8,
    },
});

export default MonthlySettingsModal;
