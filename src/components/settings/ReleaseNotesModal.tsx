import React from 'react';
import {
    View,
    Text,
    ScrollView,
    Modal,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Platform,
    Linking,
} from 'react-native';
import { useTheme } from '@/theme';
import { useTranslation } from '@/i18n';
import { BlurView } from 'expo-blur';
import { ModalBackground } from '../ModalBackground';

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

// Inline markdown: **bold**, *italic*, `code`, [label](url), bare URL
function renderInline(text: string, colors: any, typography: any, keyPrefix: string): React.ReactNode[] {
    const regex =
        /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|https?:\/\/[^\s)]+)/g;
    const nodes: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let i = 0;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            nodes.push(
                <Text key={`${keyPrefix}-t${i}`} style={{ color: colors.text }}>
                    {text.slice(lastIndex, match.index)}
                </Text>
            );
            i++;
        }

        const token = match[0];
        if (token.startsWith('**')) {
            nodes.push(
                <Text key={`${keyPrefix}-b${i}`} style={{ fontWeight: '700', color: colors.text }}>
                    {token.slice(2, -2)}
                </Text>
            );
        } else if (token.startsWith('`')) {
            nodes.push(
                <Text key={`${keyPrefix}-c${i}`} style={[typography.body, { color: colors.primary, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}>
                    {token.slice(1, -1)}
                </Text>
            );
        } else if (token.startsWith('*')) {
            nodes.push(
                <Text key={`${keyPrefix}-i${i}`} style={{ fontStyle: 'italic', color: colors.text }}>
                    {token.slice(1, -1)}
                </Text>
            );
        } else if (token.startsWith('[')) {
            const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
            if (linkMatch) {
                nodes.push(
                    <Text
                        key={`${keyPrefix}-l${i}`}
                        style={{ color: colors.primary, textDecorationLine: 'underline' }}
                        onPress={() => Linking.openURL(linkMatch[2])}
                    >
                        {linkMatch[1]}
                    </Text>
                );
            }
        } else {
            nodes.push(
                <Text
                    key={`${keyPrefix}-u${i}`}
                    style={{ color: colors.primary, textDecorationLine: 'underline' }}
                    onPress={() => Linking.openURL(token)}
                >
                    {token}
                </Text>
            );
        }

        i++;
        lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
        nodes.push(
            <Text key={`${keyPrefix}-t${i}`} style={{ color: colors.text }}>
                {text.slice(lastIndex)}
            </Text>
        );
    }

    return nodes;
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
                    {renderInline(headerText, colors, typography, `h${index}`)}
                </Text>
            );
        }

        if (/^[-*]\s+/.test(trimmed)) {
            const itemText = trimmed.replace(/^[-*]\s*/, '');
            return (
                <View key={index} style={{ flexDirection: 'row', alignItems: 'flex-start', marginVertical: 3, paddingLeft: 8 }}>
                    <Text style={[typography.body, { color: colors.primary, marginRight: 6 }]}>•</Text>
                    <Text style={[typography.body, { color: colors.text, flex: 1, lineHeight: 22 }]}>
                        {renderInline(itemText, colors, typography, `u${index}`)}
                    </Text>
                </View>
            );
        }

        const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (orderedMatch) {
            const itemText = orderedMatch[2];
            return (
                <View key={index} style={{ flexDirection: 'row', alignItems: 'flex-start', marginVertical: 3, paddingLeft: 8 }}>
                    <Text style={[typography.body, { color: colors.primary, marginRight: 6, fontWeight: '600' }]}>
                        {orderedMatch[1]}.
                    </Text>
                    <Text style={[typography.body, { color: colors.text, flex: 1, lineHeight: 22 }]}>
                        {renderInline(itemText, colors, typography, `o${index}`)}
                    </Text>
                </View>
            );
        }

        return (
            <Text key={index} style={[typography.body, { color: colors.text, marginVertical: 4, lineHeight: 22 }]}>
                {renderInline(trimmed, colors, typography, `p${index}`)}
            </Text>
        );
    });
}

export function ReleaseNotesModal({
    visible,
    onClose,
    selectedNotes,
}: ReleaseNotesModalProps) {
    const { colors, typography, isDark } = useTheme();
    const { t } = useTranslation();

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="overFullScreen"
            transparent
            onRequestClose={onClose}
        >
            <BlurView
                intensity={18}
                tint={isDark ? 'dark' : 'light'}
                experimentalBlurMethod="dimezisBlurView"
                style={[
                    styles.container,
                    {
                        backgroundColor: isDark
                            ? 'rgba(10, 10, 10, 0.82)'
                            : 'rgba(255, 255, 255, 0.82)',
                    }
                ]}
            >
                <ModalBackground />
                <View style={[styles.header, {
                    borderBottomColor: colors.border,
                    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 16 : 16
                }]}>
                    <TouchableOpacity onPress={onClose}>
                        <Text style={[typography.body, { color: colors.primary }]}>
                            {t('common.done') || 'Done'}
                        </Text>
                    </TouchableOpacity>
                    <Text style={[typography.headline, { color: colors.text, flex: 1, textAlign: 'center' }]} numberOfLines={1}>
                        {t('settings.releaseNotes') || 'Release Notes'}
                    </Text>
                    <View style={{ width: 50 }} />
                </View>
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
            </BlurView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
});