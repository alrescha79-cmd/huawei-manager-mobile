import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Card, BouncingDots } from '@/components';

interface NoDataWarningCardProps {
    t: (key: string) => string;
    isRetrying: boolean;
    onRetry: () => void;
    onGoToLogin: () => void;
}

export function NoDataWarningCard({
    t,
    isRetrying,
    onRetry,
    onGoToLogin,
}: NoDataWarningCardProps) {
    const { colors, typography, spacing } = useTheme();

    return (
        <Card style={{
            marginBottom: spacing.md,
            backgroundColor: colors.error + '10',
            borderColor: colors.error,
            borderWidth: 1
        }}>
            <Text style={[typography.headline, { color: colors.error, marginBottom: spacing.sm, textAlign: 'center' }]}>
                <MaterialIcons name="warning" size={24} color={colors.error} /> {t('alerts.noSignalData')}
            </Text>

            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />

            <Text style={[typography.body, { color: colors.text }]}>
                {t('alerts.noSignalMessage')}{'\n\n'}
                <Text style={{ fontWeight: 'bold' }}>{t('alerts.possibleCauses')}</Text>{'\n'}
                • {t('alerts.notLoggedIn')}{'\n'}
                • {t('alerts.sessionExpired')}{'\n'}
                • {t('alerts.modemNotResponding')}
            </Text>

            <TouchableOpacity
                onPress={onRetry}
                disabled={isRetrying}
                style={[styles.retryButton, {
                    backgroundColor: colors.primary,
                    marginTop: spacing.md,
                    opacity: isRetrying ? 0.7 : 1
                }]}
            >
                {isRetrying ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <BouncingDots size="small" color="#FFFFFF" />
                        <Text style={[typography.body, { color: '#FFFFFF', fontWeight: '600', marginLeft: 8 }]}>
                            {t('common.retrying')}
                        </Text>
                    </View>
                ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MaterialIcons name="refresh" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={[typography.body, { color: '#FFFFFF', fontWeight: '600' }]}>
                            {t('common.retryConnection')}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        </Card>
    );
}

const styles = StyleSheet.create({
    retryButton: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default NoDataWarningCard;
