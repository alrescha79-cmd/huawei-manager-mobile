import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    LayoutAnimation,
    StyleProp,
    TextStyle,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Card } from '../Card';


interface CollapsibleCardProps {
    title: string;
    children: React.ReactNode;
    defaultExpanded?: boolean;
    onToggle?: (expanded: boolean) => void;
    storageKey?: string;
    headerRight?: React.ReactNode;
    titleStyle?: StyleProp<TextStyle>;
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
    storageKey,
    headerRight,
    titleStyle,
}: CollapsibleCardProps) {
    const { colors, typography, spacing } = useTheme();
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    useEffect(() => {
        if (!storageKey) return;

        AsyncStorage.getItem(storageKey)
            .then((value) => {
                if (value !== null) setIsExpanded(value === 'true');
            })
            .catch(() => {});
    }, [storageKey]);

    const toggleExpand = useCallback(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        const newState = !isExpanded;
        setIsExpanded(newState);
        if (storageKey) AsyncStorage.setItem(storageKey, String(newState)).catch(() => {});
        onToggle?.(newState);
    }, [isExpanded, onToggle, storageKey]);

    return (
        <Card style={{ marginBottom: spacing.md }}>
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
                <Text style={[
                    typography.headline,
                    {
                        color: colors.text,
                        flex: 1,
                        textAlign: headerRight ? 'left' : 'center',
                        marginLeft: headerRight ? 8 : 0,
                    },
                    titleStyle
                ]}>
                    {title}
                </Text>
                {headerRight ? headerRight : <View style={{ width: 24 }} />}
            </TouchableOpacity>

            {isExpanded && (
                <>
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

