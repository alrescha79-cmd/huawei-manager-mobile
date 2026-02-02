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
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/theme';
import { useTranslation } from '@/i18n';
import { ModalMeshGradient } from './ModalMeshGradient';

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
                        borderBottomColor: color,
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
        width: 0,
        height: 0,
        borderLeftWidth: 6,
        borderRightWidth: 6,
        borderBottomWidth: 12,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
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
            setPhase('latency');

            const latencyResults: number[] = [];

            try {
                await fetch(`${CF_DOWNLOAD_URL}?bytes=0`, { signal });
            } catch { }

            for (let i = 0; i < 20; i++) {
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
                    }
                }
                setProgress((i + 1));
            }

            const validLatency = latencyResults.filter(l => l > 0 && l < 10000);
            const sorted = [...validLatency].sort((a, b) => a - b);
            const median = sorted[Math.floor(sorted.length / 2)] || 100;
            const avg = validLatency.reduce((a, b) => a + b, 0) / validLatency.length;
            const jitter = Math.sqrt(validLatency.reduce((s, l) => s + Math.pow(l - avg, 2), 0) / validLatency.length);

            setResult(prev => ({ ...prev, latency: median, jitter }));
            setProgress(20);

            setPhase('download');

            const downloadSizes = [
                { bytes: 100000, count: 1 },
                { bytes: 100000, count: 8 },
                { bytes: 1000000, count: 6 },
                { bytes: 10000000, count: 4 },
                { bytes: 25000000, count: 2 },
            ];

            const downloadSpeeds: number[] = [];
            let downloadCount = 0;
            const totalDownloads = downloadSizes.reduce((sum, s) => sum + s.count, 0);

            for (const { bytes, count } of downloadSizes) {
                if (signal.aborted) break;

                for (let i = 0; i < count; i++) {
                    if (signal.aborted) break;

                    const start = performance.now();
                    try {
                        const response = await fetch(`${CF_DOWNLOAD_URL}?bytes=${bytes}`, {
                            cache: 'no-store',
                            signal,
                        });
                        const buffer = await response.arrayBuffer();
                        const duration = (performance.now() - start) / 1000;

                        const transferSize = buffer.byteLength;
                        const speedBps = (transferSize * 8) / duration;
                        const speedMbps = speedBps / 1000000;

                        downloadSpeeds.push(speedMbps);

                        setResult(prev => ({ ...prev, downloadSpeed: speedMbps }));

                    } catch (e: any) {
                        if (e.name !== 'AbortError') {
                        }
                    }

                    downloadCount++;
                    setProgress(20 + (downloadCount / totalDownloads) * 40);
                }
            }

            const sortedSpeeds = [...downloadSpeeds].sort((a, b) => a - b);
            const p90Index = Math.floor(sortedSpeeds.length * 0.9);
            const downloadP90 = sortedSpeeds[p90Index] || sortedSpeeds[sortedSpeeds.length - 1] || 0;

            setResult(prev => ({ ...prev, downloadSpeed: downloadP90 }));
            setProgress(60);

            setPhase('upload');
            const uploadSizes = [
                { bytes: 100000, count: 4 },
                { bytes: 500000, count: 4 },
                { bytes: 1000000, count: 2 },
                { bytes: 5000000, count: 1 },
            ];

            const uploadSpeeds: number[] = [];
            let uploadCount = 0;
            const totalUploads = uploadSizes.reduce((sum, s) => sum + s.count, 0);

            const uploadUrl = 'https://postman-echo.com/post';

            for (const { bytes, count } of uploadSizes) {
                if (signal.aborted) break;

                const uploadData = new Uint8Array(bytes);
                for (let i = 0; i < bytes; i++) {
                    uploadData[i] = Math.floor(Math.random() * 256);
                }

                for (let i = 0; i < count; i++) {
                    if (signal.aborted) break;

                    const start = performance.now();
                    try {
                        await fetch(uploadUrl, {
                            method: 'POST',
                            body: uploadData,
                            headers: { 'Content-Type': 'application/octet-stream' },
                            signal,
                        });
                        const duration = (performance.now() - start) / 1000;

                        const speedBps = (bytes * 8) / duration;
                        const speedMbps = speedBps / 1000000;

                        uploadSpeeds.push(speedMbps);

                        setResult(prev => ({ ...prev, uploadSpeed: speedMbps }));

                    } catch (e: any) {
                        if (e.name !== 'AbortError') {
                        }
                    }

                    uploadCount++;
                    setProgress(60 + (uploadCount / totalUploads) * 35);
                }
            }

            const sortedUploadSpeeds = [...uploadSpeeds].sort((a, b) => a - b);
            const uploadP90Index = Math.floor(sortedUploadSpeeds.length * 0.9);
            const uploadP90 = sortedUploadSpeeds[uploadP90Index] || sortedUploadSpeeds[sortedUploadSpeeds.length - 1] || 0;

            setResult(prev => ({ ...prev, uploadSpeed: uploadP90 }));
            setProgress(100);

            setPhase('complete');
        } catch (error: any) {
            if (error.message !== 'Aborted') {
                console.error('[SPEEDTEST] Error:', error.message);
            }
            setPhase('complete');
        } finally {
            setIsRunning(false);
        }
    };

    const stopSpeedtest = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        setIsRunning(false);
        setPhase('idle');
    };

    const handleClose = () => {
        if (isRunning) {
            stopSpeedtest();
        }
        setPhase('idle');
        setProgress(0);
        setResult({ downloadSpeed: 0, uploadSpeed: 0, latency: 0, jitter: 0 });
        onClose();
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
