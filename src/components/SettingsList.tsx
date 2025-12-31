import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';

interface SettingsSectionProps {
    title?: string;
    children: React.ReactNode;
    style?: any;
}

export const SettingsSection = ({ title, children, style }: SettingsSectionProps) => {
    const { colors, typography } = useTheme();

    return (
        <View style={[styles.sectionWrapper, style]}>
            {title && (
                <Text style={[styles.sectionTitle, typography.caption1, { color: colors.textSecondary }]}>
                    {title}
                </Text>
            )}
            <View style={[styles.sectionContent, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}>
                {children}
            </View>
        </View>
    );
};

interface SettingsItemProps {
    icon?: keyof typeof MaterialIcons.glyphMap;
    title: string;
    subtitle?: string;
    value?: string; // For displaying a value on the right
    onPress?: () => void;
    showChevron?: boolean;
    color?: string;
    destructive?: boolean;
    isLast?: boolean;
    loading?: boolean; // For showing activity indicator
    rightElement?: React.ReactNode; // For switches or custom right elements
}

export const SettingsItem = ({
    icon,
    title,
    subtitle,
    value,
    onPress,
    showChevron = true,
    color,
    destructive = false,
    isLast = false,
    loading = false,
    rightElement,
}: SettingsItemProps) => {
    const { colors, typography } = useTheme();

    // Determine if we should render as TouchableOpacity or generic View
    const Wrapper = onPress ? TouchableOpacity : View;
    const wrapperProps = onPress ? { activeOpacity: 0.7, onPress } : {};

    return (
        <Wrapper
            style={[styles.itemTouchable]}
            {...wrapperProps}
        >
            <View style={styles.itemContainer}>
                {icon && (
                    <View style={[styles.iconContainer, { backgroundColor: destructive ? colors.error + '15' : colors.primary + '15' }]}>
                        <MaterialIcons
                            name={icon}
                            size={22}
                            color={color || (destructive ? colors.error : colors.primary)}
                        />
                    </View>
                )}

                <View style={[
                    styles.contentContainer,
                    !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                    !icon && { paddingLeft: 0 } // Remove left padding if no icon
                ]}>
                    <View style={styles.textContainer}>
                        <Text style={[
                            typography.body,  // Changed from subheadline to body for consistency
                            { color: destructive ? colors.error : colors.text, fontWeight: '500' }
                        ]}>
                            {title}
                        </Text>
                        {subtitle && (
                            <Text style={[typography.caption1, { color: colors.textSecondary, marginTop: 2 }]}>
                                {subtitle}
                            </Text>
                        )}
                    </View>

                    {loading ? (
                        <ActivityIndicator size="small" color={colors.textSecondary} />
                    ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {value && (
                                <Text style={[typography.body, { color: colors.textSecondary, marginRight: showChevron ? 4 : 0 }]}>
                                    {value}
                                </Text>
                            )}
                            {rightElement}
                            {showChevron && onPress && (
                                <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} style={{ marginLeft: 4 }} />
                            )}
                        </View>
                    )}
                </View>
            </View>
        </Wrapper>
    );
};

const styles = StyleSheet.create({
    sectionWrapper: {
        marginBottom: 16,  // Changed from 24 to match Card spacing
        marginHorizontal: 16,
    },
    sectionTitle: {
        marginBottom: 8,
        marginLeft: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    sectionContent: {
        borderRadius: 16,
        overflow: 'hidden',
        // No shadow - keep clean look
    },
    itemTouchable: {
        minHeight: 50,
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 16,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    contentContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingRight: 16,
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
        paddingVertical: 2
    },
});
