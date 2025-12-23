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

// LTE Band definitions - Comprehensive FDD and TDD bands
const LTE_BANDS = [
    // === FDD Bands ===
    { bit: 0, name: 'B1', freq: '2100 MHz', region: 'Global' },
    { bit: 1, name: 'B2', freq: '1900 MHz', region: 'Americas' },
    { bit: 2, name: 'B3', freq: '1800 MHz', region: 'Global' },
    { bit: 3, name: 'B4', freq: '1700/2100 MHz', region: 'Americas' },
    { bit: 4, name: 'B5', freq: '850 MHz', region: 'Americas/Asia' },
    { bit: 6, name: 'B7', freq: '2600 MHz', region: 'Global' },
    { bit: 7, name: 'B8', freq: '900 MHz', region: 'Europe/Asia' },
    { bit: 11, name: 'B12', freq: '700 MHz', region: 'Americas' },
    { bit: 12, name: 'B13', freq: '700 MHz', region: 'Americas' },
    { bit: 16, name: 'B17', freq: '700 MHz', region: 'Americas' },
    { bit: 17, name: 'B18', freq: '850 MHz', region: 'Japan' },
    { bit: 18, name: 'B19', freq: '850 MHz', region: 'Japan' },
    { bit: 19, name: 'B20', freq: '800 MHz', region: 'Europe' },
    { bit: 20, name: 'B21', freq: '1500 MHz', region: 'Japan' },
    { bit: 24, name: 'B25', freq: '1900 MHz', region: 'Americas' },
    { bit: 25, name: 'B26', freq: '850 MHz', region: 'Americas' },
    { bit: 27, name: 'B28', freq: '700 MHz', region: 'Asia Pacific' },
    { bit: 28, name: 'B29', freq: '700 MHz SDL', region: 'Americas' },
    { bit: 29, name: 'B30', freq: '2300 MHz', region: 'Americas' },
    { bit: 31, name: 'B32', freq: '1500 MHz SDL', region: 'Europe' },
    { bit: 65, name: 'B66', freq: '1700/2100 MHz', region: 'Americas' },
    { bit: 70, name: 'B71', freq: '600 MHz', region: 'Americas' },
    // === TDD Bands ===
    { bit: 33, name: 'B34', freq: '2010 MHz TDD', region: 'China' },
    { bit: 37, name: 'B38', freq: '2600 MHz TDD', region: 'Global' },
    { bit: 38, name: 'B39', freq: '1900 MHz TDD', region: 'China' },
    { bit: 39, name: 'B40', freq: '2300 MHz TDD', region: 'Global' },
    { bit: 40, name: 'B41', freq: '2500 MHz TDD', region: 'Global' },
    { bit: 41, name: 'B42', freq: '3500 MHz TDD', region: 'Global' },
    { bit: 42, name: 'B43', freq: '3700 MHz TDD', region: 'Global' },
    { bit: 45, name: 'B46', freq: '5200 MHz LAA', region: 'Global' },
    { bit: 47, name: 'B48', freq: '3600 MHz CBRS', region: 'Americas' },
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
                // Use BigInt for handling large bit positions
                const lteBandValue = BigInt('0x' + bands.lteBand);
                const activeBits: number[] = [];
                for (const band of LTE_BANDS) {
                    if ((lteBandValue >> BigInt(band.bit)) & BigInt(1)) {
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
            // Use BigInt for handling large bit positions
            let lteBandValue = BigInt(0);
            for (const bit of selectedBandBits) {
                lteBandValue |= (BigInt(1) << BigInt(bit));
            }
            if (lteBandValue === BigInt(0)) {
                lteBandValue = BigInt('0x7FFFFFFFFFFFFFFF');
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
                                {band.freq} • {band.region}
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
        // Use BigInt for handling large bit positions (like bit 65 for B66)
        const lteBandValue = BigInt('0x' + lteBandHex);
        const activeBands: string[] = [];
        for (const band of LTE_BANDS) {
            if ((lteBandValue >> BigInt(band.bit)) & BigInt(1)) {
                activeBands.push(band.name);
            }
        }
        return activeBands.length > 0 ? activeBands : ['All'];
    } catch {
        return ['All'];
    }
}
