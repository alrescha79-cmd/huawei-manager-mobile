import React from 'react';
import { Text, Linking } from 'react-native';
import { useTheme } from '@/theme';

/**
 * Hook that provides a function to render SMS message content
 * with clickable URL links.
 */
export function useMessageLinks() {
    const { colors, typography } = useTheme();

    const renderMessageWithLinks = (content: string) => {
        const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/gi;

        const parts = content.split(urlRegex).filter(Boolean);

        if (parts.length === 1 && !urlRegex.test(content)) {
            return (
                <Text style={[typography.body, { color: colors.text, lineHeight: 22 }]}>
                    {content}
                </Text>
            );
        }

        urlRegex.lastIndex = 0;

        const elements: React.ReactNode[] = [];
        let lastIndex = 0;
        let match;
        let key = 0;

        while ((match = urlRegex.exec(content)) !== null) {
            if (match.index > lastIndex) {
                elements.push(
                    <Text key={key++} style={[typography.body, { color: colors.text, lineHeight: 22 }]}>
                        {content.substring(lastIndex, match.index)}
                    </Text>
                );
            }

            const url = match[0];
            const fullUrl = url.startsWith('http') ? url : `https://${url}`;

            elements.push(
                <Text
                    key={key++}
                    style={[typography.body, { color: colors.primary, lineHeight: 22, textDecorationLine: 'underline' }]}
                    onPress={() => Linking.openURL(fullUrl)}
                >
                    {url}
                </Text>
            );

            lastIndex = match.index + match[0].length;
        }

        if (lastIndex < content.length) {
            elements.push(
                <Text key={key++} style={[typography.body, { color: colors.text, lineHeight: 22 }]}>
                    {content.substring(lastIndex)}
                </Text>
            );
        }

        return <Text>{elements}</Text>;
    };

    return { renderMessageWithLinks };
}
