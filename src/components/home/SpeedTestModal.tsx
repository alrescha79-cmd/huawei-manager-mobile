import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Animated,
    Platform,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Svg, { Path, Line, Text as SvgText } from 'react-native-svg';
import Reanimated, {
    useSharedValue,
    useAnimatedProps,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { useTranslation } from '@/i18n';
import { ModalBackground } from '../ModalBackground';
import { showInterstitial } from '@/services/ad.service';
import { AdNative } from '@/components';

interface SpeedTestModalProps {
    visible: boolean;
    onClose: () => void;
}

interface SpeedtestResult {
    downloadSpeed: number;
    uploadSpeed: number;
    latency: number;
    jitter: number;
}

// ============================================================================
// SVG GAUGE HELPERS
// ============================================================================

const AnimatedPath = Reanimated.createAnimatedComponent(Path);

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, sweepAngle: number) {
    const s = polarToCartesian(cx, cy, r, startAngle);
    const e = polarToCartesian(cx, cy, r, startAngle + sweepAngle);
    const large = sweepAngle > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

function labelAnchor(angleDeg: number): 'start' | 'middle' | 'end' {
    const a = ((angleDeg % 360) + 360) % 360;
    if (a >= 135 && a <= 225) return 'end';
    if (a > 225 && a < 315) return 'middle';
    return 'start';
}

const ARC_CX = 120;
const ARC_CY = 118;
const ARC_R = 80;
const ARC_START = 135;
const ARC_SWEEP = 270;
const ARC_LEN = (ARC_SWEEP / 360) * 2 * Math.PI * ARC_R;
const VB_W = 240;
const VB_H = 190;

// ============================================================================
// SPEEDOMETER GAUGE
// ============================================================================

const SpeedometerGauge: React.FC<{
    speed: number;
    maxSpeed: number;
    color: string;
    label: string;
    isActive: boolean;
}> = ({ speed, maxSpeed, color, label, isActive }) => {
    const { colors, isDark } = useTheme();
    const progress = useSharedValue(0);

    useEffect(() => {
        const target = Math.min(Math.max(speed / maxSpeed, 0), 1);
        if (speed === 0) {
            progress.value = withTiming(0, { duration: 300 });
        } else {
            progress.value = withSpring(target, {
                damping: 18,
                stiffness: 80,
                mass: 0.6,
            });
        }
    }, [speed, maxSpeed]);

    const animatedProps = useAnimatedProps(() => ({
        strokeDashoffset: ARC_LEN * (1 - progress.value),
    }));

    const arcPath = useMemo(
        () => describeArc(ARC_CX, ARC_CY, ARC_R, ARC_START, ARC_SWEEP),
        []
    );

    const ticks = useMemo(() => {
        const count = 20;
        return Array.from({ length: count + 1 }, (_, i) => {
            const frac = i / count;
            const angle = ARC_START + frac * ARC_SWEEP;
            const isMajor = i % 5 === 0;
            const value = Math.round(frac * maxSpeed);
            const innerR = isMajor ? ARC_R - 10 : ARC_R - 5;
            return {
                inner: polarToCartesian(ARC_CX, ARC_CY, innerR, angle),
                outer: polarToCartesian(ARC_CX, ARC_CY, ARC_R + 6, angle),
                labelPos: polarToCartesian(ARC_CX, ARC_CY, ARC_R + 18, angle),
                isMajor,
                value,
                angle,
            };
        });
    }, [maxSpeed]);

    const bgStroke = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    const tickStroke = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)';
    const labelFill = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)';

    const isDownload = label.toLowerCase().includes('download') || label.toLowerCase().includes('unduh');

    return (
        <View style={gaugeStyles.wrapper}>
            <View style={{ width: '100%', aspectRatio: VB_W / VB_H }}>
                <Svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" height="100%">
                    <Path
                        d={arcPath}
                        stroke={bgStroke}
                        strokeWidth={12}
                        fill="none"
                        strokeLinecap="round"
                    />

                    <AnimatedPath
                        d={arcPath}
                        stroke={color}
                        strokeWidth={22}
                        fill="none"
                        opacity={0.12}
                        strokeLinecap="round"
                        strokeDasharray={`${ARC_LEN} ${ARC_LEN}`}
                        animatedProps={animatedProps}
                    />

                    <AnimatedPath
                        d={arcPath}
                        stroke={color}
                        strokeWidth={12}
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={`${ARC_LEN} ${ARC_LEN}`}
                        animatedProps={animatedProps}
                    />

                    {ticks.map((t, i) => (
                        <Line
                            key={i}
                            x1={t.inner.x}
                            y1={t.inner.y}
                            x2={t.outer.x}
                            y2={t.outer.y}
                            stroke={tickStroke}
                            strokeWidth={t.isMajor ? 2 : 1}
                            strokeLinecap="round"
                        />
                    ))}

                    {ticks
                        .filter((t) => t.isMajor)
                        .map((t, i) => (
                            <SvgText
                                key={`l${i}`}
                                x={t.labelPos.x}
                                y={t.labelPos.y + 4}
                                textAnchor={labelAnchor(t.angle)}
                                fontSize={10}
                                fill={labelFill}
                            >
                                {t.value}
                            </SvgText>
                        ))}
                </Svg>

                <View style={gaugeStyles.centerOverlay} pointerEvents="none">
                    {(() => {
                        const useKbps = speed > 0 && speed < 1;
                        const displayValue = useKbps
                            ? Math.round(speed * 1000).toString()
                            : isActive
                                ? Math.round(speed).toString()
                                : speed.toFixed(1);
                        const displayUnit = useKbps ? 'Kbps' : 'Mbps';
                        return (
                            <>
                                <Text
                                    style={{
                                        fontSize: useKbps ? 36 : 44,
                                        fontWeight: '800',
                                        color: isActive ? colors.text : colors.textSecondary,
                                        letterSpacing: -1.5,
                                        fontVariant: ['tabular-nums'],
                                    }}
                                >
                                    {displayValue}
                                </Text>
                                <Text
                                    style={{
                                        fontSize: 13,
                                        fontWeight: '500',
                                        color: colors.textSecondary,
                                        marginTop: -2,
                                    }}
                                >
                                    {displayUnit}
                                </Text>
                            </>
                        );
                    })()}
                </View>
            </View>

            <View
                style={[
                    gaugeStyles.phaseBadge,
                    isActive && {
                        backgroundColor: color + '18',
                        borderColor: color + '40',
                    },
                ]}
            >
                <Ionicons
                    name={isDownload ? 'arrow-down' : 'arrow-up'}
                    size={14}
                    color={isActive ? color : colors.textSecondary}
                />
                <Text
                    style={{
                        fontSize: 13,
                        fontWeight: '600',
                        color: isActive ? color : colors.textSecondary,
                        marginLeft: 6,
                    }}
                >
                    {label}
                </Text>
            </View>
        </View>
    );
};

const gaugeStyles = StyleSheet.create({
    wrapper: {
        alignItems: 'center',
        paddingVertical: 4,
    },
    centerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: '24%',
    },
    phaseBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'transparent',
        marginTop: 6,
    },
});

// ============================================================================
// SPEED TEST LOGIC
// ============================================================================

const CF_DOWNLOAD_URL = 'https://speed.cloudflare.com/__down';
const CF_UPLOAD_URL = 'https://speed.cloudflare.com/__up';

export const SpeedTestModal: React.FC<SpeedTestModalProps> = ({ visible, onClose }) => {
    const { colors, typography, spacing, glassmorphism, isDark } = useTheme();
    const { t } = useTranslation();

    const [isRunning, setIsRunning] = useState(false);
    const [phase, setPhase] = useState<'idle' | 'latency' | 'download' | 'upload' | 'complete'>('idle');
    const [result, setResult] = useState<SpeedtestResult>({
        downloadSpeed: 0,
        uploadSpeed: 0,
        latency: 0,
        jitter: 0,
    });
    const [progress, setProgress] = useState(0);
    const progressAnim = useRef(new Animated.Value(0)).current;
    const abortControllerRef = useRef<AbortController | null>(null);
    const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const [clientIp, setClientIp] = useState<string>('');
    const [ispInfo, setIspInfo] = useState<string>('');
    const [providerHostname, setProviderHostname] = useState<string>('');

    const [dlMax, setDlMax] = useState(100);
    const [ulMax, setUlMax] = useState(50);

    useEffect(() => {
        if (visible) {
            fetch('https://ipinfo.io/json')
                .then(res => res.json())
                .then(data => {
                    if (data.ip) setClientIp(data.ip);
                    if (data.org) {
                        setIspInfo(data.org.replace(/^AS\d+\s+/, ''));
                    } else if (data.isp) {
                        setIspInfo(data.isp);
                    }
                    if (data.hostname) setProviderHostname(data.hostname);
                })
                .catch(() => {
                    fetch('https://speed.cloudflare.com/meta')
                        .then(res => res.json())
                        .then(data => {
                            if (data.clientIp) setClientIp(data.clientIp);
                            if (data.clientIsp) setIspInfo(data.clientIsp);
                        })
                        .catch(() => setClientIp('Unknown'));
                });
        } else {
            setClientIp('');
            setIspInfo('');
            setProviderHostname('');
        }
    }, [visible]);

    useEffect(() => {
        Animated.timing(progressAnim, {
            toValue: progress,
            duration: 300,
            useNativeDriver: false,
        }).start();
    }, [progress]);

    useEffect(() => {
        if (result.downloadSpeed > dlMax * 0.8) {
            setDlMax(Math.ceil(result.downloadSpeed / 50) * 50 + 50);
        }
    }, [result.downloadSpeed]);

    useEffect(() => {
        if (result.uploadSpeed > ulMax * 0.8) {
            setUlMax(Math.ceil(result.uploadSpeed / 25) * 25 + 25);
        }
    }, [result.uploadSpeed]);

    const runSpeedtest = async () => {
        setIsRunning(true);
        setProgress(0);
        setDlMax(100);
        setUlMax(50);
        setResult({ downloadSpeed: 0, uploadSpeed: 0, latency: 0, jitter: 0 });

        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        try {
            setPhase('latency');
            const latencyResults: number[] = [];

            try {
                await fetch(`${CF_DOWNLOAD_URL}?bytes=0`, { signal });
            } catch { }

            for (let i = 0; i < 10; i++) {
                if (signal.aborted) throw new Error('Aborted');
                const start = performance.now();
                try {
                    await fetch(`${CF_DOWNLOAD_URL}?bytes=0`, { cache: 'no-store', signal });
                    latencyResults.push(performance.now() - start);
                } catch (e: any) {
                    if (e.name !== 'AbortError') { }
                }
                setProgress(Math.round(((i + 1) / 10) * 20));
            }

            const validLatency = latencyResults.filter(l => l > 0 && l < 10000);
            const sorted = [...validLatency].sort((a, b) => a - b);
            const median = sorted[Math.floor(sorted.length / 2)] || 100;
            const avg = validLatency.reduce((a, b) => a + b, 0) / validLatency.length;
            const jitter = Math.sqrt(validLatency.reduce((s, l) => s + Math.pow(l - avg, 2), 0) / validLatency.length);

            setResult(prev => ({ ...prev, latency: median, jitter: isNaN(jitter) ? 0 : jitter }));
            setProgress(20);

            if (signal.aborted) throw new Error('Aborted');

            // DOWNLOAD
            setPhase('download');

            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = setInterval(() => {
                setProgress(prev => Math.min(prev + 0.8, 59));
            }, 100);

            const dlDurationMs = 6000;
            const dlStartTime = performance.now();
            let totalBytesDownloaded = 0;
            const DL_CHUNK_SIZE = 1000000;

            const downloadWorker = async () => {
                while (performance.now() - dlStartTime < dlDurationMs && !signal.aborted) {
                    try {
                        const res = await fetch(`${CF_DOWNLOAD_URL}?bytes=${DL_CHUNK_SIZE}`, { cache: 'no-store', signal });
                        const buffer = await res.arrayBuffer();
                        if (signal.aborted) break;
                        totalBytesDownloaded += buffer.byteLength;
                        const elapsed = (performance.now() - dlStartTime) / 1000;
                        if (elapsed > 0) {
                            setResult(prev => ({ ...prev, downloadSpeed: ((totalBytesDownloaded * 8) / elapsed) / 1000000 }));
                        }
                    } catch (err) {
                        if (signal.aborted) break;
                    }
                }
            };

            await Promise.all([downloadWorker(), downloadWorker(), downloadWorker()]);

            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
            setProgress(60);

            if (signal.aborted) throw new Error('Aborted');

            // UPLOAD
            setPhase('upload');

            progressIntervalRef.current = setInterval(() => {
                setProgress(prev => Math.min(prev + 0.6, 94));
            }, 100);

            const ulDurationMs = 6000;
            const ulStartTime = performance.now();
            let totalBytesUploaded = 0;
            const UL_CHUNK_SIZE = 500000;

            const uploadData = new Uint8Array(UL_CHUNK_SIZE);
            for (let i = 0; i < UL_CHUNK_SIZE; i++) {
                uploadData[i] = Math.floor(Math.random() * 256);
            }

            const uploadWorker = async () => {
                while (performance.now() - ulStartTime < ulDurationMs && !signal.aborted) {
                    try {
                        await fetch(CF_UPLOAD_URL, {
                            method: 'POST',
                            body: uploadData,
                            headers: { 'Content-Type': 'application/octet-stream' },
                            signal,
                        });
                        if (signal.aborted) break;
                        totalBytesUploaded += UL_CHUNK_SIZE;
                        const elapsed = (performance.now() - ulStartTime) / 1000;
                        if (elapsed > 0) {
                            setResult(prev => ({ ...prev, uploadSpeed: ((totalBytesUploaded * 8) / elapsed) / 1000000 }));
                        }
                    } catch (err) {
                        if (signal.aborted) break;
                    }
                }
            };

            await Promise.all([uploadWorker(), uploadWorker(), uploadWorker()]);

            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
            setProgress(100);
            setPhase('complete');
        } catch (error: any) {
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
            if (error.message !== 'Aborted') {
                console.error('[SPEEDTEST] Error:', error.message);
            }
            setPhase('complete');
        } finally {
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
            setIsRunning(false);
        }
    };

    const stopSpeedtest = () => {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        if (abortControllerRef.current) abortControllerRef.current.abort();
        setIsRunning(false);
        setPhase('idle');
    };

    const handleClose = () => {
        const wasComplete = phase === 'complete';
        if (isRunning) stopSpeedtest();
        setPhase('idle');
        setProgress(0);
        setDlMax(100);
        setUlMax(50);
        setResult({ downloadSpeed: 0, uploadSpeed: 0, latency: 0, jitter: 0 });
        setClientIp('');
        setIspInfo('');
        setProviderHostname('');
        if (wasComplete) {
            showInterstitial(() => onClose());
        } else {
            onClose();
        }
    };

    // Derived gauge state
    const currentSpeed = phase === 'upload' ? result.uploadSpeed : result.downloadSpeed;
    const currentMax = phase === 'upload' ? ulMax : dlMax;
    const currentColor = phase === 'upload' ? '#3B82F6' : '#22C55E';
    const currentLabel = phase === 'upload' ? t('home.upload') : t('home.download');

    const getPhaseText = () => {
        switch (phase) {
            case 'latency': return t('home.latency') + '...';
            case 'download': return t('home.download') + '...';
            case 'upload': return t('home.upload') + '...';
            case 'complete': return t('home.speedtestComplete');
            default: return t('home.startTest');
        }
    };

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 100],
        outputRange: ['0%', '100%'],
    });

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
            <View style={styles.overlay}>
                <BlurView
                    intensity={glassmorphism.blur.overlay}
                    tint={isDark ? 'dark' : 'light'}
                    experimentalBlurMethod="dimezisBlurView"
                    style={styles.blurContainer}
                >
                    <View style={[styles.modalContent, { backgroundColor: isDark ? glassmorphism.background.dark.modal : glassmorphism.background.light.modal }]}>
                        <ModalBackground />

                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={[typography.title2, { color: colors.text, fontWeight: '700' }]}>
                                {t('home.speedtestTitle')}
                            </Text>
                            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                                <MaterialIcons name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {/* ISP Info */}
                        {(clientIp || ispInfo || providerHostname) && (
                            <View style={[styles.ispCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                                {ispInfo !== '' && (
                                    <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                                        <Ionicons name="earth" size={12} color={colors.textSecondary} />{' '}
                                        <Text style={{ color: colors.text, fontWeight: '600' }}>{ispInfo}</Text>
                                    </Text>
                                )}
                                {clientIp !== '' && (
                                    <Text style={[typography.caption1, { color: colors.textSecondary, marginTop: 2 }]}>
                                        <MaterialIcons name="network-wifi" size={12} color={colors.textSecondary} />{' '}
                                        <Text style={{ color: colors.text, fontWeight: '600' }}>{clientIp}</Text>
                                    </Text>
                                )}
                                {providerHostname !== '' && providerHostname !== clientIp && (
                                    <Text style={[typography.caption1, { color: colors.textSecondary, marginTop: 2, textAlign: 'center' }]}>
                                        <MaterialIcons name="computer" size={12} color={colors.textSecondary} />{' '}
                                        <Text style={{ color: colors.text, fontWeight: '600' }}>{providerHostname}</Text>
                                    </Text>
                                )}
                            </View>
                        )}

                        {/* Gauge */}
                        <SpeedometerGauge
                            speed={currentSpeed}
                            maxSpeed={currentMax}
                            color={currentColor}
                            label={currentLabel}
                            isActive={isRunning}
                        />

                        {/* Progress bar */}
                        {isRunning && (
                            <View style={[styles.progressContainer, { backgroundColor: colors.border }]}>
                                <Animated.View
                                    style={[styles.progressBar, { width: progressWidth, backgroundColor: currentColor }]}
                                />
                            </View>
                        )}

                        {/* Ad */}
                        <View style={{ paddingHorizontal: 4, marginTop: spacing.sm }}>
                            <AdNative />
                        </View>

                        {/* Results */}
                        {phase === 'complete' && result.latency > 0 && (
                            <View style={[styles.resultsRow, { marginTop: spacing.sm }]}>
                                <View style={[styles.resultItem, { backgroundColor: isDark ? 'rgba(34,197,94,0.08)' : 'rgba(34,197,94,0.06)' }]}>
                                    <Ionicons name="arrow-down" size={16} color="#22C55E" />
                                    <Text style={[typography.caption1, { color: colors.textSecondary, marginTop: 4 }]}>
                                        {t('home.download')}
                                    </Text>
                                    <Text style={[typography.headline, { color: '#22C55E', fontWeight: '700', fontSize: 18 }]}>
                                        {result.downloadSpeed.toFixed(1)}
                                    </Text>
                                    <Text style={[typography.caption2, { color: colors.textSecondary }]}>Mbps</Text>
                                </View>
                                <View style={[styles.resultItem, { backgroundColor: isDark ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.06)' }]}>
                                    <Ionicons name="arrow-up" size={16} color="#3B82F6" />
                                    <Text style={[typography.caption1, { color: colors.textSecondary, marginTop: 4 }]}>
                                        {t('home.upload')}
                                    </Text>
                                    <Text style={[typography.headline, { color: '#3B82F6', fontWeight: '700', fontSize: 18 }]}>
                                        {result.uploadSpeed.toFixed(1)}
                                    </Text>
                                    <Text style={[typography.caption2, { color: colors.textSecondary }]}>Mbps</Text>
                                </View>
                            </View>
                        )}

                        <View style={[styles.statsRow, { marginTop: spacing.sm }]}>
                            <View style={[styles.statItem, { backgroundColor: isDark ? glassmorphism.innerBackground.dark : glassmorphism.innerBackground.light }]}>
                                <MaterialIcons name="timer" size={20} color={colors.primary} />
                                <Text style={[typography.caption1, { color: colors.textSecondary, marginTop: 4 }]}>
                                    {t('home.latency')}
                                </Text>
                                <Text style={[typography.headline, { color: colors.text, fontWeight: '600' }]}>
                                    {result.latency.toFixed(0)} ms
                                </Text>
                            </View>
                            <View style={[styles.statItem, { backgroundColor: isDark ? glassmorphism.innerBackground.dark : glassmorphism.innerBackground.light }]}>
                                <MaterialIcons name="trending-up" size={20} color={colors.success} />
                                <Text style={[typography.caption1, { color: colors.textSecondary, marginTop: 4 }]}>
                                    {t('home.jitter')}
                                </Text>
                                <Text style={[typography.headline, { color: colors.text, fontWeight: '600' }]}>
                                    {result.jitter.toFixed(1)} ms
                                </Text>
                            </View>
                        </View>

                        {/* Action */}
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: isRunning ? colors.error : colors.primary }]}
                            onPress={isRunning ? stopSpeedtest : phase === 'complete' ? handleClose : runSpeedtest}
                        >
                            <Text style={[typography.body, { color: '#FFFFFF', fontWeight: '600' }]}>
                                {isRunning ? t('common.stop') : phase === 'complete' ? t('common.ok') : t('home.startTest')}
                            </Text>
                        </TouchableOpacity>

                        <Text style={[typography.caption2, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md }]}>
                            {t('home.poweredBy')}
                        </Text>
                    </View>
                </BlurView>
            </View>
        </Modal>
    );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    blurContainer: {
        borderRadius: 24,
        overflow: 'hidden',
        margin: 20,
        width: '90%',
        maxWidth: 400,
    },
    modalContent: {
        padding: 24,
        borderRadius: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    closeButton: {
        padding: 4,
    },
    ispCard: {
        marginBottom: 8,
        alignItems: 'center',
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 12,
        width: '100%',
    },
    progressContainer: {
        height: 3,
        borderRadius: 2,
        overflow: 'hidden',
        marginTop: 10,
        marginHorizontal: 16,
    },
    progressBar: {
        height: '100%',
        borderRadius: 2,
    },
    resultsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    resultItem: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 12,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        gap: 16,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        marginTop: 20,
    },
});

export default SpeedTestModal;
