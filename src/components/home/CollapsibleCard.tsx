import React, { useState, useCallback, useEffect, useRef } from 'react';
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
    onExpanded?: () => void;
    storageKey?: string;
    headerRight?: React.ReactNode;
    titleStyle?: StyleProp<TextStyle>;
    lazy?: boolean;
    loading?: boolean;
    skeleton?: React.ReactNode;
}

/**
 * A card component that can be collapsed/expanded.
 * Shows only the title when collapsed, full content when expanded.
 * With lazy={true}, children only render when expanded and loading is handled.
 */
export function CollapsibleCard({
    title,
    children,
    defaultExpanded = true,
    onToggle,
    onExpanded,
    storageKey,
    headerRight,
    titleStyle,
    lazy = false,
    loading = false,
    skeleton,
}: CollapsibleCardProps) {
    const { colors, typography, spacing } = useTheme();
    const [isExpanded, setIsExpanded] = useState<boolean | null>(null);
    const hasBeenExpanded = useRef(false);

    useEffect(() => {
        if (!storageKey) {
            setIsExpanded(defaultExpanded);
            return;
        }
        AsyncStorage.getItem(storageKey)
            .then((value) => {
                const expanded = value !== null ? value === 'true' : defaultExpanded;
                setIsExpanded(expanded);
                if (expanded && lazy && !hasBeenExpanded.current) {
                    hasBeenExpanded.current = true;
                    onExpanded?.();
                }
            })
            .catch(() => setIsExpanded(defaultExpanded));
    }, [storageKey, defaultExpanded]);

    const toggleExpand = useCallback(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        const newState = isExpanded !== true;
        setIsExpanded(newState);
        if (storageKey) AsyncStorage.setItem(storageKey, String(newState)).catch(() => {});
        onToggle?.(newState);
        if (newState && lazy) {
            hasBeenExpanded.current = true;
            onExpanded?.();
        }
    }, [isExpanded, onToggle, storageKey, lazy, onExpanded]);

    const showContent = isExpanded === true && (!lazy || hasBeenExpanded.current);
    const showSkeleton = showContent && lazy && loading && skeleton;

    return (
        <Card style={{ marginBottom: spacing.md }}>
            <TouchableOpacity
                style={styles.header}
                onPress={toggleExpand}
                activeOpacity={0.7}
            >
                <MaterialIcons
                    name={isExpanded === true ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
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

            {isExpanded === true && (
                <>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <View style={styles.content}>
                        {showSkeleton ? skeleton : children}
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

