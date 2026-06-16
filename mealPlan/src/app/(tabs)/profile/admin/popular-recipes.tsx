import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Modal,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme } from '@/hooks/use-theme';
import { useUserRole } from '@/hooks/use-user-role';
import { usePopularRecipes, type PopularRecipeEntry } from '@/hooks/use-popular-recipes';
import { triggerSync } from '@/utils/trigger-sync';
import { usePowerSync } from '@powersync/react-native';
import { supabase, getCachedUserId } from '@/services/supabase';
import { saveRecipe } from '@/services/recipe-service';
import { searchRecipes, getRecipeDetail } from '@/services/spoonacular';
import { Colors, Spacing, FontSizes, BorderRadius, MaxContentWidth } from '@/constants/theme';
import { layout } from '@/styles/layout';

const ITEM_HEIGHT = 72;

function clamp(val: number, min: number, max: number) {
  'worklet';
  return Math.min(Math.max(val, min), max);
}

// ─── Draggable row (native only) ────────────────────────────────────────────

interface DraggableRowProps {
  entry: PopularRecipeEntry;
  index: number;
  total: number;
  activeIdx: SharedValue<number>;
  dragY: SharedValue<number>;
  onDragStart: (index: number) => void;
  onDragEnd: (fromIndex: number, toIndex: number) => void;
  onRemove: (id: string) => void;
  theme: ReturnType<typeof useTheme>;
}

function DraggableRow({
  entry, index, total, activeIdx, dragY,
  onDragStart, onDragEnd, onRemove, theme,
}: DraggableRowProps) {
  const pan = useMemo(() =>
    Gesture.Pan()
      .runOnJS(true)
      .activateAfterLongPress(200)
      .onBegin(() => {
        onDragStart(index);
      })
      .onUpdate((e) => {
        dragY.value = e.translationY;
      })
      .onEnd(() => {
        const targetIndex = clamp(
          Math.round((index * ITEM_HEIGHT + dragY.value) / ITEM_HEIGHT),
          0,
          total - 1,
        );
        onDragEnd(index, targetIndex);
        dragY.value = withTiming(0, { duration: 150 });
        activeIdx.value = -1;
      })
      .onFinalize(() => {
        dragY.value = withTiming(0, { duration: 150 });
        activeIdx.value = -1;
      }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [index, total],
  );

  const animStyle = useAnimatedStyle(() => {
    const isActive = activeIdx.value === index;
    if (isActive) {
      return {
        transform: [{ translateY: dragY.value }, { scale: 1.03 }],
        zIndex: 100,
        shadowOpacity: 0.2,
        elevation: 8,
      };
    }
    const fromIdx = activeIdx.value;
    if (fromIdx === -1) {
      return { transform: [{ translateY: withTiming(0, { duration: 150 }) }], zIndex: 1 };
    }
    const toIdx = clamp(
      Math.round((fromIdx * ITEM_HEIGHT + dragY.value) / ITEM_HEIGHT),
      0,
      total - 1,
    );
    let shift = 0;
    if (fromIdx < toIdx && index > fromIdx && index <= toIdx) shift = -ITEM_HEIGHT;
    else if (fromIdx > toIdx && index < fromIdx && index >= toIdx) shift = ITEM_HEIGHT;
    return { transform: [{ translateY: withTiming(shift, { duration: 150 }) }], zIndex: 1 };
  });

  const mins = (entry.recipe.prep_minutes ?? 0) + (entry.recipe.cook_minutes ?? 0);

  return (
    <Animated.View style={[styles.row, { backgroundColor: theme.backgroundElement, borderColor: theme.border }, animStyle]}>
      <GestureDetector gesture={pan}>
        <View style={styles.dragHandle}>
          <Text style={[styles.dragIcon, { color: theme.textSecondary }]}>≡</Text>
        </View>
      </GestureDetector>

      <View style={styles.rowInfo}>
        <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={1}>
          {entry.recipe.title}
        </Text>
        <Text style={[styles.rowMeta, { color: theme.textSecondary }]}>
          {mins > 0 ? `${mins} min` : null}
          {mins > 0 && entry.recipe.calories_per_serving ? '  ·  ' : null}
          {entry.recipe.calories_per_serving ? `${Math.round(entry.recipe.calories_per_serving)} cal` : null}
        </Text>
      </View>

      <Pressable style={styles.removeBtn} onPress={() => onRemove(entry.id)}>
        <Text style={styles.removeBtnText}>✕</Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Web row with ↑/↓ buttons ───────────────────────────────────────────────

interface WebRowProps {
  entry: PopularRecipeEntry;
  index: number;
  total: number;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRemove: (id: string) => void;
  theme: ReturnType<typeof useTheme>;
}

function WebRow({ entry, index, total, onMoveUp, onMoveDown, onRemove, theme }: WebRowProps) {
  const mins = (entry.recipe.prep_minutes ?? 0) + (entry.recipe.cook_minutes ?? 0);
  return (
    <View style={[styles.row, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={styles.webArrows}>
        <Pressable
          onPress={() => onMoveUp(index)}
          disabled={index === 0}
          style={[styles.arrowBtn, index === 0 && styles.arrowBtnDisabled]}
        >
          <Text style={[styles.arrowText, { color: index === 0 ? theme.textSecondary : theme.text }]}>↑</Text>
        </Pressable>
        <Pressable
          onPress={() => onMoveDown(index)}
          disabled={index === total - 1}
          style={[styles.arrowBtn, index === total - 1 && styles.arrowBtnDisabled]}
        >
          <Text style={[styles.arrowText, { color: index === total - 1 ? theme.textSecondary : theme.text }]}>↓</Text>
        </Pressable>
      </View>

      <View style={styles.rowInfo}>
        <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={1}>
          {entry.recipe.title}
        </Text>
        <Text style={[styles.rowMeta, { color: theme.textSecondary }]}>
          {mins > 0 ? `${mins} min` : null}
          {mins > 0 && entry.recipe.calories_per_serving ? '  ·  ' : null}
          {entry.recipe.calories_per_serving ? `${Math.round(entry.recipe.calories_per_serving)} cal` : null}
        </Text>
      </View>

      <Pressable style={styles.removeBtn} onPress={() => onRemove(entry.id)}>
        <Text style={styles.removeBtnText}>✕</Text>
      </Pressable>
    </View>
  );
}

// ─── Recipe picker modal ─────────────────────────────────────────────────────

interface RecipeResult {
  id: string;
  title: string;
  calories_per_serving: number | null;
  prep_minutes: number | null;
  cook_minutes: number | null;
}

interface RecipePickerProps {
  visible: boolean;
  excludeIds: string[];
  onSelect: (recipe: RecipeResult) => void;
  onClose: () => void;
  theme: ReturnType<typeof useTheme>;
}

type SpoonResult = { source: 'spoon'; spoonId: number; title: string; readyInMinutes?: number; calories?: number };
type SavedResult = { source: 'saved' } & RecipeResult;
type PickerRow = SavedResult | SpoonResult;

function RecipePicker({ visible, excludeIds, onSelect, onClose, theme }: RecipePickerProps) {
  const db = usePowerSync();
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<PickerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [importingId, setImportingId] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) { setQuery(''); setRows([]); }
  }, [visible]);

  const search = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const trimmed = q.trim();
      const [savedResp, spoonResp] = await Promise.all([
        supabase
          .from('recipes')
          .select('id, title, calories_per_serving, prep_minutes, cook_minutes')
          .order('title')
          .limit(20)
          .then((res) => trimmed ? supabase
            .from('recipes')
            .select('id, title, calories_per_serving, prep_minutes, cook_minutes')
            .ilike('title', `%${trimmed}%`)
            .order('title')
            .limit(20) : res),
        trimmed.length >= 2
          ? searchRecipes({ query: trimmed, number: 8 }).catch(() => ({ results: [] }))
          : Promise.resolve({ results: [] }),
      ]);
      const saved: SavedResult[] = ((savedResp.data ?? []) as RecipeResult[])
        .filter((r) => !excludeIds.includes(r.id))
        .map((r) => ({ source: 'saved' as const, ...r }));
      const savedApiIds = new Set(
        ((await supabase.from('recipes').select('source_api_id').not('source_api_id', 'is', null)).data ?? [])
          .map((r: { source_api_id: string }) => r.source_api_id)
      );
      const spoon: SpoonResult[] = (spoonResp.results as { id: number; title: string; readyInMinutes?: number; nutrition?: { calories?: number } }[])
        .filter((r) => !savedApiIds.has(String(r.id)))
        .map((r) => ({ source: 'spoon' as const, spoonId: r.id, title: r.title, readyInMinutes: r.readyInMinutes, calories: r.nutrition?.calories }));
      setRows([...saved, ...spoon]);
    } finally {
      setLoading(false);
    }
  }, [excludeIds]);

  useEffect(() => {
    if (!visible) return;
    search('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function handleQueryChange(t: string) {
    setQuery(t);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(t), 400);
  }

  async function handleSpoonSelect(row: SpoonResult) {
    const userId = getCachedUserId();
    if (!userId) return;
    setImportingId(row.spoonId);
    try {
      const detail = await getRecipeDetail(row.spoonId);
      const saved = await saveRecipe(db, userId, {
        title: detail.title,
        description: detail.description,
        image_url: detail.image,
        prep_minutes: detail.prepMinutes,
        cook_minutes: detail.cookMinutes,
        servings: detail.servings,
        difficulty: detail.difficulty ?? undefined,
        cuisine_type: detail.cuisineType ?? undefined,
        source_type: 'api',
        source_api_id: String(detail.id),
        source_url: detail.sourceUrl,
        calories_per_serving: detail.nutrition.calories,
        protein_per_serving: detail.nutrition.protein,
        carbs_per_serving: detail.nutrition.carbs,
        fat_per_serving: detail.nutrition.fat,
        fiber_per_serving: detail.nutrition.fiber,
        sugar_per_serving: detail.nutrition.sugar,
        sodium_per_serving: detail.nutrition.sodium,
        instructions: detail.instructions,
        dietary_tags: detail.dietaryTags,
        ingredients: detail.ingredients.map((ing, i) => ({
          raw_text: ing.rawText,
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          display_order: i,
        })),
      });
      onSelect({ id: saved.id, title: saved.title, calories_per_serving: saved.calories_per_serving ?? null, prep_minutes: saved.prep_minutes ?? null, cook_minutes: saved.cook_minutes ?? null });
      onClose();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to import recipe');
    } finally {
      setImportingId(null);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.pickerOverlay}>
        <View style={[styles.pickerCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <View style={styles.pickerHeader}>
            <Text style={[styles.pickerTitle, { color: theme.text }]}>Select Recipe</Text>
            <Pressable onPress={onClose}>
              <Text style={[styles.pickerClose, { color: Colors.accent }]}>Cancel</Text>
            </Pressable>
          </View>

          <TextInput
            style={[styles.pickerInput, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
            placeholder="Search saved or discover new…"
            placeholderTextColor={theme.textSecondary}
            value={query}
            onChangeText={handleQueryChange}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {loading ? (
            <ActivityIndicator style={{ marginTop: Spacing.xl }} color={Colors.accent} />
          ) : (
            <ScrollView style={styles.pickerList} keyboardShouldPersistTaps="handled">
              {rows.map((r) => {
                if (r.source === 'saved') {
                  return (
                    <Pressable
                      key={r.id}
                      style={[styles.pickerItem, { borderColor: theme.border }]}
                      onPress={() => { onSelect(r); onClose(); }}
                    >
                      <Text style={[styles.pickerItemTitle, { color: theme.text }]} numberOfLines={1}>{r.title}</Text>
                      {r.calories_per_serving ? (
                        <Text style={[styles.pickerItemMeta, { color: theme.textSecondary }]}>
                          Saved  ·  {Math.round(r.calories_per_serving)} cal
                        </Text>
                      ) : (
                        <Text style={[styles.pickerItemMeta, { color: theme.textSecondary }]}>Saved</Text>
                      )}
                    </Pressable>
                  );
                }
                const importing = importingId === r.spoonId;
                return (
                  <Pressable
                    key={`spoon-${r.spoonId}`}
                    style={[styles.pickerItem, { borderColor: theme.border }, importing && { opacity: 0.5 }]}
                    onPress={() => { if (!importing) handleSpoonSelect(r); }}
                    disabled={importing}
                  >
                    <Text style={[styles.pickerItemTitle, { color: theme.text }]} numberOfLines={1}>{r.title}</Text>
                    <Text style={[styles.pickerItemMeta, { color: theme.textSecondary }]}>
                      {importing ? 'Importing…' : `Spoonacular${r.calories ? `  ·  ${Math.round(r.calories)} cal` : ''}`}
                    </Text>
                  </Pressable>
                );
              })}
              {rows.length === 0 && (
                <Text style={[styles.pickerEmpty, { color: theme.textSecondary }]}>No recipes found</Text>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function PopularRecipesAdminScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { role } = useUserRole();
  const { items, limit, addRecipe, removeRecipe, reorderRecipes, updateLimit } = usePopularRecipes();

  const [isDragging, setIsDragging] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [limitText, setLimitText] = useState(String(limit));
  const [savingLimit, setSavingLimit] = useState(false);

  const activeIdx = useSharedValue(-1);
  const dragY = useSharedValue(0);

  useEffect(() => { setLimitText(String(limit)); }, [limit]);

  const handleDragStart = useCallback((index: number) => {
    activeIdx.value = index;
    setIsDragging(true);
  }, [activeIdx]);

  const handleDragEnd = useCallback(async (fromIndex: number, toIndex: number) => {
    setIsDragging(false);
    if (fromIndex === toIndex) return;
    const reordered = [...items];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    const updates = reordered.map((item, i) => ({ id: item.id, display_order: i }));
    try {
      await reorderRecipes(updates);
    } catch {
      Alert.alert('Error', 'Failed to reorder recipes');
    }
  }, [items, reorderRecipes]);

  const handleMoveUp = useCallback(async (index: number) => {
    if (index === 0) return;
    const reordered = [...items];
    [reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]];
    await reorderRecipes(reordered.map((item, i) => ({ id: item.id, display_order: i })));
  }, [items, reorderRecipes]);

  const handleMoveDown = useCallback(async (index: number) => {
    if (index === items.length - 1) return;
    const reordered = [...items];
    [reordered[index], reordered[index + 1]] = [reordered[index + 1], reordered[index]];
    await reorderRecipes(reordered.map((item, i) => ({ id: item.id, display_order: i })));
  }, [items, reorderRecipes]);

  const handleRemove = useCallback(async (popularId: string) => {
    const doRemove = async () => {
      try {
        await removeRecipe(popularId);
        triggerSync().catch(() => {});
      } catch {
        Alert.alert('Error', 'Failed to remove recipe');
      }
    };
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-restricted-globals
      if (confirm('Remove this recipe from the popular list?')) doRemove();
    } else {
      Alert.alert('Remove Recipe', 'Remove this recipe from the popular list?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: doRemove },
      ]);
    }
  }, [removeRecipe]);

  const handleAdd = useCallback(async (recipe: RecipeResult) => {
    try {
      await addRecipe(recipe.id);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to add recipe';
      Alert.alert('Error', msg);
    }
  }, [addRecipe]);

  const handleSaveLimit = useCallback(async () => {
    const parsed = parseInt(limitText, 10);
    if (isNaN(parsed) || parsed < 1) {
      Alert.alert('Invalid', 'Limit must be a positive number');
      return;
    }
    setSavingLimit(true);
    try {
      await updateLimit(parsed);
    } catch {
      Alert.alert('Error', 'Failed to update limit');
    } finally {
      setSavingLimit(false);
    }
  }, [limitText, updateLimit]);

  const atLimit = items.length >= limit;
  const excludeIds = useMemo(() => items.map((i) => i.recipe_id), [items]);

  return (
    <View style={[layout.screenContainer, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backBtnText, { color: Colors.accent }]}>‹ Back</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Popular Recipes</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        scrollEnabled={!isDragging}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Max limit section */}
        <View style={[styles.section, { borderColor: theme.border }]}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            MAX POPULAR RECIPES
          </Text>
          {role === 'admin' ? (
            <View style={styles.limitRow}>
              <TextInput
                style={[styles.limitInput, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
                value={limitText}
                onChangeText={setLimitText}
                keyboardType="number-pad"
                maxLength={3}
              />
              <Pressable
                onPress={handleSaveLimit}
                style={[styles.limitSaveBtn, { backgroundColor: Colors.accent }]}
                disabled={savingLimit}
              >
                {savingLimit
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.limitSaveBtnText}>Save</Text>
                }
              </Pressable>
            </View>
          ) : (
            <Text style={[styles.limitReadOnly, { color: theme.text }]}>{limit}</Text>
          )}
          <Text style={[styles.limitCurrent, { color: theme.textSecondary }]}>
            {items.length} / {limit} slots used
          </Text>
        </View>

        {/* Add button */}
        <Pressable
          style={[
            styles.addBtn,
            { borderColor: atLimit ? theme.border : Colors.accent },
            atLimit && styles.addBtnDisabled,
          ]}
          onPress={() => { if (!atLimit) setPickerVisible(true); }}
          disabled={atLimit}
        >
          <Text style={[styles.addBtnText, { color: atLimit ? theme.textSecondary : Colors.accent }]}>
            {atLimit ? `+ Add Recipe (limit reached)` : '+ Add Recipe'}
          </Text>
        </Pressable>

        {/* List */}
        {items.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            No popular recipes yet. Add some above.
          </Text>
        ) : (
          <View>
            {items.map((entry, index) =>
              Platform.OS === 'web' ? (
                <WebRow
                  key={entry.id}
                  entry={entry}
                  index={index}
                  total={items.length}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                  onRemove={handleRemove}
                  theme={theme}
                />
              ) : (
                <DraggableRow
                  key={entry.id}
                  entry={entry}
                  index={index}
                  total={items.length}
                  activeIdx={activeIdx}
                  dragY={dragY}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onRemove={handleRemove}
                  theme={theme}
                />
              ),
            )}
          </View>
        )}
      </ScrollView>

      <RecipePicker
        visible={pickerVisible}
        excludeIds={excludeIds}
        onSelect={handleAdd}
        onClose={() => setPickerVisible(false)}
        theme={theme}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,
  backBtn: {
    minWidth: 70,
  } as ViewStyle,
  backBtnText: {
    fontSize: FontSizes.md,
  } as TextStyle,
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: FontSizes.lg,
    fontWeight: '700',
  } as TextStyle,
  headerRight: {
    minWidth: 70,
  } as ViewStyle,
  scrollContent: {
    padding: Spacing.lg,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
    gap: Spacing.md,
  } as ViewStyle,
  section: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  } as ViewStyle,
  sectionLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    letterSpacing: 0.5,
  } as TextStyle,
  limitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  } as ViewStyle,
  limitInput: {
    width: 72,
    height: 40,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    fontSize: FontSizes.md,
    textAlign: 'center',
  } as TextStyle,
  limitSaveBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
    height: 40,
  } as ViewStyle,
  limitSaveBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: FontSizes.sm,
  } as TextStyle,
  limitReadOnly: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
  } as TextStyle,
  limitCurrent: {
    fontSize: FontSizes.sm,
  } as TextStyle,
  addBtn: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  } as ViewStyle,
  addBtnDisabled: {
    opacity: 0.5,
  } as ViewStyle,
  addBtnText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  } as TextStyle,
  emptyText: {
    textAlign: 'center',
    fontSize: FontSizes.sm,
    marginTop: Spacing.xl,
  } as TextStyle,
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ITEM_HEIGHT,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  } as ViewStyle,
  dragHandle: {
    width: 44,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  dragIcon: {
    fontSize: 20,
    lineHeight: 24,
  } as TextStyle,
  webArrows: {
    flexDirection: 'column',
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  } as ViewStyle,
  arrowBtn: {
    padding: 4,
  } as ViewStyle,
  arrowBtnDisabled: {
    opacity: 0.3,
  } as ViewStyle,
  arrowText: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    lineHeight: FontSizes.lg + 4,
  } as TextStyle,
  rowInfo: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
    gap: 2,
  } as ViewStyle,
  rowTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  } as TextStyle,
  rowMeta: {
    fontSize: FontSizes.xs,
  } as TextStyle,
  removeBtn: {
    width: 44,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  removeBtnText: {
    fontSize: FontSizes.md,
    color: '#FF3B30',
  } as TextStyle,
  // Picker
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  } as ViewStyle,
  pickerCard: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    maxHeight: '80%',
    paddingBottom: Spacing.xl,
  } as ViewStyle,
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
  } as ViewStyle,
  pickerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
  } as TextStyle,
  pickerClose: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  } as TextStyle,
  pickerInput: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    height: 44,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    fontSize: FontSizes.md,
  } as TextStyle,
  pickerList: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  } as ViewStyle,
  pickerItem: {
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 2,
  } as ViewStyle,
  pickerItemTitle: {
    fontSize: FontSizes.md,
    fontWeight: '500',
  } as TextStyle,
  pickerItemMeta: {
    fontSize: FontSizes.xs,
  } as TextStyle,
  pickerEmpty: {
    textAlign: 'center',
    marginTop: Spacing.xl,
    fontSize: FontSizes.sm,
  } as TextStyle,
});
