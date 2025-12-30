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
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Keyboard,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
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
    const { colors } = useTheme();
    const { t } = useTranslation();

    const [enabled, setEnabled] = useState(false);
    const [startDay, setStartDay] = useState(1);
    const [dataLimit, setDataLimit] = useState('');
    const [dataLimitUnit, setDataLimitUnit] = useState<'MB' | 'GB'>('GB');
    const [monthThreshold, setMonthThreshold] = useState(90);
    const [isSaving, setIsSaving] = useState(false);
    const [showUnitDropdown, setShowUnitDropdown] = useState(false);

    // Load initial settings when modal opens
    useEffect(() => {
        if (visible && initialSettings) {
            setEnabled(initialSettings.enabled);
            setStartDay(initialSettings.startDay);
            setDataLimit(initialSettings.dataLimit > 0 ? initialSettings.dataLimit.toString() : '');
            setDataLimitUnit(initialSettings.dataLimitUnit);
            setMonthThreshold(initialSettings.monthThreshold);
        }
    }, [visible, initialSettings]);

    const handleSave = async () => {
        Keyboard.dismiss(); // Dismiss keyboard first to prevent double-click issue
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

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                {/* Header */}
                <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.title, { color: colors.text }]}>
                        {t('home.monthlySettings') || 'Usage Limit'}
                    </Text>
                    <TouchableOpacity onPress={onClose}>
                        <Ionicons name="close-circle" size={32} color={colors.primary} />
                    </TouchableOpacity>
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <ScrollView style={styles.modalContent} contentContainerStyle={{ paddingBottom: 100 }} keyboardShouldPersistTaps="handled">

                        {/* Enable Toggle Box */}
                        <View style={[styles.toggleBox, { borderColor: colors.primary }]}>
                            <Text style={[styles.label, { color: colors.text, fontSize: 16 }]}>
                                {t('home.enableMonthlyLimit')}
                            </Text>
                            <Switch
                                value={enabled}
                                onValueChange={setEnabled}
                                trackColor={{ false: '#333', true: colors.primary }}
                                thumbColor={'#FFF'}
                            />
                        </View>

                        {/* Cycle Start Date */}
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('home.startDate')}</Text>
                            <View style={[styles.dateCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
                                <Text style={[styles.dateHeaderStr, { color: colors.text }]}>
                                    {t('home.everyDate')} <Text style={{ color: colors.primary }}>{startDay}</Text>
                                </Text>
                                <View style={styles.daysGrid}>
                                    {DAYS.map((day) => (
                                        <TouchableOpacity
                                            key={day}
                                            style={[
                                                styles.dayItem,
                                                { borderColor: colors.border },
                                                startDay === day && { backgroundColor: colors.primary, borderColor: colors.primary }
                                            ]}
                                            onPress={() => setStartDay(day)}
                                        >
                                            <Text style={[styles.dayText, { color: startDay === day ? '#FFF' : colors.text }]}>
                                                {day}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </View>

                        {/* Monthly Data Plan Input */}
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

                        {/* Threshold Slider */}
                        <View style={styles.section}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('home.threshold').replace(' (%)', '')}</Text>
                                <View style={[styles.badge, { borderColor: colors.primary }]}>
                                    <Text style={{ color: colors.primary, fontWeight: 'bold' }}>{monthThreshold} %</Text>
                                </View>
                            </View>

                            {/* Custom Slider Bar */}
                            <View
                                style={[styles.sliderTrack, { backgroundColor: '#333' }]}
                                onLayout={(e) => setSliderWidth(e.nativeEvent.layout.width)}
                                onTouchEnd={(e) => {
                                    if (sliderWidth > 0) {
                                        const x = e.nativeEvent.locationX;
                                        const percent = Math.min(100, Math.max(0, Math.round((x / sliderWidth) * 100)));
                                        setMonthThreshold(percent);
                                    }
                                }}
                            >
                                <View style={[styles.sliderFill, { width: `${monthThreshold}%`, backgroundColor: colors.primary }]}>
                                    <View style={styles.sliderKnob} />
                                </View>
                            </View>

                            <Text style={[styles.description, { color: colors.textSecondary }]}>
                                {t('home.thresholdDesc').replace('{{value}}', monthThreshold.toString())}
                            </Text>
                        </View>

                    </ScrollView>
                </KeyboardAvoidingView>

                {/* Footer Button */}
                <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
                    <TouchableOpacity
                        style={[styles.applyButton, { backgroundColor: colors.primary }]}
                        onPress={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={styles.applyButtonText}>{t('settings.applyConfiguration')}</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        paddingTop: 20,
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
        borderWidth: 1,
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
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
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
});

export default MonthlySettingsModal;
