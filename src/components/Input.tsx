import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInputProps
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  secureTextEntry?: boolean;
  showPasswordToggle?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  secureTextEntry,
  showPasswordToggle = false,
  style,
  ...props
}) => {
  const { colors, borderRadius, typography, spacing } = useTheme();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text
          style={[
            typography.subheadline,
            { color: colors.text, marginBottom: spacing.xs }
          ]}
        >
          {label}
        </Text>
      )}
      <View style={styles.inputContainer}>
        <TextInput
          {...props}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          style={[
            styles.input,
            typography.body,
            {
              backgroundColor: colors.card,
              borderColor: error ? colors.error : colors.border,
              borderRadius: borderRadius.md,
              color: colors.text,
            },
          ]}
          placeholderTextColor={colors.textSecondary}
        />
        {showPasswordToggle && secureTextEntry && (
          <TouchableOpacity
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            style={styles.eyeIcon}
          >
            <MaterialIcons
              name={isPasswordVisible ? 'visibility' : 'visibility-off'}
              size={24}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <Text
          style={[
            typography.caption1,
            { color: colors.error, marginTop: spacing.xs }
          ]}
        >
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 50,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
});
