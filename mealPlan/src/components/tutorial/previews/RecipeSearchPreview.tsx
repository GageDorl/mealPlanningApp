import { View, Text, TextInput, Pressable, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { RecipeCard } from '@/components/recipes/recipe-card';

const NOOP = () => {};

// Same cuisine options as search.tsx
const CUISINE_OPTIONS = ['Italian', 'Mexican', 'Asian', 'American', 'Mediterranean', 'Indian'];
const SELECTED_CUISINE = 'Italian';

const FILLER_RESULTS = [
  { id: 'r1', title: 'Spaghetti Carbonara', image: '', readyInMinutes: 20, calories: 580, isSaved: false },
  { id: 'r2', title: 'Chicken Parmigiana', image: '', readyInMinutes: 45, calories: 610, isSaved: true },
];

export function RecipeSearchPreview() {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      {/* Search bar — matches search.tsx searchBar style */}
      <View style={[styles.searchBar, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          value="Italian pasta"
          onChangeText={NOOP}
          placeholderTextColor={theme.textSecondary}
          editable={false}
        />
      </View>

      {/* Cuisine chips — matches search.tsx Chip component style */}
      <View style={styles.filterRow}>
        <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>Cuisine:</Text>
        {CUISINE_OPTIONS.map((c) => (
          <Pressable
            key={c}
            style={[
              styles.chip,
              c === SELECTED_CUISINE
                ? { backgroundColor: Colors.accent }
                : { backgroundColor: theme.backgroundElement, borderColor: theme.border, borderWidth: 1 },
            ]}
            onPress={NOOP}
          >
            <Text style={[styles.chipText, { color: c === SELECTED_CUISINE ? '#fff' : theme.text }]}>{c}</Text>
          </Pressable>
        ))}
      </View>

      {/* Real RecipeCard components as search results */}
      {FILLER_RESULTS.map((r) => (
        <RecipeCard key={r.id} recipe={r} onPress={NOOP} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  } as ViewStyle,
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    height: 44,
  } as ViewStyle,
  searchInput: {
    flex: 1,
    fontSize: FontSizes.md,
    height: '100%',
  } as TextStyle,
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    alignItems: 'center',
  } as ViewStyle,
  filterLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  } as TextStyle,
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  } as ViewStyle,
  chipText: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
  } as TextStyle,
});
