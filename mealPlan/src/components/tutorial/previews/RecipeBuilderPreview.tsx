import { View, Text, Pressable, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { IngredientInput, type IngredientInputValue } from '@/components/recipes/ingredient-input';

const NOOP = () => {};
const NOOP_CHANGE = (_val: IngredientInputValue) => {};

// Pre-filled ingredients with macros already computed so IngredientInput renders the macro row
const FILLER_INGREDIENTS = [
  {
    name: 'Chicken breast',
    quantity: '200',
    unit: 'g',
    macros: { calories: 220, protein: 41, carbs: 0, fat: 5 },
  },
  {
    name: 'Brown rice',
    quantity: '80',
    unit: 'g',
    macros: { calories: 290, protein: 6, carbs: 62, fat: 2 },
  },
  {
    name: 'Olive oil',
    quantity: '1',
    unit: 'tbsp',
    macros: { calories: 120, protein: 0, carbs: 0, fat: 14 },
  },
];

const TOTALS = { calories: 630, protein: 47, carbs: 62, fat: 21 };

export function RecipeBuilderPreview() {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      {/* Section header — matches create.tsx sectionLabel style */}
      <Text style={[styles.sectionLabel, { color: theme.text }]}>Ingredients</Text>

      {/* Real IngredientInput components — pointerEvents=none keeps them non-interactive */}
      {FILLER_INGREDIENTS.map((ing, idx) => (
        <View key={ing.name} pointerEvents="none">
          <IngredientInput
            index={idx}
            value={ing}
            onChange={NOOP_CHANGE}
          />
        </View>
      ))}

      {/* Add ingredient button — matches create.tsx addBtn style */}
      <Pressable style={[styles.addBtn, { borderColor: theme.border }]} onPress={NOOP}>
        <Text style={[styles.addBtnText, { color: Colors.accent }]}>+ Add Ingredient</Text>
      </Pressable>

      {/* Macro summary — matches create.tsx macroSummary style */}
      <View style={[styles.macroSummary, { backgroundColor: theme.backgroundElement }]}>
        <Text style={[styles.macroSummaryLabel, { color: theme.textSecondary }]}>
          Total macros (2 servings)
        </Text>
        <View style={styles.macroSummaryRow}>
          <MacroChip label="cal" value={TOTALS.calories} theme={theme} highlight />
          <MacroChip label="P" value={TOTALS.protein} unit="g" theme={theme} />
          <MacroChip label="C" value={TOTALS.carbs} unit="g" theme={theme} />
          <MacroChip label="F" value={TOTALS.fat} unit="g" theme={theme} />
        </View>
        <Text style={[styles.perServingNote, { color: theme.textSecondary }]}>
          ~{Math.round(TOTALS.calories / 2)} cal / serving
        </Text>
      </View>
    </View>
  );
}

function MacroChip({
  label,
  value,
  unit,
  theme,
  highlight,
}: {
  label: string;
  value: number;
  unit?: string;
  theme: ReturnType<typeof useTheme>;
  highlight?: boolean;
}) {
  return (
    <View style={styles.macroChip}>
      <Text style={[styles.macroChipValue, { color: highlight ? Colors.accent : theme.text }]}>
        {value}{unit}
      </Text>
      <Text style={[styles.macroChipLabel, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  } as ViewStyle,
  sectionLabel: {
    fontSize: FontSizes.md,
    fontWeight: '700',
  } as TextStyle,
  addBtn: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  } as ViewStyle,
  addBtnText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  } as TextStyle,
  macroSummary: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  } as ViewStyle,
  macroSummaryLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,
  macroSummaryRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  } as ViewStyle,
  macroChip: {
    alignItems: 'center',
  } as ViewStyle,
  macroChipValue: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
  } as TextStyle,
  macroChipLabel: {
    fontSize: FontSizes.xs,
  } as TextStyle,
  perServingNote: {
    fontSize: FontSizes.xs,
    fontStyle: 'italic',
  } as TextStyle,
});
