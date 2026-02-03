import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Platform,
    Vibration,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useTranslation } from '@/i18n';
import { useAuthStore } from '@/stores/auth.store';
import { Card, PageSheetModal, SelectionModal, ThemedAlertHelper, BouncingDots } from '@/components';
import { SignalInfo } from '@/types';
import { ModemService } from '@/services/modem.service';

interface SignalPointingModalProps {
    visible: boolean;
    onClose: () => void;
}

interface SignalQuality {
    level: 'excellent' | 'good' | 'fair' | 'poor' | 'none';
    color: string;
    percentage: number;
}

const ANTENNA_MODES = [
    { value: 'auto', labelKey: 'settings.antennaAuto' },
    { value: 'internal', labelKey: 'settings.antennaInternal' },
    { value: 'external', labelKey: 'settings.antennaExternal' },
];

const MAX_GRAPH_POINTS = 30;

// Band to frequency mapping
const LTE_BAND_FREQ: Record<string, string> = {
    '1': '2100 MHz', '2': '1900 MHz', '3': '1800 MHz', '4': '1700 MHz',
    '5': '850 MHz', '7': '2600 MHz', '8': '900 MHz', '12': '700 MHz',
    '13': '700 MHz', '17': '700 MHz', '18': '850 MHz', '19': '850 MHz',
    '20': '800 MHz', '21': '1500 MHz', '25': '1900 MHz', '26': '850 MHz',
    '28': '700 MHz', '29': '700 MHz', '30': '2300 MHz', '32': '1500 MHz',
    '34': '2010 MHz', '38': '2600 MHz', '39': '1900 MHz', '40': '2300 MHz',
    '41': '2500 MHz', '42': '3500 MHz', '43': '3700 MHz', '46': '5200 MHz',
    '48': '3600 MHz', '66': '1700 MHz', '71': '600 MHz',
};

function formatBandWithFreq(band: string | undefined): string {
    if (!band || band === '-' || band === '') return '-';
    // Handle format like "B40" or "LTE BAND 40" or just "40"
    const bandMatch = band.match(/(\d+)/);
    if (bandMatch) {
        const bandNum = bandMatch[1];
        const freq = LTE_BAND_FREQ[bandNum];
        if (freq) {
            return `B${bandNum} (${freq})`;
        }
        return `B${bandNum}`;
    }
    return band;
}

function getRsrpQuality(rsrp: number, colors: { success: string; warning: string; error: string; textSecondary: string }): SignalQuality {
    if (rsrp >= -80) {
        return { level: 'excellent', color: colors.success, percentage: 100 };
    } else if (rsrp >= -90) {
        return { level: 'good', color: colors.success, percentage: 75 };
    } else if (rsrp >= -100) {
        return { level: 'fair', color: colors.warning, percentage: 50 };
    } else if (rsrp >= -110) {
        return { level: 'poor', color: colors.error, percentage: 25 };
    } else {
        return { level: 'none', color: colors.textSecondary, percentage: 10 };
    }
}

function getSinrQuality(sinr: number, colors: { success: string; warning: string; error: string; textSecondary: string }): SignalQuality {
    if (sinr >= 20) {
        return { level: 'excellent', color: colors.success, percentage: 100 };
    } else if (sinr >= 13) {
        return { level: 'good', color: colors.success, percentage: 75 };
    } else if (sinr >= 0) {
        return { level: 'fair', color: colors.warning, percentage: 50 };
    } else if (sinr >= -5) {
        return { level: 'poor', color: colors.error, percentage: 25 };
    } else {
        return { level: 'none', color: colors.textSecondary, percentage: 10 };
    }
}

function formatSignalValue(value: string | undefined, unit: string): string {
    if (!value || value === '-' || value === '') return '-';
    const num = parseInt(value);
    if (isNaN(num)) return value;
    return `${num} ${unit}`;
}

// Mini Signal Graph Component - Area chart style
function MiniSignalGraph({ history, colors, isDark, metric }: { history: number[]; colors: any; isDark: boolean; metric: 'rsrp' | 'sinr' }) {
    if (history.length < 2) return null;

    const graphHeight = 50;
    const graphWidth = 100; // percentage
    const minVal = metric === 'rsrp' ? -120 : -10;
    const maxVal = metric === 'rsrp' ? -60 : 30;

    const normalizeValue = (val: number) => {
        const clamped = Math.max(minVal, Math.min(maxVal, val));
        return ((clamped - minVal) / (maxVal - minVal)) * graphHeight;
    };

    const points = history.map((val, i) => ({
        x: (i / (history.length - 1)) * graphWidth,
        y: graphHeight - normalizeValue(val),
    }));

    const latestValue = history[history.length - 1];
    const quality = metric === 'rsrp' ? getRsrpQuality(latestValue, colors) : getSinrQuality(latestValue, colors);

    // Create gradient bars for smoother look
    const barWidth = graphWidth / (history.length - 1);

    return (
        <View style={[miniGraphStyles.container, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
            <View style={[miniGraphStyles.graphArea, { height: graphHeight }]}>
                {/* Grid lines */}
                <View style={[miniGraphStyles.gridLine, { top: 0 }]} />
                <View style={[miniGraphStyles.gridLine, { top: graphHeight / 2 }]} />
                <View style={[miniGraphStyles.gridLine, { top: graphHeight }]} />

                {/* Area fill using vertical bars */}
                {points.map((point, i) => (
                    <View
                        key={`bar-${i}`}
                        style={{
                            position: 'absolute',
                            left: `${point.x - barWidth / 2}%`,
                            bottom: 0,
                            width: `${barWidth + 0.5}%`,
                            height: graphHeight - point.y,
                            backgroundColor: `${quality.color}20`,
                        }}
                    />
                ))}

                {/* Line on top - smooth connection using dots */}
                {points.map((point, i) => (
                    <View
                        key={`dot-${i}`}
                        style={{
                            position: 'absolute',
                            left: `${point.x}%`,
                            top: point.y - 1.5,
                            width: 3,
                            height: 3,
                            borderRadius: 1.5,
                            marginLeft: -1.5,
                            backgroundColor: quality.color,
                        }}
                    />
                ))}

                {/* Current point indicator (larger) */}
                {points.length > 0 && (
                    <View
                        style={[
                            miniGraphStyles.currentPoint,
                            {
                                left: `${points[points.length - 1].x}%`,
                                top: points[points.length - 1].y - 5,
                                backgroundColor: quality.color,
                            }
                        ]}
                    />
                )}
            </View>

            {/* Labels */}
            <View style={miniGraphStyles.labels}>
                <Text style={[miniGraphStyles.labelText, { color: colors.textSecondary }]}>{metric === 'rsrp' ? '-60' : '30'}</Text>
                <Text style={[miniGraphStyles.labelText, { color: colors.textSecondary }]}>{metric === 'rsrp' ? '-120' : '-10'}</Text>
            </View>
        </View>
    );
}

export function SignalPointingModal({ visible, onClose }: SignalPointingModalProps) {
    const { colors, typography, spacing, isDark } = useTheme();
    const { t } = useTranslation();
    const { credentials } = useAuthStore();

    const [modemService, setModemService] = useState<ModemService | null>(null);
    const [signalInfo, setSignalInfo] = useState<SignalInfo | null>(null);
    const [bestRsrp, setBestRsrp] = useState<number | null>(null);
    const [bestPci, setBestPci] = useState<string | null>(null);
    const [soundEnabled, setSoundEnabled] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchTime, setFetchTime] = useState<number | null>(null);
    const [signalHistory, setSignalHistory] = useState<number[]>([]);

    // Signal metric toggle (rsrp or sinr)
    const [signalMetric, setSignalMetric] = useState<'rsrp' | 'sinr'>('rsrp');

    // Antenna settings
    const [antennaMode, setAntennaMode] = useState('auto');
    const [showAntennaModal, setShowAntennaModal] = useState(false);
    const [isChangingAntenna, setIsChangingAntenna] = useState(false);

    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const previousValueRef = useRef<number | null>(null);
    const bestValueRef = useRef<number | null>(null);
    const soundEnabledRef = useRef(false);
    const signalMetricRef = useRef<'rsrp' | 'sinr'>('rsrp');

    // Keep refs in sync with state
    useEffect(() => {
        bestValueRef.current = bestRsrp;
    }, [bestRsrp]);

    useEffect(() => {
        soundEnabledRef.current = soundEnabled;
    }, [soundEnabled]);

    useEffect(() => {
        signalMetricRef.current = signalMetric;
    }, [signalMetric]);

    useEffect(() => {
        if (visible && credentials?.modemIp) {
            const service = new ModemService(credentials.modemIp);
            setModemService(service);
            service.getAntennaMode().then(mode => setAntennaMode(mode)).catch(() => { });
        }
    }, [visible, credentials]);

    useEffect(() => {
        if (!visible) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            setSignalInfo(null);
            setBestRsrp(null);
            setIsLoading(true);
            setFetchTime(null);
            setSignalHistory([]);
            previousValueRef.current = null;
            bestValueRef.current = null;
        }
    }, [visible]);

    const loadSignalInfo = useCallback(async () => {
        if (!modemService) return;

        const startTime = Date.now();

        try {
            const info = await modemService.getSignalInfoFast();
            const elapsed = Date.now() - startTime;
            setFetchTime(elapsed);
            setSignalInfo(info);
            setIsLoading(false);

            const currentMetric = signalMetricRef.current;
            const rawValue = currentMetric === 'rsrp' ? info.rsrp : info.sinr;
            const currentValue = parseInt(rawValue);
            if (!isNaN(currentValue)) {
                setSignalHistory(prev => {
                    const newHistory = [...prev, currentValue];
                    if (newHistory.length > MAX_GRAPH_POINTS) {
                        return newHistory.slice(-MAX_GRAPH_POINTS);
                    }
                    return newHistory;
                });

                if (bestValueRef.current === null || currentValue > bestValueRef.current) {
                    setBestRsrp(currentValue);
                    setBestPci(info.pci || null);
                    if (soundEnabledRef.current && previousValueRef.current !== null && currentValue > previousValueRef.current) {
                        Vibration.vibrate(50);
                    }
                }
                previousValueRef.current = currentValue;
            }
        } catch (error) {
            setFetchTime(Date.now() - startTime);
        }
    }, [modemService]);

    useEffect(() => {
        if (!visible || !modemService) return;

        loadSignalInfo();
        intervalRef.current = setInterval(loadSignalInfo, 500);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [visible, modemService, loadSignalInfo]);

    const handleReset = () => {
        setBestRsrp(null);
        setBestPci(null);
        setSignalHistory([]);
        previousValueRef.current = null;
    };

    const handleMetricChange = (metric: 'rsrp' | 'sinr') => {
        if (metric !== signalMetric) {
            setSignalMetric(metric);
            setSignalHistory([]);
            setBestRsrp(null);
            setBestPci(null);
            previousValueRef.current = null;
        }
    };

    const handleAntennaChange = async (mode: string) => {
        if (!modemService) return;
        setShowAntennaModal(false);
        setIsChangingAntenna(true);
        try {
            await modemService.setAntennaMode(mode as 'auto' | 'internal' | 'external');
            setAntennaMode(mode);
            ThemedAlertHelper.alert(t('common.success'), t('settings.antennaModeChanged'));
        } catch (error) {
            ThemedAlertHelper.alert(t('common.error'), t('alerts.failedChangeAntenna'));
        } finally {
            setIsChangingAntenna(false);
        }
    };

    const currentValue = signalMetric === 'rsrp'
        ? (signalInfo?.rsrp ? parseInt(signalInfo.rsrp) : null)
        : (signalInfo?.sinr ? parseInt(signalInfo.sinr) : null);
    const quality = currentValue !== null && !isNaN(currentValue)
        ? (signalMetric === 'rsrp' ? getRsrpQuality(currentValue, colors) : getSinrQuality(currentValue, colors))
        : { level: 'none' as const, color: colors.textSecondary, percentage: 0 };
    const valueUnit = signalMetric === 'rsrp' ? 'dBm' : 'dB';

    return (
        <PageSheetModal
            visible={visible}
            onClose={onClose}
            title={t('home.signalPointing')}
        >
            <ScrollView
                style={styles.content}
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Metric Toggle */}
                <View style={[styles.metricToggle, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                    <TouchableOpacity
                        style={[styles.metricButton, signalMetric === 'rsrp' && { backgroundColor: colors.primary }]}
                        onPress={() => handleMetricChange('rsrp')}
                    >
                        <Text style={[typography.caption1, { color: signalMetric === 'rsrp' ? '#fff' : colors.text, fontWeight: '600' }]}>
                            RSRP
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.metricButton, signalMetric === 'sinr' && { backgroundColor: colors.primary }]}
                        onPress={() => handleMetricChange('sinr')}
                    >
                        <Text style={[typography.caption1, { color: signalMetric === 'sinr' ? '#fff' : colors.text, fontWeight: '600' }]}>
                            SINR
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Main Signal Display */}
                <Card style={[styles.mainCard, { borderColor: quality.color, borderWidth: 2 }]}>
                    <Text style={[typography.caption1, { color: colors.textSecondary, textAlign: 'center', marginBottom: 8 }]}>
                        {signalMetric === 'rsrp' ? t('home.metricRSRP') : t('home.metricSINR')}
                    </Text>

                    <Text style={[styles.rsrpValue, { color: quality.color }]}>
                        {currentValue !== null ? `${currentValue}` : '-'}
                        <Text style={styles.rsrpUnit}> {valueUnit}</Text>
                    </Text>

                    {/* Signal Bar */}
                    <View style={[styles.signalBarContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                        <View style={[styles.signalBarFill, { width: `${quality.percentage}%`, backgroundColor: quality.color }]} />
                    </View>

                    <Text style={[typography.headline, { color: quality.color, textAlign: 'center', marginTop: 12, textTransform: 'uppercase' }]}>
                        {t(`home.signal${quality.level.charAt(0).toUpperCase() + quality.level.slice(1)}`)}
                    </Text>

                    {/* Mini Realtime Graph */}
                    {signalHistory.length < 2 ? (
                        <View style={[styles.graphSkeleton, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                            <View style={[styles.skeletonBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]} />
                            <View style={[styles.skeletonBar, { height: 30, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]} />
                            <View style={[styles.skeletonBar, { height: 20, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]} />
                        </View>
                    ) : (
                        <MiniSignalGraph history={signalHistory} colors={colors} isDark={isDark} metric={signalMetric} />
                    )}

                    {/* Update Time */}
                    {fetchTime !== null && (
                        <Text style={[typography.caption2, { color: colors.textSecondary, textAlign: 'center', marginTop: 8 }]}>
                            Update: {fetchTime}ms
                        </Text>
                    )}
                </Card>

                {/* Signal Details */}
                <Card style={{ marginTop: spacing.md }}>
                    <View style={styles.detailsGrid}>
                        <View style={styles.detailItem}>
                            <Text style={[typography.caption1, { color: colors.textSecondary }]}>RSRQ</Text>
                            <Text style={[typography.headline, { color: colors.text }]}>
                                {formatSignalValue(signalInfo?.rsrq, 'dB')}
                            </Text>
                        </View>
                        <View style={styles.detailItem}>
                            <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                                {signalMetric === 'rsrp' ? 'SINR' : 'RSRP'}
                            </Text>
                            <Text style={[typography.headline, { color: colors.text }]}>
                                {signalMetric === 'rsrp'
                                    ? formatSignalValue(signalInfo?.sinr, 'dB')
                                    : formatSignalValue(signalInfo?.rsrp, 'dBm')}
                            </Text>
                        </View>
                        <View style={styles.detailItem}>
                            <Text style={[typography.caption1, { color: colors.textSecondary }]}>Band</Text>
                            <Text style={[typography.headline, { color: colors.text }]}>
                                {formatBandWithFreq(signalInfo?.band)}
                            </Text>
                        </View>
                        <View style={styles.detailItem}>
                            <Text style={[typography.caption1, { color: colors.textSecondary }]}>PCI</Text>
                            <Text style={[typography.headline, { color: colors.text }]}>
                                {signalInfo?.pci || '-'}
                            </Text>
                        </View>
                    </View>
                </Card>

                {/* Best Signal Found */}
                <Card style={{ marginTop: spacing.md }}>
                    <View style={styles.bestSignalRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                                {t('home.bestSignal')}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                                <Text style={[typography.title2, { color: colors.success, fontWeight: 'bold' }]}>
                                    {bestRsrp !== null ? `${bestRsrp} ${valueUnit}` : '-'}
                                </Text>
                                {bestPci && (
                                    <Text style={[typography.caption1, { color: colors.textSecondary, marginLeft: 12 }]}>
                                        PCI: {bestPci}
                                    </Text>
                                )}
                            </View>
                        </View>
                        <TouchableOpacity
                            onPress={handleReset}
                            style={[styles.resetButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                        >
                            <MaterialIcons name="refresh" size={20} color={colors.textSecondary} />
                            <Text style={[typography.caption1, { color: colors.textSecondary, marginLeft: 4 }]}>
                                Reset
                            </Text>
                        </TouchableOpacity>
                    </View>
                </Card>

                {/* Antenna Settings */}
                <Card style={{ marginTop: spacing.md }}>
                    <TouchableOpacity
                        style={styles.antennaRow}
                        onPress={() => setShowAntennaModal(true)}
                        disabled={isChangingAntenna}
                    >
                        <View style={styles.antennaLeft}>
                            <MaterialIcons name="settings-input-antenna" size={22} color={colors.primary} />
                            <View style={{ marginLeft: 12 }}>
                                <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                                    {t('settings.antennaMode')}
                                </Text>
                                <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                                    {t(ANTENNA_MODES.find(m => m.value === antennaMode)?.labelKey || 'settings.antennaAuto')}
                                </Text>
                            </View>
                        </View>
                        {isChangingAntenna ? (
                            <BouncingDots size="small" color={colors.primary} />
                        ) : (
                            <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
                        )}
                    </TouchableOpacity>
                </Card>

                {/* Tips - Standard positioning (hidden when external antenna selected) */}
                {antennaMode !== 'external' && (
                    <Card style={{ marginTop: spacing.md, backgroundColor: isDark ? 'rgba(52,199,89,0.1)' : 'rgba(52,199,89,0.05)' }}>
                        <View style={styles.tipsHeader}>
                            <MaterialIcons name="lightbulb" size={20} color={colors.success} />
                            <Text style={[typography.headline, { color: colors.text, marginLeft: 8 }]}>
                                {t('home.positioningTips')}
                            </Text>
                        </View>
                        <View style={styles.tipsList}>
                            <Text style={[typography.body, { color: colors.text, marginBottom: 8 }]}>
                                • {t('home.tipWindow')}
                            </Text>
                            <Text style={[typography.body, { color: colors.text, marginBottom: 8 }]}>
                                • {t('home.tipRotate')}
                            </Text>
                            <Text style={[typography.body, { color: colors.text, marginBottom: 8 }]}>
                                • {t('home.tipHeight')}
                            </Text>
                            <Text style={[typography.body, { color: colors.text }]}>
                                • {t('home.tipMetal')}
                            </Text>
                        </View>
                    </Card>
                )}

                {/* External Antenna Tips - Shown when external or auto antenna mode */}
                {(antennaMode === 'external' || antennaMode === 'auto') && (
                    <Card style={{ marginTop: spacing.md, backgroundColor: isDark ? 'rgba(0,122,255,0.1)' : 'rgba(0,122,255,0.05)' }}>
                        <View style={styles.tipsHeader}>
                            <MaterialIcons name="settings-input-antenna" size={20} color={colors.primary} />
                            <Text style={[typography.headline, { color: colors.text, marginLeft: 8 }]}>
                                {t('home.externalAntennaTips')}
                            </Text>
                        </View>
                        <View style={styles.tipsList}>
                            <Text style={[typography.body, { color: colors.text, marginBottom: 8 }]}>
                                • {t('home.tipExternalCable')}
                            </Text>
                            <Text style={[typography.body, { color: colors.text, marginBottom: 8 }]}>
                                • {t('home.tipExternalConnector')}
                            </Text>
                            <Text style={[typography.body, { color: colors.text, marginBottom: 8 }]}>
                                • {t('home.tipExternalDirection')}
                            </Text>
                            <Text style={[typography.body, { color: colors.text }]}>
                                • {t('home.tipExternalHeight')}
                            </Text>
                        </View>
                    </Card>
                )}

                {/* Sound Toggle */}
                <TouchableOpacity
                    style={[styles.soundToggle, {
                        backgroundColor: soundEnabled ? colors.primary : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'),
                        marginTop: spacing.md,
                    }]}
                    onPress={() => setSoundEnabled(!soundEnabled)}
                >
                    <MaterialIcons
                        name={soundEnabled ? 'vibration' : 'notifications-off'}
                        size={24}
                        color={soundEnabled ? '#FFFFFF' : colors.textSecondary}
                    />
                    <Text style={[typography.body, {
                        color: soundEnabled ? '#FFFFFF' : colors.text,
                        marginLeft: 8,
                        fontWeight: '600',
                    }]}>
                        {t('home.vibrationFeedback')}: {soundEnabled ? 'ON' : 'OFF'}
                    </Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Antenna Selection Modal */}
            <SelectionModal
                visible={showAntennaModal}
                title={t('settings.antennaSettings')}
                options={ANTENNA_MODES.map(mode => ({
                    label: t(mode.labelKey),
                    value: mode.value
                }))}
                selectedValue={antennaMode}
                onSelect={handleAntennaChange}
                onClose={() => setShowAntennaModal(false)}
            />
        </PageSheetModal>
    );
}

const miniGraphStyles = StyleSheet.create({
    container: {
        width: '100%',
        marginTop: 16,
        borderRadius: 8,
        padding: 8,
        flexDirection: 'row',
    },
    graphArea: {
        flex: 1,
        height: 60,
        position: 'relative',
        overflow: 'hidden',
    },
    gridLine: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: 'rgba(128,128,128,0.2)',
    },
    currentPoint: {
        position: 'absolute',
        width: 8,
        height: 8,
        borderRadius: 4,
        marginLeft: -4,
    },
    labels: {
        width: 30,
        height: 60,
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingLeft: 4,
    },
    labelText: {
        fontSize: 9,
    },
});

const styles = StyleSheet.create({
    content: {
        flex: 1,
        paddingHorizontal: 16,
    },
    mainCard: {
        alignItems: 'center',
        paddingVertical: 24,
    },
    rsrpValue: {
        fontSize: 56,
        fontWeight: 'bold',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    rsrpUnit: {
        fontSize: 24,
        fontWeight: 'normal',
    },
    signalBarContainer: {
        width: '100%',
        height: 12,
        borderRadius: 6,
        marginTop: 16,
        overflow: 'hidden',
    },
    signalBarFill: {
        height: '100%',
        borderRadius: 6,
    },
    detailsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    detailItem: {
        width: '50%',
        alignItems: 'center',
        paddingVertical: 12,
    },
    bestSignalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    resetButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    antennaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    antennaLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    tipsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    tipsList: {
        paddingLeft: 4,
    },
    soundToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
    },
    metricToggle: {
        flexDirection: 'row',
        borderRadius: 10,
        padding: 4,
        marginBottom: 16,
    },
    metricButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    graphSkeleton: {
        marginTop: 16,
        borderRadius: 8,
        padding: 8,
        height: 70,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-around',
    },
    skeletonBar: {
        width: '33%',
        height: 50,
        borderRadius: 4,
    },
});
