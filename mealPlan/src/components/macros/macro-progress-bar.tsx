import { View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface MacroProgressBarProps {
  label: string;
  current: number;
  goal: number;
  unit: string;
  color?: string;
}

export function MacroProgressBar({ label, current, goal, unit, color = Colors.accent }: MacroProgressBarProps) {
  const theme = useTheme();
  const progress = goal > 0 ? Math.min(100, (current / goal) * 100) : 0;
  const isOver = current > goal;
  const barColor = isOver ? theme.error : color;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
        <Text style={[styles.values, { color: isOver ? theme.error : theme.textSecondary }]}>
          {Math.round(current * 10) / 10} / {goal} {unit}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
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
  } as TextStyle,
  values: {
    fontSize: FontSizes.xs,
  } as TextStyle,
  track: {
    width: '100%',
    height: 8,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  } as ViewStyle,
  fill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  } as ViewStyle,
});
