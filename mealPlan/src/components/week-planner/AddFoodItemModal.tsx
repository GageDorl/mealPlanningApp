import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextStyle, type ViewStyle } from 'react-native';
import { usePowerSync } from '@powersync/react-native';
import { useTheme } from '@/hooks/use-theme';
import { useKeyboardSlide } from '@/hooks/use-keyboard-slide';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { lookupIngredient, mapSearchResultToFoodInput } from '@/services/fatsecret';
import type { FoodSearchResult } from '@/services/fatsecret';
import type { MealSlotFoodInput } from '@/services/meal-plan-service';
import { FatSecretAttribution } from '@/components/food/fatsecret-attribution';

interface AddFoodItemModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (food: MealSlotFoodInput) => void;
}

export function AddFoodItemModal({ visible, onClose, onSelect }: AddFoodItemModalProps) {
  const theme = useTheme();
  const db = usePowerSync();
  const keyboardSlide = useKeyboardSlide();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setResults([]);
      setError(null);
    }
  }, [visible]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setError(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await lookupIngredient(trimmed, 1, db);
        setResults(response.results);
      } catch {
        setResults([]);
        setError('Search failed. Try again.');
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, db]);

  const handleSelect = (result: FoodSearchResult) => {
    onSelect(mapSearchResultToFoodInput(result));
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View style={[styles.sheet, { backgroundColor: theme.background, transform: [{ translateY: keyboardSlide }] }]}>
          <View style={[styles.handle, { backgroundColor: theme.border }]} />
          <Text style={[styles.title, { color: theme.text }]}>Add a Food Item</Text>
          <TextInput
            style={[styles.searchInput, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
            value={query}
            onChangeText={setQuery}
            placeholder="Search foods…"
            placeholderTextColor={theme.textSecondary}
            autoFocus
          />
          {loading && <ActivityIndicator size="small" color={Colors.accent} style={styles.loadingSpinner} />}
          {error && <Text style={[styles.emptyText, { color: theme.error }]}>{error}</Text>}
          <ScrollView style={styles.results} keyboardShouldPersistTaps="handled">
            {results.map((r) => (
              <Pressable
                key={r.id}
                style={[styles.resultRow, { borderBottomColor: theme.border }]}
                onPress={() => handleSelect(r)}
              >
                <View style={styles.resultText}>
                  {r.brand_name ? (
                    <Text style={[styles.brandName, { color: Colors.accent }]} numberOfLines={1}>{r.brand_name}</Text>
                  ) : null}
                  <Text style={[styles.foodName, { color: theme.text }]} numberOfLines={1}>{r.name}</Text>
                </View>
                <Text style={[styles.kcal, { color: theme.textSecondary }]}>
                  {Math.round(r.caloriesPerServing ?? r.caloriesPer100g)} kcal
                </Text>
              </Pressable>
            ))}
            {!loading && !error && query.trim().length > 0 && results.length === 0 && (
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No results.</Text>
            )}
          </ScrollView>
          <FatSecretAttribution />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
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
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    height: '75%',
    gap: Spacing.sm,
  } as ViewStyle,
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.xs,
  } as ViewStyle,
  title: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    textAlign: 'center',
  } as TextStyle,
  searchInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSizes.sm,
  } as TextStyle,
  loadingSpinner: {
    marginTop: Spacing.sm,
  } as ViewStyle,
  results: {
    flex: 1,
  } as ViewStyle,
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,
  resultText: {
    flex: 1,
  } as ViewStyle,
  brandName: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
  } as TextStyle,
  foodName: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
  } as TextStyle,
  kcal: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    flexShrink: 0,
  } as TextStyle,
  emptyText: {
    fontSize: FontSizes.sm,
    textAlign: 'center',
    marginTop: Spacing.lg,
  } as TextStyle,
});
