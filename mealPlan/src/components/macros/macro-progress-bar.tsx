import { View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';

interface MacroProgressBarProps {
  label: string;
  current: number;
  goal: number;
  unit: string;
  color?: string;
}

export function MacroProgressBar({ label, current, goal, unit, color = Colors.accent }: MacroProgressBarProps) {
  const progress = goal > 0 ? Math.min(100, (current / goal) * 100) : 0;
  const isOver = current > goal;
  const barColor = isOver ? Colors.light.error : color;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.values, isOver && styles.valuesOver]}>
          {Math.round(current * 10) / 10} / {goal} {unit}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress}%`, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: Spacing.xs,
  } as ViewStyle,
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  } as ViewStyle,
  label: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.light.text,
  } as TextStyle,
  values: {
    fontSize: FontSizes.xs,
    color: Colors.light.textSecondary,
  } as TextStyle,
  valuesOver: {
    color: Colors.light.error,
  } as TextStyle,
  track: {
    width: '100%',
    height: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.light.backgroundElement,
    overflow: 'hidden',
  } as ViewStyle,
  fill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  } as ViewStyle,
});
