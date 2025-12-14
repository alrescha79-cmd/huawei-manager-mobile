import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';

interface InfoRowProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
}

export const InfoRow: React.FC<InfoRowProps> = ({ label, value, icon }) => {
  const { colors, typography, spacing } = useTheme();

  return (
    <View style={[styles.container, { marginBottom: spacing.sm }]}>
      <View style={styles.labelContainer}>
        {icon && <View style={styles.icon}>{icon}</View>}
        <Text style={[typography.subheadline, { color: colors.textSecondary }]}>
          {label}
        </Text>
      </View>
      <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
        {value}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
  },
});
