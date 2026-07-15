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
import { ModalButton } from './ModalButton';

interface AdBlockAlertModalProps {
    visible?: boolean;
    onClose?: () => void;
}

const ADBLOCK_ALERT_KEY = 'last_adblock_alert_time';
const COOLDOWN_MS = 1 * 60 * 60 * 1000; // 1 hours

let adblockListener: ((visible: boolean) => void) | null = null;
let hasShownAdblockAlert = false;
let isAlertRequestPendingOrShown = false;

export const setAdblockListener = (listener: (visible: boolean) => void) => {
    adblockListener = listener;
};

export const AdBlockAlertHelper = {
    show: async () => {
        if (isAlertRequestPendingOrShown) return;
        isAlertRequestPendingOrShown = true;
        try {
            const lastShownStr = await AsyncStorage.getItem(ADBLOCK_ALERT_KEY);
            const now = Date.now();
            if (lastShownStr) {
                const lastShown = parseInt(lastShownStr, 10);
                if (now - lastShown < COOLDOWN_MS) {
                    isAlertRequestPendingOrShown = false;
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
        isAlertRequestPendingOrShown = false;
        if (adblockListener) {
            adblockListener(false);
        }
    },
    reset: () => {
        hasShownAdblockAlert = false;
        isAlertRequestPendingOrShown = false;
    }
};

export const AdBlockAlertModal: React.FC<AdBlockAlertModalProps> = () => {
    const [visible, setVisible] = useState(false);
    const { colors, typography, isDark, borderRadius, glassmorphism } = useTheme();
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
            setAdblockListener(() => { });
        };
    }, [slideAnim]);

    const handleClose = () => {
        AdBlockAlertHelper.hide();
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
                        backgroundColor: isDark ? 'rgba(28, 28, 30, 0.98)' : 'rgba(255, 255, 255, 0.98)',
                        borderColor: colors.border,
                        paddingBottom: Math.max(insets.bottom, 20) + 28,
                    }
                ]}>
                    <View style={[styles.dragHandle, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)' }]} />

                    <View style={[
                        styles.iconContainer,
                        {
                            borderColor: colors.error + '25',
                            backgroundColor: isDark ? `${colors.error}10` : `${colors.error}05`,
                            borderWidth: 1.5,
                        }
                    ]}>
                        <Ionicons name="shield-outline" size={32} color={colors.error} />
                    </View>

                    <Text style={[typography.headline, styles.title, { color: colors.text }]}>
                        {t('ads.modalTitle')}
                    </Text>

                    <Text style={[typography.body, styles.description, { color: colors.textSecondary }]}>
                        {t('ads.modalDescription')}
                    </Text>

                    {/* How to disable AdBlock Header */}
                    <View style={styles.troubleHeader}>
                        <View style={[styles.troubleDot, { backgroundColor: colors.primary }]} />
                        <Text style={[typography.caption1, styles.troubleHeaderText, { color: colors.textSecondary }]}>
                            {t('ads.stepsTitle').toUpperCase()}
                        </Text>
                    </View>

                    {/* Step Cards List */}
                    <View style={styles.troubleList}>
                        {/* Step 1 */}
                        <View style={[styles.troubleCard, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)' }]}>
                            <View style={[styles.troubleIconContainer, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)' }]}>
                                <Text style={[typography.body, { color: colors.primary, fontWeight: 'bold', fontSize: 15 }]}>1</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[typography.caption1, { color: colors.text, fontSize: 13, lineHeight: 18 }]}>
                                    {t('ads.step1')}
                                </Text>
                            </View>
                        </View>

                        {/* Step 2 */}
                        <View style={[styles.troubleCard, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)' }]}>
                            <View style={[styles.troubleIconContainer, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)' }]}>
                                <Text style={[typography.body, { color: colors.primary, fontWeight: 'bold', fontSize: 15 }]}>2</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[typography.caption1, { color: colors.text, fontSize: 13, lineHeight: 18 }]}>
                                    {t('ads.step2')}
                                </Text>
                            </View>
                        </View>

                        {/* Step 3 */}
                        <View style={[styles.troubleCard, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)' }]}>
                            <View style={[styles.troubleIconContainer, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)' }]}>
                                <Text style={[typography.body, { color: colors.primary, fontWeight: 'bold', fontSize: 15 }]}>3</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[typography.caption1, { color: colors.text, fontSize: 13, lineHeight: 18 }]}>
                                    {t('ads.step3')}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <ModalButton
                        title={t('ads.btnIHaveDisabled')}
                        variant="danger"
                        onPress={handleClose}
                        style={{ borderRadius: 14, marginTop: 12 }}
                    />

                    <ModalButton
                        title={t('ads.btnLater')}
                        variant="secondary"
                        onPress={handleClose}
                        style={{ marginTop: 4, marginBottom: 12 }}
                    />
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
        borderRadius: 32,
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
    troubleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        marginBottom: 10,
        marginTop: 12,
    },
    troubleDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    troubleHeaderText: {
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    troubleList: {
        width: '100%',
        gap: 8,
        marginBottom: 16,
    },
    troubleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 14,
        padding: 12,
        gap: 12,
    },
    troubleIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    guaranteeText: {
        textAlign: 'center',
        fontSize: 10,
        lineHeight: 14,
        paddingHorizontal: 8,
        opacity: 0.6,
    },
});
