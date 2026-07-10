import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Modal, View, Text, StyleSheet, Pressable, Animated, Alert,
  ScrollView, TextInput, ActivityIndicator,
  type ViewStyle, type TextStyle,
} from 'react-native';
import { usePowerSync } from '@powersync/react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useKeyboardSlide } from '@/hooks/use-keyboard-slide';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IconPicker } from '@/components/ui/icon-picker';
import { LogFoodForm, type LogFoodSubmitParams, type LogFoodFormPrefill } from './log-food-form';
import { DatePickerModal } from '@/components/ui/date-picker-modal';
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase } from '@/services/supabase';
import { getTopRecipes, getSavedRecipeIdByApiId, saveRecipe } from '@/services/recipe-service';
import { searchRecipes as spoonacularSearch, getRecipeDetail } from '@/services/spoonacular';
import type { Recipe } from '@/models/recipe';
import type { SpoonacularSearchResult } from '@/services/spoonacular';
import type { MealSlotFoodInput } from '@/services/meal-plan-service';

interface AddMealSlotModalProps {
  visible: boolean;
  date: string;
  initialTime?: string;
  userId?: string;
  prefillSuggestion?: LogFoodFormPrefill & { searchQuery: string; label?: string; icon?: string | null };
  onClose: () => void;
  onDateChange?: (date: string) => void;
  // Slot creation is split from item attachment so multiple recipes/food items can be added
  // to the same slot in one visit — the slot is created once, on the first pick, and reused.
  onCreateSlot: (label: string, date: string, time: string, icon?: string | null) => Promise<string | null>;
  onAddRecipeToSlot: (slotId: string, recipe: Recipe) => Promise<void>;
  onAddFoodToSlot?: (slotId: string, food: MealSlotFoodInput) => Promise<void>;
  onLogFood: (date: string, params: LogFoodSubmitParams) => Promise<void>;
}

const QUICK_LABELS = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Post-workout'];

type EntryType = 'plan' | 'log';
type PlanItemKind = 'recipe' | 'food' | null;
type RecipeResult = { source: 'saved'; item: Recipe } | { source: 'spoonacular'; item: SpoonacularSearchResult };
interface AddedItem {
  key: string;
  name: string;
  kind: 'recipe' | 'food';
  detail?: string;
}

function currentTime12(): { hour: string; minute: string; period: 'AM' | 'PM' } {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  return {
    hour: String(h === 0 ? 12 : h > 12 ? h - 12 : h),
    minute: String(m).padStart(2, '0'),
    period: (h >= 12 ? 'PM' : 'AM') as 'AM' | 'PM',
  };
}

function parse24to12(time24: string): { hour: string; minute: string; period: 'AM' | 'PM' } {
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10) || 0;
  const minute = mStr ?? '00';
  const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return { hour: String(h), minute, period };
}

function to24(hour: string, minute: string, period: 'AM' | 'PM'): string {
  let h = parseInt(hour, 10) || 0;
  if (period === 'AM' && h === 12) h = 0;
  else if (period === 'PM' && h !== 12) h += 12;
  return `${String(h).padStart(2, '0')}:${minute.padStart(2, '0')}`;
}

function dateStrToDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

function dateToDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function AddMealSlotModal({
  visible, date, initialTime, userId, prefillSuggestion, onClose, onDateChange, onCreateSlot, onAddRecipeToSlot, onAddFoodToSlot, onLogFood,
}: AddMealSlotModalProps) {
  const theme = useTheme();
  const db = usePowerSync();
  const router = useRouter();
  const keyboardSlide = useKeyboardSlide();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [entryType, setEntryType] = useState<EntryType>('plan');
  const [planItemKind, setPlanItemKind] = useState<PlanItemKind>(null);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  // A slot is created once, on the first item picked in step 4, and reused for
  // subsequent picks so the user can add several recipes/food items in one visit.
  const [createdSlotId, setCreatedSlotId] = useState<string | null>(null);
  const [addedItems, setAddedItems] = useState<AddedItem[]>([]);

  // Step 2: shared label / icon / time
  const [label, setLabel] = useState('');
  const [icon, setIcon] = useState<string | null>(null);
  const [hour, setHour] = useState('12');
  const [minute, setMinute] = useState('00');
  const [period, setPeriod] = useState<'AM' | 'PM'>('PM');

  // Step 4 (plan → recipe): recipe search
  const [recipeQuery, setRecipeQuery] = useState('');
  const [recipeResults, setRecipeResults] = useState<RecipeResult[]>([]);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [mostUsedRecipes, setMostUsedRecipes] = useState<Recipe[]>([]);
  const [importingId, setImportingId] = useState<number | null>(null);
  const recipeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Step 4 (plan → food item): reuses LogFoodForm; bumped after each add so the
  // form resets and the user can add another food item to the same slot.
  const [foodFormKey, setFoodFormKey] = useState(0);

  useEffect(() => {
    if (!visible) return;
    setRecipeQuery('');
    setRecipeResults([]);
    setMostUsedRecipes([]);
    setFoodFormKey((k) => k + 1);
    setPlanItemKind(null);
    setCreatedSlotId(null);
    setAddedItems([]);
    const t = initialTime ? parse24to12(initialTime) : currentTime12();
    setHour(t.hour);
    setMinute(t.minute);
    setPeriod(t.period);
    if (prefillSuggestion) {
      setEntryType('log');
      setLabel(prefillSuggestion?.label ?? 'Snack');
      setIcon(prefillSuggestion?.icon ?? null);
      setStep(3);
    } else {
      setStep(1);
      setLabel('');
      setIcon(null);
    }
  }, [visible, initialTime, prefillSuggestion]);

  // Load most-used recipes when entering the recipe search step
  useEffect(() => {
    if (!visible || step !== 4 || planItemKind !== 'recipe' || !userId) return;
    let cancelled = false;
    getTopRecipes(userId, 5).then((top) => { if (!cancelled) setMostUsedRecipes(top); });
    return () => { cancelled = true; };
  }, [visible, step, planItemKind, userId]);

  const runRecipeSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) { setRecipeResults([]); return; }
    setRecipeLoading(true);
    try {
      const [savedResp, spoonResp] = await Promise.all([
        supabase.from('recipes').select('*').ilike('title', `%${trimmed}%`).limit(10),
        spoonacularSearch({ query: trimmed, number: 8 }).catch(() => ({ results: [] as SpoonacularSearchResult[] })),
      ]);
      const saved = (savedResp.data ?? []) as Recipe[];
      const savedApiIds = new Set(saved.map((r) => r.source_api_id).filter(Boolean));
      setRecipeResults([
        ...saved.map((item) => ({ source: 'saved' as const, item })),
        ...spoonResp.results
          .filter((r) => !savedApiIds.has(String(r.id)))
          .map((item) => ({ source: 'spoonacular' as const, item })),
      ]);
    } finally {
      setRecipeLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!visible || step !== 4 || planItemKind !== 'recipe') return;
    if (recipeDebounceRef.current) clearTimeout(recipeDebounceRef.current);
    recipeDebounceRef.current = setTimeout(() => runRecipeSearch(recipeQuery), 400);
    return () => { if (recipeDebounceRef.current) clearTimeout(recipeDebounceRef.current); };
  }, [visible, recipeQuery, step, planItemKind, runRecipeSearch]);

  const time24 = to24(hour, minute, period);

  const selectedDateObj = dateStrToDate(date);
  const formattedDate = selectedDateObj.toLocaleDateString(undefined, {
    weekday: 'long', month: 'short', day: 'numeric',
  });

  const ensureSlotCreated = useCallback(async (): Promise<string | null> => {
    if (createdSlotId) return createdSlotId;
    const slotId = await onCreateSlot(label.trim(), date, time24, icon);
    if (slotId) setCreatedSlotId(slotId);
    return slotId;
  }, [createdSlotId, onCreateSlot, label, date, time24, icon]);

  const handleSelectSaved = async (recipe: Recipe) => {
    const slotId = await ensureSlotCreated();
    if (!slotId) return;
    await onAddRecipeToSlot(slotId, recipe);
    setAddedItems((prev) => [...prev, {
      key: `r-${recipe.id}-${prev.length}`,
      name: recipe.title,
      kind: 'recipe',
      detail: recipe.calories_per_serving ? `${recipe.calories_per_serving} kcal` : undefined,
    }]);
    setRecipeQuery('');
  };

  const handleAddFoodItems = async (params: LogFoodSubmitParams) => {
    try {
      const slotId = await ensureSlotCreated();
      if (!slotId || !onAddFoodToSlot) return;
      for (const item of params.items) {
        const food: MealSlotFoodInput = {
          food_name: item.food_name,
          brand_name: item.brand_name,
          serving_size_amount: item.serving_size_amount,
          serving_size_unit: item.serving_size_unit,
          servings_planned: item.servings_eaten,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
          saturated_fat: item.saturated_fat,
          trans_fat: item.trans_fat,
          cholesterol: item.cholesterol,
          sodium: item.sodium,
          dietary_fiber: item.dietary_fiber,
          total_sugar: item.total_sugar,
          added_sugar: item.added_sugar,
          source: item.source as MealSlotFoodInput['source'],
          source_id: item.source_id,
          // Manual search picks default to grocery-purchasable, matching the recipe-import path.
          is_grocery_item: true,
        };
        await onAddFoodToSlot(slotId, food);
        setAddedItems((prev) => [...prev, {
          key: `f-${food.source_id ?? food.food_name}-${prev.length}`,
          name: food.food_name,
          kind: 'food',
          detail: food.calories ? `${food.calories} kcal` : undefined,
        }]);
      }
      setFoodFormKey((k) => k + 1);
    } catch (e) {
      Alert.alert('Failed to add food item', e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const handleSelectSpoonacular = async (item: SpoonacularSearchResult) => {
    if (!userId) return;
    setImportingId(item.id);
    try {
      const existingId = await getSavedRecipeIdByApiId(userId, String(item.id));
      let recipe: Recipe;
      if (existingId) {
        const { data } = await supabase.from('recipes').select('*').eq('id', existingId).single();
        recipe = data as Recipe;
      } else {
        const detail = await getRecipeDetail(item.id);
        recipe = await saveRecipe(db, userId, {
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
      }
      const slotId = await ensureSlotCreated();
      if (slotId) {
        await onAddRecipeToSlot(slotId, recipe);
        setAddedItems((prev) => [...prev, {
          key: `r-${recipe.id}-${prev.length}`,
          name: recipe.title,
          kind: 'recipe',
          detail: recipe.calories_per_serving ? `${recipe.calories_per_serving} kcal` : undefined,
        }]);
      }
      setRecipeQuery('');
    } catch {
      // silently fail — user can retry
    } finally {
      setImportingId(null);
    }
  };

  const handleLogFood = async (params: LogFoodSubmitParams) => {
    try {
      await onLogFood(date, { ...params, label: label.trim() || null, timeOfDay: time24, icon });
      onClose();
    } catch (e) {
      Alert.alert('Failed to log food', e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const showMostUsed = recipeQuery.trim().length < 2;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View style={[styles.sheet, { backgroundColor: theme.background, transform: [{ translateY: keyboardSlide.translateY }] }, keyboardSlide.maxHeight != null && { maxHeight: keyboardSlide.maxHeight }]}>

          {/* Header: back arrow + date + close */}
          <View style={styles.headerRow}>
            {step > 1 ? (
              <Pressable
                onPress={() => {
                  if (step === 4) setPlanItemKind(null);
                  setStep((s) => (s - 1) as 1 | 2 | 3 | 4);
                }}
                hitSlop={12}
                style={styles.headerSide}
              >
                <Ionicons name="chevron-back" size={22} color={theme.text} />
              </Pressable>
            ) : (
              <View style={styles.headerSide} />
            )}
            {onDateChange && !createdSlotId ? (
              <Pressable style={styles.headerDatePressable} onPress={() => setDatePickerVisible(true)} hitSlop={8}>
                <Text style={[styles.headerDate, { color: theme.text }]}>{formattedDate}</Text>
                <Ionicons name="chevron-down" size={14} color={theme.textSecondary} />
              </Pressable>
            ) : (
              <Text style={[styles.headerDate, { color: theme.textSecondary }]}>{formattedDate}</Text>
            )}
            <View style={styles.headerSide}>
              <Pressable style={[styles.closeButton, { backgroundColor: theme.backgroundElement }]} onPress={onClose} hitSlop={8}>
                <Ionicons name="close" size={18} color={theme.textSecondary} />
              </Pressable>
            </View>
          </View>

          {/* Step 1: type picker */}
          {step === 1 && (
            <View style={styles.typePickerStep}>
              <Text style={[styles.stepTitle, { color: theme.text }]}>What would you like to add?</Text>
              <View style={styles.typeCards}>
                <Pressable
                  style={[styles.typeCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
                  onPress={() => { setEntryType('plan'); setStep(2); }}
                >
                  <Ionicons name="restaurant-outline" size={28} color={Colors.accent} />
                  <Text style={[styles.typeCardTitle, { color: theme.text }]}>Plan a Meal</Text>
                  <Text style={[styles.typeCardSub, { color: theme.textSecondary }]}>Schedule a recipe or food item on your calendar</Text>
                </Pressable>
                <Pressable
                  style={[styles.typeCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
                  onPress={() => { setEntryType('log'); setStep(2); }}
                >
                  <Ionicons name="nutrition-outline" size={28} color={Colors.accent} />
                  <Text style={[styles.typeCardTitle, { color: theme.text }]}>Log Food</Text>
                  <Text style={[styles.typeCardSub, { color: theme.textSecondary }]}>Track what you ate or are eating</Text>
                </Pressable>
              </View>

              <Pressable
                style={styles.planWeekLink}
                onPress={() => { onClose(); router.push('/plan-week' as any); }}
              >
                <Ionicons name="calendar-outline" size={16} color={Colors.accent} />
                <Text style={[styles.planWeekLinkText, { color: Colors.accent }]}>Plan out your whole week instead</Text>
              </Pressable>
            </View>
          )}

          {/* Step 2: label, icon, time */}
          {step === 2 && (
            <View style={styles.detailsStep}>
              <Text style={[styles.stepTitle, { color: theme.text }]}>
                {entryType === 'log' ? 'Name this food entry' : 'Name your meal slot'}
              </Text>

              <IconPicker value={icon} onChange={setIcon} />

              <View style={styles.quickLabels}>
                {QUICK_LABELS.map((ql) => (
                  <Pressable
                    key={ql}
                    style={[styles.chip, { borderColor: theme.border }, label === ql && styles.chipActive]}
                    onPress={() => setLabel(ql)}
                  >
                    <Text style={[styles.chipText, { color: theme.text }, label === ql && styles.chipTextActive]}>{ql}</Text>
                  </Pressable>
                ))}
              </View>

              <Input placeholder="Custom label…" value={label} onChangeText={setLabel} />

              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Time</Text>
              <View style={styles.timeRow}>
                <Input
                  placeholder="12"
                  value={hour}
                  onChangeText={(v) => setHour(v.replace(/[^0-9]/g, '').slice(0, 2))}
                  keyboardType="number-pad"
                  style={styles.timeInput}
                  containerStyle={styles.timeInputContainer}
                />
                <Text style={[styles.timeSeparator, { color: theme.text }]}>:</Text>
                <Input
                  placeholder="00"
                  value={minute}
                  onChangeText={(v) => setMinute(v.replace(/[^0-9]/g, '').slice(0, 2))}
                  keyboardType="number-pad"
                  style={styles.timeInput}
                  containerStyle={styles.timeInputContainer}
                />
                <View style={[styles.periodToggle, { borderColor: Colors.accent }]}>
                  <Pressable style={[styles.periodBtn, period === 'AM' && styles.periodBtnActive]} onPress={() => setPeriod('AM')}>
                    <Text style={[styles.periodText, period === 'AM' && styles.periodTextActive]}>AM</Text>
                  </Pressable>
                  <Pressable style={[styles.periodBtn, period === 'PM' && styles.periodBtnActive]} onPress={() => setPeriod('PM')}>
                    <Text style={[styles.periodText, period === 'PM' && styles.periodTextActive]}>PM</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.actions}>
                <Button label="Back" onPress={() => setStep(1)} variant="secondary" />
                <Button
                  label={entryType === 'plan' ? 'Next →' : 'Add Food →'}
                  onPress={() => setStep(3)}
                  disabled={!label.trim()}
                />
              </View>
            </View>
          )}

          {/* Step 3 (plan): recipe or food item? */}
          {step === 3 && entryType === 'plan' && (
            <View style={styles.typePickerStep}>
              <Text style={[styles.stepTitle, { color: theme.text }]}>Add a recipe or a food item?</Text>
              <View style={styles.typeCards}>
                <Pressable
                  style={[styles.typeCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
                  onPress={() => { setPlanItemKind('recipe'); setStep(4); }}
                >
                  <Ionicons name="restaurant-outline" size={28} color={Colors.accent} />
                  <Text style={[styles.typeCardTitle, { color: theme.text }]}>Recipe</Text>
                  <Text style={[styles.typeCardSub, { color: theme.textSecondary }]}>Search your saved recipes or discover new ones</Text>
                </Pressable>
                <Pressable
                  style={[styles.typeCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
                  onPress={() => { setPlanItemKind('food'); setStep(4); }}
                >
                  <Ionicons name="cart-outline" size={28} color={Colors.accent} />
                  <Text style={[styles.typeCardTitle, { color: theme.text }]}>Food Item</Text>
                  <Text style={[styles.typeCardSub, { color: theme.textSecondary }]}>Something you'll buy, like a protein bar</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Step 4 (plan): add recipes and/or food items to the slot */}
          {step === 4 && entryType === 'plan' && (
            <>
              <Text style={[styles.stepTitle, { color: theme.text }]}>Add Items</Text>

              <View style={[styles.modeTabs, { borderColor: theme.border }]}>
                <Pressable
                  style={[styles.modeTab, planItemKind === 'recipe' && styles.modeTabActive]}
                  onPress={() => setPlanItemKind('recipe')}
                >
                  <Text style={[styles.modeTabText, { color: theme.text }, planItemKind === 'recipe' && styles.modeTabTextActive]}>Recipes</Text>
                </Pressable>
                <Pressable
                  style={[styles.modeTab, planItemKind === 'food' && styles.modeTabActive]}
                  onPress={() => setPlanItemKind('food')}
                >
                  <Text style={[styles.modeTabText, { color: theme.text }, planItemKind === 'food' && styles.modeTabTextActive]}>Food Items</Text>
                </Pressable>
              </View>

              {addedItems.length > 0 && (
                <View style={styles.stagedList}>
                  <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Added ({addedItems.length})</Text>
                  {addedItems.map((it) => (
                    <View key={it.key} style={[styles.stagedItem, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                      <Ionicons
                        name={it.kind === 'recipe' ? 'restaurant-outline' : 'nutrition-outline'}
                        size={16}
                        color={Colors.accent}
                      />
                      <View style={styles.stagedItemText}>
                        <Text style={[styles.stagedItemName, { color: theme.text }]} numberOfLines={1}>{it.name}</Text>
                        {it.detail && (
                          <Text style={[styles.stagedItemDetail, { color: theme.textSecondary }]}>{it.detail}</Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {planItemKind === 'recipe' ? (
            <>
              <View style={[styles.searchBar, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
                <TextInput
                  style={[styles.searchInput, { color: theme.text }]}
                  placeholder="Search saved & Spoonacular…"
                  placeholderTextColor={theme.textSecondary}
                  value={recipeQuery}
                  onChangeText={setRecipeQuery}
                />
                {recipeQuery.length > 0 && (
                  <Pressable onPress={() => setRecipeQuery('')} hitSlop={8} style={styles.clearBtn}>
                    <Text style={[styles.clearIcon, { color: theme.textSecondary }]}>×</Text>
                  </Pressable>
                )}
              </View>

              <ScrollView style={styles.recipeList} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {recipeLoading ? (
                  <ActivityIndicator color={Colors.accent} style={styles.spinner} />
                ) : showMostUsed ? (
                  mostUsedRecipes.length > 0 ? (
                    <>
                      <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Most Used</Text>
                      {mostUsedRecipes.map((recipe) => (
                        <Pressable
                          key={recipe.id}
                          style={[styles.recipeRow, { borderBottomColor: theme.border }]}
                          onPress={() => handleSelectSaved(recipe)}
                        >
                          <View style={styles.recipeRowInfo}>
                            <Text style={[styles.recipeRowTitle, { color: theme.text }]} numberOfLines={1}>{recipe.title}</Text>
                            <Text style={[styles.recipeRowMeta, { color: theme.textSecondary }]}>
                              {[
                                recipe.calories_per_serving ? `${recipe.calories_per_serving} kcal` : null,
                                recipe.prep_minutes ? `${recipe.prep_minutes} min` : null,
                              ].filter(Boolean).join(' · ')}
                            </Text>
                          </View>
                          <Text style={[styles.chevron, { color: theme.textSecondary }]}>›</Text>
                        </Pressable>
                      ))}
                    </>
                  ) : (
                    <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>
                      Search your saved recipes or discover from Spoonacular
                    </Text>
                  )
                ) : recipeResults.length === 0 ? (
                  <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>No recipes found</Text>
                ) : (
                  recipeResults.map((result, idx) => {
                    if (result.source === 'saved') {
                      const r = result.item;
                      return (
                        <Pressable
                          key={r.id}
                          style={[styles.recipeRow, { borderBottomColor: theme.border }]}
                          onPress={() => handleSelectSaved(r)}
                        >
                          <View style={styles.recipeRowInfo}>
                            <Text style={[styles.recipeRowTitle, { color: theme.text }]} numberOfLines={1}>{r.title}</Text>
                            <Text style={[styles.recipeRowMeta, { color: theme.textSecondary }]}>
                              {[r.calories_per_serving ? `${r.calories_per_serving} kcal` : null, r.prep_minutes ? `${r.prep_minutes} min` : null].filter(Boolean).join(' · ')}
                            </Text>
                          </View>
                          <View style={styles.badgeCol}>
                            <Text style={[styles.badge, styles.badgeSaved]}>Saved</Text>
                            <Text style={[styles.chevron, { color: theme.textSecondary }]}>›</Text>
                          </View>
                        </Pressable>
                      );
                    }
                    const r = result.item;
                    const isImporting = importingId === r.id;
                    return (
                      <Pressable
                        key={`spoon-${r.id}-${idx}`}
                        style={[styles.recipeRow, { borderBottomColor: theme.border }]}
                        onPress={() => handleSelectSpoonacular(r)}
                        disabled={!!importingId}
                      >
                        <View style={styles.recipeRowInfo}>
                          <Text style={[styles.recipeRowTitle, { color: theme.text }]} numberOfLines={1}>{r.title}</Text>
                          <Text style={[styles.recipeRowMeta, { color: theme.textSecondary }]}>
                            {[
                              r.nutrition?.calories ? `${r.nutrition.calories} kcal` : null,
                              r.readyInMinutes ? `${r.readyInMinutes} min` : null,
                            ].filter(Boolean).join(' · ')}
                          </Text>
                        </View>
                        <View style={styles.badgeCol}>
                          <Text style={[styles.badge, styles.badgeSpoon]}>Spoonacular</Text>
                          {isImporting
                            ? <ActivityIndicator size="small" color={Colors.accent} />
                            : <Text style={[styles.chevron, { color: theme.textSecondary }]}>›</Text>}
                        </View>
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>
            </>
              ) : (
                <LogFoodForm
                  key={foodFormKey}
                  userId={userId}
                  showLabelAndTime={false}
                  submitLabel="Add to Slot"
                  onSubmit={handleAddFoodItems}
                  onCancel={() => setPlanItemKind(null)}
                />
              )}

              <View style={styles.actions}>
                {addedItems.length === 0 ? (
                  <Button
                    label="Add slot without items"
                    onPress={async () => { await ensureSlotCreated(); onClose(); }}
                    variant="secondary"
                  />
                ) : (
                  <Button label="Done" onPress={onClose} />
                )}
              </View>
            </>
          )}

          {/* Step 3 (log): food log form */}
          {step === 3 && entryType === 'log' && (
            <LogFoodForm
              userId={userId}
              showLabelAndTime={false}
              initialQuery={prefillSuggestion?.searchQuery}
              initialManualValues={prefillSuggestion}
              onSubmit={handleLogFood}
              onCancel={() => prefillSuggestion ? onClose() : setStep(2)}
            />
          )}

        </Animated.View>
      </View>

      {onDateChange && (
        <DatePickerModal
          visible={datePickerVisible}
          currentDate={selectedDateObj}
          onSelect={(d) => onDateChange(dateToDateStr(d))}
          onClose={() => setDatePickerVisible(false)}
          allowFuture
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  } as ViewStyle,
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  } as ViewStyle,
  sheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.md,
    maxHeight: '90%',
  } as ViewStyle,
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  } as ViewStyle,
  headerSide: {
    width: 36,
    alignItems: 'center',
  } as ViewStyle,
  headerDate: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    textAlign: 'center',
  } as TextStyle,
  headerDatePressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  } as ViewStyle,
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  stepTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  } as TextStyle,

  // Step 1
  typePickerStep: {
    gap: Spacing.md,
  } as ViewStyle,
  typeCards: {
    flexDirection: 'row',
    gap: Spacing.md,
  } as ViewStyle,
  typeCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
    alignItems: 'flex-start',
  } as ViewStyle,
  planWeekLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  } as ViewStyle,
  planWeekLinkText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  } as TextStyle,
  typeCardTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
  } as TextStyle,
  typeCardSub: {
    fontSize: FontSizes.xs,
    lineHeight: 16,
  } as TextStyle,

  // Step 2
  detailsStep: {
    gap: Spacing.md,
  } as ViewStyle,
  quickLabels: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  } as ViewStyle,
  chip: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  } as ViewStyle,
  chipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  } as ViewStyle,
  chipText: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
  } as TextStyle,
  chipTextActive: {
    color: '#FFFFFF',
  } as TextStyle,
  sectionLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  } as ViewStyle,
  timeInput: {
    textAlign: 'center',
  } as TextStyle,
  timeInputContainer: {
    width: 52,
  } as ViewStyle,
  timeSeparator: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
  } as TextStyle,
  periodToggle: {
    flexDirection: 'row',
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    borderWidth: 1,
    marginLeft: Spacing.sm,
  } as ViewStyle,
  periodBtn: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  } as ViewStyle,
  periodBtnActive: {
    backgroundColor: Colors.accent,
  } as ViewStyle,
  periodText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.accent,
  } as TextStyle,
  periodTextActive: {
    color: '#FFFFFF',
  } as TextStyle,
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  } as ViewStyle,

  // Step 3a recipe search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
  } as ViewStyle,
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.sm,
    fontSize: 16,
  } as TextStyle,
  clearBtn: {
    paddingLeft: Spacing.xs,
    paddingVertical: 4,
  } as ViewStyle,
  clearIcon: {
    fontSize: 20,
    lineHeight: 22,
  } as TextStyle,
  recipeList: {
    maxHeight: 320,
  } as ViewStyle,
  recipeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,
  recipeRowInfo: {
    flex: 1,
  } as ViewStyle,
  recipeRowTitle: {
    fontSize: FontSizes.md,
    fontWeight: '500',
  } as TextStyle,
  recipeRowMeta: {
    fontSize: FontSizes.sm,
    marginTop: 2,
  } as TextStyle,
  badgeCol: {
    alignItems: 'flex-end',
    gap: 4,
  } as ViewStyle,
  badge: {
    fontSize: 10,
    fontWeight: '700',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  } as TextStyle,
  badgeSaved: {
    backgroundColor: '#E8F5E9',
    color: '#2E7D32',
  } as TextStyle,
  badgeSpoon: {
    backgroundColor: '#FFF3E0',
    color: '#E65100',
  } as TextStyle,
  chevron: {
    fontSize: 20,
    paddingLeft: Spacing.sm,
  } as TextStyle,
  emptyHint: {
    textAlign: 'center',
    paddingVertical: Spacing.xl,
    fontSize: FontSizes.sm,
  } as TextStyle,
  spinner: {
    marginTop: Spacing.xl,
  } as ViewStyle,

  // Step 4 mode tabs + added-items list
  modeTabs: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  } as ViewStyle,
  modeTab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  } as ViewStyle,
  modeTabActive: {
    backgroundColor: Colors.accent,
  } as ViewStyle,
  modeTabText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  } as TextStyle,
  modeTabTextActive: {
    color: '#FFFFFF',
  } as TextStyle,
  stagedList: {
    gap: Spacing.xs,
  } as ViewStyle,
  stagedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  } as ViewStyle,
  stagedItemText: {
    flex: 1,
  } as ViewStyle,
  stagedItemName: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
  } as TextStyle,
  stagedItemDetail: {
    fontSize: FontSizes.xs,
    marginTop: 1,
  } as TextStyle,
});
