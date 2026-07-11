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

let updateListener: ((visible: boolean, version?: string) => void) | null = null;

export const UpdateAvailableHelper = {
    show: (version: string) => {
        if (updateListener) {
            updateListener(true, version);
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
    const { colors, typography, isDark } = useTheme();
    const { t } = useTranslation();
    const [slideAnim] = useState(new Animated.Value(0));
    const insets = useSafeAreaInsets();

    useEffect(() => {
        updateListener = (vis, ver) => {
            if (vis) {
                setVersion(ver || '');
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

                    <Text style={[typography.body, styles.description, { color: colors.textSecondary }]}>
                        {t('alerts.newVersionAvailable')}
                    </Text>

                    <TouchableOpacity
                        style={[
                            styles.primaryButton,
                            { borderRadius: 24, backgroundColor: colors.primary }
                        ]}
                        activeOpacity={0.8}
                        onPress={handleDownload}
                    >
                        <Text style={styles.primaryButtonText}>
                            {t('settings.downloadUpdate')}
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
        marginBottom: 8,
    },
    description: {
        textAlign: 'center',
        paddingHorizontal: 12,
        lineHeight: 20,
        marginBottom: 24,
    },
    primaryButton: {
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
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
    },
    secondaryButtonText: {
        fontWeight: '600',
    },
});