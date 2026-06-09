import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { BorderRadius, Colors, FontSizes, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { lookupIngredient, type FoodSearchResult } from '@/services/fatsecret';
import { calculateForQuantity } from '@/utils/macro-calculator';
import type { RecipeIngredientInput } from '@/services/recipe-service';

export interface IngredientInputValue {
  name: string;
  quantity: string;
  unit: string;
  offResult?: FoodSearchResult;
  macros?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface IngredientInputProps {
  value: IngredientInputValue;
  onChange: (value: IngredientInputValue) => void;
  onRemove?: () => void;
  index: number;
}

const COMMON_UNITS = ['g', 'oz', 'cup', 'tbsp', 'tsp', 'lb', 'ml', 'each'];

export function toIngredientInput(
  val: IngredientInputValue,
  displayOrder: number
): RecipeIngredientInput {
  return {
    raw_text: [val.quantity, val.unit, val.name].filter(Boolean).join(' ').trim(),
    name: val.name,
    quantity: parseFloat(val.quantity) || undefined,
    unit: val.unit || undefined,
    display_order: displayOrder,
    calories: val.macros?.calories,
    protein: val.macros?.protein,
    carbs: val.macros?.carbs,
    fat: val.macros?.fat,
  };
}

const INITIAL_VISIBLE = 5;
const PAGE_SIZE = 10;

export function IngredientInput({ value, onChange, onRemove, index }: IngredientInputProps) {
  const theme = useTheme();
  const [suggestions, setSuggestions] = useState<FoodSearchResult[]>([]);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function computeMacros(
    ingredient: FoodSearchResult,
    qty: string,
    unit: string
  ): { calories: number; protein: number; carbs: number; fat: number } | undefined {
    const quantity = parseFloat(qty);
    if (isNaN(quantity) || quantity <= 0) return undefined;

    if (!unit || unit === 'each') {
      if (ingredient.caloriesPerServing == null) return undefined;
      return {
        calories: Math.round(ingredient.caloriesPerServing * quantity),
        protein: parseFloat(((ingredient.proteinPerServing ?? 0) * quantity).toFixed(1)),
        carbs: parseFloat(((ingredient.carbsPerServing ?? 0) * quantity).toFixed(1)),
        fat: parseFloat(((ingredient.fatPerServing ?? 0) * quantity).toFixed(1)),
      };
    }

    const m = calculateForQuantity(ingredient, quantity, unit);
    return { calories: m.calories, protein: m.protein, carbs: m.carbs, fat: m.fat };
  }

  function handleNameChange(text: string) {
    onChange({ ...value, name: text, offResult: undefined, macros: undefined });
    setShowSuggestions(true);
    setVisibleCount(INITIAL_VISIBLE);
    setCurrentPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) {
      setSuggestions([]);
      setCurrentQuery('');
      return;
    }
    setCurrentQuery(text);
    debounceRef.current = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const result = await lookupIngredient(text, 1);
        setSuggestions(result.results);
        setHasMore(result.hasMore);
      } catch {
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 500);
  }

  async function handleLoadMore() {
    const query = currentQuery || value.name;
    if (!query.trim() || loadingMore || !hasMore) return;
    const nextPage = currentPage + 1;
    setLoadingMore(true);
    try {
      const result = await lookupIngredient(query, nextPage);
      setSuggestions((prev) => {
        const existingIds = new Set(prev.map((s) => s.id));
        return [...prev, ...result.results.filter((r) => !existingIds.has(r.id))];
      });
      setVisibleCount((prev) => prev + PAGE_SIZE);
      setCurrentPage(nextPage);
      setHasMore(result.hasMore);
    } catch {
      // silent
    } finally {
      setLoadingMore(false);
    }
  }

  const handleSelectSuggestion = useCallback(
    (ingredient: FoodSearchResult) => {
      setSuggestions([]);
      setShowSuggestions(false);
      onChange({
        ...value,
        name: ingredient.name,
        offResult: ingredient,
        macros: computeMacros(ingredient, value.quantity, value.unit),
      });
    },
    [value, onChange]
  );

  function handleQuantityChange(text: string) {
    const macros = value.offResult
      ? computeMacros(value.offResult, text, value.unit)
      : undefined;
    onChange({ ...value, quantity: text, macros });
  }

  function handleUnitChange(unit: string) {
    const macros = value.offResult
      ? computeMacros(value.offResult, value.quantity, unit)
      : undefined;
    onChange({ ...value, unit, macros });
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
      ]}
    >
      {/* Name + quantity + unit row */}
      <View style={styles.inputRow}>
        <View style={styles.nameWrap}>
          <TextInput
            style={[styles.nameInput, { color: theme.text, borderColor: theme.border }]}
            placeholder={`Ingredient ${index + 1}`}
            placeholderTextColor={theme.textSecondary}
            value={value.name}
            onChangeText={handleNameChange}
            onBlur={() => {
              blurTimerRef.current = setTimeout(() => setShowSuggestions(false), 150);
            }}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {loadingSuggestions && (
            <ActivityIndicator
              size="small"
              color={Colors.accent}
              style={styles.nameLoader}
            />
          )}
        </View>

        <View style={styles.qtyWrap}>
          <TextInput
            style={[styles.qtyInput, { color: theme.text, borderColor: theme.border }]}
            placeholder="Qty"
            placeholderTextColor={theme.textSecondary}
            value={value.quantity}
            onChangeText={handleQuantityChange}
            keyboardType="decimal-pad"
          />
        </View>

        <TextInput
          style={[styles.unitInput, { color: theme.text, borderColor: theme.border }]}
          placeholder="Unit"
          placeholderTextColor={theme.textSecondary}
          value={value.unit}
          onChangeText={handleUnitChange}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {onRemove && (
          <Pressable onPress={onRemove} style={styles.removeBtn} hitSlop={10}>
            <Text style={[styles.removeIcon, { color: theme.textSecondary }]}>×</Text>
          </Pressable>
        )}
      </View>

      {/* Autocomplete dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <View
          style={[
            styles.dropdown,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          {suggestions.slice(0, visibleCount).map((s) => (
            <Pressable
              key={s.id}
              style={[styles.dropdownItem, { borderBottomColor: theme.border }]}
              onPress={() => handleSelectSuggestion(s)}
            >
              <Text
                style={[styles.dropdownName, { color: theme.text }]}
                numberOfLines={1}
              >
                {s.name}
              </Text>
              <Text style={[styles.dropdownMeta, { color: theme.textSecondary }]}>
                {s.servingDescription
                  ? `${s.caloriesPerServing} kcal · ${s.proteinPerServing}g P / ${s.servingDescription}`
                  : `${s.caloriesPer100g} kcal · ${s.proteinPer100g}g P / 100g`}
              </Text>
            </Pressable>
          ))}

          {/* Show more already-fetched results */}
          {visibleCount < suggestions.length && (
            <Pressable
              style={[styles.dropdownAction, { borderTopColor: theme.border }]}
              onPress={() => {
                if (blurTimerRef.current) { clearTimeout(blurTimerRef.current); blurTimerRef.current = null; }
                setVisibleCount((n) => n + PAGE_SIZE);
              }}
            >
              <Text style={[styles.dropdownActionText, { color: Colors.accent }]}>
                See {Math.min(suggestions.length - visibleCount, PAGE_SIZE)} more
              </Text>
            </Pressable>
          )}

          {/* Load next page */}
          {visibleCount >= suggestions.length && hasMore && (
            <Pressable
              style={[styles.dropdownAction, { borderTopColor: theme.border }]}
              onPress={() => {
                if (blurTimerRef.current) { clearTimeout(blurTimerRef.current); blurTimerRef.current = null; }
                handleLoadMore();
              }}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <ActivityIndicator size="small" color={Colors.accent} />
              ) : (
                <Text style={[styles.dropdownActionText, { color: Colors.accent }]}>
                  Load more results…
                </Text>
              )}
            </Pressable>
          )}
        </View>
      )}

      {/* Unit quick-select chips */}
      <View style={styles.unitChips}>
        {COMMON_UNITS.map((u) => (
          <Pressable
            key={u}
            onPress={() => handleUnitChange(u)}
            style={[
              styles.unitChip,
              value.unit === u
                ? { backgroundColor: Colors.accent }
                : { backgroundColor: theme.background, borderColor: theme.border, borderWidth: 1 },
            ]}
          >
            <Text
              style={[
                styles.unitChipText,
                { color: value.unit === u ? '#FFFFFF' : theme.textSecondary },
              ]}
            >
              {u}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Macro preview */}
      {value.macros ? (
        <View style={styles.macroRow}>
          <Text style={[styles.macroItem, { color: theme.textSecondary }]}>
            {value.macros.calories} cal
          </Text>
          <Text style={[styles.macroItem, { color: theme.textSecondary }]}>
            {value.macros.protein}g P
          </Text>
          <Text style={[styles.macroItem, { color: theme.textSecondary }]}>
            {value.macros.carbs}g C
          </Text>
          <Text style={[styles.macroItem, { color: theme.textSecondary }]}>
            {value.macros.fat}g F
          </Text>
        </View>
      ) : value.offResult && parseFloat(value.quantity) > 0 ? (
        <Text style={[styles.unitHint, { color: theme.textSecondary }]}>
          Select a unit to calculate macros
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    gap: Spacing.xs,
  } as ViewStyle,
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  } as ViewStyle,
  nameWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,
  nameInput: {
    flex: 1,
    height: 36,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    fontSize: FontSizes.sm,
  } as TextStyle,
  nameLoader: {
    position: 'absolute',
    right: Spacing.sm,
  } as ViewStyle,
  qtyWrap: {
    alignItems: 'center',
    gap: 2,
  } as ViewStyle,
  qtyInput: {
    width: 56,
    height: 36,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    fontSize: FontSizes.sm,
    textAlign: 'center',
  } as TextStyle,
  qtyLoader: {
    position: 'absolute',
    bottom: -16,
  } as ViewStyle,
  estLabel: {
    fontSize: 9,
    fontWeight: '500',
  } as TextStyle,
  unitInput: {
    width: 52,
    height: 36,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    fontSize: FontSizes.sm,
    textAlign: 'center',
  } as TextStyle,
  removeBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  removeIcon: {
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '300',
  } as TextStyle,
  dropdown: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    overflow: 'hidden',
    zIndex: 10,
  } as ViewStyle,
  dropdownItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,
  dropdownAction: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,
  dropdownActionText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  } as TextStyle,
  dropdownName: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
  } as TextStyle,
  dropdownMeta: {
    fontSize: FontSizes.xs,
    marginTop: 2,
  } as TextStyle,
  unitChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  } as ViewStyle,
  unitChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  } as ViewStyle,
  unitChipText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  } as TextStyle,
  macroRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingTop: Spacing.xs,
  } as ViewStyle,
  macroItem: {
    fontSize: FontSizes.xs,
    fontWeight: '500',
  } as TextStyle,
  unitHint: {
    fontSize: FontSizes.xs,
    fontStyle: 'italic',
    paddingTop: Spacing.xs,
  } as TextStyle,
});
