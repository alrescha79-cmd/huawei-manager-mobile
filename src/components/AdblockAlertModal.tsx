import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Platform,
    Animated,
    TouchableWithoutFeedback,
} from 'react-native';
import { useTheme } from '@/theme';
import { useTranslation } from '@/i18n';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AdblockAlertModalProps {
    visible?: boolean;
    onClose?: () => void;
}

const ADBLOCK_ALERT_KEY = 'last_adblock_alert_time';
const COOLDOWN_MS = 1 * 60 * 60 * 1000; // 1 hours

let adblockListener: ((visible: boolean) => void) | null = null;
let hasShownAdblockAlert = false;

export const setAdblockListener = (listener: (visible: boolean) => void) => {
    adblockListener = listener;
};

export const AdblockAlertHelper = {
    show: async () => {
        try {
            const lastShownStr = await AsyncStorage.getItem(ADBLOCK_ALERT_KEY);
            const now = Date.now();
            if (lastShownStr) {
                const lastShown = parseInt(lastShownStr, 10);
                if (now - lastShown < COOLDOWN_MS) {
                    return;
                }
            }
            await AsyncStorage.setItem(ADBLOCK_ALERT_KEY, now.toString());
            hasShownAdblockAlert = true;
            if (adblockListener) {
                adblockListener(true);
            }
        } catch (e) {
            if (!hasShownAdblockAlert) {
                hasShownAdblockAlert = true;
                if (adblockListener) {
                    adblockListener(true);
                }
            }
        }
    },
    hide: () => {
        if (adblockListener) {
            adblockListener(false);
        }
    },
    reset: () => {
        hasShownAdblockAlert = false;
    }
};

export const AdblockAlertModal: React.FC<AdblockAlertModalProps> = () => {
    const [visible, setVisible] = useState(false);
    const { colors, typography, isDark, borderRadius } = useTheme();
    const { t } = useTranslation();
    const [slideAnim] = useState(new Animated.Value(0));
    const insets = useSafeAreaInsets();

    useEffect(() => {
        setAdblockListener((vis) => {
            if (vis) {
                setVisible(true);
                Animated.timing(slideAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }).start();
            } else {
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver: true,
                }).start(() => {
                    setVisible(false);
                });
            }
        });
        return () => {
            setAdblockListener(() => {});
        };
    }, [slideAnim]);

    const handleClose = () => {
        AdblockAlertHelper.hide();
    };

    if (!visible) return null;

    const screenHeight = Dimensions.get('window').height;
    const translateY = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [screenHeight, 0],
    });

    const backdropOpacity = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
    });

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <TouchableWithoutFeedback onPress={handleClose}>
                    <Animated.View style={[
                        styles.backdrop,
                        {
                            opacity: backdropOpacity,
                            backgroundColor: isDark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(0, 0, 0, 0.45)',
                        }
                    ]} />
                </TouchableWithoutFeedback>

                <Animated.View style={[
                    styles.sheetContainer,
                    {
                        transform: [{ translateY }],
                        backgroundColor: isDark ? '#1c1c1e' : '#ffffff',
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
                        paddingBottom: Math.max(insets.bottom, 20) + 28,
                    }
                ]}>
                    {/* Top drag handle indicator */}
                    <View style={[styles.dragHandle, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)' }]} />

                    {/* Shield Icon Container */}
                    <View style={[
                        styles.iconContainer,
                        { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)' }
                    ]}>
                        <Ionicons name="shield-outline" size={32} color="#EF4444" />
                    </View>

                    {/* Title */}
                    <Text style={[typography.headline, styles.title, { color: colors.text }]}>
                        {t('ads.modalTitle')}
                    </Text>

                    {/* Description */}
                    <Text style={[typography.body, styles.description, { color: colors.textSecondary }]}>
                        {t('ads.modalDescription')}
                    </Text>

                    {/* Guide Card */}
                    <View style={[
                        styles.guideCard,
                        {
                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                            borderColor: colors.border,
                        }
                    ]}>
                        <View style={styles.guideHeader}>
                            <MaterialIcons name="verified-user" size={18} color={colors.primary} />
                            <Text style={[typography.body, styles.guideTitle, { color: colors.text }]}>
                                {t('ads.stepsTitle')}
                            </Text>
                        </View>
                        <View style={styles.stepsContainer}>
                            <Text style={[typography.footnote, styles.stepText, { color: colors.textSecondary }]}>
                                1. {t('ads.step1')}
                            </Text>
                            <Text style={[typography.footnote, styles.stepText, { color: colors.textSecondary }]}>
                                2. {t('ads.step2')}
                            </Text>
                            <Text style={[typography.footnote, styles.stepText, { color: colors.textSecondary }]}>
                                3. {t('ads.step3')}
                            </Text>
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <TouchableOpacity
                        style={[styles.primaryButton, { borderRadius: borderRadius.md }]}
                        activeOpacity={0.8}
                        onPress={handleClose}
                    >
                        <Text style={styles.primaryButtonText}>
                            {t('ads.btnIHaveDisabled')}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryButton}
                        activeOpacity={0.7}
                        onPress={handleClose}
                    >
                        <Text style={[typography.body, styles.secondaryButtonText, { color: colors.textSecondary }]}>
                            {t('ads.btnLater')}
                        </Text>
                    </TouchableOpacity>

                    {/* Guarantee Text Notice */}
                    <Text style={[styles.guaranteeText, { color: colors.textSecondary }]}>
                        {t('ads.guaranteeNotice')}
                    </Text>
                </Animated.View>
            </View>
        </Modal>
    );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    sheetContainer: {
        width: '100%',
        maxWidth: width > 500 ? 460 : undefined,
        alignSelf: 'center',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderWidth: 1,
        borderBottomWidth: 0,
        paddingHorizontal: 24,
        paddingTop: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 24,
    },
    dragHandle: {
        width: 38,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginVertical: 12,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginTop: 8,
        marginBottom: 16,
    },
    title: {
        textAlign: 'center',
        fontWeight: 'bold',
        marginBottom: 8,
    },
    description: {
        textAlign: 'center',
        paddingHorizontal: 12,
        lineHeight: 20,
        marginBottom: 20,
    },
    guideCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        marginBottom: 24,
    },
    guideHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    guideTitle: {
        fontWeight: '600',
    },
    stepsContainer: {
        gap: 8,
    },
    stepText: {
        lineHeight: 18,
    },
    primaryButton: {
        backgroundColor: '#EF4444',
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    primaryButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    secondaryButton: {
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
        marginBottom: 12,
    },
    secondaryButtonText: {
        fontWeight: '600',
    },
    guaranteeText: {
        textAlign: 'center',
        fontSize: 10,
        lineHeight: 14,
        paddingHorizontal: 8,
        opacity: 0.6,
    },
});
