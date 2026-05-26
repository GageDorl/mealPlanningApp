import { View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { Colors, FontSizes, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ProgressRingProps {
  current: number;
  goal: number;
  unit: string;
  label?: string;
  color?: string;
  size?: number;
}

export function ProgressRing({
  current,
  goal,
  unit,
  label,
  color = Colors.accent,
  size = 96,
}: ProgressRingProps) {
  const theme = useTheme();
  const percentage = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0;
  const isOver = current > goal;

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: isOver ? theme.error : color,
          },
        ]}
      >
        <Text style={[styles.percentage, { color: isOver ? theme.error : theme.text }]}>
          {percentage}%
        </Text>
      </View>
      <Text style={[styles.values, { color: theme.textSecondary }]} numberOfLines={1}>
        {Math.round(current)} / {Math.round(goal)} {unit}
      </Text>
      {label ? <Text style={[styles.label, { color: theme.text }]}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: Spacing.xs,
  } as ViewStyle,
  ring: {
    borderWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  } as ViewStyle,
  percentage: {
    fontSize: FontSizes.md,
    fontWeight: '700',
  } as TextStyle,
  values: {
    fontSize: FontSizes.xs,
    textAlign: 'center',
  } as TextStyle,
  label: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    textAlign: 'center',
  } as TextStyle,
});
