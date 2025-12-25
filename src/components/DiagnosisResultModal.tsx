import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Platform,
    StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useTranslation } from '@/i18n';

interface DiagnosisResultModalProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    results: {
        label: string;
        success: boolean;
        value?: string;
    }[];
    summary?: string;
}

export function DiagnosisResultModal({
    visible,
    onClose,
    title,
    results,
    summary,
}: DiagnosisResultModalProps) {
    const { colors, typography, spacing } = useTheme();
    const { t } = useTranslation();

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
                    {/* Header */}
                    <View style={[styles.header, { borderBottomColor: colors.border }]}>
                        <MaterialIcons name="fact-check" size={28} color={colors.primary} />
                        <Text style={[typography.headline, { color: colors.text, marginLeft: spacing.sm, textAlign: 'center' }]}>
                            {title}
                        </Text>
                    </View>

                    {/* Results */}
                    <View style={styles.resultsContainer}>
                        {results.map((result, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.resultRow,
                                    { borderBottomColor: colors.border },
                                    index === results.length - 1 && { borderBottomWidth: 0 }
                                ]}
                            >
                                <View style={styles.resultLabel}>
                                    <MaterialIcons
                                        name={result.success ? 'check-circle' : 'cancel'}
                                        size={24}
                                        color={result.success ? colors.success : colors.error}
                                    />
                                    <Text style={[typography.body, { color: colors.text, marginLeft: spacing.sm }]}>
                                        {result.label}
                                    </Text>
                                </View>
                                {result.value && (
                                    <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                                        {result.value}
                                    </Text>
                                )}
                            </View>
                        ))}
                    </View>

                    {/* Summary */}
                    {summary && (
                        <View style={[styles.summaryContainer, { backgroundColor: colors.background }]}>
                            <Text style={[typography.body, { color: colors.text, textAlign: 'center' }]}>
                                {summary}
                            </Text>
                        </View>
                    )}

                    {/* Close Button */}
                    <TouchableOpacity
                        style={[styles.closeButton, { backgroundColor: colors.primary }]}
                        onPress={onClose}
                    >
                        <Text style={[typography.body, { color: '#FFFFFF', fontWeight: '600' }]}>
                            {t('common.ok')}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContainer: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 16,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        borderBottomWidth: 1,
    },
    resultsContainer: {
        padding: 16,
    },
    resultRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    resultLabel: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    summaryContainer: {
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 12,
        borderRadius: 8,
    },
    closeButton: {
        margin: 16,
        marginTop: 0,
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
    },
});

export default DiagnosisResultModal;
