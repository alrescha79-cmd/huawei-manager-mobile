import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';

interface SignalBarProps {
  strength: number; // 0-5
  label?: string;
}

export const SignalBar: React.FC<SignalBarProps> = ({ strength, label }) => {
  const { colors, spacing } = useTheme();

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {label}
        </Text>
      )}
      <View style={styles.barsContainer}>
        {[1, 2, 3, 4, 5].map((bar) => (
          <View
            key={bar}
            style={[
              styles.bar,
              {
                height: bar * 4 + 8,
                backgroundColor: bar <= strength ? colors.success : colors.border,
                marginLeft: bar === 1 ? 0 : spacing.xs,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  label: {
    fontSize: 11,
    marginBottom: 4,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 28,
  },
  bar: {
    width: 5,
    borderRadius: 2,
  },
});
