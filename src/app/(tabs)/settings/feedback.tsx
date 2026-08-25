import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useTranslation } from '@/i18n';
import { useModemStore } from '@/stores/modem.store';
import {
    MeshGradientBackground,
    AnimatedScreen,
    Button,
    Card,
    ToastHelper,
    AdNative,
} from '@/components';
import { KeyboardAnimatedView } from '@/components/sms/KeyboardAnimatedView';
import { PageHeader } from '@/components/settings';
import { sendFeedback } from '@/services/feedback.service';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GITHUB_BUG_URL = 'https://github.com/alrescha79-cmd/huawei-manager-mobile/issues/new?assignees=alrescha79-cmd&labels=bug&projects=&template=bug_report.md';

export default function FeedbackScreen() {
    const router = useRouter();
    const { colors, typography, borderRadius } = useTheme();
    const { t } = useTranslation();
    const modemInfo = useModemStore((s) => s.modemInfo);

    const [type, setType] = useState<'bug' | 'feature'>('bug');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [modem, setModem] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<{ email?: string; message?: string }>({});

    const startedAtRef = useRef<number>(Date.now());

    useEffect(() => {
        if (modemInfo?.deviceName && !modem) {
            setModem(modemInfo.deviceName);
        }
    }, [modemInfo, modem]);

    const validate = () => {
        const nextErrors: { email?: string; message?: string } = {};
        const trimmedEmail = email.trim();
        const trimmedMessage = message.trim();

        if (!trimmedEmail) {
            nextErrors.email = t('settings.feedbackInvalidEmail');
        } else if (!EMAIL_REGEX.test(trimmedEmail)) {
            nextErrors.email = t('settings.feedbackInvalidEmail');
        }

        if (!trimmedMessage || trimmedMessage.length < 5) {
            nextErrors.message = t('settings.feedbackMessageRequired');
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        setIsSubmitting(true);
        try {
            const res = await sendFeedback({
                name,
                email,
                type,
                modem,
                message,
                startedAt: startedAtRef.current,
            });

            if (res.success) {
                ToastHelper.success(t('settings.feedbackSuccess'));
                setMessage('');
                startedAtRef.current = Date.now();
                setTimeout(() => {
                    if (router.canGoBack()) {
                        router.back();
                    }
                }, 1200);
            } else {
                ToastHelper.error(res.message || t('settings.feedbackError'));
            }
        } catch {
            ToastHelper.error(t('settings.feedbackError'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatedScreen noAnimation>
            <MeshGradientBackground>
                <PageHeader title={t('settings.feedbackTitle')} showBackButton />
                <KeyboardAnimatedView style={{ flex: 1 }}>
                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Subtitle / intro */}
                        <Text style={[typography.caption1, { color: colors.textSecondary, marginBottom: 16, lineHeight: 18 }]}>
                            {t('settings.feedbackSubtitle')}
                        </Text>

                        {/* Type selector (Bug vs Feature) */}
                        <View style={styles.section}>
                            <Text style={[typography.caption1, styles.label, { color: colors.textSecondary }]}>
                                {t('settings.feedbackType')}
                            </Text>
                            <View style={[styles.typeSelectorRow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: borderRadius.md }]}>
                                <TouchableOpacity
                                    style={[
                                        styles.typeTab,
                                        type === 'bug' && { backgroundColor: colors.primary, borderRadius: borderRadius.sm },
                                    ]}
                                    onPress={() => setType('bug')}
                                    activeOpacity={0.8}
                                >
                                    <MaterialIcons
                                        name="bug-report"
                                        size={18}
                                        color={type === 'bug' ? '#FFFFFF' : colors.textSecondary}
                                        style={{ marginRight: 6 }}
                                    />
                                    <Text
                                        style={[
                                            typography.caption1,
                                            {
                                                color: type === 'bug' ? '#FFFFFF' : colors.text,
                                                fontWeight: type === 'bug' ? '700' : '500',
                                            },
                                        ]}
                                    >
                                        {t('settings.feedbackTypeBug')}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.typeTab,
                                        type === 'feature' && { backgroundColor: colors.primary, borderRadius: borderRadius.sm },
                                    ]}
                                    onPress={() => setType('feature')}
                                    activeOpacity={0.8}
                                >
                                    <MaterialIcons
                                        name="lightbulb-outline"
                                        size={18}
                                        color={type === 'feature' ? '#FFFFFF' : colors.textSecondary}
                                        style={{ marginRight: 6 }}
                                    />
                                    <Text
                                        style={[
                                            typography.caption1,
                                            {
                                                color: type === 'feature' ? '#FFFFFF' : colors.text,
                                                fontWeight: type === 'feature' ? '700' : '500',
                                            },
                                        ]}
                                    >
                                        {t('settings.feedbackTypeFeature')}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Form Card */}
                        <Card style={{ padding: 16, marginBottom: 16 }}>
                            {/* Name */}
                            <View style={styles.formGroup}>
                                <Text style={[typography.caption1, styles.label, { color: colors.textSecondary }]}>
                                    {t('settings.feedbackNameLabel')}
                                </Text>
                                <TextInput
                                    style={[
                                        styles.input,
                                        typography.body,
                                        {
                                            backgroundColor: colors.background,
                                            borderColor: colors.border,
                                            color: colors.text,
                                            borderRadius: borderRadius.md,
                                        },
                                    ]}
                                    value={name}
                                    onChangeText={setName}
                                    placeholder={t('settings.feedbackNamePlaceholder')}
                                    placeholderTextColor={colors.textSecondary}
                                    autoCapitalize="words"
                                />
                            </View>

                            {/* Email */}
                            <View style={styles.formGroup}>
                                <Text style={[typography.caption1, styles.label, { color: colors.textSecondary }]}>
                                    {t('settings.feedbackEmailLabel')} <Text style={{ color: colors.error }}>*</Text>
                                </Text>
                                <TextInput
                                    style={[
                                        styles.input,
                                        typography.body,
                                        {
                                            backgroundColor: colors.background,
                                            borderColor: errors.email ? colors.error : colors.border,
                                            color: colors.text,
                                            borderRadius: borderRadius.md,
                                        },
                                    ]}
                                    value={email}
                                    onChangeText={(v) => {
                                        setEmail(v);
                                        if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
                                    }}
                                    placeholder={t('settings.feedbackEmailPlaceholder')}
                                    placeholderTextColor={colors.textSecondary}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                                {errors.email && (
                                    <Text style={[typography.caption2, { color: colors.error, marginTop: 4 }]}>
                                        {errors.email}
                                    </Text>
                                )}
                            </View>

                            {/* Modem */}
                            <View style={styles.formGroup}>
                                <Text style={[typography.caption1, styles.label, { color: colors.textSecondary }]}>
                                    {t('settings.feedbackModemLabel')}
                                </Text>
                                <TextInput
                                    style={[
                                        styles.input,
                                        typography.body,
                                        {
                                            backgroundColor: colors.background,
                                            borderColor: colors.border,
                                            color: colors.text,
                                            borderRadius: borderRadius.md,
                                        },
                                    ]}
                                    value={modem}
                                    onChangeText={setModem}
                                    placeholder={t('settings.feedbackModemPlaceholder')}
                                    placeholderTextColor={colors.textSecondary}
                                    autoCapitalize="characters"
                                />
                            </View>

                            {/* Message */}
                            <View style={[styles.formGroup, { marginBottom: 8 }]}>
                                <Text style={[typography.caption1, styles.label, { color: colors.textSecondary }]}>
                                    {t('settings.feedbackMessageLabel')} <Text style={{ color: colors.error }}>*</Text>
                                </Text>
                                <TextInput
                                    style={[
                                        styles.textArea,
                                        typography.body,
                                        {
                                            backgroundColor: colors.background,
                                            borderColor: errors.message ? colors.error : colors.border,
                                            color: colors.text,
                                            borderRadius: borderRadius.md,
                                        },
                                    ]}
                                    value={message}
                                    onChangeText={(v) => {
                                        setMessage(v);
                                        if (errors.message) setErrors((e) => ({ ...e, message: undefined }));
                                    }}
                                    placeholder={
                                        type === 'bug'
                                            ? t('settings.feedbackMessagePlaceholderBug')
                                            : t('settings.feedbackMessagePlaceholderFeature')
                                    }
                                    placeholderTextColor={colors.textSecondary}
                                    multiline
                                    numberOfLines={5}
                                    textAlignVertical="top"
                                />
                                {errors.message && (
                                    <Text style={[typography.caption2, { color: colors.error, marginTop: 4 }]}>
                                        {errors.message}
                                    </Text>
                                )}
                            </View>

                            {/* Submit Button */}
                            <Button
                                title={isSubmitting ? t('settings.feedbackSending') : t('settings.feedbackSubmit')}
                                onPress={handleSubmit}
                                loading={isSubmitting}
                                style={{ marginTop: 12 }}
                            />
                        </Card>

                        {/* GitHub Alternative link */}
                        <TouchableOpacity
                            style={styles.githubLink}
                            onPress={() => {
                                router.push({
                                    pathname: '/webview',
                                    params: {
                                        url: GITHUB_BUG_URL,
                                        title: 'GitHub Issues',
                                    },
                                });
                            }}
                            activeOpacity={0.7}
                        >
                            <MaterialIcons name="code" size={16} color={colors.primary} />
                            <Text style={[typography.caption1, { color: colors.primary, marginLeft: 6 }]}>
                                {t('settings.feedbackOrGithub')}
                            </Text>
                        </TouchableOpacity>

                        {/* Native ad */}
                        <View style={{ marginTop: 16 }}>
                            <AdNative />
                        </View>
                    </ScrollView>
                </KeyboardAnimatedView>
            </MeshGradientBackground>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 40,
    },
    section: {
        marginBottom: 16,
    },
    label: {
        marginBottom: 6,
        fontWeight: '600',
    },
    typeSelectorRow: {
        flexDirection: 'row',
        padding: 4,
        borderWidth: 1,
    },
    typeTab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 8,
    },
    formGroup: {
        marginBottom: 14,
    },
    input: {
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 10,
        minHeight: 44,
    },
    textArea: {
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 10,
        minHeight: 120,
    },
    githubLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
    },
});
