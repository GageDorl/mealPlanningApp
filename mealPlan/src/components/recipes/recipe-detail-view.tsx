import { type ReactElement } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { Image } from 'expo-image';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useState } from 'react';
import { scaleRecipe, formatQuantity, type ScalableIngredient, type ScalableMacros } from '@/utils/serving-scaler';

export interface RecipeDetailData {
  title: string;
  description?: string;
  image?: string;
  prepMinutes?: number;
  cookMinutes?: number;
  servings: number;
  difficulty?: 'easy' | 'medium' | 'hard' | null;
  cuisineType?: string | null;
  ingredients: ScalableIngredient[];
  instructions: string[];
  macros: ScalableMacros;
  dietaryTags?: string[];
}

interface RecipeDetailViewProps {
  recipe: RecipeDetailData;
  onServingsChange?: (servings: number) => void;
  refreshControl?: ReactElement;
}

const DIFFICULTY_LABELS = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
const DIFFICULTY_COLORS = { easy: '#34C759', medium: '#FFB800', hard: '#FF3B30' };

export function RecipeDetailView({ recipe, onServingsChange, refreshControl }: RecipeDetailViewProps) {
  const theme = useTheme();
  const [servings, setServings] = useState(recipe.servings);

  const scaled = scaleRecipe(recipe.ingredients, recipe.macros, recipe.servings, servings);

  function changeServings(delta: number) {
    const next = Math.max(1, servings + delta);
    setServings(next);
    onServingsChange?.(next);
  }

  const totalMinutes = (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} refreshControl={refreshControl}>
      {recipe.image ? (
        <Image source={{ uri: recipe.image }} style={styles.image} contentFit="cover" />
      ) : null}

      <View style={styles.content}>
        {/* Meta row */}
        <View style={styles.metaRow}>
          {totalMinutes > 0 && (
            <View style={[styles.metaChip, { backgroundColor: theme.backgroundElement }]}>
              <Text style={[styles.metaChipText, { color: theme.textSecondary }]}>
                {totalMinutes} min
              </Text>
            </View>
          )}
          {recipe.cuisineType && (
            <View style={[styles.metaChip, { backgroundColor: theme.backgroundElement }]}>
              <Text style={[styles.metaChipText, { color: theme.textSecondary }]}>
                {recipe.cuisineType}
              </Text>
            </View>
          )}
          {recipe.difficulty && (
            <View
              style={[
                styles.metaChip,
                { backgroundColor: DIFFICULTY_COLORS[recipe.difficulty] + '22' },
              ]}
            >
              <Text
                style={[
                  styles.metaChipText,
                  { color: DIFFICULTY_COLORS[recipe.difficulty] },
                ]}
              >
                {DIFFICULTY_LABELS[recipe.difficulty]}
              </Text>
            </View>
          )}
          {recipe.dietaryTags?.map((tag) => (
            <View key={tag} style={[styles.metaChip, { backgroundColor: Colors.accent + '22' }]}>
              <Text style={[styles.metaChipText, { color: Colors.accent }]}>{tag}</Text>
            </View>
          ))}
        </View>

        {recipe.description ? (
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            {recipe.description}
          </Text>
        ) : null}

        {/* Macros */}
        {(scaled.macros.calories_per_serving != null ||
          scaled.macros.protein_per_serving != null) && (
          <View style={[styles.macrosCard, { backgroundColor: theme.backgroundElement }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Nutrition</Text>
            <View style={styles.macrosGrid}>
              {scaled.macros.calories_per_serving != null && (
                <MacroCell label="Calories" value={scaled.macros.calories_per_serving} unit="kcal" theme={theme} />
              )}
              {scaled.macros.protein_per_serving != null && (
                <MacroCell label="Protein" value={scaled.macros.protein_per_serving} unit="g" theme={theme} />
              )}
              {scaled.macros.carbs_per_serving != null && (
                <MacroCell label="Carbs" value={scaled.macros.carbs_per_serving} unit="g" theme={theme} />
              )}
              {scaled.macros.fat_per_serving != null && (
                <MacroCell label="Fat" value={scaled.macros.fat_per_serving} unit="g" theme={theme} />
              )}
            </View>
          </View>
        )}

        {/* Serving adjuster */}
        <View style={styles.servingRow}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Servings</Text>
          <View style={styles.servingControls}>
            <Pressable
              style={[styles.servingBtn, { borderColor: theme.border }]}
              onPress={() => changeServings(-1)}
              hitSlop={8}
            >
              <Text style={[styles.servingBtnText, { color: theme.text }]}>−</Text>
            </Pressable>
            <Text style={[styles.servingCount, { color: theme.text }]}>{servings}</Text>
            <Pressable
              style={[styles.servingBtn, { borderColor: theme.border }]}
              onPress={() => changeServings(1)}
              hitSlop={8}
            >
              <Text style={[styles.servingBtnText, { color: theme.text }]}>+</Text>
            </Pressable>
          </View>
        </View>

        {/* Ingredients */}
        {scaled.ingredients.length > 0 && (
          <View>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Ingredients</Text>
            <View style={styles.ingredientList}>
              {scaled.ingredients.map((ing, i) => (
                <View key={i} style={[styles.ingredientRow, { borderBottomColor: theme.border }]}>
                  <View style={[styles.ingredientDot, { backgroundColor: Colors.accent }]} />
                  <Text style={[styles.ingredientText, { color: theme.text }]}>
                    {ing.scaledQuantity != null
                      ? `${formatQuantity(ing.scaledQuantity)}${ing.unit ? ' ' + ing.unit : ''} `
                      : ''}
                    <Text style={{ fontWeight: '600' }}>{ing.name}</Text>
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Instructions */}
        {recipe.instructions.length > 0 && (
          <View>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Instructions</Text>
            <View style={styles.instructionList}>
              {recipe.instructions.map((step, i) => (
                <View key={i} style={styles.instructionRow}>
                  <View style={[styles.stepNumber, { backgroundColor: Colors.accent }]}>
                    <Text style={styles.stepNumberText}>{i + 1}</Text>
                  </View>
                  <Text style={[styles.instructionText, { color: theme.text }]}>{step}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function MacroCell({
  label,
  value,
  unit,
  theme,
}: {
  label: string;
  value: number;
  unit: string;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={styles.macroCell}>
      <Text style={[styles.macroCellValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.macroCellUnit, { color: theme.textSecondary }]}>{unit}</Text>
      <Text style={[styles.macroCellLabel, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: Spacing.xxxl,
  } as ViewStyle,
  image: {
    width: '100%',
    height: 220,
  } as ViewStyle,
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  } as ViewStyle,
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  } as ViewStyle,
  metaChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  } as ViewStyle,
  metaChipText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    textTransform: 'capitalize',
  } as TextStyle,
  description: {
    fontSize: FontSizes.sm,
    lineHeight: 20,
  } as TextStyle,
  macrosCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.md,
  } as ViewStyle,
  macrosGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  } as ViewStyle,
  macroCell: {
    alignItems: 'center',
    gap: 2,
  } as ViewStyle,
  macroCellValue: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
  } as TextStyle,
  macroCellUnit: {
    fontSize: FontSizes.xs,
  } as TextStyle,
  macroCellLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '500',
  } as TextStyle,
  servingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as ViewStyle,
  servingControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  } as ViewStyle,
  servingBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  servingBtnText: {
    fontSize: FontSizes.lg,
    fontWeight: '400',
    lineHeight: 22,
  } as TextStyle,
  servingCount: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    minWidth: 28,
    textAlign: 'center',
  } as TextStyle,
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  } as TextStyle,
  ingredientList: {
    gap: 0,
  } as ViewStyle,
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,
  ingredientDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    flexShrink: 0,
  } as ViewStyle,
  ingredientText: {
    fontSize: FontSizes.sm,
    lineHeight: 20,
    flex: 1,
  } as TextStyle,
  instructionList: {
    gap: Spacing.md,
  } as ViewStyle,
  instructionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
  } as ViewStyle,
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: FontSizes.sm,
    fontWeight: '700',
  } as TextStyle,
  instructionText: {
    fontSize: FontSizes.sm,
    lineHeight: 22,
    flex: 1,
  } as TextStyle,
});
