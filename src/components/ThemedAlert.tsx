import React from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
} from 'react-native';
import { useTheme } from '@/theme';

interface AlertButton {
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
}

interface ThemedAlertProps {
    visible: boolean;
    title: string;
    message?: string;
    buttons?: AlertButton[];
    onDismiss?: () => void;
}

export const ThemedAlert: React.FC<ThemedAlertProps> = ({
    visible,
    title,
    message,
    buttons = [{ text: 'OK' }],
    onDismiss,
}) => {
    const { colors, typography } = useTheme();

    const handleButtonPress = (button: AlertButton) => {
        button.onPress?.();
        onDismiss?.();
    };

    const getButtonColor = (style?: string) => {
        switch (style) {
            case 'destructive':
                return colors.error;
            case 'cancel':
                return colors.textSecondary;
            default:
                return colors.primary;
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onDismiss}
        >
            <View style={styles.overlay}>
                <View style={[styles.alertContainer, { backgroundColor: colors.card }]}>
                    <Text style={[typography.headline, styles.title, { color: colors.text }]}>
                        {title}
                    </Text>

                    {message && (
                        <Text style={[typography.body, styles.message, { color: colors.textSecondary }]}>
                            {message}
                        </Text>
                    )}

                    <View style={[styles.buttonContainer, { borderTopColor: colors.border }]}>
                        {buttons.map((button, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.button,
                                    index > 0 && { borderLeftWidth: 1, borderLeftColor: colors.border },
                                ]}
                                onPress={() => handleButtonPress(button)}
                            >
                                <Text
                                    style={[
                                        typography.body,
                                        styles.buttonText,
                                        { color: getButtonColor(button.style) },
                                        button.style === 'cancel' && { fontWeight: '400' },
                                    ]}
                                >
                                    {button.text}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// Global alert state management
type AlertConfig = {
    visible: boolean;
    title: string;
    message?: string;
    buttons?: AlertButton[];
};

let alertListener: ((config: AlertConfig) => void) | null = null;

export const setAlertListener = (listener: (config: AlertConfig) => void) => {
    alertListener = listener;
};

// Drop-in replacement for React Native's Alert.alert()
export const ThemedAlertHelper = {
    alert: (
        title: string,
        message?: string,
        buttons?: AlertButton[]
    ) => {
        if (alertListener) {
            alertListener({
                visible: true,
                title,
                message,
                buttons: buttons || [{ text: 'OK' }],
            });
        }
    },
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    alertContainer: {
        width: width * 0.8,
        maxWidth: 320,
        borderRadius: 14,
        overflow: 'hidden',
    },
    title: {
        textAlign: 'center',
        paddingTop: 20,
        paddingHorizontal: 20,
        paddingBottom: 8,
        fontWeight: '600',
    },
    message: {
        textAlign: 'center',
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    buttonContainer: {
        flexDirection: 'row',
        borderTopWidth: 1,
    },
    button: {
        flex: 1,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        fontWeight: '600',
    },
});

export default ThemedAlert;
