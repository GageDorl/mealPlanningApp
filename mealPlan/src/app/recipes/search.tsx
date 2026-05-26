import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { RecipeCard } from '@/components/recipes/recipe-card';
import { searchRecipes, type SpoonacularSearchResult } from '@/services/spoonacular';

const CUISINE_OPTIONS = ['Italian', 'Mexican', 'Asian', 'American', 'Mediterranean', 'Indian'];
const DIET_OPTIONS = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free'];
const TIME_OPTIONS = [
  { label: '≤ 20 min', value: 20 },
  { label: '≤ 30 min', value: 30 },
  { label: '≤ 45 min', value: 45 },
];

export default function RecipeSearchScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState<string | null>(null);
  const [selectedDiets, setSelectedDiets] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState<number | null>(null);

  const [results, setResults] = useState<SpoonacularSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(
    async (q: string, cuisine: string | null, diets: string[], maxTime: number | null) => {
      if (!q.trim()) {
        setResults([]);
        setSearched(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await searchRecipes({
          query: q.trim(),
          cuisine: cuisine ?? undefined,
          diet: diets.length ? diets : undefined,
          maxReadyTime: maxTime ?? undefined,
          number: 20,
        });
        setResults(response.results);
        setSearched(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Search failed');
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  function handleQueryChange(text: string) {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      doSearch(text, selectedCuisine, selectedDiets, selectedTime);
    }, 600);
  }

  function handleSearch() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    doSearch(query, selectedCuisine, selectedDiets, selectedTime);
  }

  function toggleDiet(diet: string) {
    const next = selectedDiets.includes(diet)
      ? selectedDiets.filter((d) => d !== diet)
      : [...selectedDiets, diet];
    setSelectedDiets(next);
    doSearch(query, selectedCuisine, next, selectedTime);
  }

  function toggleCuisine(cuisine: string) {
    const next = selectedCuisine === cuisine ? null : cuisine;
    setSelectedCuisine(next);
    doSearch(query, next, selectedDiets, selectedTime);
  }

  function toggleTime(value: number) {
    const next = selectedTime === value ? null : value;
    setSelectedTime(next);
    doSearch(query, selectedCuisine, selectedDiets, next);
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>Find Recipes</Text>
        <Pressable onPress={() => router.push('/recipes/saved')} style={styles.savedLink}>
          <Text style={[styles.savedLinkText, { color: Colors.accent }]}>My Recipes</Text>
        </Pressable>
      </View>

      {/* Search input */}
      <View style={[styles.searchBar, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search recipes…"
          placeholderTextColor={theme.textSecondary}
          value={query}
          onChangeText={handleQueryChange}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {loading && <ActivityIndicator size="small" color={Colors.accent} />}
      </View>

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>Cuisine:</Text>
        {CUISINE_OPTIONS.map((c) => (
          <Chip
            key={c}
            label={c}
            selected={selectedCuisine === c}
            onPress={() => toggleCuisine(c)}
            theme={theme}
          />
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>Diet:</Text>
        {DIET_OPTIONS.map((d) => (
          <Chip
            key={d}
            label={d}
            selected={selectedDiets.includes(d)}
            onPress={() => toggleDiet(d)}
            theme={theme}
          />
        ))}
        {TIME_OPTIONS.map((t) => (
          <Chip
            key={t.value}
            label={t.label}
            selected={selectedTime === t.value}
            onPress={() => toggleTime(t.value)}
            theme={theme}
          />
        ))}
      </ScrollView>

      {/* Results */}
      {error ? (
        <View style={styles.center}>
          <Text style={[styles.statusText, { color: theme.textSecondary }]}>
            {error.includes('offline') || error.includes('network') || error.includes('fetch')
              ? 'You appear to be offline. Showing cached results if available.'
              : error}
          </Text>
        </View>
      ) : !searched && !loading ? (
        <View style={styles.center}>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Search for recipes</Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
            Try "chicken stir-fry" or "pasta"
          </Text>
        </View>
      ) : searched && results.length === 0 && !loading ? (
        <View style={styles.center}>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No results found</Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
            Try different keywords or filters
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
          {results.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={{
                id: recipe.id,
                title: recipe.title,
                image: recipe.image,
                readyInMinutes: recipe.readyInMinutes,
                calories: recipe.nutrition.calories,
              }}
              onPress={() => router.push(`/recipes/${recipe.id}` as any)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function Chip({
  label,
  selected,
  onPress,
  theme,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <Pressable
      style={[
        styles.chip,
        selected
          ? { backgroundColor: Colors.accent }
          : { backgroundColor: theme.backgroundElement, borderColor: theme.border, borderWidth: 1 },
      ]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, { color: selected ? '#FFFFFF' : theme.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,
  title: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
  } as TextStyle,
  savedLink: {
    padding: Spacing.sm,
  } as ViewStyle,
  savedLinkText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  } as TextStyle,
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    height: 48,
    gap: Spacing.sm,
  } as ViewStyle,
  searchInput: {
    flex: 1,
    fontSize: FontSizes.md,
    height: '100%',
  } as TextStyle,
  filterRow: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
    alignItems: 'center',
  } as ViewStyle,
  filterLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginRight: Spacing.xs,
  } as TextStyle,
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  } as ViewStyle,
  chipText: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
    textTransform: 'capitalize',
  } as TextStyle,
  grid: {
    padding: Spacing.lg,
    gap: Spacing.md,
  } as ViewStyle,
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  } as ViewStyle,
  emptyTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    textAlign: 'center',
  } as TextStyle,
  emptySubtitle: {
    fontSize: FontSizes.sm,
    textAlign: 'center',
  } as TextStyle,
  statusText: {
    fontSize: FontSizes.md,
    textAlign: 'center',
  } as TextStyle,
});
