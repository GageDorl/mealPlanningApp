import { Pressable, View, Text, StyleSheet, Alert, Platform, type ViewStyle, type TextStyle } from 'react-native';
import { Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { FoodLogWithItems } from '@/services/food-log-service';

function formatTime12(time24: string): string {
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10) || 0;
  const m = mStr ?? '00';
  const suffix = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return m === '00' ? `${h} ${suffix}` : `${h}:${m} ${suffix}`;
}

function totalCalories(log: FoodLogWithItems): number | null {
  const cals = log.items.reduce((sum, item) => {
    if (item.calories == null) return sum;
    return sum + item.calories * item.servings_eaten;
  }, 0);
  return log.items.some((i) => i.calories != null) ? Math.round(cals) : null;
}

interface FoodLogCardProps {
  log: FoodLogWithItems;
  compact?: boolean;
  onPress: () => void;
  onDelete: () => void;
}

export function FoodLogCard({ log, compact = false, onPress, onDelete }: FoodLogCardProps) {
  const theme = useTheme();
  const cals = totalCalories(log);
  const itemCount = log.items.length;
  const summary = itemCount === 1
    ? log.items[0].food_name
    : `${itemCount} items`;

  return (
    <Pressable
      style={[styles.block, compact && styles.blockCompact, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
      onPress={onPress}
    >
      <View style={styles.cardHeader}>
        {log.label ? (
          <Text style={[styles.label, { color: theme.textSecondary }]} numberOfLines={1}>
            {log.label}
          </Text>
        ) : null}
        <Pressable
          hitSlop={8}
          style={styles.deleteButton}
          onPress={() => {
            if (Platform.OS === 'web') {
              if (window.confirm('Delete this food log?')) onDelete();
            } else {
              Alert.alert('Delete food log?', 'This will remove the entry from your calendar.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: onDelete },
              ]);
            }
          }}
        >
          <Text style={[styles.deleteIcon, { color: theme.textSecondary }]}>×</Text>
        </Pressable>
      </View>

      <Text style={[styles.summary, { color: theme.text }]} numberOfLines={compact ? 1 : 2}>
        {summary}
      </Text>

      {!compact && cals != null && (
        <Text style={[styles.macroHint, { color: theme.textSecondary }]}>{cals} kcal</Text>
      )}

      {!compact && log.time_of_day ? (
        <Text style={[styles.time, { color: theme.textSecondary }]}>{formatTime12(log.time_of_day)}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  block: {
    borderLeftWidth: 3,
    borderLeftColor: '#50C878',
    borderRadius: BorderRadius.sm,
    padding: Spacing.xs,
    flex: 1,
  } as ViewStyle,
  blockCompact: {
    justifyContent: 'center',
  } as ViewStyle,
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as ViewStyle,
  deleteButton: {
    marginLeft: 2,
  } as ViewStyle,
  deleteIcon: {
    fontSize: 14,
    lineHeight: 14,
    fontWeight: '400',
  } as TextStyle,
  label: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    flex: 1,
  } as TextStyle,
  summary: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
  } as TextStyle,
  macroHint: {
    fontSize: FontSizes.xs,
  } as TextStyle,
  time: {
    fontSize: FontSizes.xs,
    marginTop: 2,
  } as TextStyle,
});
