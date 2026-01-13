import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Modal,
    TextInput,
    SafeAreaView,
    Keyboard,
    StatusBar,
    Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useTranslation } from '@/i18n';
import { ThemedAlertHelper } from './ThemedAlert';
import { ModemService } from '@/services/modem.service';
import { ModalMeshGradient } from './ModalMeshGradient';

const LTE_BANDS = [
    { bit: 0, name: 'B1', freq: '2100 MHz', region: 'Global', type: 'FDD' },
    { bit: 1, name: 'B2', freq: '1900 MHz', region: 'Americas', type: 'FDD' },
    { bit: 2, name: 'B3', freq: '1800 MHz', region: 'Global', type: 'FDD' },
    { bit: 3, name: 'B4', freq: '1700/2100 MHz', region: 'Americas', type: 'FDD' },
    { bit: 4, name: 'B5', freq: '850 MHz', region: 'Americas/Asia', type: 'FDD' },
    { bit: 6, name: 'B7', freq: '2600 MHz', region: 'Global', type: 'FDD' },
    { bit: 7, name: 'B8', freq: '900 MHz', region: 'Europe/Asia', type: 'FDD' },
    { bit: 11, name: 'B12', freq: '700 MHz', region: 'Americas', type: 'FDD' },
    { bit: 12, name: 'B13', freq: '700 MHz', region: 'Americas', type: 'FDD' },
    { bit: 16, name: 'B17', freq: '700 MHz', region: 'Americas', type: 'FDD' },
    { bit: 17, name: 'B18', freq: '850 MHz', region: 'Japan', type: 'FDD' },
    { bit: 18, name: 'B19', freq: '850 MHz', region: 'Japan', type: 'FDD' },
    { bit: 19, name: 'B20', freq: '800 MHz', region: 'Europe', type: 'FDD' },
    { bit: 20, name: 'B21', freq: '1500 MHz', region: 'Japan', type: 'FDD' },
    { bit: 24, name: 'B25', freq: '1900 MHz', region: 'Americas', type: 'FDD' },
    { bit: 25, name: 'B26', freq: '850 MHz', region: 'Americas', type: 'FDD' },
    { bit: 27, name: 'B28', freq: '700 MHz', region: 'Asia Pacific', type: 'FDD' },
    { bit: 28, name: 'B29', freq: '700 MHz SDL', region: 'Americas', type: 'FDD' },
    { bit: 29, name: 'B30', freq: '2300 MHz', region: 'Americas', type: 'FDD' },
    { bit: 31, name: 'B32', freq: '1500 MHz SDL', region: 'Europe', type: 'FDD' },
    { bit: 65, name: 'B66', freq: '1700/2100 MHz', region: 'Americas', type: 'FDD' },
    { bit: 70, name: 'B71', freq: '600 MHz', region: 'Americas', type: 'FDD' },
    { bit: 33, name: 'B34', freq: '2010 MHz', region: 'China', type: 'TDD' },
    { bit: 37, name: 'B38', freq: '2600 MHz', region: 'Global', type: 'TDD' },
    { bit: 38, name: 'B39', freq: '1900 MHz', region: 'China', type: 'TDD' },
    { bit: 39, name: 'B40', freq: '2300 MHz', region: 'Global', type: 'TDD' },
    { bit: 40, name: 'B41', freq: '2500 MHz', region: 'Global', type: 'TDD' },
    { bit: 41, name: 'B42', freq: '3500 MHz', region: 'Global', type: 'TDD' },
    { bit: 42, name: 'B43', freq: '3700 MHz', region: 'Global', type: 'TDD' },
    { bit: 45, name: 'B46', freq: '5200 MHz', region: 'Global', type: 'LAA' },
    { bit: 47, name: 'B48', freq: '3600 MHz', region: 'Americas', type: 'CBRS' },
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
    const { colors, typography, glassmorphism, isDark } = useTheme();
    const { t } = useTranslation();

    const [selectedBandBits, setSelectedBandBits] = useState<number[]>([]);
    const [initialBandBits, setInitialBandBits] = useState<number[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<'ALL' | 'TDD' | 'FDD'>('ALL');

    const hasChanges = JSON.stringify([...selectedBandBits].sort()) !== JSON.stringify([...initialBandBits].sort());

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
                const lteBandValue = BigInt('0x' + bands.lteBand);
                const activeBits: number[] = [];
                for (const band of LTE_BANDS) {
                    if ((lteBandValue >> BigInt(band.bit)) & BigInt(1)) {
                        activeBits.push(band.bit);
                    }
                }
                setSelectedBandBits(activeBits);
                setInitialBandBits(activeBits);
            }
        } catch (error) {
            throw error;
        }
    };

    const toggleBand = (bit: number) => {
        setSelectedBandBits(prev =>
            prev.includes(bit) ? prev.filter(b => b !== bit) : [...prev, bit]
        );
    };

    const handleSave = async () => {
        Keyboard.dismiss();
        if (!modemService || isSaving) return;
        setIsSaving(true);
        try {
            let lteBandValue = BigInt(0);
            for (const bit of selectedBandBits) {
                lteBandValue |= (BigInt(1) << BigInt(bit));
            }
            if (lteBandValue === BigInt(0)) {
                lteBandValue = BigInt('0x7FFFFFFFFFFFFFFF');
            }
            const lteBandHex = lteBandValue.toString(16).toUpperCase();

            await modemService.setBandSettings('3FFFFFFF', lteBandHex);
            ThemedAlertHelper.alert(t('common.success'), t('settings.bandSettingsSaved'));
            onClose();
            onSaved?.();
        } catch (error: any) {
            const errorMessage = error?.message || t('alerts.failedSaveBands');
            ThemedAlertHelper.alert(t('common.error'), errorMessage);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSelectAll = () => {
        const visibleBits = filteredBands.map(b => b.bit);
        const allVisibleSelected = visibleBits.every(bit => selectedBandBits.includes(bit));

        if (allVisibleSelected) {
            setSelectedBandBits(prev => prev.filter(bit => !visibleBits.includes(bit)));
        } else {
            const newSelected = new Set([...selectedBandBits, ...visibleBits]);
            setSelectedBandBits(Array.from(newSelected));
        }
    };

    const filteredBands = LTE_BANDS.filter(band => {
        const matchesSearch =
            band.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            band.freq.toLowerCase().includes(searchQuery.toLowerCase()) ||
            band.region.toLowerCase().includes(searchQuery.toLowerCase());

        let matchesType = true;
        if (filterType === 'TDD') {
            matchesType = (band.type === 'TDD' || band.type === 'LAA' || band.type === 'CBRS');
        } else if (filterType === 'FDD') {
            matchesType = (band.type === 'FDD' || band.type === 'SDL');
        }

        return matchesSearch && matchesType;
    });

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleClose}
        >
            <BlurView
                intensity={isDark ? 80 : glassmorphism.blur.modal}
                tint={isDark ? 'dark' : 'light'}
                experimentalBlurMethod='dimezisBlurView'
                style={[
                    styles.container,
                    { backgroundColor: isDark ? 'rgba(20, 20, 22, 0.92)' : glassmorphism.background.light.modal }
                ]}
            >
                <ModalMeshGradient />
                {/* Header */}
                <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 16 : 16 }]}>
                    <View>
                        <Text style={[styles.title, { color: colors.text }]}>{t('settings.lteBandSelection') || 'Select Bands'}</Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('settings.selectedCount', { count: selectedBandBits.length })}</Text>
                    </View>
                    <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                        <Ionicons name="close-circle" size={32} color={colors.primary} />
                    </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <View style={[styles.searchBar, { backgroundColor: isDark ? glassmorphism.innerBackground.dark : glassmorphism.innerBackground.light, borderColor: colors.border }]}>
                        <Ionicons name="search" size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
                        <TextInput
                            style={[styles.searchInput, { color: colors.text }]}
                            placeholder={t('settings.searchPlaceholder')}
                            placeholderTextColor={colors.textSecondary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                </View>

                {/* Filter Chips */}
                <View style={styles.filterContainer}>
                    <TouchableOpacity
                        style={[styles.filterChip, { borderColor: colors.border, backgroundColor: colors.card }, filterType === 'ALL' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                        onPress={() => setFilterType('ALL')}
                    >
                        <Text style={[styles.filterText, { color: colors.textSecondary }, filterType === 'ALL' && { color: '#FFF' }]}>{t('settings.allBands')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterChip, { borderColor: colors.border, backgroundColor: colors.card }, filterType === 'TDD' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                        onPress={() => setFilterType('TDD')}
                    >
                        <Text style={[styles.filterText, { color: colors.textSecondary }, filterType === 'TDD' && { color: '#FFF' }]}>{t('settings.tddOnly')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterChip, { borderColor: colors.border, backgroundColor: colors.card }, filterType === 'FDD' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                        onPress={() => setFilterType('FDD')}
                    >
                        <Text style={[styles.filterText, { color: colors.textSecondary }, filterType === 'FDD' && { color: '#FFF' }]}>{t('settings.fddOnly')}</Text>
                    </TouchableOpacity>
                </View>

                {/* Count & Select All */}
                <View style={styles.listHeader}>
                    <Text style={[styles.countText, { color: colors.textSecondary }]}>{t('settings.bandsFound', { count: filteredBands.length })}</Text>
                    <TouchableOpacity onPress={handleSelectAll}>
                        <Text style={[styles.selectAllText, { color: colors.primary }]}>
                            {filteredBands.every(b => selectedBandBits.includes(b.bit)) && filteredBands.length > 0 ? t('settings.deselectAll') : t('settings.selectAll')}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Scrollable content area with margin to stop above footer */}
                <View style={{ flex: 1, marginBottom: 60, backgroundColor: 'transparent' }}>
                    <ScrollView
                        showsVerticalScrollIndicator={true}
                        contentContainerStyle={styles.listContent}
                    >
                        {filteredBands.map((band) => {
                            const isSelected = selectedBandBits.includes(band.bit);
                            return (
                                <TouchableOpacity
                                    key={band.bit}
                                    style={[
                                        styles.bandItem,
                                        { backgroundColor: isDark ? glassmorphism.innerBackground.dark : glassmorphism.innerBackground.light },
                                        isSelected && { borderColor: colors.primary, borderWidth: 1 }
                                    ]}
                                    onPress={() => toggleBand(band.bit)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.bandLeft}>
                                        <View style={[
                                            styles.bandTag,
                                            { backgroundColor: isDark ? colors.border : '#9CA3AF' },
                                            isSelected && { backgroundColor: colors.primary }
                                        ]}>
                                            <Text style={styles.bandTagName}>{band.name}</Text>
                                        </View>
                                        <View>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                <Text style={[styles.freqText, { color: colors.text }]}>{band.freq}</Text>
                                                <View style={[styles.typeTag, { borderColor: colors.textSecondary }]}>
                                                    <Text style={[styles.typeText, { color: colors.textSecondary }]}>{band.type}</Text>
                                                </View>
                                            </View>
                                            <Text style={[styles.regionText, { color: colors.textSecondary }]}>{band.region}</Text>
                                        </View>
                                    </View>

                                    <Ionicons
                                        name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                                        size={28}
                                        color={isSelected ? colors.primary : colors.textSecondary}
                                    />
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* Footer Button - Floating with transparent glassmorphism */}
                <BlurView
                    intensity={20}
                    tint={isDark ? 'dark' : 'light'}
                    experimentalBlurMethod='dimezisBlurView'
                    style={[styles.footer, {
                        backgroundColor: isDark ? 'rgba(10, 10, 10, 0.1)' : 'rgba(255, 255, 255, 0.1)',
                        borderTopColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
                    }]}
                >
                    <TouchableOpacity
                        style={[styles.applyButton, { backgroundColor: hasChanges ? colors.primary : colors.textSecondary }, isSaving && { opacity: 0.7 }]}
                        onPress={hasChanges ? handleSave : onClose}
                        disabled={isSaving}
                    >
                        <Text style={styles.applyButtonText}>
                            {isSaving ? t('common.saving') || 'Saving...' : hasChanges ? t('settings.applyConfiguration') : t('common.cancel')}
                        </Text>
                    </TouchableOpacity>
                </BlurView>
            </BlurView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFF',
    },
    subtitle: {
        fontSize: 14,
        color: '#888',
        marginTop: 2,
    },
    closeButton: {
        padding: 4,
    },
    searchContainer: {
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E1E1E',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
        borderWidth: 1,
        borderColor: '#333',
    },
    searchInput: {
        flex: 1,
        color: '#FFF',
        fontSize: 15,
    },
    filterContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 12,
        marginBottom: 20,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#333',
        backgroundColor: '#1E1E1E',
    },
    filterText: {
        color: '#AAA',
        fontWeight: '600',
        fontSize: 13,
    },
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    countText: {
        color: '#666',
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    selectAllText: {
        color: '#007AFF',
        fontSize: 14,
        fontWeight: '600',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    bandItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#1C1C1E',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    bandLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    bandTag: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#333',
        alignItems: 'center',
        justifyContent: 'center',
    },
    bandTagName: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
    freqText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    typeTag: {
        borderWidth: 1,
        borderColor: '#666',
        borderRadius: 4,
        paddingHorizontal: 4,
        paddingVertical: 1,
    },
    typeText: {
        color: '#AAA',
        fontSize: 10,
        fontWeight: 'bold',
    },
    regionText: {
        color: '#888',
        fontSize: 13,
        marginTop: 2,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        paddingBottom: 40,
        backgroundColor: '#121212',
        borderTopWidth: 1,
        borderTopColor: '#222',
    },
    applyButton: {
        backgroundColor: '#007AFF',
        borderRadius: 14,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
    },
    applyButtonText: {
        color: '#FFF',
        fontSize: 17,
        fontWeight: 'bold',
    },
});

export function getSelectedBandsDisplay(lteBandHex: string): string[] {
    try {
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
