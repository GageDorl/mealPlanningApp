import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, Alert, StyleSheet, ActivityIndicator,
  type ViewStyle, type TextStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { Colors, Spacing, FontSizes, BorderRadius, MaxContentWidth } from '@/constants/theme';
import { getPendingFoods, moderateFood, type PublicFood } from '@/services/public-food-service';

function macroLine(food: PublicFood): string {
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

function PendingCard({
  food,
  onRemove,
}: {
  food: PublicFood;
  onRemove: (id: string) => void;
}) {
  const theme = useTheme();
  const [acting, setActing] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');

  const handleApprove = async () => {
    setActing(true);
    try {
      await moderateFood(food.id, 'approve');
      onRemove(food.id);
    } catch {
      Alert.alert('Error', 'Failed to approve. Please try again.');
      setActing(false);
    }
  };

  const handleReject = async () => {
    setActing(true);
    try {
      await moderateFood(food.id, 'reject', rejectNotes.trim() || undefined);
      onRemove(food.id);
    } catch {
      Alert.alert('Error', 'Failed to reject. Please try again.');
      setActing(false);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <Text style={[styles.foodName, { color: theme.text }]}>{food.food_name}</Text>
      {food.brand_name ? (
        <Text style={[styles.brand, { color: theme.textSecondary }]}>{food.brand_name}</Text>
      ) : null}
      {food.serving_size_amount != null ? (
        <Text style={[styles.meta, { color: theme.textSecondary }]}>
          Serving: {food.serving_size_amount}{food.serving_size_unit ?? ''}
        </Text>
      ) : null}
      <Text style={[styles.meta, { color: theme.textSecondary }]}>{macroLine(food)}</Text>
      <Text style={[styles.meta, { color: theme.textSecondary }]}>
        By {shortId(food.submitted_by)} · {formatDate(food.created_at)}
      </Text>

      {showReject ? (
        <View style={styles.rejectBlock}>
          <TextInput
            style={[styles.notesInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
            placeholder="Rejection reason (optional)"
            placeholderTextColor={theme.textSecondary}
            value={rejectNotes}
            onChangeText={setRejectNotes}
            multiline
            numberOfLines={2}
          />
          <View style={styles.actionRow}>
            <Pressable
              style={[styles.btn, styles.btnOutline, { borderColor: theme.border }]}
              onPress={() => setShowReject(false)}
              disabled={acting}
            >
              <Text style={[styles.btnText, { color: theme.text }]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, { backgroundColor: '#FF3B30' }]}
              onPress={handleReject}
              disabled={acting}
            >
              {acting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[styles.btnText, { color: '#fff' }]}>Confirm reject</Text>
              )}
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.actionRow}>
          <Pressable
            style={[styles.btn, styles.btnOutline, { borderColor: theme.border }]}
            onPress={() => setShowReject(true)}
            disabled={acting}
          >
            <Text style={[styles.btnText, { color: theme.text }]}>Reject</Text>
          </Pressable>
          <Pressable
            style={[styles.btn, { backgroundColor: '#34C759' }]}
            onPress={handleApprove}
            disabled={acting}
          >
            {acting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={[styles.btnText, { color: '#fff' }]}>Approve</Text>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

export default function PendingFoodsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [foods, setFoods] = useState<PublicFood[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setFoods(await getPendingFoods());
    } catch {
      setError('Failed to load pending foods.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

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
            <Text style={[styles.title, { color: theme.text }]}>Pending Foods</Text>
          </View>

          {loading ? (
            <ActivityIndicator style={styles.centered} color={theme.text} />
          ) : error ? (
            <Text style={[styles.empty, { color: theme.textSecondary }]}>{error}</Text>
          ) : foods.length === 0 ? (
            <Text style={[styles.empty, { color: theme.textSecondary }]}>No pending submissions.</Text>
          ) : (
            foods.map((food) => (
              <PendingCard key={food.id} food={food} onRemove={handleRemove} />
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
    gap: Spacing.xs,
  } as ViewStyle,
  foodName: { fontSize: FontSizes.md, fontWeight: '700' } as TextStyle,
  brand: { fontSize: FontSizes.sm } as TextStyle,
  meta: { fontSize: FontSizes.sm } as TextStyle,
  rejectBlock: { gap: Spacing.sm, marginTop: Spacing.sm } as ViewStyle,
  notesInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    fontSize: FontSizes.sm,
    minHeight: 60,
    textAlignVertical: 'top',
  } as TextStyle,
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    justifyContent: 'flex-end',
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
