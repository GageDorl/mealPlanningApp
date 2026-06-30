import { useState, useEffect, useCallback, useRef } from 'react';
import { usePowerSync } from '@powersync/react-native';
import {
  View, Text, TextInput, ScrollView, Pressable, StyleSheet, ActivityIndicator, Modal,
  type ViewStyle, type TextStyle,
} from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { FoodLogItemInput } from '@/services/food-log-service';
import { getPersonalFoods } from '@/services/personal-food-service';
import type { PersonalFood } from '@/models/personal-food';
import { lookupIngredient, getFoodDetails } from '@/services/fatsecret';
import type { FoodSearchResult, FoodDetails, FatSecretServing } from '@/services/fatsecret';
import Ionicons from '@expo/vector-icons/Ionicons';
import { cachePublicFood, searchPublicFoods } from '@/services/public-food-service';
import type { PublicFood } from '@/services/public-food-service';
import { FatSecretAttribution } from '@/components/food/fatsecret-attribution';
import { BarcodeScanner } from '@/components/food/barcode-scanner';
import { IconPicker } from '@/components/ui/icon-picker';

const QUICK_LABELS = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Post-workout'];

const SERVING_UNITS = ['g', 'oz', 'cup', 'piece', 'slice', 'tbsp', 'tsp', 'ml'];

const GRAMS_PER_OZ = 28.3495;

function calcServingsFromWeight(
  inputAmount: string,
  inputUnit: 'g' | 'oz',
  serving: FatSecretServing,
): string | null {
  const amt = parseFloat(inputAmount);
  if (!amt || !serving.metric_serving_amount) return null;
  const metricUnit = serving.metric_serving_unit ?? 'g';
  if (metricUnit !== 'g' && metricUnit !== 'oz') return null;
  const servingGrams = metricUnit === 'oz'
    ? serving.metric_serving_amount * GRAMS_PER_OZ
    : serving.metric_serving_amount;
  const inputGrams = inputUnit === 'oz' ? amt * GRAMS_PER_OZ : amt;
  const servings = inputGrams / servingGrams;
  return String(Math.round(servings * 100) / 100);
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

export interface LogFoodSubmitParams {
  label: string | null;
  timeOfDay: string | null;
  items: FoodLogItemInput[];
  icon?: string | null;
}

interface LogFoodFormProps {
  initialTime?: string;
  userId?: string;
  showLabelAndTime?: boolean;
  onSubmit: (params: LogFoodSubmitParams) => void;
  onCancel: () => void;
}

interface StagedItem {
  key: string;
  food_name: string;
  brand_name: string;
  serving_size_amount: string;
  serving_size_unit: string;
  servings_eaten: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  saturated_fat: string;
  trans_fat: string;
  cholesterol: string;
  sodium: string;
  dietary_fiber: string;
  total_sugar: string;
  added_sugar: string;
  source: 'manual' | 'library' | 'community' | 'fatsecret';
  source_id: string | null;
}

function emptyItem(): StagedItem {
  return {
    key: String(Date.now() + Math.random()),
    food_name: '',
    brand_name: '',
    serving_size_amount: '',
    serving_size_unit: 'g',
    servings_eaten: '1',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    saturated_fat: '',
    trans_fat: '',
    cholesterol: '',
    sodium: '',
    dietary_fiber: '',
    total_sugar: '',
    added_sugar: '',
    source: 'manual',
    source_id: null,
  };
}

function toItemInput(staged: StagedItem): FoodLogItemInput {
  const num = (v: string) => v.trim() === '' ? null : parseFloat(v) || null;
  return {
    food_name: staged.food_name.trim(),
    brand_name: staged.brand_name.trim() || null,
    serving_size_amount: num(staged.serving_size_amount),
    serving_size_unit: staged.serving_size_unit || null,
    servings_eaten: parseFloat(staged.servings_eaten) || 1,
    calories: num(staged.calories),
    protein: num(staged.protein),
    carbs: num(staged.carbs),
    fat: num(staged.fat),
    saturated_fat: num(staged.saturated_fat),
    trans_fat: num(staged.trans_fat),
    cholesterol: num(staged.cholesterol),
    sodium: num(staged.sodium),
    dietary_fiber: num(staged.dietary_fiber),
    total_sugar: num(staged.total_sugar),
    added_sugar: num(staged.added_sugar),
    source: staged.source,
    source_id: staged.source_id,
  };
}

function servingToFields(srv: FatSecretServing): Partial<StagedItem> {
  const s = (v: number | undefined) => (v != null ? String(v) : '');
  return {
    serving_size_amount: srv.metric_serving_amount != null ? String(srv.metric_serving_amount) : '',
    serving_size_unit: srv.metric_serving_unit ?? 'g',
    calories: s(srv.calories),
    protein: s(srv.protein),
    carbs: s(srv.carbs),
    fat: s(srv.fat),
    saturated_fat: s(srv.saturated_fat),
    trans_fat: s(srv.trans_fat),
    cholesterol: s(srv.cholesterol),
    sodium: s(srv.sodium),
    dietary_fiber: s(srv.fiber),
    total_sugar: s(srv.sugar),
    added_sugar: s(srv.added_sugar),
  };
}

type FormMode = 'manual' | 'search';

type UnifiedFoodResult =
  | { source: 'library'; item: PersonalFood }
  | { source: 'community'; item: PublicFood }
  | { source: 'fatsecret'; item: FoodSearchResult };

export function LogFoodForm({ initialTime, userId, showLabelAndTime = true, onSubmit, onCancel }: LogFoodFormProps) {
  const theme = useTheme();
  const db = usePowerSync();

  const [formMode, setFormMode] = useState<FormMode>('search');

  // Unified search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UnifiedFoodResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // FatSecret detail-fetch state (used in manual form for serving picker)
  const [fsLoadingId, setFsLoadingId] = useState<string | null>(null);
  const [fsSelectedFood, setFsSelectedFood] = useState<FoodDetails | null>(null);
  const [fsServingIdx, setFsServingIdx] = useState(0);
  const [convertAmount, setConvertAmount] = useState('');
  const [convertUnit, setConvertUnit] = useState<'g' | 'oz'>('g');

  const runUnifiedSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) { setSearchResults([]); return; }
    setSearchLoading(true);
    try {
      const [libraryItems, communityItems, fsResponse] = await Promise.all([
        userId ? getPersonalFoods(userId, trimmed) : Promise.resolve([] as PersonalFood[]),
        searchPublicFoods(trimmed).catch(() => [] as PublicFood[]),
        lookupIngredient(trimmed, 1, db).catch(() => ({ results: [] as FoodSearchResult[] })),
      ]);
      // Suppress FatSecret duplicates that exist in community (matched by fatsecret_id)
      const communityFsIds = new Set(communityItems.map((f) => f.fatsecret_id).filter(Boolean));
      const results: UnifiedFoodResult[] = [
        ...libraryItems.map((item) => ({ source: 'library' as const, item })),
        ...communityItems.map((item) => ({ source: 'community' as const, item })),
        ...fsResponse.results
          .filter((r) => !communityFsIds.has(r.id))
          .map((item) => ({ source: 'fatsecret' as const, item })),
      ];
      setSearchResults(results);
    } finally {
      setSearchLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (formMode !== 'search') return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => runUnifiedSearch(searchQuery), 400);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery, formMode, runUnifiedSearch]);

  function selectLibraryItem(food: PersonalFood) {
    setDraft({
      key: String(Date.now() + Math.random()),
      food_name: food.food_name,
      brand_name: food.brand_name ?? '',
      serving_size_amount: food.serving_size_amount != null ? String(food.serving_size_amount) : '',
      serving_size_unit: food.serving_size_unit ?? 'g',
      servings_eaten: '1',
      calories: food.calories != null ? String(food.calories) : '',
      protein: food.protein != null ? String(food.protein) : '',
      carbs: food.carbs != null ? String(food.carbs) : '',
      fat: food.fat != null ? String(food.fat) : '',
      saturated_fat: food.saturated_fat != null ? String(food.saturated_fat) : '',
      trans_fat: food.trans_fat != null ? String(food.trans_fat) : '',
      cholesterol: food.cholesterol != null ? String(food.cholesterol) : '',
      sodium: food.sodium != null ? String(food.sodium) : '',
      dietary_fiber: food.dietary_fiber != null ? String(food.dietary_fiber) : '',
      total_sugar: food.total_sugar != null ? String(food.total_sugar) : '',
      added_sugar: food.added_sugar != null ? String(food.added_sugar) : '',
      source: 'library',
      source_id: food.id,
    });
    setFsSelectedFood(null);
    setFormMode('manual');
  }

  function selectCommunityItem(food: PublicFood) {
    setDraft({
      key: String(Date.now() + Math.random()),
      food_name: food.food_name,
      brand_name: food.brand_name ?? '',
      serving_size_amount: food.serving_size_amount != null ? String(food.serving_size_amount) : '',
      serving_size_unit: food.serving_size_unit ?? 'g',
      servings_eaten: '1',
      calories: food.calories != null ? String(food.calories) : '',
      protein: food.protein != null ? String(food.protein) : '',
      carbs: food.carbs != null ? String(food.carbs) : '',
      fat: food.fat != null ? String(food.fat) : '',
      saturated_fat: '',
      trans_fat: '',
      cholesterol: '',
      sodium: '',
      dietary_fiber: '',
      total_sugar: '',
      added_sugar: '',
      source: 'community',
      source_id: food.id,
    });
    setFsSelectedFood(null);
    setFormMode('manual');
  }

  async function selectFatSecretFood(result: FoodSearchResult) {
    setFsLoadingId(result.id);
    let details: FoodDetails | null = null;
    try {
      details = await getFoodDetails(result.id);
      const firstServing = details?.servings[0];

      const base: StagedItem = {
        key: String(Date.now() + Math.random()),
        food_name: details?.name ?? result.name,
        brand_name: details?.brand_name ?? result.brand_name ?? '',
        servings_eaten: '1',
        source: 'fatsecret',
        source_id: result.id,
        serving_size_amount: firstServing?.metric_serving_amount != null
          ? String(firstServing.metric_serving_amount) : '',
        serving_size_unit: firstServing?.metric_serving_unit ?? 'g',
        calories: firstServing?.calories != null ? String(firstServing.calories)
          : result.caloriesPerServing != null ? String(result.caloriesPerServing) : '',
        protein: firstServing?.protein != null ? String(firstServing.protein)
          : result.proteinPerServing != null ? String(result.proteinPerServing) : '',
        carbs: firstServing?.carbs != null ? String(firstServing.carbs)
          : result.carbsPerServing != null ? String(result.carbsPerServing) : '',
        fat: firstServing?.fat != null ? String(firstServing.fat)
          : result.fatPerServing != null ? String(result.fatPerServing) : '',
        saturated_fat: firstServing?.saturated_fat != null ? String(firstServing.saturated_fat) : '',
        trans_fat: firstServing?.trans_fat != null ? String(firstServing.trans_fat) : '',
        cholesterol: firstServing?.cholesterol != null ? String(firstServing.cholesterol) : '',
        sodium: firstServing?.sodium != null ? String(firstServing.sodium) : '',
        dietary_fiber: firstServing?.fiber != null ? String(firstServing.fiber) : '',
        total_sugar: firstServing?.sugar != null ? String(firstServing.sugar) : '',
        added_sugar: firstServing?.added_sugar != null ? String(firstServing.added_sugar) : '',
      };

      setDraft(base);
      if (details && details.servings.length > 0) {
        setFsSelectedFood(details);
        setFsServingIdx(0);
      } else {
        setFsSelectedFood(null);
      }
    } catch {
      setDraft(prev => ({
        ...prev,
        food_name: result.name,
        brand_name: result.brand_name ?? '',
        calories: result.caloriesPerServing != null ? String(result.caloriesPerServing) : '',
        protein: result.proteinPerServing != null ? String(result.proteinPerServing) : '',
        carbs: result.carbsPerServing != null ? String(result.carbsPerServing) : '',
        fat: result.fatPerServing != null ? String(result.fatPerServing) : '',
        source: 'fatsecret',
        source_id: result.id,
      }));
      setFsSelectedFood(null);
    } finally {
      setFsLoadingId(null);
      setFormMode('manual');
      // Background-cache in public_foods so future community searches skip the FatSecret API
      const srv = details?.servings[0];
      cachePublicFood({
        food_name: details?.name ?? result.name,
        brand_name: details?.brand_name ?? result.brand_name ?? null,
        fatsecret_id: result.id,
        source: 'fatsecret',
        serving_size_amount: srv?.metric_serving_amount ?? null,
        serving_size_unit: srv?.metric_serving_unit ?? null,
        calories: srv?.calories ?? result.caloriesPerServing ?? null,
        protein: srv?.protein ?? result.proteinPerServing ?? null,
        carbs: srv?.carbs ?? result.carbsPerServing ?? null,
        fat: srv?.fat ?? result.fatPerServing ?? null,
        saturated_fat: srv?.saturated_fat ?? null,
        trans_fat: srv?.trans_fat ?? null,
        cholesterol: srv?.cholesterol ?? null,
        sodium: srv?.sodium ?? null,
        dietary_fiber: srv?.fiber ?? null,
        total_sugar: srv?.sugar ?? null,
        added_sugar: srv?.added_sugar ?? null,
      });
    }
  }

  function changeFsServing(idx: number) {
    if (!fsSelectedFood) return;
    setFsServingIdx(idx);
    setConvertAmount('');
    setDraft(prev => ({ ...prev, servings_eaten: '1', ...servingToFields(fsSelectedFood.servings[idx]) }));
  }

  function handleConvertAmount(v: string) {
    const cleaned = v.replace(/[^0-9.]/g, '');
    setConvertAmount(cleaned);
    if (!fsSelectedFood) return;
    const result = calcServingsFromWeight(cleaned, convertUnit, fsSelectedFood.servings[fsServingIdx]);
    if (result) updateDraft({ servings_eaten: result });
  }

  function handleConvertUnit(u: 'g' | 'oz') {
    setConvertUnit(u);
    if (!fsSelectedFood && !convertAmount) return;
    const result = calcServingsFromWeight(convertAmount, u, fsSelectedFood!.servings[fsServingIdx]);
    if (result) updateDraft({ servings_eaten: result });
  }

  const [scannerVisible, setScannerVisible] = useState(false);

  function applyFoodDetails(details: FoodDetails, sourceId: string, barcode?: string) {
    const firstServing = details.servings[0];
    setDraft({
      key: String(Date.now() + Math.random()),
      food_name: details.name,
      brand_name: details.brand_name ?? '',
      servings_eaten: '1',
      source: 'fatsecret',
      source_id: sourceId,
      serving_size_amount: firstServing?.metric_serving_amount != null
        ? String(firstServing.metric_serving_amount) : '',
      serving_size_unit: firstServing?.metric_serving_unit ?? 'g',
      calories: firstServing?.calories != null ? String(firstServing.calories) : '',
      protein: firstServing?.protein != null ? String(firstServing.protein) : '',
      carbs: firstServing?.carbs != null ? String(firstServing.carbs) : '',
      fat: firstServing?.fat != null ? String(firstServing.fat) : '',
      saturated_fat: firstServing?.saturated_fat != null ? String(firstServing.saturated_fat) : '',
      trans_fat: firstServing?.trans_fat != null ? String(firstServing.trans_fat) : '',
      cholesterol: firstServing?.cholesterol != null ? String(firstServing.cholesterol) : '',
      sodium: firstServing?.sodium != null ? String(firstServing.sodium) : '',
      dietary_fiber: firstServing?.fiber != null ? String(firstServing.fiber) : '',
      total_sugar: firstServing?.sugar != null ? String(firstServing.sugar) : '',
      added_sugar: firstServing?.added_sugar != null ? String(firstServing.added_sugar) : '',
    });
    if (details.servings.length > 0) {
      setFsSelectedFood(details);
      setFsServingIdx(0);
    } else {
      setFsSelectedFood(null);
    }
    // Background-cache barcode scans so the food is findable in community search without re-hitting FatSecret
    cachePublicFood({
      food_name: details.name,
      brand_name: details.brand_name ?? null,
      fatsecret_id: sourceId,
      source: 'fatsecret',
      barcode: barcode ?? null,
      serving_size_amount: firstServing?.metric_serving_amount ?? null,
      serving_size_unit: firstServing?.metric_serving_unit ?? null,
      calories: firstServing?.calories ?? null,
      protein: firstServing?.protein ?? null,
      carbs: firstServing?.carbs ?? null,
      fat: firstServing?.fat ?? null,
      saturated_fat: firstServing?.saturated_fat ?? null,
      trans_fat: firstServing?.trans_fat ?? null,
      cholesterol: firstServing?.cholesterol ?? null,
      sodium: firstServing?.sodium ?? null,
      dietary_fiber: firstServing?.fiber ?? null,
      total_sugar: firstServing?.sugar ?? null,
      added_sugar: firstServing?.added_sugar ?? null,
    });
  }

  // Meal label + time + icon
  const [label, setLabel] = useState('');
  const [icon, setIcon] = useState<string | null>(null);
  const init = initialTime ? parse24to12(initialTime) : { hour: '12', minute: '00', period: 'PM' as const };
  const [hour, setHour] = useState(init.hour);
  const [minute, setMinute] = useState(init.minute);
  const [period, setPeriod] = useState<'AM' | 'PM'>(init.period);
  const [hasTime, setHasTime] = useState(!!initialTime);

  // Staged items (already confirmed)
  const [stagedItems, setStagedItems] = useState<StagedItem[]>([]);

  // Current item being edited
  const [draft, setDraft] = useState<StagedItem>(emptyItem);
  const [showMoreMacros, setShowMoreMacros] = useState(false);

  const updateDraft = (patch: Partial<StagedItem>) => setDraft((d) => ({ ...d, ...patch }));

  const canAddItem = draft.food_name.trim().length > 0;

  const handleAddItem = () => {
    if (!canAddItem) return;
    setStagedItems((prev) => [...prev, draft]);
    setDraft(emptyItem());
    setShowMoreMacros(false);
    setFsSelectedFood(null);
    setFsServingIdx(0);
  };

  const handleRemoveStagedItem = (key: string) => {
    setStagedItems((prev) => prev.filter((i) => i.key !== key));
  };

  const handleSubmit = () => {
    const allItems = canAddItem ? [...stagedItems, draft] : stagedItems;
    if (allItems.length === 0) return;
    onSubmit({
      label: label.trim() || null,
      timeOfDay: hasTime ? to24(hour, minute, period) : null,
      items: allItems.map(toItemInput),
      icon,
    });
  };

  const canSubmit = stagedItems.length > 0 || canAddItem;

  return (
    <>
    <Modal visible={scannerVisible} animationType="slide" onRequestClose={() => setScannerVisible(false)}>
      <BarcodeScanner
        onFoodFound={(details, barcode) => {
          setScannerVisible(false);
          applyFoodDetails(details, details.id, barcode);
          setFormMode('manual');
        }}
        onNotFound={() => {
          setScannerVisible(false);
          setFormMode('manual');
        }}
        onDismiss={() => setScannerVisible(false)}
      />
    </Modal>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {/* Mode tab bar */}
      <View style={[styles.modeTabs, { borderColor: theme.border }]}>
        <Pressable
          style={[styles.modeTab, formMode === 'manual' ? styles.modeTabActive : null]}
          onPress={() => setFormMode('manual')}
        >
          <Text style={[styles.modeTabText, { color: theme.text }, formMode === 'manual' ? styles.modeTabTextActive : null]}>Manual</Text>
        </Pressable>
        <Pressable
          style={[styles.modeTab, formMode === 'search' ? styles.modeTabActive : null]}
          onPress={() => setFormMode('search')}
        >
          <Text style={[styles.modeTabText, { color: theme.text }, formMode === 'search' ? styles.modeTabTextActive : null]}>Search</Text>
        </Pressable>
      </View>

      {formMode === 'search' ? (
        <View style={styles.libraryPanel}>
          <View style={styles.searchBarRow}>
            <View style={[styles.searchBarField, { borderColor: theme.border, backgroundColor: theme.background }]}>
              <TextInput
                style={[styles.searchBarInput, { color: theme.text }]}
                placeholder="Search foods, brands…"
                placeholderTextColor={theme.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 ? (
                <Pressable onPress={() => setSearchQuery('')} hitSlop={8} style={styles.searchClearBtn}>
                  <Text style={[styles.searchClearIcon, { color: theme.textSecondary }]}>×</Text>
                </Pressable>
              ) : null}
            </View>
            <Pressable style={[styles.cameraBtn, { borderColor: theme.border }]} onPress={() => setScannerVisible(true)} hitSlop={4}>
              <Ionicons name="barcode-outline" size={22} color="#888" />
            </Pressable>
          </View>
          {searchLoading && searchResults.length === 0 ? (
            <ActivityIndicator size="small" color={Colors.accent} style={styles.librarySpinner} />
          ) : searchResults.length === 0 ? (
            <Text style={[styles.libraryEmpty, { color: theme.textSecondary }]}>
              {searchQuery.trim() ? 'No results.' : 'Search your library, community foods, and FatSecret.'}
            </Text>
          ) : (
            searchResults.map((result, idx) => {
              if (result.source === 'library') {
                const food = result.item;
                return (
                  <Pressable
                    key={`lib-${food.id}`}
                    style={[styles.libraryRow, { borderBottomColor: theme.border }]}
                    onPress={() => selectLibraryItem(food)}
                  >
                    <View style={styles.fsResultRow}>
                      <View style={styles.fsResultText}>
                        {food.brand_name ? (
                          <Text style={[styles.fsBrandName, { color: Colors.accent }]} numberOfLines={1}>{food.brand_name}</Text>
                        ) : null}
                        <Text style={[styles.libraryFoodName, { color: theme.text }]} numberOfLines={1}>{food.food_name}</Text>
                        <Text style={[styles.libraryMacros, { color: theme.textSecondary }]}>
                          {[food.calories != null ? `${food.calories} kcal` : null, food.serving_size_amount != null ? `per ${food.serving_size_amount}${food.serving_size_unit ?? ''}` : null].filter(Boolean).join(' · ') || '—'}
                        </Text>
                      </View>
                      <View style={styles.sourceBadgeContainer}>
                        <Text style={[styles.sourceBadge, styles.sourceBadgeLibrary]}>My Library</Text>
                        <Text style={[styles.fsChevron, { color: theme.textSecondary }]}>›</Text>
                      </View>
                    </View>
                  </Pressable>
                );
              }
              if (result.source === 'community') {
                const food = result.item;
                return (
                  <Pressable
                    key={`com-${food.id}`}
                    style={[styles.libraryRow, { borderBottomColor: theme.border }]}
                    onPress={() => selectCommunityItem(food)}
                  >
                    <View style={styles.fsResultRow}>
                      <View style={styles.fsResultText}>
                        {food.brand_name ? (
                          <Text style={[styles.fsBrandName, { color: Colors.accent }]} numberOfLines={1}>{food.brand_name}</Text>
                        ) : null}
                        <Text style={[styles.libraryFoodName, { color: theme.text }]} numberOfLines={1}>{food.food_name}</Text>
                        <Text style={[styles.libraryMacros, { color: theme.textSecondary }]}>
                          {[food.calories != null ? `${food.calories} kcal` : null, food.serving_size_amount != null ? `per ${food.serving_size_amount}${food.serving_size_unit ?? ''}` : null].filter(Boolean).join(' · ') || '—'}
                        </Text>
                      </View>
                      <View style={styles.sourceBadgeContainer}>
                        <Text style={[styles.sourceBadge, styles.sourceBadgeCommunity]}>Community</Text>
                        <Text style={[styles.fsChevron, { color: theme.textSecondary }]}>›</Text>
                      </View>
                    </View>
                  </Pressable>
                );
              }
              // FatSecret result
              const food = result.item;
              return (
                <Pressable
                  key={`fs-${food.id}-${idx}`}
                  style={[styles.libraryRow, { borderBottomColor: theme.border }]}
                  onPress={() => selectFatSecretFood(food)}
                  disabled={fsLoadingId === food.id}
                >
                  <View style={styles.fsResultRow}>
                    <View style={styles.fsResultText}>
                      {food.brand_name ? (
                        <Text style={[styles.fsBrandName, { color: Colors.accent }]} numberOfLines={1}>{food.brand_name}</Text>
                      ) : null}
                      <Text style={[styles.libraryFoodName, { color: theme.text }]} numberOfLines={2}>{food.name}</Text>
                      <Text style={[styles.libraryMacros, { color: theme.textSecondary }]}>
                        {food.caloriesPerServing != null
                          ? `${food.caloriesPerServing} kcal${food.servingDescription ? ` / ${food.servingDescription}` : ''}`
                          : `${food.caloriesPer100g} kcal / 100g`}
                      </Text>
                    </View>
                    <View style={styles.sourceBadgeContainer}>
                      <Text style={[styles.sourceBadge, styles.sourceBadgeFatSecret]}>FatSecret</Text>
                      {fsLoadingId === food.id
                        ? <ActivityIndicator size="small" color={Colors.accent} />
                        : <Text style={[styles.fsChevron, { color: theme.textSecondary }]}>›</Text>}
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
          {searchResults.some((r) => r.source === 'fatsecret') ? (
            <FatSecretAttribution style={styles.fsAttribution} />
          ) : null}
        </View>
      ) : (
        <View style={styles.manualForm}>
          {showLabelAndTime ? (
            <>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Meal</Text>
              <View style={styles.chips}>
                {QUICK_LABELS.map((ql) => (
                  <Pressable
                    key={ql}
                    style={[styles.chip, { borderColor: theme.border }, label === ql ? styles.chipActive : null]}
                    onPress={() => setLabel(ql)}
                  >
                    <Text style={[styles.chipText, { color: theme.text }, label === ql ? styles.chipTextActive : null]}>{ql}</Text>
                  </Pressable>
                ))}
              </View>
              <Input placeholder="Custom meal label (optional)" value={label} onChangeText={setLabel} />

              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Icon (optional)</Text>
              <IconPicker value={icon} onChange={setIcon} />

              <View style={styles.timeToggleRow}>
                <Pressable onPress={() => setHasTime((v) => !v)} style={styles.timeToggle}>
                  <View style={[styles.checkbox, { borderColor: theme.border }, hasTime ? styles.checkboxChecked : null]} />
                  <Text style={[styles.timeToggleLabel, { color: theme.text }]}>Set time</Text>
                </Pressable>
              </View>
              {hasTime ? (
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
                    <Pressable style={[styles.periodBtn, period === 'AM' ? styles.periodBtnActive : null]} onPress={() => setPeriod('AM')}>
                      <Text style={[styles.periodText, period === 'AM' ? styles.periodTextActive : null]}>AM</Text>
                    </Pressable>
                    <Pressable style={[styles.periodBtn, period === 'PM' ? styles.periodBtnActive : null]} onPress={() => setPeriod('PM')}>
                      <Text style={[styles.periodText, period === 'PM' ? styles.periodTextActive : null]}>PM</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </>
          ) : null}

          {stagedItems.length > 0 && (
            <View style={styles.stagedList}>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Added items</Text>
              {stagedItems.map((item) => (
                <View key={item.key} style={[styles.stagedItem, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                  <View style={styles.stagedItemText}>
                    <Text style={[styles.stagedItemName, { color: theme.text }]} numberOfLines={1}>
                      {item.food_name}{item.brand_name ? ` (${item.brand_name})` : ''}
                    </Text>
                    <Text style={[styles.stagedItemDetail, { color: theme.textSecondary }]}>
                      {item.servings_eaten}x {item.serving_size_amount ? `${item.serving_size_amount}${item.serving_size_unit}` : item.serving_size_unit}
                      {item.calories ? ` · ${Math.round(parseFloat(item.calories) * (parseFloat(item.servings_eaten) || 1))} kcal` : ''}
                    </Text>
                  </View>
                  <Pressable onPress={() => handleRemoveStagedItem(item.key)} hitSlop={8}>
                    <Text style={[styles.removeIcon, { color: theme.textSecondary }]}>x</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
          {canAddItem && (
            <Button label="+ Add Another Item" onPress={handleAddItem} variant="secondary" />
          )}

          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            {stagedItems.length > 0 ? 'Next item' : 'Food item'}
          </Text>
          <View style={styles.foodNameRow}>
            <Input
              placeholder="Food name *"
              value={draft.food_name}
              onChangeText={(v) => updateDraft({ food_name: v })}
              containerStyle={styles.foodNameInput}
            />
            <Pressable style={[styles.cameraBtn, { borderColor: theme.border }]} onPress={() => setScannerVisible(true)} hitSlop={4}>
              <Ionicons name="barcode-outline" size={22} color="#888" />
            </Pressable>
          </View>
          <Input placeholder="Brand (optional)" value={draft.brand_name} onChangeText={(v) => updateDraft({ brand_name: v })} />

          {/* Serving size row — FatSecret serving picker or standard unit chips */}
          {fsSelectedFood && draft.source === 'fatsecret' ? (
            <View style={styles.fsServingSection}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Serving size</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitScroll} contentContainerStyle={styles.unitScrollContent}>
                {fsSelectedFood.servings.map((srv, idx) => (
                  <Pressable
                    key={srv.serving_id}
                    style={[styles.unitChip, { borderColor: theme.border }, fsServingIdx === idx ? styles.chipActive : null]}
                    onPress={() => changeFsServing(idx)}
                  >
                    <Text style={[styles.chipText, { color: theme.text }, fsServingIdx === idx ? styles.chipTextActive : null]}>
                      {srv.serving_description}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              {fsSelectedFood.servings[fsServingIdx]?.metric_serving_amount != null ? (
                <Text style={[styles.fsServingMetric, { color: theme.textSecondary }]}>
                  {fsSelectedFood.servings[fsServingIdx].metric_serving_amount}{fsSelectedFood.servings[fsServingIdx].metric_serving_unit ?? 'g'}
                </Text>
              ) : null}
              {(() => {
                const srv = fsSelectedFood.servings[fsServingIdx];
                const unit = srv?.metric_serving_unit ?? 'g';
                if (!srv?.metric_serving_amount || (unit !== 'g' && unit !== 'oz')) return null;
                return (
                  <View style={styles.convertRow}>
                    <Text style={[styles.convertLabel, { color: theme.textSecondary }]}>My amount:</Text>
                    <Input
                      placeholder="e.g. 150"
                      value={convertAmount}
                      onChangeText={handleConvertAmount}
                      keyboardType="decimal-pad"
                      containerStyle={styles.convertInput}
                    />
                    <View style={styles.convertUnits}>
                      {(['g', 'oz'] as const).map((u) => (
                        <Pressable
                          key={u}
                          style={[styles.unitChip, { borderColor: theme.border }, convertUnit === u ? styles.chipActive : null]}
                          onPress={() => handleConvertUnit(u)}
                        >
                          <Text style={[styles.chipText, { color: theme.text }, convertUnit === u ? styles.chipTextActive : null]}>{u}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                );
              })()}
            </View>
          ) : (
            <View style={styles.servingRow}>
              <Input
                placeholder="Amount"
                value={draft.serving_size_amount}
                onChangeText={(v) => updateDraft({ serving_size_amount: v.replace(/[^0-9.]/g, '') })}
                keyboardType="decimal-pad"
                containerStyle={styles.servingAmountContainer}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitScroll} contentContainerStyle={styles.unitScrollContent}>
                {SERVING_UNITS.map((u) => (
                  <Pressable
                    key={u}
                    style={[styles.unitChip, { borderColor: theme.border }, draft.serving_size_unit === u ? styles.chipActive : null]}
                    onPress={() => updateDraft({ serving_size_unit: u })}
                  >
                    <Text style={[styles.chipText, { color: theme.text }, draft.serving_size_unit === u ? styles.chipTextActive : null]}>{u}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Servings eaten</Text>
              <Input
                placeholder="1"
                value={draft.servings_eaten}
                onChangeText={(v) => updateDraft({ servings_eaten: v.replace(/[^0-9.]/g, '') })}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Macros per serving (optional)</Text>
          <View style={styles.macroGrid}>
            <MacroInput label="Calories" unit="kcal" value={draft.calories} onChangeText={(v) => updateDraft({ calories: v })} />
            <MacroInput label="Fat" unit="g" value={draft.fat} onChangeText={(v) => updateDraft({ fat: v })} />
            <MacroInput label="Carbs" unit="g" value={draft.carbs} onChangeText={(v) => updateDraft({ carbs: v })} />
            <MacroInput label="Protein" unit="g" value={draft.protein} onChangeText={(v) => updateDraft({ protein: v })} />
          </View>

          <Pressable onPress={() => setShowMoreMacros((v) => !v)} style={styles.moreToggle}>
            <Text style={[styles.moreToggleText, { color: Colors.accent }]}>
              {showMoreMacros ? '▲ Less' : '▼ More macros'}
            </Text>
          </Pressable>

          {showMoreMacros ? (
            <View style={styles.macroGrid}>
              <MacroInput label="Saturated Fat" unit="g" value={draft.saturated_fat} onChangeText={(v) => updateDraft({ saturated_fat: v })} />
              <MacroInput label="Trans Fat" unit="g" value={draft.trans_fat} onChangeText={(v) => updateDraft({ trans_fat: v })} />
              <MacroInput label="Cholesterol" unit="mg" value={draft.cholesterol} onChangeText={(v) => updateDraft({ cholesterol: v })} />
              <MacroInput label="Sodium" unit="mg" value={draft.sodium} onChangeText={(v) => updateDraft({ sodium: v })} />
              <MacroInput label="Fiber" unit="g" value={draft.dietary_fiber} onChangeText={(v) => updateDraft({ dietary_fiber: v })} />
              <MacroInput label="Sugar" unit="g" value={draft.total_sugar} onChangeText={(v) => updateDraft({ total_sugar: v })} />
              <MacroInput label="Added Sugar" unit="g" value={draft.added_sugar} onChangeText={(v) => updateDraft({ added_sugar: v })} />
            </View>
          ) : null}

          {draft.source === 'fatsecret' ? (
            <FatSecretAttribution />
          ) : null}

          <View style={styles.actions}>
            <Button label="Cancel" onPress={onCancel} variant="secondary" />
            <Button label="Log Food" onPress={handleSubmit} disabled={!canSubmit} />
          </View>
        </View>
      )}
    </ScrollView>
    </>
  );
}

function MacroInput({ label, unit, value, onChangeText }: { label: string; unit: string; value: string; onChangeText: (v: string) => void }) {
  const theme = useTheme();
  return (
    <View style={styles.macroField}>
      <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{label} ({unit})</Text>
      <Input
        placeholder="–"
        value={value}
        onChangeText={(v) => onChangeText(v.replace(/[^0-9.]/g, ''))}
        keyboardType="decimal-pad"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {} as ViewStyle,
  scrollContent: {
    padding: Spacing.md,
    gap: Spacing.sm,
  } as ViewStyle,
  sectionLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: Spacing.xs,
  } as TextStyle,
  chips: {
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
  timeToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,
  timeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  } as ViewStyle,
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderRadius: 4,
  } as ViewStyle,
  checkboxChecked: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  } as ViewStyle,
  timeToggleLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
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
  stagedList: {
    gap: Spacing.xs,
  } as ViewStyle,
  stagedItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
  removeIcon: {
    fontSize: 18,
    lineHeight: 18,
    paddingHorizontal: Spacing.xs,
  } as TextStyle,
  servingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  } as ViewStyle,
  servingAmountContainer: {
    width: 80,
  } as ViewStyle,
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
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  } as ViewStyle,
  halfField: {
    flex: 1,
    gap: 4,
  } as ViewStyle,
  fieldLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '500',
  } as TextStyle,
  macroGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  } as ViewStyle,
  macroField: {
    width: '47%',
    gap: 4,
  } as ViewStyle,
  moreToggle: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.xs,
  } as ViewStyle,
  moreToggleText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  } as TextStyle,
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  } as ViewStyle,
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
  libraryPanel: {
    gap: Spacing.xs,
  } as ViewStyle,
  librarySpinner: {
    marginVertical: Spacing.md,
  } as ViewStyle,
  libraryEmpty: {
    fontSize: FontSizes.sm,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  } as TextStyle,
  libraryRow: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,
  libraryFoodName: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  } as TextStyle,
  libraryBrand: {
    fontSize: FontSizes.xs,
    marginTop: 1,
  } as TextStyle,
  libraryMacros: {
    fontSize: FontSizes.xs,
    marginTop: 2,
  } as TextStyle,
  manualForm: {
    gap: Spacing.sm,
  } as ViewStyle,
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  } as ViewStyle,
  searchBarField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
  } as ViewStyle,
  searchBarInput: {
    flex: 1,
    paddingVertical: Spacing.sm,
    fontSize: 16,
  } as TextStyle,
  searchClearBtn: {
    paddingLeft: Spacing.xs,
    paddingVertical: 4,
  } as ViewStyle,
  searchClearIcon: {
    fontSize: 18,
    lineHeight: 20,
  } as TextStyle,
  sourceBadgeContainer: {
    alignItems: 'flex-end',
    gap: 4,
  } as ViewStyle,
  sourceBadge: {
    fontSize: 10,
    fontWeight: '700',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  } as TextStyle,
  sourceBadgeLibrary: {
    backgroundColor: '#E8F5E9',
    color: '#2E7D32',
  } as TextStyle,
  sourceBadgeCommunity: {
    backgroundColor: '#E3F2FD',
    color: '#1565C0',
  } as TextStyle,
  sourceBadgeFatSecret: {
    backgroundColor: '#FFF3E0',
    color: '#E65100',
  } as TextStyle,
  // FatSecret-specific
  fsResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,
  fsResultText: {
    flex: 1,
  } as ViewStyle,
  fsBrandName: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 1,
  } as TextStyle,
  fsChevron: {
    fontSize: 20,
    paddingLeft: Spacing.sm,
  } as TextStyle,
  fsAttribution: {
    marginTop: Spacing.sm,
  } as ViewStyle,
  fsServingSection: {
    gap: 4,
  } as ViewStyle,
  fsServingMetric: {
    fontSize: FontSizes.xs,
    marginTop: 2,
  } as TextStyle,
  foodNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  } as ViewStyle,
  foodNameInput: {
    flex: 1,
  } as ViewStyle,
  cameraBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  cameraBtnIcon: {
    fontSize: 20,
  } as TextStyle,
  convertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  } as ViewStyle,
  convertLabel: {
    fontSize: 13,
  } as TextStyle,
  convertInput: {
    flex: 1,
  } as ViewStyle,
  convertUnits: {
    flexDirection: 'row',
    gap: 6,
  } as ViewStyle,
});
