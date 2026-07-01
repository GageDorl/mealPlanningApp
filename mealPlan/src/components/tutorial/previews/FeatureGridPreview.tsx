import { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { CalendarPreviewCard } from '@/components/dashboard/calendar-preview-card';
import { GroceryPreviewCard } from '@/components/dashboard/grocery-preview-card';
import { RecipePreviewCard } from '@/components/dashboard/recipe-preview-card';
import { MacrosPreviewCard } from '@/components/dashboard/macros-preview-card';
import type { Recipe } from '@/models/recipe';
import type { DailyMacroProgress } from '@/services/macro-service';
import type { TooltipData } from '@/types/tutorial';

const NOOP = () => {};

const FILLER_RECIPES: Recipe[] = [
  { id: '1', title: 'Chicken Stir Fry', servings: 4, source_type: 'user_created', is_favorited: false, is_offline_available: false, calories_per_serving: 520, protein_per_serving: 42, carbs_per_serving: 38, fat_per_serving: 14, created_at: '', updated_at: '' },
  { id: '2', title: 'Greek Salad', servings: 2, source_type: 'user_created', is_favorited: true, is_offline_available: false, calories_per_serving: 180, protein_per_serving: 8, carbs_per_serving: 12, fat_per_serving: 10, created_at: '', updated_at: '' },
  { id: '3', title: 'Oatmeal Bowl', servings: 1, source_type: 'user_created', is_favorited: false, is_offline_available: false, calories_per_serving: 320, protein_per_serving: 12, carbs_per_serving: 52, fat_per_serving: 8, created_at: '', updated_at: '' },
];

const FILLER_PROGRESS: DailyMacroProgress = {
  date: '2026-06-27',
  macros: [
    { macro_name: 'calories', label: 'Calories', current: 1450, goal: 2000, unit: 'kcal', percentage: 72.5, color: Colors.accent },
    { macro_name: 'protein',  label: 'Protein',  current: 95,   goal: 150,  unit: 'g',    percentage: 63.3, color: '#4A90E2' },
    { macro_name: 'carbs',    label: 'Carbs',    current: 145,  goal: 200,  unit: 'g',    percentage: 72.5, color: '#F5A623' },
    { macro_name: 'fat',      label: 'Fat',      current: 48,   goal: 65,   unit: 'g',    percentage: 73.8, color: '#7ED321' },
  ],
  meal_breakdown: [],
};

const TOOLTIP_STEPS = [
  {
    title: 'Calendar',
    body: 'Plan your meals for the week on an interactive time grid. Tap any slot to add a meal and assign a recipe.',
  },
  {
    title: 'Grocery',
    body: 'Your shopping list is built automatically from your meal plan each week. Check items off as you shop.',
  },
  {
    title: 'Recipes',
    body: 'Browse millions of recipes, import from any website URL, or build your own. Macros are totaled per serving automatically.',
  },
  {
    title: 'Macros',
    body: 'Track your daily calories and macro targets. Bento shows your progress and can suggest adjustments based on real data over time.',
  },
];

const HIGHLIGHT = { borderWidth: 2, borderColor: Colors.accent, borderRadius: BorderRadius.md } as ViewStyle;

interface Props {
  onTooltipChange?: (data: TooltipData | null) => void;
}

export function FeatureGridPreview({ onTooltipChange }: Props) {
  const [tooltipStep, setTooltipStep] = useState<number | null>(0);

  // Per-card measurements (relative to this component's root View)
  const [gridTop, setGridTop] = useState(0);
  const [gridBottom, setGridBottom] = useState(0);
  const [calBottom, setCalBottom] = useState(0);   // bottom-Y within leftCol
  const [calCX, setCalCX] = useState(0);           // center-X within leftCol (= preview since leftCol.x=0)
  const [grocBottom, setGrocBottom] = useState(0);
  const [grocCX, setGrocCX] = useState(0);
  const [recipeCX, setRecipeCX] = useState(0);    // center-X of rightCol within grid (grid.x=0 in preview)
  const [macrosBottom, setMacrosBottom] = useState(0);
  const [macrosCX, setMacrosCX] = useState(0);

  const advance = useCallback(() =>
    setTooltipStep((s) => (s !== null && s < TOOLTIP_STEPS.length - 1 ? s + 1 : null)), []);
  const dismiss = useCallback(() => setTooltipStep(null), []);

  // Derived tooltip position in this component's coordinate space
  const tooltipY =
    tooltipStep === 0 ? gridTop + calBottom :
    tooltipStep === 1 ? gridTop + grocBottom :
    tooltipStep === 2 ? gridBottom :
    macrosBottom;

  const tooltipCX =
    tooltipStep === 0 ? calCX :
    tooltipStep === 1 ? grocCX :
    tooltipStep === 2 ? recipeCX :
    macrosCX;

  useEffect(() => {
    if (tooltipStep === null || tooltipY === 0) {
      onTooltipChange?.(null);
      return;
    }
    onTooltipChange?.({
      step: tooltipStep,
      total: TOOLTIP_STEPS.length,
      title: TOOLTIP_STEPS[tooltipStep].title,
      body: TOOLTIP_STEPS[tooltipStep].body,
      relativeY: tooltipY,
      centerX: tooltipCX,
      onNext: advance,
      onDismiss: dismiss,
    });
  }, [tooltipStep, tooltipY, tooltipCX, onTooltipChange, advance, dismiss]);

  return (
    <View style={styles.container}>
      <View
        style={styles.grid}
        onLayout={(e) => {
          setGridTop(e.nativeEvent.layout.y);
          setGridBottom(e.nativeEvent.layout.y + e.nativeEvent.layout.height);
        }}
      >
        <View style={styles.leftCol}>
          <View
            style={tooltipStep === 0 ? HIGHLIGHT : undefined}
            onLayout={(e) => {
              setCalCX(e.nativeEvent.layout.x + e.nativeEvent.layout.width / 2);
              setCalBottom(e.nativeEvent.layout.y + e.nativeEvent.layout.height);
            }}
          >
            <CalendarPreviewCard onPress={NOOP} />
          </View>
          <View
            style={tooltipStep === 1 ? HIGHLIGHT : undefined}
            onLayout={(e) => {
              setGrocCX(e.nativeEvent.layout.x + e.nativeEvent.layout.width / 2);
              setGrocBottom(e.nativeEvent.layout.y + e.nativeEvent.layout.height);
            }}
          >
            <GroceryPreviewCard totalCount={8} checkedCount={5} onPress={NOOP} />
          </View>
        </View>
        <View
          style={[styles.rightCol, tooltipStep === 2 ? HIGHLIGHT : undefined]}
          onLayout={(e) => {
            setRecipeCX(e.nativeEvent.layout.x + e.nativeEvent.layout.width / 2);
          }}
        >
          <RecipePreviewCard recipes={FILLER_RECIPES} onRecipePress={NOOP} onViewAll={NOOP} />
        </View>
      </View>

      <View
        style={tooltipStep === 3 ? HIGHLIGHT : undefined}
        onLayout={(e) => {
          setMacrosCX(e.nativeEvent.layout.x + e.nativeEvent.layout.width / 2);
          setMacrosBottom(e.nativeEvent.layout.y + e.nativeEvent.layout.height);
        }}
      >
        <MacrosPreviewCard dailyProgress={FILLER_PROGRESS} onPress={NOOP} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  } as ViewStyle,
  grid: {
    flexDirection: 'row',
    gap: Spacing.md,
  } as ViewStyle,
  leftCol: {
    flex: 1,
    gap: Spacing.md,
  } as ViewStyle,
  rightCol: {
    flex: 1,
  } as ViewStyle,
});
