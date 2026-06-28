import { View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { ProgressRing } from '@/components/macros/progress-ring';
import { MacroProgressBar } from '@/components/macros/macro-progress-bar';

const FILLER_BARS = [
  { label: 'Protein', current: 95, goal: 150, unit: 'g', color: '#4A90E2' },
  { label: 'Carbs', current: 145, goal: 200, unit: 'g', color: '#F5A623' },
  { label: 'Fat', current: 48, goal: 65, unit: 'g', color: '#7ED321' },
];

export function DashboardPreview() {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>Today · Fri Jun 27</Text>
      <View style={styles.ring}>
        <ProgressRing
          current={1450}
          goal={2000}
          unit="cal"
          label="Calories"
          color={Colors.accent}
          size={80}
        />
      </View>
      <View style={styles.bars}>
        {FILLER_BARS.map((b) => (
          <MacroProgressBar key={b.label} {...b} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  } as ViewStyle,
  label: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    letterSpacing: 0.5,
  } as TextStyle,
  ring: {
    alignItems: 'center',
  } as ViewStyle,
  bars: {
    gap: Spacing.sm,
  } as ViewStyle,
});
