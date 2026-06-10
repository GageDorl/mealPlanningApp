import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Modal,
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
import { FatSecretAttribution } from '@/components/food/fatsecret-attribution';
import { BarcodeScanner } from '@/components/food/barcode-scanner';

const QUICK_LABELS = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Post-workout'];

const SERVING_UNITS = ['g', 'oz', 'cup', 'piece', 'slice', 'tbsp', 'tsp', 'ml'];

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
  source: 'manual' | 'library' | 'fatsecret';
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

type FormMode = 'manual' | 'library' | 'fatsecret';

export function LogFoodForm({ initialTime, userId, showLabelAndTime = true, onSubmit, onCancel }: LogFoodFormProps) {
  const theme = useTheme();

  const [formMode, setFormMode] = useState<FormMode>('manual');

  // Library search state
  const [libraryQuery, setLibraryQuery] = useState('');
  const [libraryResults, setLibraryResults] = useState<PersonalFood[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);

  const searchLibrary = useCallback(async (q: string) => {
    if (!userId) return;
    setLibraryLoading(true);
    try {
      const results = await getPersonalFoods(userId, q);
      setLibraryResults(results);
    } finally {
      setLibraryLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (formMode === 'library') {
      searchLibrary(libraryQuery);
    }
  }, [formMode, libraryQuery, searchLibrary]);

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

  // FatSecret search state
  const [fsQuery, setFsQuery] = useState('');
  const [fsResults, setFsResults] = useState<FoodSearchResult[]>([]);
  const [fsSearching, setFsSearching] = useState(false);
  const [fsLoadingId, setFsLoadingId] = useState<string | null>(null);
  const [fsSelectedFood, setFsSelectedFood] = useState<FoodDetails | null>(null);
  const [fsServingIdx, setFsServingIdx] = useState(0);
  const fsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (formMode !== 'fatsecret') return;
    const trimmed = fsQuery.trim();
    if (!trimmed) {
      setFsResults([]);
      return;
    }
    if (fsDebounceRef.current) clearTimeout(fsDebounceRef.current);
    fsDebounceRef.current = setTimeout(async () => {
      setFsSearching(true);
      try {
        const response = await lookupIngredient(trimmed);
        setFsResults(response.results);
      } catch {
        setFsResults([]);
      } finally {
        setFsSearching(false);
      }
    }, 400);
    return () => {
      if (fsDebounceRef.current) clearTimeout(fsDebounceRef.current);
    };
  }, [fsQuery, formMode]);

  async function selectFatSecretFood(result: FoodSearchResult) {
    setFsLoadingId(result.id);
    try {
      const details = await getFoodDetails(result.id);
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
    }
  }

  function changeFsServing(idx: number) {
    if (!fsSelectedFood) return;
    setFsServingIdx(idx);
    setDraft(prev => ({ ...prev, servings_eaten: '1', ...servingToFields(fsSelectedFood.servings[idx]) }));
  }

  const [scannerVisible, setScannerVisible] = useState(false);

  function applyFoodDetails(details: FoodDetails, sourceId: string) {
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
  }

  // Meal label + time
  const [label, setLabel] = useState('');
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
    });
  };

  const canSubmit = stagedItems.length > 0 || canAddItem;

  return (
    <>
    <Modal visible={scannerVisible} animationType="slide" onRequestClose={() => setScannerVisible(false)}>
      <BarcodeScanner
        onFoodFound={(details) => {
          setScannerVisible(false);
          applyFoodDetails(details, details.id);
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
        {userId ? (
          <Pressable
            style={[styles.modeTab, formMode === 'library' ? styles.modeTabActive : null]}
            onPress={() => setFormMode('library')}
          >
            <Text style={[styles.modeTabText, { color: theme.text }, formMode === 'library' ? styles.modeTabTextActive : null]}>My Library</Text>
          </Pressable>
        ) : null}
        <Pressable
          style={[styles.modeTab, formMode === 'fatsecret' ? styles.modeTabActive : null]}
          onPress={() => setFormMode('fatsecret')}
        >
          <Text style={[styles.modeTabText, { color: theme.text }, formMode === 'fatsecret' ? styles.modeTabTextActive : null]}>Search</Text>
        </Pressable>
      </View>

      {formMode === 'library' ? (
        <View style={styles.libraryPanel}>
          <Input
            placeholder="Search saved foods…"
            value={libraryQuery}
            onChangeText={setLibraryQuery}
          />
          {libraryLoading ? (
            <ActivityIndicator size="small" color={Colors.accent} style={styles.librarySpinner} />
          ) : libraryResults.length === 0 ? (
            <Text style={[styles.libraryEmpty, { color: theme.textSecondary }]}>
              {libraryQuery.trim() ? 'No matches found.' : 'No saved foods yet.'}
            </Text>
          ) : (
            libraryResults.map((food) => (
              <Pressable
                key={food.id}
                style={[styles.libraryRow, { borderBottomColor: theme.border }]}
                onPress={() => selectLibraryItem(food)}
              >
                <Text style={[styles.libraryFoodName, { color: theme.text }]} numberOfLines={1}>{food.food_name}</Text>
                {food.brand_name ? (
                  <Text style={[styles.libraryBrand, { color: theme.textSecondary }]} numberOfLines={1}>{food.brand_name}</Text>
                ) : null}
                <Text style={[styles.libraryMacros, { color: theme.textSecondary }]}>
                  {[
                    food.calories != null ? `${food.calories} kcal` : null,
                    food.serving_size_amount != null ? `per ${food.serving_size_amount}${food.serving_size_unit ?? ''}` : null,
                  ].filter(Boolean).join(' · ') || '—'}
                </Text>
              </Pressable>
            ))
          )}
        </View>
      ) : formMode === 'fatsecret' ? (
        <View style={styles.libraryPanel}>
          <Input
            placeholder="Search foods, brands…"
            value={fsQuery}
            onChangeText={setFsQuery}
          />
          {fsSearching ? (
            <ActivityIndicator size="small" color={Colors.accent} style={styles.librarySpinner} />
          ) : fsResults.length === 0 ? (
            <Text style={[styles.libraryEmpty, { color: theme.textSecondary }]}>
              {fsQuery.trim() ? 'No results.' : 'Type to search the FatSecret database.'}
            </Text>
          ) : (
            fsResults.map((food) => (
              <Pressable
                key={food.id}
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
                  {fsLoadingId === food.id ? (
                    <ActivityIndicator size="small" color={Colors.accent} />
                  ) : (
                    <Text style={[styles.fsChevron, { color: theme.textSecondary }]}>›</Text>
                  )}
                </View>
              </Pressable>
            ))
          )}
          <FatSecretAttribution style={styles.fsAttribution} />
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

          {stagedItems.length > 0 ? (
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
          ) : null}

          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            {stagedItems.length > 0 ? 'Add another item' : 'Food item'}
          </Text>
          <View style={styles.foodNameRow}>
            <Input
              placeholder="Food name *"
              value={draft.food_name}
              onChangeText={(v) => updateDraft({ food_name: v })}
              containerStyle={styles.foodNameInput}
            />
            <Pressable style={[styles.cameraBtn, { borderColor: theme.border }]} onPress={() => setScannerVisible(true)} hitSlop={4}>
              <Text style={styles.cameraBtnIcon}>📷</Text>
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

          <Button label="+ Add Another Item" onPress={handleAddItem} variant="secondary" disabled={!canAddItem} />

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
  scroll: {
    maxHeight: 520,
  } as ViewStyle,
  scrollContent: {
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
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
});
