import { Pressable, View, Text, StyleSheet, Alert, Platform, type ViewStyle, type TextStyle } from 'react-native';
import { Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { FoodLogWithItems } from '@/services/food-log-service';
import { ICON_COMPONENTS } from '@/components/ui/icon-picker';

const ACCENT = '#5EA87A';
const ICON_COLOR = '#FFFFFF';

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
  // See MealSlotCard's growToFill for why this matters — flex:1 only makes sense inside an
  // ancestor with a definite height (the timed grid), not the all-day row's auto-height stack.
  growToFill?: boolean;
  onPress: () => void;
  onDelete: () => void;
}

export function FoodLogCard({ log, compact = false, growToFill = true, onPress, onDelete }: FoodLogCardProps) {
  const theme = useTheme();
  const cals = totalCalories(log);
  const itemCount = log.items.length;
  const summary = log.label
    ? log.label
    : itemCount === 1
      ? log.items[0].food_name
      : `${itemCount} items`;
  const IconComp = log.icon ? ICON_COMPONENTS[log.icon] : null;

  const handleDelete = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Delete this food log?')) onDelete();
    } else {
      Alert.alert('Delete food log?', 'This will remove the entry from your calendar.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ]);
    }
  };

  if (compact) {
    return (
      <Pressable
        style={[styles.block, styles.blockCompact, !growToFill && styles.blockAuto, { backgroundColor: `${ACCENT}BB`, borderLeftColor: ACCENT }]}
        onPress={onPress}
      >
        <View style={styles.compactRow}>
          {IconComp && <IconComp size={12} color={ICON_COLOR} />}
          <Text style={[styles.compactName, { color: '#FFFFFF' }]} numberOfLines={1} ellipsizeMode="tail">
            {summary}
          </Text>
          {cals != null && (
            <Text style={[styles.compactCals, { color: 'rgba(255,255,255,0.80)' }]}>{cals} kcal</Text>
          )}
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      style={[styles.block, { backgroundColor: `${ACCENT}BB`, borderLeftColor: ACCENT }]}
      onPress={onPress}
    >
      <View style={styles.headerRow}>
        {IconComp && <IconComp size={14} color={ICON_COLOR} />}
        <Text style={[styles.label, { color: '#FFFFFF' }]} numberOfLines={1} ellipsizeMode="tail">
          {log.label ?? (itemCount === 1 ? log.items[0].food_name : `${itemCount} items`)}
        </Text>
        <Pressable hitSlop={8} style={styles.deleteButton} onPress={handleDelete}>
          <Text style={[styles.deleteIcon, { color: 'rgba(255,255,255,0.70)' }]}>×</Text>
        </Pressable>
      </View>

      {log.label && (
        <Text style={[styles.summary, { color: 'rgba(255,255,255,0.92)' }]} numberOfLines={2} ellipsizeMode="tail">
          {itemCount === 1 ? log.items[0].food_name : `${itemCount} items`}
        </Text>
      )}

      {cals != null && (
        <Text style={[styles.calHint, { color: 'rgba(255,255,255,0.80)' }]}>{cals} kcal</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  block: {
    borderLeftWidth: 3,
    borderRadius: BorderRadius.sm,
    padding: Spacing.xs,
    flex: 1,
    minHeight: 36,
  } as ViewStyle,
  blockAuto: {
    flex: 0,
    flexGrow: 0,
    flexShrink: 0,
  } as ViewStyle,
  blockCompact: {
    justifyContent: 'center',
    paddingVertical: 3,
  } as ViewStyle,
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  } as ViewStyle,
  compactName: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    flex: 1,
  } as TextStyle,
  compactCals: {
    fontSize: FontSizes.xs,
    flexShrink: 0,
  } as TextStyle,
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
    gap: 4,
  } as ViewStyle,
  deleteButton: {
    flexShrink: 0,
    marginLeft: 2,
  } as ViewStyle,
  deleteIcon: {
    fontSize: 14,
    lineHeight: 14,
  } as TextStyle,
  label: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    flex: 1,
  } as TextStyle,
  summary: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    lineHeight: 16,
  } as TextStyle,
  calHint: {
    fontSize: FontSizes.xs,
    marginTop: 2,
  } as TextStyle,
});
