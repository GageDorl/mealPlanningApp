import { Pressable, View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface GroceryPreviewCardProps {
  totalCount: number;
  checkedCount: number;
  onPress: () => void;
}

export function GroceryPreviewCard({ totalCount, checkedCount, onPress }: GroceryPreviewCardProps) {
  const theme = useTheme();
  const progress = totalCount > 0 ? checkedCount / totalCount : 0;
  const isComplete = totalCount > 0 && checkedCount === totalCount;

  return (
    <Pressable
      style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
      onPress={onPress}
    >
      <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>Grocery</Text>

      {totalCount === 0 ? (
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          No list generated yet
        </Text>
      ) : (
        <>
          <View style={styles.countRow}>
            <Text style={[styles.countNum, { color: isComplete ? theme.success : theme.text }]}>
              {checkedCount}
            </Text>
            <Text style={[styles.countDivider, { color: theme.textSecondary }]}>/ {totalCount}</Text>
          </View>
          <Text style={[styles.countLabel, { color: theme.textSecondary }]}>items checked</Text>

          <View style={[styles.progressTrack, { backgroundColor: theme.backgroundSelected }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.round(progress * 100)}%`,
                  backgroundColor: isComplete ? theme.success : Colors.accent,
                },
              ]}
            />
          </View>

          {isComplete && (
            <Text style={[styles.completeLabel, { color: theme.success }]}>All done!</Text>
          )}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
    gap: Spacing.xs,
    flex: 1,
  } as ViewStyle,
  cardTitle: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
  } as TextStyle,
  emptyText: {
    fontSize: FontSizes.sm,
    marginTop: Spacing.sm,
  } as TextStyle,
  countRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    marginTop: Spacing.xs,
  } as ViewStyle,
  countNum: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
  } as TextStyle,
  countDivider: {
    fontSize: FontSizes.lg,
  } as TextStyle,
  countLabel: {
    fontSize: FontSizes.xs,
  } as TextStyle,
  progressTrack: {
    height: 6,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    marginTop: Spacing.sm,
  } as ViewStyle,
  progressFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  } as ViewStyle,
  completeLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    marginTop: Spacing.xs,
  } as TextStyle,
});
