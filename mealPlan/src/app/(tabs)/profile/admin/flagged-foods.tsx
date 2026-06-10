import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, Alert, StyleSheet, ActivityIndicator,
  type ViewStyle, type TextStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { Colors, Spacing, FontSizes, BorderRadius, MaxContentWidth } from '@/constants/theme';
import { getFlaggedFoods, moderateFood, type FlaggedPublicFood, type FoodFlag } from '@/services/public-food-service';

function macroLine(food: FlaggedPublicFood): string {
  const parts: string[] = [];
  if (food.calories != null) parts.push(`${food.calories} kcal`);
  if (food.protein != null) parts.push(`${Math.round(Number(food.protein) * 10) / 10}g P`);
  if (food.carbs != null) parts.push(`${Math.round(Number(food.carbs) * 10) / 10}g C`);
  if (food.fat != null) parts.push(`${Math.round(Number(food.fat) * 10) / 10}g F`);
  return parts.join(' · ') || '—';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function shortId(id: string): string {
  return id.slice(0, 8) + '…';
}

function FlagRow({ flag }: { flag: FoodFlag }) {
  const theme = useTheme();
  return (
    <View style={[styles.flagRow, { borderLeftColor: flag.resolved ? theme.border : '#FF3B30' }]}>
      <Text style={[styles.flagMeta, { color: theme.textSecondary }]}>
        {shortId(flag.flagged_by)} · {formatDate(flag.created_at)}
        {flag.resolved ? ' · resolved' : ''}
      </Text>
      {flag.reason ? (
        <Text style={[styles.flagReason, { color: theme.text }]}>{flag.reason}</Text>
      ) : null}
    </View>
  );
}

function FlaggedCard({
  food,
  onUpdate,
  onRemove,
}: {
  food: FlaggedPublicFood;
  onUpdate: (id: string, patch: Partial<FlaggedPublicFood>) => void;
  onRemove: (id: string) => void;
}) {
  const theme = useTheme();
  const [acting, setActing] = useState<string | null>(null);
  const openFlags = food.food_flags.filter((f) => !f.resolved);

  const act = async (action: 'clear-flags' | 're-pend' | 'remove', label: string) => {
    setActing(action);
    try {
      await moderateFood(food.id, action);
      if (action === 'remove') {
        onRemove(food.id);
      } else if (action === 'clear-flags') {
        onUpdate(food.id, {
          flagged: false,
          food_flags: food.food_flags.map((f) => ({ ...f, resolved: true })),
        });
      } else {
        // re-pend: food stays in flagged list (flagged=true) but approved=false
        onUpdate(food.id, { approved: false });
      }
    } catch {
      Alert.alert('Error', `Failed to ${label}. Please try again.`);
    } finally {
      setActing(null);
    }
  };

  const confirmRemove = () => {
    Alert.alert(
      'Remove food',
      `Remove "${food.food_name}" and all its flags permanently?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => act('remove', 'remove') },
      ]
    );
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={[styles.foodName, { color: theme.text }]}>{food.food_name}</Text>
          {food.brand_name ? (
            <Text style={[styles.brand, { color: theme.textSecondary }]}>{food.brand_name}</Text>
          ) : null}
          <Text style={[styles.meta, { color: theme.textSecondary }]}>{macroLine(food)}</Text>
        </View>
        <View style={[styles.flagBadge, { backgroundColor: '#FF3B3020' }]}>
          <Text style={styles.flagCount}>{openFlags.length}</Text>
          <Text style={[styles.flagLabel, { color: '#FF3B30' }]}>flags</Text>
        </View>
      </View>

      {food.food_flags.length > 0 ? (
        <View style={styles.flagList}>
          {food.food_flags.map((flag) => (
            <FlagRow key={flag.id} flag={flag} />
          ))}
        </View>
      ) : null}

      <View style={styles.actionRow}>
        <Pressable
          style={[styles.btn, styles.btnOutline, { borderColor: theme.border }]}
          onPress={() => act('clear-flags', 'clear flags')}
          disabled={acting !== null}
        >
          {acting === 'clear-flags' ? (
            <ActivityIndicator size="small" color={theme.text} />
          ) : (
            <Text style={[styles.btnText, { color: theme.text }]}>Clear flags</Text>
          )}
        </Pressable>
        <Pressable
          style={[styles.btn, styles.btnOutline, { borderColor: Colors.accent }]}
          onPress={() => act('re-pend', 're-pend')}
          disabled={acting !== null}
        >
          {acting === 're-pend' ? (
            <ActivityIndicator size="small" color={Colors.accent} />
          ) : (
            <Text style={[styles.btnText, { color: Colors.accent }]}>Re-pend</Text>
          )}
        </Pressable>
        <Pressable
          style={[styles.btn, { backgroundColor: '#FF3B30' }]}
          onPress={confirmRemove}
          disabled={acting !== null}
        >
          {acting === 'remove' ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={[styles.btnText, { color: '#fff' }]}>Remove</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

export default function FlaggedFoodsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [foods, setFoods] = useState<FlaggedPublicFood[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setFoods(await getFlaggedFoods());
    } catch {
      setError('Failed to load flagged foods.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUpdate = (id: string, patch: Partial<FlaggedPublicFood>) => {
    setFoods((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...patch } : f))
    );
  };

  const handleRemove = (id: string) => {
    setFoods((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.inner, { maxWidth: MaxContentWidth }]}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <Text style={[styles.back, { color: Colors.accent }]}>‹ Back</Text>
            </Pressable>
            <Text style={[styles.title, { color: theme.text }]}>Flagged Foods</Text>
          </View>

          {loading ? (
            <ActivityIndicator style={styles.centered} color={theme.text} />
          ) : error ? (
            <Text style={[styles.empty, { color: theme.textSecondary }]}>{error}</Text>
          ) : foods.length === 0 ? (
            <Text style={[styles.empty, { color: theme.textSecondary }]}>No flagged foods.</Text>
          ) : (
            foods.map((food) => (
              <FlaggedCard
                key={food.id}
                food={food}
                onUpdate={handleUpdate}
                onRemove={handleRemove}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 } as ViewStyle,
  scroll: { padding: Spacing.lg, alignItems: 'center' } as ViewStyle,
  inner: { width: '100%' } as ViewStyle,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  } as ViewStyle,
  back: { fontSize: FontSizes.lg } as TextStyle,
  title: { fontSize: FontSizes.xl, fontWeight: '700', flex: 1 } as TextStyle,
  card: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  } as ViewStyle,
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  } as ViewStyle,
  cardHeaderLeft: { flex: 1, gap: Spacing.xs } as ViewStyle,
  foodName: { fontSize: FontSizes.md, fontWeight: '700' } as TextStyle,
  brand: { fontSize: FontSizes.sm } as TextStyle,
  meta: { fontSize: FontSizes.sm } as TextStyle,
  flagBadge: {
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    minWidth: 44,
  } as ViewStyle,
  flagCount: { fontSize: FontSizes.lg, fontWeight: '700', color: '#FF3B30' } as TextStyle,
  flagLabel: { fontSize: FontSizes.xs, fontWeight: '600' } as TextStyle,
  flagList: { gap: Spacing.xs } as ViewStyle,
  flagRow: {
    borderLeftWidth: 3,
    paddingLeft: Spacing.sm,
    gap: 2,
  } as ViewStyle,
  flagMeta: { fontSize: FontSizes.xs } as TextStyle,
  flagReason: { fontSize: FontSizes.sm } as TextStyle,
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
  } as ViewStyle,
  btn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    minWidth: 80,
  } as ViewStyle,
  btnOutline: { borderWidth: 1 } as ViewStyle,
  btnText: { fontSize: FontSizes.sm, fontWeight: '600' } as TextStyle,
  centered: { marginTop: Spacing.xxl } as ViewStyle,
  empty: { textAlign: 'center', marginTop: Spacing.xxl, fontSize: FontSizes.md } as TextStyle,
});
