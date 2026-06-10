import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, StyleSheet, Platform, Alert,
  type ViewStyle, type TextStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { Colors, Spacing, FontSizes, BorderRadius, MaxContentWidth } from '@/constants/theme';
import { Input } from '@/components/ui/input';
import { useUserProfile } from '@/hooks/use-user-profile';
import {
  getPersonalFoods,
  deletePersonalFood,
  updatePersonalFood,
} from '@/services/personal-food-service';
import type { PersonalFood } from '@/models/personal-food';

const SERVING_UNITS = ['g', 'oz', 'cup', 'piece', 'slice', 'tbsp', 'tsp', 'ml'];

function macroSummary(food: PersonalFood): string {
  const parts: string[] = [];
  if (food.calories != null) parts.push(`${food.calories} kcal`);
  if (food.protein != null) parts.push(`${Math.round(food.protein * 10) / 10}g P`);
  if (food.carbs != null) parts.push(`${Math.round(food.carbs * 10) / 10}g C`);
  if (food.fat != null) parts.push(`${Math.round(food.fat * 10) / 10}g F`);
  return parts.join(' · ') || '—';
}

interface EditState {
  food_name: string;
  brand_name: string;
  serving_size_amount: string;
  serving_size_unit: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
}

function toEditState(food: PersonalFood): EditState {
  return {
    food_name: food.food_name,
    brand_name: food.brand_name ?? '',
    serving_size_amount: food.serving_size_amount != null ? String(food.serving_size_amount) : '',
    serving_size_unit: food.serving_size_unit ?? 'g',
    calories: food.calories != null ? String(food.calories) : '',
    protein: food.protein != null ? String(food.protein) : '',
    carbs: food.carbs != null ? String(food.carbs) : '',
    fat: food.fat != null ? String(food.fat) : '',
  };
}

function FoodRow({
  food,
  onDelete,
  onSave,
}: {
  food: PersonalFood;
  onDelete: (id: string) => void;
  onSave: (id: string, patch: Partial<PersonalFood>) => Promise<void>;
}) {
  const theme = useTheme();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EditState>(() => toEditState(food));
  const [saving, setSaving] = useState(false);

  const update = (patch: Partial<EditState>) => setDraft((d) => ({ ...d, ...patch }));

  async function handleSave() {
    if (!draft.food_name.trim()) return;
    setSaving(true);
    const num = (v: string) => v.trim() === '' ? null : parseFloat(v) || null;
    await onSave(food.id, {
      food_name: draft.food_name.trim(),
      brand_name: draft.brand_name.trim() || null,
      serving_size_amount: num(draft.serving_size_amount),
      serving_size_unit: draft.serving_size_unit || null,
      calories: num(draft.calories),
      protein: num(draft.protein),
      carbs: num(draft.carbs),
      fat: num(draft.fat),
    });
    setSaving(false);
    setEditing(false);
  }

  function handleDelete() {
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete "${food.food_name}"?`)) onDelete(food.id);
    } else {
      Alert.alert('Delete food?', `Remove "${food.food_name}" from your library?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(food.id) },
      ]);
    }
  }

  if (editing) {
    return (
      <View style={[styles.editCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <Input placeholder="Food name *" value={draft.food_name} onChangeText={(v) => update({ food_name: v })} />
        <Input placeholder="Brand (optional)" value={draft.brand_name} onChangeText={(v) => update({ brand_name: v })} />

        <View style={styles.editRow}>
          <TextInput
            style={[styles.editNumInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
            placeholder="Amount"
            placeholderTextColor={theme.textSecondary}
            value={draft.serving_size_amount}
            onChangeText={(v) => update({ serving_size_unit: v.replace(/[^0-9.]/g, '') })}
            keyboardType="decimal-pad"
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitScroll} contentContainerStyle={styles.unitScrollContent}>
            {SERVING_UNITS.map((u) => (
              <Pressable
                key={u}
                style={[styles.unitChip, { borderColor: theme.border }, draft.serving_size_unit === u ? styles.unitChipActive : null]}
                onPress={() => update({ serving_size_unit: u })}
              >
                <Text style={[styles.unitChipText, { color: theme.text }, draft.serving_size_unit === u ? styles.unitChipTextActive : null]}>{u}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.macroRow}>
          {(['calories', 'protein', 'carbs', 'fat'] as const).map((key) => (
            <View key={key} style={styles.macroField}>
              <Text style={[styles.macroLabel, { color: theme.textSecondary }]}>
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </Text>
              <TextInput
                style={[styles.editNumInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                placeholder="–"
                placeholderTextColor={theme.textSecondary}
                value={draft[key]}
                onChangeText={(v) => update({ [key]: v.replace(/[^0-9.]/g, '') })}
                keyboardType="decimal-pad"
              />
            </View>
          ))}
        </View>

        <View style={styles.editActions}>
          <Pressable style={[styles.actionBtn, { borderColor: theme.border }]} onPress={() => setEditing(false)}>
            <Text style={[styles.actionBtnText, { color: theme.text }]}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, styles.saveBtn, !draft.food_name.trim() || saving ? styles.actionBtnDisabled : null]}
            onPress={handleSave}
            disabled={!draft.food_name.trim() || saving}
          >
            <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.foodRow, { borderBottomColor: theme.border }]}>
      <View style={styles.foodInfo}>
        <Text style={[styles.foodName, { color: theme.text }]} numberOfLines={1}>{food.food_name}</Text>
        {food.brand_name ? (
          <Text style={[styles.brandName, { color: theme.textSecondary }]} numberOfLines={1}>{food.brand_name}</Text>
        ) : null}
        <Text style={[styles.macroText, { color: theme.textSecondary }]}>
          {macroSummary(food)}
          {food.serving_size_amount != null ? ` · per ${food.serving_size_amount}${food.serving_size_unit ?? ''}` : ''}
        </Text>
      </View>
      <View style={styles.rowActions}>
        <Pressable onPress={() => setEditing(true)} hitSlop={8} style={styles.rowBtn}>
          <Text style={[styles.rowBtnText, { color: Colors.accent }]}>Edit</Text>
        </Pressable>
        <Pressable onPress={handleDelete} hitSlop={8} style={styles.rowBtn}>
          <Text style={[styles.rowBtnText, { color: '#E53E3E' }]}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function FoodLibraryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { profile } = useUserProfile();
  const [foods, setFoods] = useState<PersonalFood[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async (q: string) => {
    if (!profile) return;
    setLoading(true);
    try {
      const results = await getPersonalFoods(profile.user.id, q);
      setFoods(results);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  // Load on mount
  useState(() => { load(''); });

  async function handleQueryChange(q: string) {
    setQuery(q);
    await load(q);
  }

  async function handleDelete(id: string) {
    await deletePersonalFood(id);
    setFoods((prev) => prev.filter((f) => f.id !== id));
  }

  async function handleSave(id: string, patch: Partial<PersonalFood>) {
    await updatePersonalFood(id, patch);
    setFoods((prev) => prev.map((f) => f.id === id ? { ...f, ...patch } : f));
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Text style={[styles.backText, { color: Colors.accent }]}>← Back</Text>
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>Food Library</Text>
      </View>

      <View style={[styles.content, { maxWidth: MaxContentWidth }]}>
        <Input
          placeholder="Search saved foods…"
          value={query}
          onChangeText={handleQueryChange}
        />

        {loading ? (
          <Text style={[styles.statusText, { color: theme.textSecondary }]}>Loading…</Text>
        ) : !loaded || foods.length === 0 ? (
          <Text style={[styles.statusText, { color: theme.textSecondary }]}>
            {query.trim() ? 'No matches found.' : 'No saved foods yet. Tap ☆ on a food log item to save it here.'}
          </Text>
        ) : (
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {foods.map((food) => (
              <FoodRow
                key={food.id}
                food={food}
                onDelete={handleDelete}
                onSave={handleSave}
              />
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  } as ViewStyle,
  backBtn: {
    paddingVertical: Spacing.xs,
  } as ViewStyle,
  backText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  } as TextStyle,
  title: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
  } as TextStyle,
  content: {
    flex: 1,
    width: '100%',
    marginHorizontal: 'auto',
    padding: Spacing.lg,
    gap: Spacing.md,
  } as ViewStyle,
  list: {
    flex: 1,
  } as ViewStyle,
  statusText: {
    fontSize: FontSizes.sm,
    textAlign: 'center',
    marginTop: Spacing.xl,
  } as TextStyle,
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  } as ViewStyle,
  foodInfo: {
    flex: 1,
  } as ViewStyle,
  foodName: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  } as TextStyle,
  brandName: {
    fontSize: FontSizes.xs,
    marginTop: 1,
  } as TextStyle,
  macroText: {
    fontSize: FontSizes.xs,
    marginTop: 2,
  } as TextStyle,
  rowActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  } as ViewStyle,
  rowBtn: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
  } as ViewStyle,
  rowBtnText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  } as TextStyle,
  editCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginVertical: Spacing.xs,
    gap: Spacing.sm,
  } as ViewStyle,
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  } as ViewStyle,
  editNumInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    fontSize: FontSizes.sm,
    width: 80,
  } as TextStyle,
  unitScroll: {
    flex: 1,
  } as ViewStyle,
  unitScrollContent: {
    flexDirection: 'row',
    gap: Spacing.xs,
    alignItems: 'center',
  } as ViewStyle,
  unitChip: {
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  } as ViewStyle,
  unitChipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  } as ViewStyle,
  unitChipText: {
    fontSize: FontSizes.xs,
    fontWeight: '500',
  } as TextStyle,
  unitChipTextActive: {
    color: '#FFFFFF',
  } as TextStyle,
  macroRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  } as ViewStyle,
  macroField: {
    flex: 1,
    gap: 4,
  } as ViewStyle,
  macroLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '500',
  } as TextStyle,
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  } as ViewStyle,
  actionBtn: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  } as ViewStyle,
  actionBtnDisabled: {
    opacity: 0.4,
  } as ViewStyle,
  saveBtn: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  } as ViewStyle,
  actionBtnText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  } as TextStyle,
  saveBtnText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: '#FFFFFF',
  } as TextStyle,
});
