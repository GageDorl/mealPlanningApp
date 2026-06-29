import { View, Text, TextInput, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { RecipeCard } from '@/components/recipes/recipe-card';

const NOOP = () => {};

const FILLER_RECIPES = [
  { id: '1', title: 'Chicken & Rice Bowl', image: '', readyInMinutes: 25, calories: 520, isSaved: true },
  { id: '2', title: 'Greek Salad with Feta', image: '', readyInMinutes: 10, calories: 280, isSaved: true },
  { id: '3', title: 'Overnight Oats', image: '', readyInMinutes: 5, calories: 340, isSaved: false },
];

export function RecipeLibraryPreview() {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      {/* Filter input — matches saved.tsx searchBar style */}
      <View style={[styles.searchBar, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Filter recipes…"
          placeholderTextColor={theme.textSecondary}
          editable={false}
        />
      </View>

      {/* Filter tabs — All / Favorites / Import / Create */}
      <View style={styles.actions}>
        {['All', 'Favorites', 'Import', 'Create'].map((tab) => (
          <View
            key={tab}
            style={[
              styles.tab,
              tab === 'All'
                ? { backgroundColor: Colors.accent }
                : { borderColor: theme.border, borderWidth: 1 },
            ]}
          >
            <Text style={[styles.tabText, { color: tab === 'All' ? '#fff' : Colors.accent }]}>{tab}</Text>
          </View>
        ))}
      </View>

      {/* Real RecipeCard components — no image URL shows the gray placeholder */}
      {FILLER_RECIPES.map((r) => (
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
    marginVertical: Spacing.xs,
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
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  } as ViewStyle,
  tab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  } as ViewStyle,
  tabText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  } as TextStyle,
});
