import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Animated,
    TouchableWithoutFeedback,
} from 'react-native';
import { useTheme } from '@/theme';
import { useTranslation } from '@/i18n';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ModalButton } from './ModalButton';

let updateListener: ((visible: boolean, version?: string, isPreRelease?: boolean) => void) | null = null;

export const UpdateAvailableHelper = {
    show: (version: string, isPreRelease?: boolean) => {
        if (updateListener) {
            updateListener(true, version, isPreRelease);
        }
    },
    hide: () => {
        if (updateListener) {
            updateListener(false);
        }
    }
};

interface UpdateAvailableModalProps {
    onDownload?: () => void;
}

export const UpdateAvailableModal: React.FC<UpdateAvailableModalProps> = ({ onDownload }) => {
    const [visible, setVisible] = useState(false);
    const [version, setVersion] = useState('');
    const [isPreRelease, setIsPreRelease] = useState(false);
    const { colors, typography, isDark } = useTheme();
    const { t } = useTranslation();
    const [slideAnim] = useState(new Animated.Value(0));
    const insets = useSafeAreaInsets();

    useEffect(() => {
        updateListener = (vis, ver, preRelease) => {
            if (vis) {
                setVersion(ver || '');
                setIsPreRelease(preRelease || false);
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
                    setVersion('');
                    setIsPreRelease(false);
                });
            }
        };
        return () => {
            updateListener = null;
        };
    }, [slideAnim]);

    const handleClose = () => {
        UpdateAvailableHelper.hide();
    };

    const handleDownload = () => {
        UpdateAvailableHelper.hide();
        setTimeout(() => {
            onDownload?.();
        }, 250);
    };

    if (!visible) return null;

    const screenHeight = Dimensions.get('window').height;
    const translateY = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [screenHeight, 0],
    });

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
            <View style={styles.overlay}>
                <TouchableWithoutFeedback onPress={handleClose}>
                    <Animated.View style={[
                        styles.backdrop,
                        { opacity: slideAnim, backgroundColor: isDark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(0, 0, 0, 0.45)' }
                    ]} />
                </TouchableWithoutFeedback>

                <Animated.View style={[
                    styles.sheetContainer,
                    {
                        transform: [{ translateY }],
                        backgroundColor: isDark ? 'rgba(28, 28, 30, 0.98)' : 'rgba(255, 255, 255, 0.98)',
                        borderColor: colors.border,
                        paddingBottom: Math.max(insets.bottom, 20) + 28,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: -4 },
                        shadowOpacity: 0.15,
                        shadowRadius: 12,
                        elevation: 24,
                    }
                ]}>
                    <View style={[styles.dragHandle, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)' }]} />

                    <View style={[
                        styles.iconContainer,
                        {
                            borderColor: colors.primary + '25',
                            backgroundColor: isDark ? `${colors.primary}10` : `${colors.primary}05`,
                            borderWidth: 1.5,
                        }
                    ]}>
                        <Ionicons name="download-outline" size={32} color={colors.primary} />
                    </View>

                    <Text style={[typography.headline, styles.title, { color: colors.text }]}>
                        {t('settings.updateAvailable')} {version ? `v${version}` : ''}
                    </Text>

                    {isPreRelease && (
                        <View style={[styles.preReleaseBadge, { backgroundColor: colors.warning + '20', borderColor: colors.warning + '40' }]}>
                            <Ionicons name="flask-outline" size={13} color={colors.warning} />
                            <Text style={[typography.caption1, { color: colors.warning, fontWeight: '600', marginLeft: 4 }]}>
                                {t('notifications.preReleaseBadge')}
                            </Text>
                        </View>
                    )}

                    <Text style={[typography.body, styles.description, { color: colors.textSecondary }]}>
                        {t('alerts.newVersionAvailable')}
                    </Text>

                    <ModalButton
                        title={t('settings.downloadUpdate')}
                        variant="primary"
                        onPress={handleDownload}
                        style={{ borderRadius: 24 }}
                    />

                    <ModalButton
                        title={t('ads.btnLater')}
                        variant="secondary"
                        onPress={handleClose}
                        style={{ marginTop: 4 }}
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
        marginBottom: 4,
    },
    preReleaseBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 12,
    },
    description: {
        textAlign: 'center',
        paddingHorizontal: 12,
        lineHeight: 20,
        marginBottom: 24,
    },
});