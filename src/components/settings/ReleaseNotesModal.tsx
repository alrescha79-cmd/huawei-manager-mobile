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
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useTranslation } from '@/i18n';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MeshGradientBackground } from '../MeshGradientBackground';
import { Button } from '../Button';

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
        if (extracted) return extracted;
    }

    return body.trim();
}

function stripHtml(text: string): string {
    return text
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/?(p|div|span|sup|sub|strong|em|b|i|u|a|img|details|summary|table|tr|td|th|thead|tbody|pre|code|blockquote|ul|ol|li|h[1-6]|hr|dl|dt|dd)[^>]*>/gi, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}

function parseCells(row: string): string[] {
    const parts = row.split('|');
    if (parts[0].trim() === '') parts.shift();
    if (parts.length > 0 && parts[parts.length - 1].trim() === '') parts.pop();
    return parts.map(c => c.trim());
}

function renderInline(text: string, colors: any, typography: any, keyPrefix: string): React.ReactNode[] {
    const regex =
        /(\*\*[^*]+\*\*|~~[^~]+~~|\*[^*]+\*|`[^`]+`|!\[[^\]]*\]\([^)]+\)|\[[^\]]+\]\([^)]+\)|<https?:\/\/[^\s>]+>|https?:\/\/[^\s)]+)/g;
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
        } else if (token.startsWith('~~')) {
            nodes.push(
                <Text key={`${keyPrefix}-s${i}`} style={{ textDecorationLine: 'line-through', color: colors.textSecondary }}>
                    {token.slice(2, -2)}
                </Text>
            );
        } else if (token.startsWith('`')) {
            nodes.push(
                <Text key={`${keyPrefix}-c${i}`} style={[typography.body, {
                    color: colors.primary,
                    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                    fontSize: 13,
                    backgroundColor: colors.border + '40',
                    paddingHorizontal: 4,
                    borderRadius: 4,
                }]}>
                    {token.slice(1, -1)}
                </Text>
            );
        } else if (token.startsWith('![')) {
            const imgMatch = token.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
            if (imgMatch) {
                nodes.push(
                    <Text key={`${keyPrefix}-img${i}`} style={{ color: colors.textSecondary, fontStyle: 'italic' }}>
                        [{imgMatch[1] || 'image'}]
                    </Text>
                );
            }
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
        } else if (token.startsWith('<') && token.endsWith('>')) {
            const url = token.slice(1, -1);
            nodes.push(
                <Text
                    key={`${keyPrefix}-au${i}`}
                    style={{ color: colors.primary, textDecorationLine: 'underline' }}
                    onPress={() => Linking.openURL(url)}
                >
                    {url}
                </Text>
            );
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

function renderTable(rows: string[], colors: any, typography: any, isDark: boolean, keyPrefix: string) {
    if (rows.length < 2) return null;

    const headerCells = parseCells(rows[0]);
    const dataRows = rows.slice(2).map(parseCells);
    const colCount = Math.max(headerCells.length, ...dataRows.map(r => r.length));
    if (colCount === 0) return null;

    return (
        <View key={keyPrefix} style={{
            marginVertical: 10,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 8,
            overflow: 'hidden',
        }}>
            <View style={{ flexDirection: 'row', backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                {Array.from({ length: colCount }, (_, j) => (
                    <View key={j} style={{
                        flex: 1,
                        paddingVertical: 8,
                        paddingHorizontal: 10,
                        borderRightWidth: j < colCount - 1 ? StyleSheet.hairlineWidth : 0,
                        borderColor: colors.border,
                    }}>
                        <Text style={[typography.body, { fontWeight: '700', color: colors.text, fontSize: 13 }]}>
                            {headerCells[j] ? renderInline(headerCells[j], colors, typography, `${keyPrefix}h${j}`) : ''}
                        </Text>
                    </View>
                ))}
            </View>
            {dataRows.map((row, ri) => (
                <View key={ri} style={{
                    flexDirection: 'row',
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderColor: colors.border,
                }}>
                    {Array.from({ length: colCount }, (_, j) => (
                        <View key={j} style={{
                            flex: 1,
                            paddingVertical: 8,
                            paddingHorizontal: 10,
                            borderRightWidth: j < colCount - 1 ? StyleSheet.hairlineWidth : 0,
                            borderColor: colors.border,
                        }}>
                            <Text style={[typography.body, { color: colors.text, fontSize: 13 }]}>
                                {row[j] ? renderInline(row[j], colors, typography, `${keyPrefix}d${ri}${j}`) : ''}
                            </Text>
                        </View>
                    ))}
                </View>
            ))}
        </View>
    );
}

function renderMarkdown(text: string, colors: any, typography: any, isDark: boolean) {
    if (!text) return null;

    text = stripHtml(text);
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
        const trimmed = lines[i].trim();

        if (trimmed === '') {
            elements.push(<View key={i} style={{ height: 6 }} />);
            i++;
            continue;
        }

        // Fenced code block
        if (trimmed.startsWith('```')) {
            const codeLines: string[] = [];
            i++;
            while (i < lines.length && !lines[i].trim().startsWith('```')) {
                codeLines.push(lines[i]);
                i++;
            }
            if (i < lines.length) i++;
            elements.push(
                <View key={`cb${i}`} style={{
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    borderRadius: 8,
                    padding: 12,
                    marginVertical: 8,
                }}>
                    <Text style={{
                        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                        fontSize: 13,
                        color: colors.text,
                        lineHeight: 20,
                    }}>
                        {codeLines.join('\n')}
                    </Text>
                </View>
            );
            continue;
        }

        // Horizontal rule
        if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
            elements.push(
                <View key={i} style={{ height: 1, backgroundColor: colors.border, marginVertical: 12 }} />
            );
            i++;
            continue;
        }

        // Table
        if (trimmed.startsWith('|') && i + 1 < lines.length && /^\|[\s\-:|]+\|/.test(lines[i + 1].trim())) {
            const tableRows: string[] = [];
            while (i < lines.length && lines[i].trim().startsWith('|')) {
                tableRows.push(lines[i].trim());
                i++;
            }
            elements.push(renderTable(tableRows, colors, typography, isDark, `tbl${i}`));
            continue;
        }

        // Blockquote
        if (trimmed.startsWith('>')) {
            const quoteLines: string[] = [];
            while (i < lines.length && lines[i].trim().startsWith('>')) {
                quoteLines.push(lines[i].trim().replace(/^>\s*/, ''));
                i++;
            }
            elements.push(
                <View key={`q${i}`} style={{
                    borderLeftWidth: 3,
                    borderLeftColor: colors.primary,
                    paddingLeft: 12,
                    marginVertical: 8,
                    paddingVertical: 4,
                }}>
                    {quoteLines.map((ql, qi) => (
                        <Text key={qi} style={[typography.body, { color: colors.textSecondary, lineHeight: 22 }]}>
                            {ql === '' ? ' ' : renderInline(ql, colors, typography, `q${i}-${qi}`)}
                        </Text>
                    ))}
                </View>
            );
            continue;
        }

        // Header
        if (trimmed.startsWith('#')) {
            const headerText = trimmed.replace(/^#+\s*/, '');
            const level = (trimmed.match(/^#+/) || ['#'])[0].length;
            const fontSize = level === 1 ? 22 : level === 2 ? 18 : 16;
            elements.push(
                <Text key={i} style={[typography.headline, {
                    color: colors.text,
                    fontSize,
                    fontWeight: 'bold',
                    marginTop: 14,
                    marginBottom: 6,
                }]}>
                    {renderInline(headerText, colors, typography, `h${i}`)}
                </Text>
            );
            i++;
            continue;
        }

        // Task list
        const taskMatch = trimmed.match(/^[-*]\s+\[([ xX])\]\s+(.*)/);
        if (taskMatch) {
            const isChecked = taskMatch[1] !== ' ';
            elements.push(
                <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginVertical: 3, paddingLeft: 4 }}>
                    <MaterialIcons
                        name={isChecked ? 'check-box' : 'check-box-outline-blank'}
                        size={18}
                        color={isChecked ? colors.primary : colors.textSecondary}
                        style={{ marginRight: 6, marginTop: 2 }}
                    />
                    <Text style={[typography.body, {
                        color: colors.text,
                        flex: 1,
                        lineHeight: 22,
                        textDecorationLine: isChecked ? 'line-through' : 'none',
                        opacity: isChecked ? 0.6 : 1,
                    }]}>
                        {renderInline(taskMatch[2], colors, typography, `tk${i}`)}
                    </Text>
                </View>
            );
            i++;
            continue;
        }

        // Unordered list
        if (/^[-*]\s+/.test(trimmed)) {
            const itemText = trimmed.replace(/^[-*]\s*/, '');
            elements.push(
                <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginVertical: 3, paddingLeft: 8 }}>
                    <Text style={[typography.body, { color: colors.primary, marginRight: 6 }]}>•</Text>
                    <Text style={[typography.body, { color: colors.text, flex: 1, lineHeight: 22 }]}>
                        {renderInline(itemText, colors, typography, `u${i}`)}
                    </Text>
                </View>
            );
            i++;
            continue;
        }

        // Ordered list
        const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (orderedMatch) {
            elements.push(
                <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginVertical: 3, paddingLeft: 8 }}>
                    <Text style={[typography.body, { color: colors.primary, marginRight: 6, fontWeight: '600' }]}>
                        {orderedMatch[1]}.
                    </Text>
                    <Text style={[typography.body, { color: colors.text, flex: 1, lineHeight: 22 }]}>
                        {renderInline(orderedMatch[2], colors, typography, `o${i}`)}
                    </Text>
                </View>
            );
            i++;
            continue;
        }

        // Paragraph
        elements.push(
            <Text key={i} style={[typography.body, { color: colors.text, marginVertical: 4, lineHeight: 22 }]}>
                {renderInline(trimmed, colors, typography, `p${i}`)}
            </Text>
        );
        i++;
    }

    return elements;
}

export function ReleaseNotesModal({
    visible,
    onClose,
    selectedNotes,
}: ReleaseNotesModalProps) {
    const { colors, typography, isDark } = useTheme();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="overFullScreen"
            transparent
            onRequestClose={onClose}
        >
            <MeshGradientBackground>
                <View style={[styles.header, {
                    borderBottomColor: colors.border,
                    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 16 : 16
                }]}>
                    <View style={{ width: 50 }} />
                    <Text style={[typography.headline, { color: colors.text, flex: 1, textAlign: 'center' }]} numberOfLines={1}>
                        {t('settings.releaseNotes') || 'Release Notes'}
                    </Text>
                    <View style={{ width: 50 }} />
                </View>
                {selectedNotes && (
                    <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                    >
                        <Text style={[typography.subheadline, { color: colors.textSecondary, marginBottom: 12 }]}>
                            {t('settings.version') || 'Version'} {selectedNotes.version}
                        </Text>
                        <View style={{ height: 1, backgroundColor: colors.border, marginBottom: 16 }} />
                        {renderMarkdown(extractChangelog(selectedNotes.notes), colors, typography, isDark)}
                    </ScrollView>
                )}
                <View style={[styles.footer, { paddingBottom: insets.bottom > 0 ? insets.bottom : 20 }]}>
                    <Button
                        title={t('common.done')}
                        onPress={onClose}
                        variant="primary"
                    />
                </View>
            </MeshGradientBackground>
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
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingTop: 10,
    },
});

export default ReleaseNotesModal;
