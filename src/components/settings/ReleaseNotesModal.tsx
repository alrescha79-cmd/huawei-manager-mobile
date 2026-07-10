import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useTheme } from '@/theme';
import { useTranslation } from '@/i18n';
import { PageSheetModal } from '../PageSheetModal';

interface ReleaseNotesModalProps {
    visible: boolean;
    onClose: () => void;
    selectedNotes: { version: string; notes: string } | null;
}

function extractChangelog(body: string): string {
    if (!body) return '';

    const changelogHeaders = [
        /##?\s*changelog/i,
        /##?\s*what's\s*(new|changed)/i,
        /##?\s*perubahan/i,
        /##?\s*release\s*notes/i
    ];

    const lines = body.split('\n');
    let startIndex = -1;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (changelogHeaders.some(regex => regex.test(line))) {
            startIndex = i;
            break;
        }
    }

    if (startIndex !== -1) {
        const contentLines = [];
        for (let i = startIndex + 1; i < lines.length; i++) {
            const line = lines[i];
            if (/^##?\s+/.test(line.trim())) {
                break;
            }
            contentLines.push(line);
        }
        const extracted = contentLines.join('\n').trim();
        if (extracted) {
            return extracted;
        }
    }

    return body.trim();
}

function renderInlineFormatting(text: string, colors: any) {
    const parts = text.split('**');
    if (parts.length <= 1) return <Text>{text}</Text>;

    return parts.map((part, index) => {
        const isBold = index % 2 === 1;
        return (
            <Text key={index} style={isBold ? { fontWeight: '700', color: colors.text } : undefined}>
                {part}
            </Text>
        );
    });
}

function renderMarkdown(text: string, colors: any, typography: any) {
    if (!text) return null;

    const lines = text.split('\n');
    return lines.map((line, index) => {
        const trimmed = line.trim();

        if (trimmed === '') {
            return <View key={index} style={{ height: 6 }} />;
        }

        if (trimmed.startsWith('#')) {
            const headerText = trimmed.replace(/^#+\s*/, '');
            const level = (trimmed.match(/^#+/) || ['#'])[0].length;
            const fontSize = level === 1 ? 22 : level === 2 ? 18 : 16;
            return (
                <Text
                    key={index}
                    style={[
                        typography.headline,
                        {
                            color: colors.text,
                            fontSize,
                            fontWeight: 'bold',
                            marginTop: 14,
                            marginBottom: 6,
                        }
                    ]}
                >
                    {headerText}
                </Text>
            );
        }

        if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
            const itemText = trimmed.replace(/^[-*]\s*/, '');
            return (
                <View key={index} style={{ flexDirection: 'row', alignItems: 'flex-start', marginVertical: 3, paddingLeft: 8 }}>
                    <Text style={[typography.body, { color: colors.primary, marginRight: 6 }]}>•</Text>
                    <Text style={[typography.body, { color: colors.text, flex: 1, lineHeight: 22 }]}>
                        {renderInlineFormatting(itemText, colors)}
                    </Text>
                </View>
            );
        }

        return (
            <Text key={index} style={[typography.body, { color: colors.text, marginVertical: 4, lineHeight: 22 }]}>
                {renderInlineFormatting(trimmed, colors)}
            </Text>
        );
    });
}

export function ReleaseNotesModal({
    visible,
    onClose,
    selectedNotes,
}: ReleaseNotesModalProps) {
    const { colors, typography } = useTheme();
    const { t } = useTranslation();

    return (
        <PageSheetModal
            visible={visible}
            onClose={onClose}
            title={t('settings.releaseNotes') || 'Release Notes'}
            cancelText={t('common.done') || 'Done'}
        >
            {selectedNotes && (
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
                >
                    <Text style={[typography.subheadline, { color: colors.textSecondary, marginBottom: 12 }]}>
                        {t('settings.version') || 'Version'} {selectedNotes.version}
                    </Text>
                    <View style={{ height: 1, backgroundColor: colors.border, marginBottom: 16 }} />
                    {renderMarkdown(extractChangelog(selectedNotes.notes), colors, typography)}
                </ScrollView>
            )}
        </PageSheetModal>
    );
}
