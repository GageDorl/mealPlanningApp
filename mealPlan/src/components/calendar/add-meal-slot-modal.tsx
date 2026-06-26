import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Modal, View, Text, StyleSheet, Pressable, Animated, Alert,
  ScrollView, TextInput, ActivityIndicator,
  type ViewStyle, type TextStyle,
} from 'react-native';
import { usePowerSync } from '@powersync/react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useKeyboardSlide } from '@/hooks/use-keyboard-slide';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IconPicker } from '@/components/ui/icon-picker';
import { LogFoodForm, type LogFoodSubmitParams } from './log-food-form';
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase } from '@/services/supabase';
import { getTopRecipes, getSavedRecipeIdByApiId, saveRecipe } from '@/services/recipe-service';
import { searchRecipes as spoonacularSearch, getRecipeDetail } from '@/services/spoonacular';
import type { Recipe } from '@/models/recipe';
import type { SpoonacularSearchResult } from '@/services/spoonacular';

interface AddMealSlotModalProps {
  visible: boolean;
  date: string;
  initialTime?: string;
  userId?: string;
  onClose: () => void;
  onAdd: (label: string, time?: string, recipe?: Recipe, icon?: string | null) => void;
  onLogFood: (date: string, params: LogFoodSubmitParams) => Promise<void>;
}

const QUICK_LABELS = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Post-workout'];

type EntryType = 'plan' | 'log';
type RecipeResult = { source: 'saved'; item: Recipe } | { source: 'spoonacular'; item: SpoonacularSearchResult };

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

export function AddMealSlotModal({
  visible, date, initialTime, userId, onClose, onAdd, onLogFood,
}: AddMealSlotModalProps) {
  const theme = useTheme();
  const db = usePowerSync();
  const keyboardSlide = useKeyboardSlide();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [entryType, setEntryType] = useState<EntryType>('plan');

  // Step 2: shared label / icon / time
  const [label, setLabel] = useState('');
  const [icon, setIcon] = useState<string | null>(null);
  const [hour, setHour] = useState('12');
  const [minute, setMinute] = useState('00');
  const [period, setPeriod] = useState<'AM' | 'PM'>('PM');

  // Step 3a: recipe search
  const [recipeQuery, setRecipeQuery] = useState('');
  const [recipeResults, setRecipeResults] = useState<RecipeResult[]>([]);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [mostUsedRecipes, setMostUsedRecipes] = useState<Recipe[]>([]);
  const [importingId, setImportingId] = useState<number | null>(null);
  const recipeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) return;
    setStep(1);
    setLabel('');
    setIcon(null);
    setRecipeQuery('');
    setRecipeResults([]);
    setMostUsedRecipes([]);
    const t = initialTime ? parse24to12(initialTime) : currentTime12();
    setHour(t.hour);
    setMinute(t.minute);
    setPeriod(t.period);
  }, [visible, initialTime]);

  // Load most-used recipes when entering step 3 (plan)
  useEffect(() => {
    if (!visible || step !== 3 || entryType !== 'plan' || !userId) return;
    let cancelled = false;
    getTopRecipes(userId, 5).then((top) => { if (!cancelled) setMostUsedRecipes(top); });
    return () => { cancelled = true; };
  }, [visible, step, entryType, userId]);

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
    if (step !== 3 || entryType !== 'plan') return;
    if (recipeDebounceRef.current) clearTimeout(recipeDebounceRef.current);
    recipeDebounceRef.current = setTimeout(() => runRecipeSearch(recipeQuery), 400);
    return () => { if (recipeDebounceRef.current) clearTimeout(recipeDebounceRef.current); };
  }, [recipeQuery, step, entryType, runRecipeSearch]);

  const time24 = to24(hour, minute, period);

  const [year, month, day] = date.split('-').map(Number);
  const formattedDate = new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: 'long', month: 'short', day: 'numeric',
  });

  const handleSelectSaved = (recipe: Recipe) => {
    onAdd(label.trim(), time24, recipe, icon);
    onClose();
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
      onAdd(label.trim(), time24, recipe, icon);
      onClose();
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
        <Animated.View style={[styles.sheet, { backgroundColor: theme.background, transform: [{ translateY: keyboardSlide }] }]}>

          {/* Header: back arrow + date + close */}
          <View style={styles.headerRow}>
            {step > 1 ? (
              <Pressable onPress={() => setStep((s) => (s - 1) as 1 | 2 | 3)} hitSlop={12} style={styles.headerSide}>
                <Ionicons name="chevron-back" size={22} color={theme.text} />
              </Pressable>
            ) : (
              <View style={styles.headerSide} />
            )}
            <Text style={[styles.headerDate, { color: theme.textSecondary }]}>{formattedDate}</Text>
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
                  <Text style={[styles.typeCardTitle, { color: theme.text }]}>Plan a Recipe</Text>
                  <Text style={[styles.typeCardSub, { color: theme.textSecondary }]}>Schedule a recipe on your calendar</Text>
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
            </View>
          )}

          {/* Step 2: label, icon, time */}
          {step === 2 && (
            <View style={styles.detailsStep}>
              <Text style={[styles.stepTitle, { color: theme.text }]}>
                {entryType === 'plan' ? 'Name your meal slot' : 'Name this food entry'}
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
                  label={entryType === 'plan' ? 'Choose Recipe →' : 'Add Food →'}
                  onPress={() => setStep(3)}
                  disabled={!label.trim()}
                />
              </View>
            </View>
          )}

          {/* Step 3a: recipe search */}
          {step === 3 && entryType === 'plan' && (
            <>
              <Text style={[styles.stepTitle, { color: theme.text }]}>Choose a Recipe</Text>
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

              <Button
                label="Add slot without a recipe"
                onPress={() => { onAdd(label.trim(), time24, undefined, icon); onClose(); }}
                variant="secondary"
              />
            </>
          )}

          {/* Step 3b: food log form */}
          {step === 3 && entryType === 'log' && (
            <LogFoodForm
              userId={userId}
              showLabelAndTime={false}
              onSubmit={handleLogFood}
              onCancel={() => setStep(2)}
            />
          )}

        </Animated.View>
      </View>
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
    flex: 1,
    textAlign: 'center',
  } as TextStyle,
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
});
