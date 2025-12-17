import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    LayoutAnimation,
    Platform,
    UIManager,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Card } from './Card';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface CollapsibleCardProps {
    title: string;
    children: React.ReactNode;
    defaultExpanded?: boolean;
    onToggle?: (expanded: boolean) => void;
}

/**
 * A card component that can be collapsed/expanded.
 * Shows only the title when collapsed, full content when expanded.
 */
export function CollapsibleCard({
    title,
    children,
    defaultExpanded = true,
    onToggle,
}: CollapsibleCardProps) {
    const { colors, typography, spacing } = useTheme();
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    const toggleExpand = useCallback(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        const newState = !isExpanded;
        setIsExpanded(newState);
        onToggle?.(newState);
    }, [isExpanded, onToggle]);

    return (
        <Card style={{ marginBottom: spacing.md }}>
            {/* Header - always visible */}
            <TouchableOpacity
                style={styles.header}
                onPress={toggleExpand}
                activeOpacity={0.7}
            >
                <MaterialIcons
                    name={isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                    size={24}
                    color={colors.textSecondary}
                />
                <Text style={[typography.headline, { color: colors.text, flex: 1, textAlign: 'center' }]}>
                    {title}
                </Text>
                {/* Spacer to balance the icon on the left */}
                <View style={{ width: 24 }} />
            </TouchableOpacity>

            {/* Content - only visible when expanded */}
            {isExpanded && (
                <>
                    {/* Divider */}
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <View style={styles.content}>
                        {children}
                    </View>
                </>
            )}
        </Card>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    divider: {
        height: 1,
        marginTop: 12,
        marginBottom: 12,
    },
    content: {
        // Content padding handled by card
    },
});

export default CollapsibleCard;

