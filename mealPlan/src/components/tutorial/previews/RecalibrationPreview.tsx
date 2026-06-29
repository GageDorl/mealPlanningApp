import { View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';

export function RecalibrationPreview() {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: Colors.accent }]}>
        <View style={styles.heading}>
          <Text style={styles.headingIcon}>📊</Text>
          <Text style={[styles.headingText, { color: theme.text }]}>Weekly check-in</Text>
          <View style={[styles.badge, { backgroundColor: `${Colors.accent}18` }]}>
            <Text style={[styles.badgeText, { color: Colors.accent }]}>New</Text>
          </View>
        </View>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Your 7-day average was <Text style={[styles.bold, { color: theme.text }]}>2,150 cal/day</Text> vs
          your {' '}
          <Text style={[styles.bold, { color: theme.text }]}>2,000 cal goal</Text>.
        </Text>
        <View style={[styles.suggestionRow, { backgroundColor: `${Colors.accent}10`, borderRadius: BorderRadius.sm }]}>
          <Text style={[styles.suggestionLabel, { color: theme.textSecondary }]}>Suggested adjustment</Text>
          <Text style={[styles.suggestionVal, { color: Colors.accent }]}>+100 cal · +8g protein</Text>
        </View>
        <View style={[styles.cta, { borderColor: Colors.accent }]}>
          <Text style={[styles.ctaText, { color: Colors.accent }]}>Review Adjustment →</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
  } as ViewStyle,
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: Spacing.md,
    gap: Spacing.md,
  } as ViewStyle,
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  } as ViewStyle,
  headingIcon: {
    fontSize: 16,
  } as TextStyle,
  headingText: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    flex: 1,
  } as TextStyle,
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  } as ViewStyle,
  badgeText: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
  } as TextStyle,
  body: {
    fontSize: FontSizes.sm,
    lineHeight: 20,
  } as TextStyle,
  bold: {
    fontWeight: '700',
  } as TextStyle,
  suggestionRow: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: 2,
  } as ViewStyle,
  suggestionLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  } as TextStyle,
  suggestionVal: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
  } as TextStyle,
  cta: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  } as ViewStyle,
  ctaText: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
  } as TextStyle,
});
