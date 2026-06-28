import { View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { FontSizes, Spacing, BorderRadius } from '@/constants/theme';

const MACROS = [
  {
    label: 'Protein',
    amount: '150g',
    color: '#4A90E2',
    pct: 30,
    desc: 'Builds and repairs muscle. Aim for 0.7–1g per pound of bodyweight depending on your activity level.',
  },
  {
    label: 'Carbs',
    amount: '200g',
    color: '#F5A623',
    pct: 40,
    desc: "Your body's primary fuel source. Powers workouts and keeps your brain sharp throughout the day.",
  },
  {
    label: 'Fat',
    amount: '65g',
    color: '#7ED321',
    pct: 30,
    desc: "Essential for hormone production and absorbing fat-soluble vitamins. Don't cut it too low.",
  },
];

export function MacroBreakdownPreview() {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.calories, { color: theme.text }]}>2,000</Text>
        <Text style={[styles.calLabel, { color: theme.textSecondary }]}>calories/day</Text>
      </View>

      <View style={styles.barRow}>
        {MACROS.map((m) => (
          <View key={m.label} style={[styles.barSegment, { flex: m.pct, backgroundColor: m.color }]} />
        ))}
      </View>

      <View style={styles.cards}>
        {MACROS.map((m) => (
          <View
            key={m.label}
            style={[styles.macroCard, { backgroundColor: theme.backgroundElement, borderLeftColor: m.color }]}
          >
            <View style={styles.macroCardHeader}>
              <View style={[styles.dot, { backgroundColor: m.color }]} />
              <Text style={[styles.macroLabel, { color: theme.text }]}>{m.label}</Text>
              <Text style={[styles.macroAmount, { color: m.color }]}>{m.amount}</Text>
            </View>
            <Text style={[styles.macroDesc, { color: theme.textSecondary }]}>{m.desc}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  } as ViewStyle,
  header: {
    alignItems: 'center',
  } as ViewStyle,
  calories: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  } as TextStyle,
  calLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
  } as TextStyle,
  barRow: {
    flexDirection: 'row',
    height: 12,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    gap: 2,
  } as ViewStyle,
  barSegment: {
    borderRadius: BorderRadius.full,
  } as ViewStyle,
  cards: {
    gap: Spacing.sm,
  } as ViewStyle,
  macroCard: {
    borderRadius: BorderRadius.md,
    borderLeftWidth: 3,
    backgroundColor: 'transparent',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: 3,
  } as ViewStyle,
  macroCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  } as ViewStyle,
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  } as ViewStyle,
  macroLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    flex: 1,
  } as TextStyle,
  macroAmount: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
  } as TextStyle,
  macroDesc: {
    fontSize: FontSizes.xs,
    lineHeight: 16,
  } as TextStyle,
});
