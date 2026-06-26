import React, { useState, useEffect } from 'react';
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
    Linking,
    ScrollView,
} from 'react-native';
import { useTheme } from '@/theme';
import { useTranslation } from '@/i18n';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CHANGELOG_MD from '../../changelog.md';

interface ChangelogModalProps {
    visible?: boolean;
    onClose?: () => void;
}

let changelogListener: ((visible: boolean) => void) | null = null;

export const setChangelogListener = (listener: (visible: boolean) => void) => {
    changelogListener = listener;
};

export const ChangelogHelper = {
    show: () => {
        if (changelogListener) {
            changelogListener(true);
        }
    },
    hide: () => {
        if (changelogListener) {
            changelogListener(false);
        }
    },
};

export const ChangelogModal: React.FC<ChangelogModalProps> = () => {
    const [visible, setVisible] = useState(false);
    const { colors, typography, isDark, borderRadius } = useTheme();
    const { t, language } = useTranslation();
    const [slideAnim] = useState(new Animated.Value(0));
    const insets = useSafeAreaInsets();

    const currentVersion = Constants.expoConfig?.version || '1.1.28';
    const GITHUB_REPO_URL = 'https://github.com/alrescha79-cmd/huawei-manager-mobile';
    const RELEASE_URL = `${GITHUB_REPO_URL}/releases/tag/v${currentVersion}`;

    useEffect(() => {
        setChangelogListener((vis) => {
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
            setChangelogListener(() => { });
        };
    }, [slideAnim]);

    const handleClose = () => {
        ChangelogHelper.hide();
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

    const renderMarkdown = (text: string) => {
        return text.split('\n').map((line, lineIndex) => {
            const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
            const content = isBullet ? line.trim().replace(/^[-*]\s+/, '') : line.trim();

            if (!content) return null;

            // Match **Header** Description
            const boldMatch = content.match(/^\*\*(.*?)\*\*(.*)/);
            if (boldMatch) {
                const title = boldMatch[1].trim();
                const description = boldMatch[2].trim();

                if (isBullet) {
                    return (
                        <View key={lineIndex} style={styles.bulletRow}>
                            <Text style={[typography.body, { color: colors.primary, marginRight: 8, marginTop: 2 }]}>•</Text>
                            <View style={{ flex: 1 }}>
                                <Text style={[typography.body, { fontWeight: '700', color: colors.text, marginBottom: 2 }]}>
                                    {title}
                                </Text>
                                {description ? (
                                    <Text style={[typography.subheadline, { color: colors.textSecondary, lineHeight: 18 }]}>
                                        {description}
                                    </Text>
                                ) : null}
                            </View>
                        </View>
                    );
                } else {
                    return (
                        <View key={lineIndex} style={{ marginBottom: 12 }}>
                            <Text style={[typography.body, { fontWeight: '700', color: colors.text, marginBottom: 2 }]}>
                                {title}
                            </Text>
                            {description ? (
                                <Text style={[typography.subheadline, { color: colors.textSecondary, lineHeight: 18 }]}>
                                    {description}
                                </Text>
                            ) : null}
                        </View>
                    );
                }
            }

            // Fallback for standard text formatting
            const parts = content.split('**');
            const elements = parts.map((part, index) => {
                const isBold = index % 2 === 1;
                return (
                    <Text
                        key={index}
                        style={{
                            fontWeight: isBold ? '700' : '400',
                            color: isBold ? colors.text : colors.textSecondary,
                        }}
                    >
                        {part}
                    </Text>
                );
            });

            if (isBullet) {
                return (
                    <View key={lineIndex} style={styles.bulletRow}>
                        <Text style={[typography.body, { color: colors.primary, marginRight: 8 }]}>•</Text>
                        <Text style={[typography.body, { flex: 1, lineHeight: 20 }]}>
                            {elements}
                        </Text>
                    </View>
                );
            }

            return (
                <Text key={lineIndex} style={[typography.body, { lineHeight: 20, marginBottom: 8, color: colors.text }]}>
                    {elements}
                </Text>
            );
        });
    };

    const changelogText = (() => {
        const enMatch = CHANGELOG_MD.match(/#\s*EN\s*\n([\s\S]*?)(?=#\s*ID|$)/i);
        const idMatch = CHANGELOG_MD.match(/#\s*ID\s*\n([\s\S]*?)$/i);
        const enText = enMatch ? enMatch[1].trim() : '';
        const idText = idMatch ? idMatch[1].trim() : '';
        return language === 'id' ? idText : enText;
    })();

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
                    <View style={[styles.dragHandle, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)' }]} />

                    <View style={[
                        styles.iconContainer,
                        { backgroundColor: isDark ? 'rgba(52, 199, 89, 0.12)' : 'rgba(52, 199, 89, 0.08)' }
                    ]}>
                        <Ionicons name="rocket-outline" size={32} color="#34C759" />
                    </View>

                    <Text style={[typography.headline, styles.title, { color: colors.text }]}>
                        {language === 'id' ? 'Berhasil Diperbarui!' : 'Successfully Updated!'}
                    </Text>

                    <Text style={[typography.subheadline, styles.subtitle, { color: colors.primary, fontWeight: '700' }]}>
                        v{currentVersion}
                    </Text>

                    <View style={styles.scrollArea}>
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                            {renderMarkdown(changelogText)}
                        </ScrollView>
                    </View>

                    <View style={styles.buttonGroup}>
                        <TouchableOpacity
                            style={[styles.primaryButton, { borderRadius: borderRadius.md, backgroundColor: colors.primary }]}
                            activeOpacity={0.8}
                            onPress={async () => {
                                Linking.openURL(GITHUB_REPO_URL);
                            }}
                        >
                            <Text style={styles.primaryButtonText}>
                                {language === 'id' ? 'Beri Bintang' : 'Give Star'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.outlineButton, { borderRadius: borderRadius.md, borderColor: colors.border }]}
                            activeOpacity={0.7}
                            onPress={async () => {
                                Linking.openURL(RELEASE_URL);
                            }}
                        >
                            <Text style={[typography.body, styles.outlineButtonText, { color: colors.text }]}>
                                {language === 'id' ? 'Lihat Changelog Lengkap' : 'View Full Changelog'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.closeButton}
                            activeOpacity={0.7}
                            onPress={handleClose}
                        >
                            <Text style={[typography.body, styles.closeButtonText, { color: colors.textSecondary }]}>
                                {language === 'id' ? 'Lanjutkan' : 'Continue'}
                            </Text>
                        </TouchableOpacity>
                    </View>
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
        height: '85%',
        maxWidth: width > 500 ? 460 : undefined,
        alignSelf: 'center',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
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
        marginBottom: 12,
    },
    title: {
        textAlign: 'center',
        fontWeight: 'bold',
        marginBottom: 4,
    },
    subtitle: {
        textAlign: 'center',
        marginBottom: 16,
    },
    scrollArea: {
        maxHeight: 400,
        marginBottom: 20,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        padding: 12,
        backgroundColor: 'rgba(0,0,0,0.01)',
    },
    scrollContent: {
        flexGrow: 1,
    },
    bulletRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    buttonGroup: {
        gap: 8,
    },
    primaryButton: {
        flexDirection: 'row',
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 2,
    },
    primaryButtonText: {
        color: '#ffffff',
        fontSize: 15,
        fontWeight: 'bold',
    },
    outlineButton: {
        borderWidth: 1,
        paddingVertical: 13,
        alignItems: 'center',
        justifyContent: 'center',
    },
    outlineButtonText: {
        fontWeight: '600',
        fontSize: 14,
    },
    closeButton: {
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
    },
    closeButtonText: {
        fontWeight: '600',
        fontSize: 14,
    },
});
