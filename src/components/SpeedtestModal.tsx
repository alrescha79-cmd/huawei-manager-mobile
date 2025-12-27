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

interface SpeedtestModalProps {
    visible: boolean;
    onClose: () => void;
}

interface SpeedtestResult {
    downloadSpeed: number; // in Mbps
    uploadSpeed: number; // in Mbps
    latency: number; // in ms
    jitter: number; // in ms
}

// Speedometer gauge component with smooth animation
const SpeedometerGauge: React.FC<{
    speed: number;
    maxSpeed: number;
    color: string;
    label: string;
    isActive: boolean;
}> = ({ speed, maxSpeed, color, label, isActive }) => {
    const { colors, typography, spacing } = useTheme();
    const animatedValue = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.timing(animatedValue, {
            toValue: Math.min(speed / maxSpeed, 1),
            duration: 800,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
        }).start();
    }, [speed, maxSpeed]);

    useEffect(() => {
        if (isActive) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.1,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [isActive]);

    const rotation = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['-135deg', '135deg'],
    });

    return (
        <View style={gaugeStyles.container}>
            <View style={[gaugeStyles.gaugeOuter, { borderColor: colors.border }]}>
                <Animated.View
                    style={[
                        gaugeStyles.indicator,
                        {
                            backgroundColor: color,
                            transform: [{ rotate: rotation }],
                        },
                    ]}
                />
                <Animated.View
                    style={[
                        gaugeStyles.centerCircle,
                        {
                            backgroundColor: colors.card,
                            borderColor: color,
                            transform: [{ scale: pulseAnim }],
                        },
                    ]}
                >
                    <Text style={[typography.title1, { color: colors.text, fontWeight: '700' }]}>
                        {speed.toFixed(1)}
                    </Text>
                    <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                        Mbps
                    </Text>
                </Animated.View>
            </View>
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
        width: 130,
        height: 130,
        borderRadius: 65,
        borderWidth: 8,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    indicator: {
        position: 'absolute',
        width: 4,
        height: 50,
        borderRadius: 2,
        top: 15,
        transformOrigin: 'bottom center',
    },
    centerCircle: {
        width: 90,
        height: 90,
        borderRadius: 45,
        borderWidth: 3,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

// Cloudflare speedtest endpoints
const CF_DOWNLOAD_URL = 'https://speed.cloudflare.com/__down';
const CF_UPLOAD_URL = 'https://speed.cloudflare.com/__up';

export const SpeedtestModal: React.FC<SpeedtestModalProps> = ({ visible, onClose }) => {
    const { colors, typography, spacing } = useTheme();
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
        console.log('[SPEEDTEST] === Starting Cloudflare Speed Test ===');
        setIsRunning(true);
        setProgress(0);
        setResult({ downloadSpeed: 0, uploadSpeed: 0, latency: 0, jitter: 0 });

        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        try {
            // Phase 1: Latency test using Cloudflare
            console.log('[SPEEDTEST] Phase 1: Latency test...');
            setPhase('latency');

            const latencyResults: number[] = [];

            // Initial warmup
            try {
                await fetch(`${CF_DOWNLOAD_URL}?bytes=0`, { signal });
            } catch { }

            // Run 20 latency tests
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
                    console.log(`[SPEEDTEST] Ping ${i + 1}: ${latency.toFixed(0)}ms`);
                } catch (e: any) {
                    if (e.name !== 'AbortError') {
                        console.log(`[SPEEDTEST] Ping ${i + 1} failed`);
                    }
                }
                setProgress((i + 1));
            }

            const validLatency = latencyResults.filter(l => l > 0 && l < 10000);
            const sorted = [...validLatency].sort((a, b) => a - b);
            // Use median (50th percentile) for latency
            const median = sorted[Math.floor(sorted.length / 2)] || 100;
            const avg = validLatency.reduce((a, b) => a + b, 0) / validLatency.length;
            const jitter = Math.sqrt(validLatency.reduce((s, l) => s + Math.pow(l - avg, 2), 0) / validLatency.length);

            console.log(`[SPEEDTEST] Latency: ${median.toFixed(0)}ms, Jitter: ${jitter.toFixed(1)}ms`);
            setResult(prev => ({ ...prev, latency: median, jitter }));
            setProgress(20);

            // Phase 2: Download test using Cloudflare
            console.log('[SPEEDTEST] Phase 2: Download test (Cloudflare)...');
            setPhase('download');

            // Download sizes in bytes (ramp up like Cloudflare does)
            const downloadSizes = [
                { bytes: 100000, count: 1 },    // 100KB warmup
                { bytes: 100000, count: 8 },    // 100KB x 8
                { bytes: 1000000, count: 6 },   // 1MB x 6
                { bytes: 10000000, count: 4 },  // 10MB x 4
                { bytes: 25000000, count: 2 },  // 25MB x 2
                { bytes: 50000000, count: 1 },  // 50MB x 1
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
                        const duration = (performance.now() - start) / 1000; // seconds

                        // Calculate speed: bits / seconds = bps, then convert to Mbps
                        const transferSize = buffer.byteLength;
                        const speedBps = (transferSize * 8) / duration;
                        const speedMbps = speedBps / 1000000;

                        downloadSpeeds.push(speedMbps);
                        console.log(`[SPEEDTEST] Downloaded ${(transferSize / 1024 / 1024).toFixed(2)}MB in ${duration.toFixed(2)}s = ${speedMbps.toFixed(2)} Mbps`);

                        // Update with current best speed
                        const currentMax = Math.max(...downloadSpeeds);
                        setResult(prev => ({ ...prev, downloadSpeed: currentMax }));

                    } catch (e: any) {
                        if (e.name !== 'AbortError') {
                            console.log(`[SPEEDTEST] Download failed: ${e.message}`);
                        }
                    }

                    downloadCount++;
                    setProgress(20 + (downloadCount / totalDownloads) * 40);
                }
            }

            // Calculate 90th percentile (like Cloudflare does)
            const sortedSpeeds = [...downloadSpeeds].sort((a, b) => a - b);
            const p90Index = Math.floor(sortedSpeeds.length * 0.9);
            const downloadP90 = sortedSpeeds[p90Index] || sortedSpeeds[sortedSpeeds.length - 1] || 0;

            console.log(`[SPEEDTEST] Download complete: ${downloadP90.toFixed(2)} Mbps (90th percentile)`);
            setResult(prev => ({ ...prev, downloadSpeed: downloadP90 }));
            setProgress(60);

            // Phase 3: Upload test (using postman-echo since CF __up has CORS issues in RN)
            console.log('[SPEEDTEST] Phase 3: Upload test...');
            setPhase('upload');

            // Upload sizes in bytes - smaller sizes for faster results
            const uploadSizes = [
                { bytes: 100000, count: 4 },    // 100KB x 4
                { bytes: 500000, count: 4 },    // 500KB x 4
                { bytes: 1000000, count: 2 },   // 1MB x 2
                { bytes: 5000000, count: 1 },   // 5MB x 1
            ];

            const uploadSpeeds: number[] = [];
            let uploadCount = 0;
            const totalUploads = uploadSizes.reduce((sum, s) => sum + s.count, 0);

            // Use postman-echo as upload target (reliable and fast)
            const uploadUrl = 'https://postman-echo.com/post';

            for (const { bytes, count } of uploadSizes) {
                if (signal.aborted) break;

                // Create data for this size
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
                        console.log(`[SPEEDTEST] Uploaded ${(bytes / 1024).toFixed(0)}KB in ${duration.toFixed(2)}s = ${speedMbps.toFixed(2)} Mbps`);

                        const currentMax = Math.max(...uploadSpeeds);
                        setResult(prev => ({ ...prev, uploadSpeed: currentMax }));

                    } catch (e: any) {
                        if (e.name !== 'AbortError') {
                            console.log(`[SPEEDTEST] Upload failed: ${e.message}`);
                        }
                    }

                    uploadCount++;
                    setProgress(60 + (uploadCount / totalUploads) * 35);
                }
            }

            // Calculate 90th percentile for upload
            const sortedUploadSpeeds = [...uploadSpeeds].sort((a, b) => a - b);
            const uploadP90Index = Math.floor(sortedUploadSpeeds.length * 0.9);
            const uploadP90 = sortedUploadSpeeds[uploadP90Index] || sortedUploadSpeeds[sortedUploadSpeeds.length - 1] || 0;

            console.log(`[SPEEDTEST] Upload complete: ${uploadP90.toFixed(2)} Mbps (90th percentile)`);
            setResult(prev => ({ ...prev, uploadSpeed: uploadP90 }));
            setProgress(100);

            console.log('[SPEEDTEST] === Test Complete ===');
            console.log(`[SPEEDTEST] Results: DL ${downloadP90.toFixed(2)} Mbps, UL ${uploadP90.toFixed(2)} Mbps, Ping ${median.toFixed(0)}ms`);
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
                <BlurView intensity={Platform.OS === 'ios' ? 40 : 100} style={styles.blurContainer}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card + 'EE' }]}>
                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={[typography.title2, { color: colors.text, fontWeight: '700' }]}>
                                {t('home.speedtestTitle')}
                            </Text>
                            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                                <MaterialIcons name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {/* Progress bar */}
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

                        {/* Phase indicator */}
                        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginVertical: spacing.md }]}>
                            {getPhaseText()}
                        </Text>

                        {/* Speedometers */}
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

                        {/* Latency & Jitter */}
                        <View style={[styles.statsRow, { marginTop: spacing.lg }]}>
                            <View style={[styles.statItem, { backgroundColor: colors.background }]}>
                                <MaterialIcons name="timer" size={20} color={colors.primary} />
                                <Text style={[typography.caption1, { color: colors.textSecondary, marginTop: 4 }]}>
                                    {t('home.latency')}
                                </Text>
                                <Text style={[typography.headline, { color: colors.text, fontWeight: '600' }]}>
                                    {result.latency.toFixed(0)} ms
                                </Text>
                            </View>
                            <View style={[styles.statItem, { backgroundColor: colors.background }]}>
                                <MaterialIcons name="trending-up" size={20} color={colors.success} />
                                <Text style={[typography.caption1, { color: colors.textSecondary, marginTop: 4 }]}>
                                    {t('home.jitter')}
                                </Text>
                                <Text style={[typography.headline, { color: colors.text, fontWeight: '600' }]}>
                                    {result.jitter.toFixed(1)} ms
                                </Text>
                            </View>
                        </View>

                        {/* Action Button */}
                        <TouchableOpacity
                            style={[
                                styles.actionButton,
                                {
                                    backgroundColor: isRunning ? colors.error : colors.primary,
                                },
                            ]}
                            onPress={isRunning ? stopSpeedtest : (phase === 'complete' ? handleClose : runSpeedtest)}
                        >
                            <MaterialIcons
                                name={isRunning ? 'stop' : (phase === 'complete' ? 'check' : 'speed')}
                                size={24}
                                color="#FFFFFF"
                            />
                            <Text style={[typography.body, { color: '#FFFFFF', fontWeight: '600', marginLeft: 8 }]}>
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
        backgroundColor: 'rgba(0,0,0,0.5)',
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
