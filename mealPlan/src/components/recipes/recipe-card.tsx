import { Pressable, View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { Image } from 'expo-image';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface RecipeCardData {
  id: number | string;
  title: string;
  image: string;
  readyInMinutes?: number;
  calories?: number;
  isSaved?: boolean;
}

interface RecipeCardProps {
  recipe: RecipeCardData;
  onPress: () => void;
}

export function RecipeCard({ recipe, onPress }: RecipeCardProps) {
  const theme = useTheme();

  return (
    <Pressable
      style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
      onPress={onPress}
    >
      {recipe.image ? (
        <Image source={{ uri: recipe.image }} style={styles.image} contentFit="cover" />
      ) : (
        <View style={[styles.imagePlaceholder, { backgroundColor: theme.border }]} />
      )}

      <View style={styles.body}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
          {recipe.title}
        </Text>

        <View style={styles.meta}>
          {recipe.readyInMinutes != null && recipe.readyInMinutes > 0 && (
            <Text style={[styles.metaText, { color: theme.textSecondary }]}>
              {recipe.readyInMinutes} min
            </Text>
          )}
          {recipe.calories != null && recipe.calories > 0 && (
            <Text style={[styles.metaText, { color: theme.textSecondary }]}>
              {recipe.calories} kcal
            </Text>
          )}
        </View>
      </View>

      {recipe.isSaved && (
        <View style={[styles.savedBadge, { backgroundColor: Colors.accent }]}>
          <Text style={styles.savedBadgeText}>Saved</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  } as ViewStyle,
  image: {
    width: '100%',
    height: 140,
  } as ViewStyle,
  imagePlaceholder: {
    width: '100%',
    height: 140,
  } as ViewStyle,
  body: {
    padding: Spacing.md,
    gap: Spacing.xs,
  } as ViewStyle,
  title: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    lineHeight: 22,
  } as TextStyle,
  meta: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  } as ViewStyle,
  metaText: {
    fontSize: FontSizes.sm,
  } as TextStyle,
  savedBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  } as ViewStyle,
  savedBadgeText: {
    color: '#FFFFFF',
    fontSize: FontSizes.xs,
    fontWeight: '700',
  } as TextStyle,
});
