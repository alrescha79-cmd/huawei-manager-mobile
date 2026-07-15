import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Animated,
} from 'react-native';
import { useTheme } from '@/theme';
import { useTranslation } from '@/i18n';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ModalButton } from '../ModalButton';

interface NoSignalModalProps {
    visible: boolean;
    onRetry: () => void;
    isRetrying: boolean;
}

export const NoSignalModal: React.FC<NoSignalModalProps> = ({
    visible,
    onRetry,
    isRetrying,
}) => {
    const { colors, typography, isDark, borderRadius, glassmorphism } = useTheme();
    const { t } = useTranslation();
    const [sheetVisible, setSheetVisible] = useState(false);
    const [shouldShow, setShouldShow] = useState(false);
    const [slideAnim] = useState(new Animated.Value(0));
    const insets = useSafeAreaInsets();

    useEffect(() => {
        let timeout: NodeJS.Timeout;
        if (visible) {
            timeout = setTimeout(() => {
                setShouldShow(true);
            }, 3500);
        } else {
            setShouldShow(false);
        }
        return () => clearTimeout(timeout);
    }, [visible]);

    useEffect(() => {
        if (shouldShow) {
            setSheetVisible(true);
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
                setSheetVisible(false);
            });
        }
    }, [shouldShow, slideAnim]);

    if (!sheetVisible && !shouldShow) return null;

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
            visible={sheetVisible}
            transparent
            animationType="none"
            onRequestClose={() => { }}
        >
            <View style={styles.overlay}>
                <Animated.View style={[
                    styles.backdrop,
                    {
                        opacity: backdropOpacity,
                        backgroundColor: isDark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(0, 0, 0, 0.45)',
                    }
                ]} />

                <Animated.View style={[
                    styles.sheetContainer,
                    {
                        transform: [{ translateY }],
                        backgroundColor: isDark ? 'rgba(28, 28, 30, 0.98)' : 'rgba(255, 255, 255, 0.98)',
                        borderColor: colors.border,
                        paddingBottom: Math.max(insets.bottom, 20) + 28,
                    }
                ]}>
                    {/* Top drag handle indicator */}
                    <View style={[styles.dragHandle, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)' }]} />

                    {/* Cellular Off Icon Container */}
                    <View style={[
                        styles.iconContainer,
                        {
                            backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)',
                            borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)',
                            borderWidth: 1.5,
                        }
                    ]}>
                        <MaterialCommunityIcons name="access-point-network-off" size={32} color={colors.error} />
                    </View>

                    {/* Title */}
                    <Text style={[typography.headline, styles.title, { color: colors.text, fontSize: 22, fontWeight: 'bold' }]}>
                        {t('alerts.noSignalData')}
                    </Text>

                    {/* Description */}
                    <Text style={[typography.body, styles.description, { color: colors.textSecondary, fontSize: 15, paddingHorizontal: 16 }]}>
                        {t('alerts.noSignalMessage')}
                    </Text>

                    {/* Suggested Troubleshooting Header */}
                    <View style={styles.troubleHeader}>
                        <View style={[styles.troubleDot, { backgroundColor: colors.warning }]} />
                        <Text style={[typography.caption1, styles.troubleHeaderText, { color: colors.textSecondary }]}>
                            {t('alerts.suggestedTroubleshooting').toUpperCase()}
                        </Text>
                    </View>

                    {/* Suggested Troubleshooting List */}
                    <View style={styles.troubleList}>
                        {/* Cause 1 */}
                        <View style={[styles.troubleCard, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)' }]}>
                            <View style={[styles.troubleIconContainer, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)' }]}>
                                <MaterialIcons name="login" size={20} color={colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[typography.body, { color: colors.text, fontWeight: 'bold', fontSize: 14 }]}>
                                    {t('alerts.notLoggedIn')}
                                </Text>
                                <Text style={[typography.caption1, { color: colors.textSecondary, marginTop: 2, fontSize: 12 }]}>
                                    {t('alerts.notLoggedInSub')}
                                </Text>
                            </View>
                        </View>

                        {/* Cause 2 */}
                        <View style={[styles.troubleCard, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)' }]}>
                            <View style={[styles.troubleIconContainer, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)' }]}>
                                <MaterialIcons name="hourglass-empty" size={20} color={colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[typography.body, { color: colors.text, fontWeight: 'bold', fontSize: 14 }]}>
                                    {t('alerts.sessionExpired')}
                                </Text>
                                <Text style={[typography.caption1, { color: colors.textSecondary, marginTop: 2, fontSize: 12 }]}>
                                    {t('alerts.sessionExpiredSub')}
                                </Text>
                            </View>
                        </View>

                        {/* Cause 3 */}
                        <View style={[styles.troubleCard, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)' }]}>
                            <View style={[styles.troubleIconContainer, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)' }]}>
                                <MaterialIcons name="mobile-off" size={20} color={colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[typography.body, { color: colors.text, fontWeight: 'bold', fontSize: 14 }]}>
                                    {t('alerts.modemNotResponding')}
                                </Text>
                                <Text style={[typography.caption1, { color: colors.textSecondary, marginTop: 2, fontSize: 12 }]}>
                                    {t('alerts.modemNotRespondingSub')}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Action Button */}
                    <ModalButton
                        title={isRetrying ? t('common.retrying') : t('common.retryConnection')}
                        variant="primary"
                        loading={isRetrying}
                        onPress={onRetry}
                        style={{ borderRadius: 24, marginTop: 12 }}
                    />
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
    troubleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        marginTop: 8,
    },
    troubleDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 8,
    },
    troubleHeaderText: {
        letterSpacing: 1,
        fontWeight: '700',
    },
    troubleList: {
        gap: 10,
        marginBottom: 16,
    },
    troubleCard: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    troubleIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
