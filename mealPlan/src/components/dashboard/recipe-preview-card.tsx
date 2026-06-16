import { Pressable, View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { layout } from '@/styles/layout';
import { surfaces } from '@/styles/surfaces';
import { typography } from '@/styles/typography';
import type { Recipe } from '@/models/recipe';

interface RecipePreviewCardProps {
  recipes: Recipe[];
  onRecipePress: (id: string) => void;
  onViewAll: () => void;
}

const MAX_VISIBLE = 4;

export function RecipePreviewCard({ recipes, onRecipePress, onViewAll }: RecipePreviewCardProps) {
  const theme = useTheme();
  const visible = recipes.slice(0, MAX_VISIBLE);
  const overflow = recipes.length - MAX_VISIBLE;

  return (
    <View style={[surfaces.card, styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={layout.rowSpaceBetween}>
        <Text style={[typography.label, { color: theme.textSecondary }]}>Your Recipes</Text>
      </View>

      {recipes.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { borderColor: theme.border }]}>
            <Text style={[styles.emptyIconText, { color: theme.textSecondary }]}>🍽</Text>
          </View>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            No recipes scheduled yet{'\n'}Add some to your calendar!
          </Text>
        </View>
      ) : (
        <View style={styles.recipeList}>
          {visible.map((recipe) => (
            <Pressable
              key={recipe.id}
              style={[styles.recipeRow, { borderBottomColor: theme.border }]}
              onPress={() => onRecipePress(recipe.id)}
            >
              <View style={[surfaces.dot, { flexShrink: 0, backgroundColor: Colors.accent }]} />
              <Text style={[styles.recipeTitle, { color: theme.text }]} numberOfLines={1}>
                {recipe.title}
              </Text>
              {recipe.calories_per_serving != null && (
                <Text style={[styles.recipeCals, { color: theme.textSecondary }]}>
                  {Math.round(recipe.calories_per_serving)} cal
                </Text>
              )}
            </Pressable>
          ))}
          {overflow > 0 && (
            <Text style={[styles.overflow, { color: Colors.accent }]}>
              +{overflow} more
            </Text>
          )}
        </View>
      )}

      <Pressable onPress={onViewAll} style={styles.viewAll}>
        <Text style={[styles.viewAllText, { color: Colors.accent }]}>View All →</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.sm,
    flex: 1,
  } as ViewStyle,
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  } as ViewStyle,
  emptyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  emptyIconText: {
    fontSize: FontSizes.lg,
  } as TextStyle,
  emptyText: {
    fontSize: FontSizes.sm,
    textAlign: 'center',
  } as TextStyle,
  recipeList: {
    gap: Spacing.xs,
  } as ViewStyle,
  recipeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,
  recipeTitle: {
    flex: 1,
    fontSize: FontSizes.sm,
    fontWeight: '500',
  } as TextStyle,
  recipeCals: {
    fontSize: FontSizes.xs,
    flexShrink: 0,
  } as TextStyle,
  overflow: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    marginTop: Spacing.xs,
  } as TextStyle,
  viewAll: {
    paddingTop: Spacing.xs,
    alignItems: 'center',
  } as ViewStyle,
  viewAllText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  } as TextStyle,
});
