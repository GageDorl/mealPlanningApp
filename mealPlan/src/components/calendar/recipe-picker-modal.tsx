import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Animated,
  TextInput,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { usePowerSync } from '@powersync/react-native';
import { useKeyboardSlide } from '@/hooks/use-keyboard-slide';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/button';
import { supabase } from '@/services/supabase';
import { getTopRecipes, getSavedRecipeIdByApiId, saveRecipe } from '@/services/recipe-service';
import { searchRecipes as spoonacularSearch, getRecipeDetail } from '@/services/spoonacular';
import type { Recipe } from '@/models/recipe';
import type { SpoonacularSearchResult } from '@/services/spoonacular';

type UnifiedResult =
  | { source: 'saved'; item: Recipe }
  | { source: 'spoonacular'; item: SpoonacularSearchResult };

interface RecipePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (recipe: Recipe) => void;
}

export function RecipePickerModal({ visible, onClose, onSelect }: RecipePickerModalProps) {
  const theme = useTheme();
  const db = usePowerSync();
  const keyboardSlide = useKeyboardSlide();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UnifiedResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [mostUsed, setMostUsed] = useState<Recipe[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [importingId, setImportingId] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user.id;
      if (!uid || cancelled) return;
      setUserId(uid);
      const top = await getTopRecipes(uid, 5);
      if (!cancelled) setMostUsed(top);
    })();
    return () => { cancelled = true; };
  }, [visible]);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const [savedResp, spoonResp] = await Promise.all([
        supabase.from('recipes').select('*').ilike('title', `%${trimmed}%`).limit(10),
        spoonacularSearch({ query: trimmed, number: 8 }).catch(() => ({ results: [] as SpoonacularSearchResult[] })),
      ]);
      const saved = (savedResp.data ?? []) as Recipe[];
      const savedApiIds = new Set(saved.map((r) => r.source_api_id).filter(Boolean));
      const spoon = spoonResp.results.filter((r) => !savedApiIds.has(String(r.id)));
      setResults([
        ...saved.map((item) => ({ source: 'saved' as const, item })),
        ...spoon.map((item) => ({ source: 'spoonacular' as const, item })),
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, visible, runSearch]);

  const handleSelectSaved = (recipe: Recipe) => {
    setQuery('');
    setResults([]);
    onSelect(recipe);
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
      setQuery('');
      setResults([]);
      onSelect(recipe);
      onClose();
    } catch {
      // silently fail — user can retry
    } finally {
      setImportingId(null);
    }
  };

  const showMostUsed = query.trim().length < 2;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.sheet, { backgroundColor: theme.background, transform: [{ translateY: keyboardSlide }] }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>Choose a Recipe</Text>
            <Button label="Cancel" onPress={onClose} variant="secondary" />
          </View>

          <View style={[styles.searchBar, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search saved & Spoonacular…"
              placeholderTextColor={theme.textSecondary}
              value={query}
              onChangeText={setQuery}
              autoFocus
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} hitSlop={8} style={styles.clearBtn}>
                <Text style={[styles.clearIcon, { color: theme.textSecondary }]}>×</Text>
              </Pressable>
            )}
          </View>

          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {loading ? (
              <ActivityIndicator color={Colors.accent} style={styles.spinner} />
            ) : showMostUsed ? (
              mostUsed.length > 0 ? (
                <>
                  <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Most Used</Text>
                  {mostUsed.map((recipe) => (
                    <Pressable
                      key={recipe.id}
                      style={[styles.row, { borderBottomColor: theme.border }]}
                      onPress={() => handleSelectSaved(recipe)}
                    >
                      <View style={styles.rowInfo}>
                        <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={1}>{recipe.title}</Text>
                        <Text style={[styles.rowMeta, { color: theme.textSecondary }]}>
                          {[recipe.calories_per_serving ? `${recipe.calories_per_serving} kcal` : null,
                            recipe.prep_minutes ? `${recipe.prep_minutes} min` : null].filter(Boolean).join(' · ')}
                        </Text>
                      </View>
                      <Text style={[styles.chevron, { color: theme.textSecondary }]}>›</Text>
                    </Pressable>
                  ))}
                </>
              ) : (
                <Text style={[styles.empty, { color: theme.textSecondary }]}>
                  Search your saved recipes or discover from Spoonacular
                </Text>
              )
            ) : results.length === 0 ? (
              <Text style={[styles.empty, { color: theme.textSecondary }]}>No recipes found</Text>
            ) : (
              results.map((result, idx) => {
                if (result.source === 'saved') {
                  const r = result.item;
                  return (
                    <Pressable
                      key={r.id}
                      style={[styles.row, { borderBottomColor: theme.border }]}
                      onPress={() => handleSelectSaved(r)}
                    >
                      <View style={styles.rowInfo}>
                        <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={1}>{r.title}</Text>
                        <Text style={[styles.rowMeta, { color: theme.textSecondary }]}>
                          {[r.calories_per_serving ? `${r.calories_per_serving} kcal` : null,
                            r.prep_minutes ? `${r.prep_minutes} min` : null].filter(Boolean).join(' · ')}
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
                    style={[styles.row, { borderBottomColor: theme.border }]}
                    onPress={() => handleSelectSpoonacular(r)}
                    disabled={!!importingId}
                  >
                    <View style={styles.rowInfo}>
                      <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={1}>{r.title}</Text>
                      <Text style={[styles.rowMeta, { color: theme.textSecondary }]}>
                        {[r.nutrition.calories ? `${r.nutrition.calories} kcal` : null,
                          r.readyInMinutes ? `${r.readyInMinutes} min` : null].filter(Boolean).join(' · ')}
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
  sheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
    maxHeight: '85%',
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  } as ViewStyle,
  title: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
  } as TextStyle,
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
    fontSize: 18,
    lineHeight: 20,
  } as TextStyle,
  list: {
    marginTop: Spacing.md,
  } as ViewStyle,
  sectionLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xs,
  } as TextStyle,
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,
  rowInfo: {
    flex: 1,
  } as ViewStyle,
  rowTitle: {
    fontSize: FontSizes.md,
    fontWeight: '500',
  } as TextStyle,
  rowMeta: {
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
  empty: {
    textAlign: 'center',
    paddingVertical: Spacing.xl,
    fontSize: FontSizes.sm,
  } as TextStyle,
  spinner: {
    marginTop: Spacing.xl,
  } as ViewStyle,
});
