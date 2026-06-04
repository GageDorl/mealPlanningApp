import { Pressable, View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Recipe } from '@/models/recipe';

interface RecipePreviewCardProps {
  recipes: Recipe[];
  onPress: () => void;
}

const MAX_VISIBLE = 4;

export function RecipePreviewCard({ recipes, onPress }: RecipePreviewCardProps) {
  const theme = useTheme();
  const visible = recipes.slice(0, MAX_VISIBLE);
  const overflow = recipes.length - MAX_VISIBLE;

  return (
    <Pressable
      style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
      onPress={onPress}
    >
      <View style={styles.titleRow}>
        <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>Most Used</Text>
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
            <View
              key={recipe.id}
              style={[styles.recipeRow, { borderBottomColor: theme.border }]}
            >
              <View style={[styles.recipeDot, { backgroundColor: Colors.accent }]} />
              <Text style={[styles.recipeTitle, { color: theme.text }]} numberOfLines={1}>
                {recipe.title}
              </Text>
              {recipe.calories_per_serving != null && (
                <Text style={[styles.recipeCals, { color: theme.textSecondary }]}>
                  {Math.round(recipe.calories_per_serving)} cal
                </Text>
              )}
            </View>
          ))}
          {overflow > 0 && (
            <Text style={[styles.overflow, { color: Colors.accent }]}>
              +{overflow} more
            </Text>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
    gap: Spacing.sm,
    flex: 1,
  } as ViewStyle,
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as ViewStyle,
  cardTitle: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  } as TextStyle,
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
  recipeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
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
});
