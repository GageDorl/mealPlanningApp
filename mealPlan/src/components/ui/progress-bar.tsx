import { View, StyleSheet, Text, type ViewStyle } from 'react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';

interface ProgressBarProps {
  value: number;
  label?: string;
}

export function ProgressBar({ value, label }: ProgressBarProps) {
  const progress = Math.max(0, Math.min(100, value));

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: Spacing.xs,
  } as ViewStyle,
  label: {
    color: Colors.light.textSecondary,
    fontSize: 14,
  } as ViewStyle,
  track: {
    width: '100%',
    height: 12,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.light.backgroundElement,
    overflow: 'hidden',
  } as ViewStyle,
  fill: {
    height: '100%',
    backgroundColor: Colors.accent,
  } as ViewStyle,
});
