import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { useCallback, useEffect, useState } from 'react';
import { usePowerSync } from '@powersync/react-native';
import { View, Text, Pressable, ActivityIndicator, Alert, RefreshControl, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { triggerSync } from '@/utils/trigger-sync';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, MaxContentWidth, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { RecipeDetailView, type RecipeDetailData } from '@/components/recipes/recipe-detail-view';
import { ScheduleRecipeModal } from '@/components/calendar/schedule-recipe-modal';
import { getRecipeDetail } from '@/services/spoonacular';
import { deleteRecipe, getRecipeById, getRecipeIngredients, getSavedRecipeIdByApiId, saveRecipe } from '@/services/recipe-service';
import { getWeek } from '@/services/meal-plan-service';
import { supabase, getCachedUserId } from '@/services/supabase';
import type { Recipe } from '@/models/recipe';

const EDIT_PREFILL_KEY = 'recipe:edit_prefill';

function isUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

function spoonacularToDetailData(raw: Awaited<ReturnType<typeof getRecipeDetail>>): RecipeDetailData {
  return {
    title: raw.title,
    description: raw.description,
    image: raw.image,
    prepMinutes: raw.prepMinutes,
    cookMinutes: raw.cookMinutes,
    servings: raw.servings,
    difficulty: raw.difficulty,
    cuisineType: raw.cuisineType,
    ingredients: raw.ingredients.map((ing) => ({
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      raw_text: ing.rawText,
    })),
    instructions: raw.instructions,
    macros: {
      calories_per_serving: raw.nutrition.calories,
      protein_per_serving: raw.nutrition.protein,
      carbs_per_serving: raw.nutrition.carbs,
      fat_per_serving: raw.nutrition.fat,
      fiber_per_serving: raw.nutrition.fiber,
      sugar_per_serving: raw.nutrition.sugar,
      sodium_per_serving: raw.nutrition.sodium,
    },
    dietaryTags: raw.dietaryTags,
  };
}

function savedRecipeToDetailData(recipe: Recipe): RecipeDetailData {
  const instructions: string[] = (() => {
    if (!recipe.instructions) return [];
    if (Array.isArray(recipe.instructions)) return recipe.instructions as string[];
    try { return JSON.parse(recipe.instructions as unknown as string) as string[]; } catch { return []; }
  })();

  const dietaryTags: string[] = (() => {
    if (!recipe.dietary_tags) return [];
    if (Array.isArray(recipe.dietary_tags)) return recipe.dietary_tags as string[];
    try { return JSON.parse(recipe.dietary_tags as unknown as string) as string[]; } catch { return []; }
  })();

  return {
    title: recipe.title,
    description: recipe.description ?? undefined,
    image: recipe.image_url ?? undefined,
    prepMinutes: recipe.prep_minutes ?? undefined,
    cookMinutes: recipe.cook_minutes ?? undefined,
    servings: recipe.servings,
    difficulty: recipe.difficulty,
    cuisineType: recipe.cuisine_type,
    ingredients: [],
    instructions,
    macros: {
      calories_per_serving: recipe.calories_per_serving ?? null,
      protein_per_serving: recipe.protein_per_serving ?? null,
      carbs_per_serving: recipe.carbs_per_serving ?? null,
      fat_per_serving: recipe.fat_per_serving ?? null,
      fiber_per_serving: recipe.fiber_per_serving ?? null,
      sugar_per_serving: recipe.sugar_per_serving ?? null,
      sodium_per_serving: recipe.sodium_per_serving ?? null,
    },
    dietaryTags,
  };
}

export default function RecipeDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const db = usePowerSync();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [detailData, setDetailData] = useState<RecipeDetailData | null>(null);
  const [spoonacularRaw, setSpoonacularRaw] = useState<Awaited<ReturnType<typeof getRecipeDetail>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [savedRecipeId, setSavedRecipeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [scheduleVisible, setScheduleVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await triggerSync();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    if (!id) return;
    loadRecipe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleEdit() {
    try {
      const [recipe, ingredients] = await Promise.all([getRecipeById(id), getRecipeIngredients(id)]);
      if (!recipe) return;
      const instructions: string[] = (() => {
        if (!recipe.instructions) return [];
        if (Array.isArray(recipe.instructions)) return recipe.instructions as string[];
        try { return JSON.parse(recipe.instructions as unknown as string) as string[]; } catch { return []; }
      })();
      await AsyncStorage.setItem(EDIT_PREFILL_KEY, JSON.stringify({
        recipeId: id,
        title: recipe.title,
        description: recipe.description,
        image_url: recipe.image_url,
        servings: recipe.servings,
        prep_minutes: recipe.prep_minutes,
        cook_minutes: recipe.cook_minutes,
        cuisine_type: recipe.cuisine_type,
        difficulty: recipe.difficulty,
        source_url: recipe.source_url,
        instructions,
        ingredients: ingredients.map((ing) => ({ name: ing.name, quantity: ing.quantity, unit: ing.unit, raw_text: ing.raw_text })),
      }));
      router.push('/recipes/create' as any);
    } catch {
      Alert.alert('Error', 'Could not load recipe for editing.');
    }
  }

  function handleDelete() {
    Alert.alert(
      'Delete recipe?',
      'This will permanently remove the recipe.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteRecipe(db, id);
              router.back();
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Failed to delete recipe');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  }

  async function loadRecipe() {
    setLoading(true);
    setError(null);
    try {
      const userId = getCachedUserId();

      if (isUUID(id)) {
        const recipe = await getRecipeById(id);
        if (!recipe) {
          setError('Recipe not found');
          return;
        }
        setDetailData(savedRecipeToDetailData(recipe));
        setIsSaved(true);
      } else {
        const spoonacularId = parseInt(id, 10);
        const raw = await getRecipeDetail(spoonacularId);
        setSpoonacularRaw(raw);
        setDetailData(spoonacularToDetailData(raw));

        if (userId) {
          const localId = await getSavedRecipeIdByApiId(userId, String(spoonacularId));
          setIsSaved(!!localId);
          setSavedRecipeId(localId);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load recipe');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!spoonacularRaw) return;
    const userId = getCachedUserId();
    if (!userId) {
      Alert.alert('Sign in required', 'Please sign in to save recipes.');
      return;
    }

    setSaving(true);
    try {
      const saved = await saveRecipe(db, userId, {
        title: spoonacularRaw.title,
        description: spoonacularRaw.description,
        image_url: spoonacularRaw.image,
        prep_minutes: spoonacularRaw.prepMinutes,
        cook_minutes: spoonacularRaw.cookMinutes,
        servings: spoonacularRaw.servings,
        difficulty: spoonacularRaw.difficulty ?? undefined,
        cuisine_type: spoonacularRaw.cuisineType ?? undefined,
        source_type: 'api',
        source_url: spoonacularRaw.sourceUrl,
        source_api_id: String(spoonacularRaw.id),
        calories_per_serving: spoonacularRaw.nutrition.calories,
        protein_per_serving: spoonacularRaw.nutrition.protein,
        carbs_per_serving: spoonacularRaw.nutrition.carbs,
        fat_per_serving: spoonacularRaw.nutrition.fat,
        fiber_per_serving: spoonacularRaw.nutrition.fiber,
        sugar_per_serving: spoonacularRaw.nutrition.sugar,
        sodium_per_serving: spoonacularRaw.nutrition.sodium,
        instructions: spoonacularRaw.instructions,
        dietary_tags: spoonacularRaw.dietaryTags,
        ingredients: spoonacularRaw.ingredients.map((ing, i) => ({
          raw_text: ing.rawText,
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          display_order: i,
        })),
      });
      setSavedRecipeId(saved.id);
      setIsSaved(true);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save recipe');
    } finally {
      setSaving(false);
    }
  }

  async function handleSchedule(date: string, label: string, time: string) {
    try {
      const userId = getCachedUserId();
      if (!userId) {
        Alert.alert('Sign in required', 'Please sign in to schedule recipes.');
        return;
      }

      let recipeUuid: string;

      if (isUUID(id)) {
        recipeUuid = id;
      } else {
        // Spoonacular recipe — use existing local copy or auto-save
        let localId = savedRecipeId;
        if (!localId) {
          if (!spoonacularRaw) return;
          const saved = await saveRecipe(db, userId, {
            title: spoonacularRaw.title,
            description: spoonacularRaw.description,
            image_url: spoonacularRaw.image,
            prep_minutes: spoonacularRaw.prepMinutes,
            cook_minutes: spoonacularRaw.cookMinutes,
            servings: spoonacularRaw.servings,
            difficulty: spoonacularRaw.difficulty ?? undefined,
            cuisine_type: spoonacularRaw.cuisineType ?? undefined,
            source_type: 'api',
            source_url: spoonacularRaw.sourceUrl,
            source_api_id: String(spoonacularRaw.id),
            calories_per_serving: spoonacularRaw.nutrition.calories,
            protein_per_serving: spoonacularRaw.nutrition.protein,
            carbs_per_serving: spoonacularRaw.nutrition.carbs,
            fat_per_serving: spoonacularRaw.nutrition.fat,
            fiber_per_serving: spoonacularRaw.nutrition.fiber,
            sugar_per_serving: spoonacularRaw.nutrition.sugar,
            sodium_per_serving: spoonacularRaw.nutrition.sodium,
            instructions: spoonacularRaw.instructions,
            dietary_tags: spoonacularRaw.dietaryTags,
            ingredients: spoonacularRaw.ingredients.map((ing, i) => ({
              raw_text: ing.rawText,
              name: ing.name,
              quantity: ing.quantity,
              unit: ing.unit,
              display_order: i,
            })),
          });
          setSavedRecipeId(saved.id);
          setIsSaved(true);
          localId = saved.id;
        }
        recipeUuid = localId;
      }

      const [y, m, dayNum] = date.split('-').map(Number);
      const weekPlan = await getWeek(db, new Date(y, m - 1, dayNum));
      const slotsForDate = weekPlan.slots.filter((s) => s.date === date);

      // Use supabase directly so we can surface errors instead of silently swallowing them
      const slotId = randomUUID();
      const now = new Date().toISOString();
      const { error: slotError } = await supabase.from('meal_slots').insert({
        id: slotId,
        meal_plan_id: weekPlan.mealPlan.id,
        date,
        time_of_day: time,
        label,
        display_order: slotsForDate.length,
        created_at: now,
        updated_at: now,
      });
      if (slotError) throw new Error(`Failed to create slot: ${slotError.message}`);

      const { error: assignError } = await supabase.from('meal_slot_recipes').insert({
        id: randomUUID(),
        meal_slot_id: slotId,
        recipe_id: recipeUuid,
        servings_eaten: null,
        display_order: 0,
        created_at: now,
        updated_at: now,
      });
      if (assignError) throw new Error(`Failed to assign recipe: ${assignError.message}`);

      setScheduleVisible(false);
      Alert.alert('Added to calendar', `${detailData?.title} scheduled as ${label}`);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to schedule recipe');
    }
  }

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  if (error || !detailData) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.textSecondary }]}>{error ?? 'Recipe not found'}</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={[styles.backBtnText, { color: Colors.accent }]}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Sticky header with title and save button */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backIconBtn} hitSlop={8}>
          <Text style={[styles.backIcon, { color: Colors.accent }]}>‹</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
          {detailData.title}
        </Text>
        <Pressable style={styles.actionBtn} onPress={() => setScheduleVisible(true)}>
          <Text style={[styles.actionBtnText, { color: Colors.accent }]}>Schedule</Text>
        </Pressable>
        {isUUID(id) ? (
          <>
            <Pressable style={styles.actionBtn} onPress={handleEdit}>
              <Text style={[styles.actionBtnText, { color: Colors.accent }]}>Edit</Text>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={handleDelete} disabled={deleting}>
              <Text style={[styles.actionBtnText, { color: Colors.light.error }]}>
                {deleting ? '…' : 'Delete'}
              </Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            style={[
              styles.saveBtn,
              isSaved
                ? { backgroundColor: theme.backgroundElement, borderColor: theme.border, borderWidth: 1 }
                : { backgroundColor: Colors.accent },
            ]}
            onPress={isSaved ? undefined : handleSave}
            disabled={saving || isSaved}
          >
            <Text
              style={[
                styles.saveBtnText,
                { color: isSaved ? theme.textSecondary : '#FFFFFF' },
              ]}
            >
              {saving ? 'Saving…' : isSaved ? 'Saved ✓' : 'Save'}
            </Text>
          </Pressable>
        )}
      </View>

      <RecipeDetailView
        recipe={detailData}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} colors={[Colors.accent]} />}
      />

      <ScheduleRecipeModal
        visible={scheduleVisible}
        recipeTitle={detailData.title}
        onClose={() => setScheduleVisible(false)}
        onSchedule={handleSchedule}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  } as ViewStyle,
  backIconBtn: {
    flexShrink: 0,
  } as ViewStyle,
  backIcon: {
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 30,
  } as TextStyle,
  headerTitle: {
    flex: 1,
    fontSize: FontSizes.md,
    fontWeight: '600',
  } as TextStyle,
  saveBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    flexShrink: 0,
  } as ViewStyle,
  saveBtnText: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
  } as TextStyle,
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  } as ViewStyle,
  errorText: {
    fontSize: FontSizes.md,
    textAlign: 'center',
  } as TextStyle,
  backBtn: {
    padding: Spacing.sm,
  } as ViewStyle,
  backBtnText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  } as TextStyle,
  actionBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    flexShrink: 0,
  } as ViewStyle,
  actionBtnText: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
  } as TextStyle,
});
