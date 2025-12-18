import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useTranslation } from '@/i18n';
import { PageSheetModal } from './PageSheetModal';
import { ThemedAlertHelper } from './ThemedAlert';
import { ModemService } from '@/services/modem.service';

// LTE Band definitions
const LTE_BANDS = [
    { bit: 0, name: 'B1', freq: '2100 MHz' },
    { bit: 2, name: 'B3', freq: '1800 MHz' },
    { bit: 4, name: 'B5', freq: '850 MHz' },
    { bit: 6, name: 'B7', freq: '2600 MHz' },
    { bit: 7, name: 'B8', freq: '900 MHz' },
    { bit: 19, name: 'B20', freq: '800 MHz' },
    { bit: 27, name: 'B28', freq: '700 MHz' },
    { bit: 37, name: 'B38', freq: '2600 MHz TDD' },
    { bit: 39, name: 'B40', freq: '2300 MHz TDD' },
    { bit: 40, name: 'B41', freq: '2500 MHz TDD' },
];

interface BandSelectionModalProps {
    visible: boolean;
    onClose: () => void;
    modemService: ModemService | null;
    onSaved?: () => void;
}

export function BandSelectionModal({
    visible,
    onClose,
    modemService,
    onSaved,
}: BandSelectionModalProps) {
    const { colors, typography, spacing } = useTheme();
    const { t } = useTranslation();

    const [selectedBandBits, setSelectedBandBits] = useState<number[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Load current band settings when modal opens
    useEffect(() => {
        if (visible && modemService) {
            loadBands();
        }
    }, [visible, modemService]);

    const loadBands = async () => {
        if (!modemService) return;
        try {
            const bands = await modemService.getBandSettings();
            if (bands && bands.lteBand) {
                const lteBandValue = parseInt(bands.lteBand, 16);
                const activeBits: number[] = [];
                for (const band of LTE_BANDS) {
                    if ((lteBandValue & (1 << band.bit)) !== 0) {
                        activeBits.push(band.bit);
                    }
                }
                setSelectedBandBits(activeBits);
            }
        } catch (error) {
            // Silent fail
        }
    };

    const toggleBand = (bit: number) => {
        setSelectedBandBits(prev =>
            prev.includes(bit) ? prev.filter(b => b !== bit) : [...prev, bit]
        );
    };

    const handleSave = async () => {
        if (!modemService || isSaving) return;
        setIsSaving(true);
        try {
            let lteBandValue = 0;
            for (const bit of selectedBandBits) {
                lteBandValue |= (1 << bit);
            }
            if (lteBandValue === 0) {
                lteBandValue = 0x7FFFFFFFFFFFFFFF;
            }
            const lteBandHex = lteBandValue.toString(16).toUpperCase();
            await modemService.setBandSettings('3FFFFFFF', lteBandHex);
            ThemedAlertHelper.alert(t('common.success'), t('settings.bandsSaved'));
            onClose();
            onSaved?.();
        } catch (error) {
            ThemedAlertHelper.alert(t('common.error'), t('common.error'));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <PageSheetModal
            visible={visible}
            onClose={onClose}
            title={t('settings.lteBands')}
            onSave={handleSave}
            isSaving={isSaving}
            saveText={t('common.save')}
            cancelText={t('common.cancel')}
        >
            <ScrollView style={styles.content}>
                <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: spacing.md, textAlign: 'center' }]}>
                    {t('settings.selectBands')}
                </Text>

                {/* Select All / Deselect All */}
                <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: spacing.md, gap: spacing.sm }}>
                    <TouchableOpacity
                        style={[styles.selectAllButton, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
                        onPress={() => setSelectedBandBits(LTE_BANDS.map(b => b.bit))}
                    >
                        <Text style={[typography.caption1, { color: colors.primary }]}>{t('settings.selectAll')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.selectAllButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => setSelectedBandBits([])}
                    >
                        <Text style={[typography.caption1, { color: colors.textSecondary }]}>{t('settings.deselectAll')}</Text>
                    </TouchableOpacity>
                </View>

                {/* Band List */}
                {LTE_BANDS.map((band) => (
                    <TouchableOpacity
                        key={band.bit}
                        style={[styles.bandItem, {
                            backgroundColor: selectedBandBits.includes(band.bit) ? colors.primary + '15' : colors.card,
                            borderColor: selectedBandBits.includes(band.bit) ? colors.primary : colors.border
                        }]}
                        onPress={() => toggleBand(band.bit)}
                    >
                        <View style={{ flex: 1 }}>
                            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                                {band.name}
                            </Text>
                            <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                                {band.freq}
                            </Text>
                        </View>
                        <MaterialIcons
                            name={selectedBandBits.includes(band.bit) ? 'check-circle' : 'radio-button-unchecked'}
                            size={24}
                            color={selectedBandBits.includes(band.bit) ? colors.primary : colors.textSecondary}
                        />
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </PageSheetModal>
    );
}

const styles = StyleSheet.create({
    content: {
        flex: 1,
        padding: 16,
    },
    selectAllButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
    },
    bandItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 8,
    },
});

// Helper function to get selected bands as display string
export function getSelectedBandsDisplay(lteBandHex: string): string[] {
    try {
        const lteBandValue = parseInt(lteBandHex, 16);
        const activeBands: string[] = [];
        for (const band of LTE_BANDS) {
            if ((lteBandValue & (1 << band.bit)) !== 0) {
                activeBands.push(band.name);
            }
        }
        return activeBands.length > 0 ? activeBands : ['All'];
    } catch {
        return ['All'];
    }
}
