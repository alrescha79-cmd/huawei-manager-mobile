import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Switch,
    TextInput,
    ScrollView,
    Platform,
    StatusBar,
    ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useTranslation } from '@/i18n';

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

// Generate days 1-31
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export function MonthlySettingsModal({
    visible,
    onClose,
    onSave,
    initialSettings,
}: MonthlySettingsModalProps) {
    const { colors, typography, spacing } = useTheme();
    const { t } = useTranslation();

    const [enabled, setEnabled] = useState(false);
    const [startDay, setStartDay] = useState(1);
    const [dataLimit, setDataLimit] = useState('');
    const [dataLimitUnit, setDataLimitUnit] = useState<'MB' | 'GB'>('GB');
    const [monthThreshold, setMonthThreshold] = useState('90');
    const [isSaving, setIsSaving] = useState(false);
    const [showDayDropdown, setShowDayDropdown] = useState(false);
    const [showUnitDropdown, setShowUnitDropdown] = useState(false);

    // Load initial settings when modal opens
    useEffect(() => {
        if (visible && initialSettings) {
            setEnabled(initialSettings.enabled);
            setStartDay(initialSettings.startDay);
            setDataLimit(initialSettings.dataLimit > 0 ? initialSettings.dataLimit.toString() : '');
            setDataLimitUnit(initialSettings.dataLimitUnit);
            setMonthThreshold(initialSettings.monthThreshold.toString());
        }
    }, [visible, initialSettings]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave({
                enabled,
                startDay,
                dataLimit: parseInt(dataLimit) || 0,
                dataLimitUnit,
                monthThreshold: parseInt(monthThreshold) || 90,
            });
            onClose();
        } catch (error) {
            // Error handled by parent
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                {/* Header */}
                <View style={[styles.modalHeader, {
                    borderBottomColor: colors.border,
                    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 16 : 16
                }]}>
                    <TouchableOpacity onPress={onClose}>
                        <Text style={[typography.body, { color: colors.primary }]}>{t('common.cancel')}</Text>
                    </TouchableOpacity>
                    <Text style={[typography.headline, { color: colors.text, flex: 1, textAlign: 'center' }]} numberOfLines={1}>
                        {t('home.monthlySettings')}
                    </Text>
                    <TouchableOpacity onPress={handleSave} disabled={isSaving}>
                        {isSaving ? (
                            <ActivityIndicator color={colors.primary} size="small" />
                        ) : (
                            <Text style={[typography.body, { color: colors.primary, fontWeight: '600' }]}>{t('common.save')}</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalContent}>
                    {/* Enable Toggle */}
                    <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={[typography.body, { color: colors.text }]}>{t('home.enableMonthlyLimit')}</Text>
                        </View>
                        <Switch
                            value={enabled}
                            onValueChange={setEnabled}
                            trackColor={{ false: colors.border, true: colors.primary + '80' }}
                            thumbColor={enabled ? colors.primary : colors.textSecondary}
                        />
                    </View>

                    {/* Start Date Dropdown */}
                    <View style={styles.formGroup}>
                        <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                            {t('home.startDate')}
                        </Text>
                        <TouchableOpacity
                            style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}
                            onPress={() => { setShowDayDropdown(!showDayDropdown); setShowUnitDropdown(false); }}
                        >
                            <Text style={[typography.body, { color: colors.text }]}>{startDay}</Text>
                            <MaterialIcons name="arrow-drop-down" size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                        {showDayDropdown && (
                            <View style={[styles.dropdownMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                                    {DAYS.map((day) => (
                                        <TouchableOpacity
                                            key={day}
                                            style={[styles.dropdownItem, startDay === day && { backgroundColor: colors.primary + '20' }]}
                                            onPress={() => {
                                                setStartDay(day);
                                                setShowDayDropdown(false);
                                            }}
                                        >
                                            <Text style={[typography.body, { color: startDay === day ? colors.primary : colors.text }]}>
                                                {day}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}
                    </View>

                    {/* Monthly Data Plan Input */}
                    <View style={styles.formGroup}>
                        <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                            {t('home.monthlyDataPlan')}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
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
                                onPress={() => { setShowUnitDropdown(!showUnitDropdown); setShowDayDropdown(false); }}
                            >
                                <Text style={[typography.body, { color: colors.text }]}>{dataLimitUnit}</Text>
                                <MaterialIcons name="arrow-drop-down" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        {showUnitDropdown && (
                            <View style={[styles.dropdownMenu, { backgroundColor: colors.card, borderColor: colors.border, position: 'relative', marginTop: spacing.xs }]}>
                                {(['MB', 'GB'] as const).map((unit) => (
                                    <TouchableOpacity
                                        key={unit}
                                        style={[styles.dropdownItem, dataLimitUnit === unit && { backgroundColor: colors.primary + '20' }]}
                                        onPress={() => {
                                            setDataLimitUnit(unit);
                                            setShowUnitDropdown(false);
                                        }}
                                    >
                                        <Text style={[typography.body, { color: dataLimitUnit === unit ? colors.primary : colors.text }]}>
                                            {unit}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Threshold Input */}
                    <View style={styles.formGroup}>
                        <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                            {t('home.threshold')}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text, flex: 1 }]}
                                value={monthThreshold}
                                onChangeText={setMonthThreshold}
                                placeholder="90"
                                placeholderTextColor={colors.textSecondary}
                                keyboardType="numeric"
                                maxLength={3}
                            />
                            <Text style={[typography.body, { color: colors.text, marginLeft: spacing.sm }]}>%</Text>
                        </View>
                    </View>
                </ScrollView>
            </View>
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
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    modalContent: {
        flex: 1,
        padding: 16,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderBottomWidth: 1,
        marginBottom: 16,
    },
    formGroup: {
        marginBottom: 20,
    },
    dropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 10,
        borderWidth: 1,
    },
    unitDropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 10,
        borderWidth: 1,
        minWidth: 90,
    },
    dropdownMenu: {
        borderRadius: 10,
        borderWidth: 1,
        marginTop: 4,
        overflow: 'hidden',
    },
    dropdownItem: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    input: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 10,
        borderWidth: 1,
        fontSize: 16,
    },
});

export default MonthlySettingsModal;
