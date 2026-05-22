import { View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';

interface ProgressRingProps {
  value: number;
  label?: string;
}

export function ProgressRing({ value, label }: ProgressRingProps) {
  const display = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <View style={styles.container}>
      <View style={styles.ring}>
        <Text style={styles.value}>{display}%</Text>
      </View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.sm,
  } as ViewStyle,
  ring: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 10,
    borderColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.background,
  } as ViewStyle,
  value: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
  } as TextStyle,
  label: {
    color: Colors.light.textSecondary,
    fontSize: 14,
  } as TextStyle,
});
