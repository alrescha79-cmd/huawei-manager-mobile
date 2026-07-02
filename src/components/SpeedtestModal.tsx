import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Animated,
    Easing,
    Platform,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/theme';
import { useTranslation } from '@/i18n';
import { ModalMeshGradient } from './ModalMeshGradient';
import { showInterstitial, showRewarded } from '@/services/ad.service';
import { ThemedAlertHelper } from '@/components';

interface SpeedtestModalProps {
    visible: boolean;
    onClose: () => void;
}

interface SpeedtestResult {
    downloadSpeed: number;
    uploadSpeed: number;
    latency: number;
    jitter: number;
}

const SpeedometerGauge: React.FC<{
    speed: number;
    maxSpeed: number;
    color: string;
    label: string;
    isActive: boolean;
}> = ({ speed, maxSpeed, color, label, isActive }) => {
    const { colors, typography, spacing, glassmorphism, isDark } = useTheme();
    const needleAnim = useRef(new Animated.Value(0)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const targetValue = Math.min(speed / maxSpeed, 1);
        Animated.spring(needleAnim, {
            toValue: targetValue,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
        }).start();
    }, [speed, maxSpeed]);

    useEffect(() => {
        if (isActive) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(glowAnim, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: false,
                    }),
                    Animated.timing(glowAnim, {
                        toValue: 0.3,
                        duration: 800,
                        useNativeDriver: false,
                    }),
                ])
            ).start();
        } else {
            glowAnim.setValue(0);
        }
    }, [isActive]);

    const needleRotation = needleAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['-135deg', '135deg'],
    });

    const glowOpacity = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.2, 0.6],
    });

    const speedMarks = [0, 25, 50, 75, 100].map(percent => {
        const displayValue = Math.round((percent / 100) * maxSpeed);
        return displayValue;
    });

    return (
        <View style={gaugeStyles.container}>
            <Animated.View style={[
                gaugeStyles.gaugeOuter,
                {
                    borderColor: isActive ? color : colors.border,
                    shadowColor: color,
                    shadowOpacity: isActive ? 0.5 : 0,
                    shadowRadius: 10,
                    elevation: isActive ? 8 : 0,
                }
            ]}>
                <View style={[gaugeStyles.arcBackground, { borderColor: color + '30' }]} />

                <Animated.View
                    style={[
                        gaugeStyles.needleContainer,
                        { transform: [{ rotate: needleRotation }] }
                    ]}
                >
                    <View style={[gaugeStyles.needle, { backgroundColor: color }]} />
                    <View style={[gaugeStyles.needleTip, {
                        backgroundColor: color,
                    }]} />
                </Animated.View>

                <View style={[gaugeStyles.centerCircle, { backgroundColor: colors.card }]}>
                    <Text style={[typography.title1, { color: colors.text, fontWeight: '700', fontSize: 28 }]}>
                        {speed.toFixed(1)}
                    </Text>
                    <Text style={[typography.caption2, { color: colors.textSecondary, marginTop: -2 }]}>
                        Mbps
                    </Text>
                </View>
            </Animated.View>

            <Text style={[typography.body, { color: colors.text, marginTop: spacing.sm, fontWeight: '600' }]}>
                {label}
            </Text>
        </View>
    );
};

const gaugeStyles = StyleSheet.create({
    container: {
        alignItems: 'center',
        flex: 1,
    },
    gaugeOuter: {
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 6,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'visible',
    },
    arcBackground: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 4,
    },
    needleContainer: {
        position: 'absolute',
        width: 4,
        height: 70,
        alignItems: 'center',
        top: 0,
        transformOrigin: 'bottom center',
    },
    needle: {
        width: 4,
        height: 45,
        borderRadius: 2,
    },
    needleTip: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginTop: -2,
    },
    centerHub: {
        position: 'absolute',
        width: 16,
        height: 16,
        borderRadius: 8,
        zIndex: 10,
    },
    centerCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
    },
});

const CF_DOWNLOAD_URL = 'https://speed.cloudflare.com/__down';
const CF_UPLOAD_URL = 'https://speed.cloudflare.com/__up';

export const SpeedtestModal: React.FC<SpeedtestModalProps> = ({ visible, onClose }) => {
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

    useEffect(() => {
        if (visible) {
            fetch('https://ipinfo.io/json')
                .then(res => res.json())
                .then(data => {
                    if (data.ip) {
                        setClientIp(data.ip);
                    }
                    if (data.org) {
                        const cleanIsp = data.org.replace(/^AS\d+\s+/, '');
                        setIspInfo(cleanIsp);
                    } else if (data.isp) {
                        setIspInfo(data.isp);
                    }
                    if (data.hostname) {
                        setProviderHostname(data.hostname);
                    }
                })
                .catch(() => {
                    // Fallback to speed.cloudflare.com
                    fetch('https://speed.cloudflare.com/meta')
                        .then(res => res.json())
                        .then(data => {
                            if (data.clientIp) {
                                setClientIp(data.clientIp);
                            }
                            if (data.clientIsp) {
                                setIspInfo(data.clientIsp);
                            }
                        })
                        .catch(() => {
                            setClientIp('Unknown');
                        });
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

    const runSpeedtest = async () => {
        setIsRunning(true);
        setProgress(0);
        setResult({ downloadSpeed: 0, uploadSpeed: 0, latency: 0, jitter: 0 });

        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        try {
            // 1. LATENCY & JITTER PHASE
            setPhase('latency');
            const latencyResults: number[] = [];

            try {
                await fetch(`${CF_DOWNLOAD_URL}?bytes=0`, { signal });
            } catch { }

            for (let i = 0; i < 10; i++) {
                if (signal.aborted) throw new Error('Aborted');
                const start = performance.now();
                try {
                    await fetch(`${CF_DOWNLOAD_URL}?bytes=0`, {
                        cache: 'no-store',
                        signal
                    });
                    const latency = performance.now() - start;
                    latencyResults.push(latency);
                } catch (e: any) {
                    if (e.name !== 'AbortError') {
                        // ignore error and continue
                    }
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

            // 2. DOWNLOAD SPEED PHASE
            setPhase('download');
            
            // Set up smooth progress increment from 20 to 60
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = setInterval(() => {
                setProgress(prev => Math.min(prev + 0.8, 59));
            }, 100);

            const dlDurationMs = 6000; // 6 seconds test duration
            const dlStartTime = performance.now();
            let totalBytesDownloaded = 0;
            const DL_CHUNK_SIZE = 1000000; // 1MB chunks

            const downloadWorker = async () => {
                while (performance.now() - dlStartTime < dlDurationMs && !signal.aborted) {
                    try {
                        const res = await fetch(`${CF_DOWNLOAD_URL}?bytes=${DL_CHUNK_SIZE}`, {
                            cache: 'no-store',
                            signal
                        });
                        const buffer = await res.arrayBuffer();
                        if (signal.aborted) break;

                        totalBytesDownloaded += buffer.byteLength;
                        const elapsed = (performance.now() - dlStartTime) / 1000;
                        if (elapsed > 0) {
                            const speedMbps = ((totalBytesDownloaded * 8) / elapsed) / 1000000;
                            setResult(prev => ({ ...prev, downloadSpeed: speedMbps }));
                        }
                    } catch (err) {
                        if (signal.aborted) break;
                    }
                }
            };

            // Run 3 workers in parallel to saturate bandwidth
            await Promise.all([downloadWorker(), downloadWorker(), downloadWorker()]);

            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
            setProgress(60);

            if (signal.aborted) throw new Error('Aborted');

            // 3. UPLOAD SPEED PHASE
            setPhase('upload');

            // Set up smooth progress increment from 60 to 95
            progressIntervalRef.current = setInterval(() => {
                setProgress(prev => Math.min(prev + 0.6, 94));
            }, 100);

            const ulDurationMs = 6000; // 6 seconds test duration
            const ulStartTime = performance.now();
            let totalBytesUploaded = 0;
            const UL_CHUNK_SIZE = 500000; // 500KB chunks

            // Pre-generate random payload once to save device CPU
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
                            const speedMbps = ((totalBytesUploaded * 8) / elapsed) / 1000000;
                            setResult(prev => ({ ...prev, uploadSpeed: speedMbps }));
                        }
                    } catch (err) {
                        if (signal.aborted) break;
                    }
                }
            };

            // Run 3 workers in parallel to saturate upload bandwidth
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
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
        }
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        setIsRunning(false);
        setPhase('idle');
    };

    const handleClose = () => {
        const wasComplete = phase === 'complete';
        if (isRunning) {
            stopSpeedtest();
        }
        setPhase('idle');
        setProgress(0);
        setResult({ downloadSpeed: 0, uploadSpeed: 0, latency: 0, jitter: 0 });
        setClientIp('');
        setIspInfo('');
        setProviderHostname('');
        if (wasComplete) {
            showInterstitial(() => {
                onClose();
            });
        } else {
            onClose();
        }
    };

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
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <BlurView
                    intensity={glassmorphism.blur.overlay}
                    tint={isDark ? 'dark' : 'light'}
                    experimentalBlurMethod='dimezisBlurView'
                    style={styles.blurContainer}
                >
                    <View style={[styles.modalContent, { backgroundColor: isDark ? glassmorphism.background.dark.modal : glassmorphism.background.light.modal }]}>
                        <ModalMeshGradient />
                        <View style={styles.header}>
                            <Text style={[typography.title2, { color: colors.text, fontWeight: '700' }]}>
                                {t('home.speedtestTitle')}
                            </Text>
                            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                                <MaterialIcons name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {(clientIp !== '' || ispInfo !== '' || providerHostname !== '') && (
                            <View style={{ marginBottom: 16, alignItems: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, width: '100%' }}>
                                {ispInfo !== '' && (
                                    <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                                        <Ionicons name="earth" size={12} color={colors.textSecondary} /> <Text style={{ color: colors.text, fontWeight: '600' }}>{ispInfo}</Text>
                                    </Text>
                                )}
                                {clientIp !== '' && (
                                    <Text style={[typography.caption1, { color: colors.textSecondary, marginTop: 2 }]}>
                                        <MaterialIcons name="network-wifi" size={12} color={colors.textSecondary} /> <Text style={{ color: colors.text, fontWeight: '600' }}>{clientIp}</Text>
                                    </Text>
                                )}
                                {providerHostname !== '' && providerHostname !== clientIp && (
                                    <Text style={[typography.caption1, { color: colors.textSecondary, marginTop: 2, textAlign: 'center' }]}>
                                        <MaterialIcons name="computer" size={12} color={colors.textSecondary} /> <Text style={{ color: colors.text, fontWeight: '600' }}>{providerHostname}</Text>
                                    </Text>
                                )}
                            </View>
                        )}

                        {isRunning && (
                            <View style={[styles.progressContainer, { backgroundColor: colors.border }]}>
                                <Animated.View
                                    style={[
                                        styles.progressBar,
                                        { width: progressWidth, backgroundColor: colors.primary },
                                    ]}
                                />
                            </View>
                        )}

                        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginVertical: spacing.md }]}>
                            {getPhaseText()}
                        </Text>

                        <View style={styles.gaugesContainer}>
                            <SpeedometerGauge
                                speed={result.downloadSpeed}
                                maxSpeed={100}
                                color="#22C55E"
                                label={t('home.download')}
                                isActive={phase === 'download'}
                            />
                            <SpeedometerGauge
                                speed={result.uploadSpeed}
                                maxSpeed={50}
                                color="#3B82F6"
                                label={t('home.upload')}
                                isActive={phase === 'upload'}
                            />
                        </View>

                        <View style={[styles.statsRow, { marginTop: spacing.lg }]}>
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

                        <TouchableOpacity
                            style={[
                                styles.actionButton,
                                {
                                    backgroundColor: isRunning ? colors.error : colors.primary,
                                },
                            ]}
                            onPress={isRunning ? stopSpeedtest : (phase === 'complete' ? handleClose : runSpeedtest)}
                        >
                            <Text style={[typography.body, { color: '#FFFFFF', fontWeight: '600' }]}>
                                {isRunning ? t('common.stop') : (phase === 'complete' ? t('common.ok') : t('home.startTest'))}
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
        marginBottom: 16,
    },
    closeButton: {
        padding: 4,
    },
    progressContainer: {
        height: 4,
        borderRadius: 2,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressBar: {
        height: '100%',
        borderRadius: 2,
    },
    gaugesContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 16,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        gap: 16,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        marginTop: 24,
    },
});

export default SpeedtestModal;
