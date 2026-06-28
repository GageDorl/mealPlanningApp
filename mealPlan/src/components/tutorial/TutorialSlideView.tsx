import { useState, useCallback } from 'react';
import { ScrollView, View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { TooltipCard } from '@/components/tutorial/TooltipCard';
import type { InfoSlide, TooltipData } from '@/types/tutorial';
import { WelcomeSplashPreview } from './previews/WelcomeSplashPreview';
import { FeatureGridPreview } from './previews/FeatureGridPreview';
import { ChapterListPreview } from './previews/ChapterListPreview';
import { MacroBreakdownPreview } from './previews/MacroBreakdownPreview';
import { DashboardPreview } from './previews/DashboardPreview';
import { FoodLogPreview } from './previews/FoodLogPreview';
import { RecalibrationPreview } from './previews/RecalibrationPreview';
import { WeeklyCalendarPreview } from './previews/WeeklyCalendarPreview';
import { AddMealSlotPreview } from './previews/AddMealSlotPreview';
import { AssignRecipePreview } from './previews/AssignRecipePreview';
import { AdjustServingsPreview } from './previews/AdjustServingsPreview';
import { CalendarSyncPreview } from './previews/CalendarSyncPreview';
import { RecipeLibraryPreview } from './previews/RecipeLibraryPreview';
import { RecipeSearchPreview } from './previews/RecipeSearchPreview';
import { RecipeImportPreview } from './previews/RecipeImportPreview';
import { RecipeBuilderPreview } from './previews/RecipeBuilderPreview';
import { GroceryGeneratedPreview } from './previews/GroceryGeneratedPreview';
import { GroceryPantryPreview } from './previews/GroceryPantryPreview';
import { GroceryChecklistPreview } from './previews/GroceryChecklistPreview';
import { GroceryRegeneratePreview } from './previews/GroceryRegeneratePreview';

interface Props {
  slide: InfoSlide;
}

function resolveIllustration(
  key: string,
  onTooltipChange: (data: TooltipData | null) => void,
): React.ReactNode {
  switch (key) {
    case 'welcome-splash': return <WelcomeSplashPreview />;
    case 'feature-grid': return <FeatureGridPreview onTooltipChange={onTooltipChange} />;
    case 'chapter-list': return <ChapterListPreview />;
    case 'macro-breakdown': return <MacroBreakdownPreview />;
    case 'macro-dashboard': return <DashboardPreview />;
    case 'food-log': return <FoodLogPreview />;
    case 'recalibration': return <RecalibrationPreview />;
    case 'weekly-calendar': return <WeeklyCalendarPreview />;
    case 'add-meal-slot': return <AddMealSlotPreview onTooltipChange={onTooltipChange} />;
    case 'assign-recipe': return <AssignRecipePreview />;
    case 'adjust-servings': return <AdjustServingsPreview />;
    case 'calendar-sync': return <CalendarSyncPreview />;
    case 'recipe-library': return <RecipeLibraryPreview />;
    case 'recipe-search': return <RecipeSearchPreview />;
    case 'recipe-import': return <RecipeImportPreview />;
    case 'recipe-builder': return <RecipeBuilderPreview />;
    case 'grocery-generated': return <GroceryGeneratedPreview />;
    case 'grocery-pantry': return <GroceryPantryPreview />;
    case 'grocery-checklist': return <GroceryChecklistPreview />;
    case 'grocery-regenerate': return <GroceryRegeneratePreview />;
    default: return null;
  }
}

export function TutorialSlideView({ slide }: Props) {
  const theme = useTheme();
  // illustration View's position within the ScrollView content (measured via onLayout)
  const [illustrationLayout, setIllustrationLayout] = useState({ x: 0, y: 0 });
  const [activeTooltip, setActiveTooltip] = useState<TooltipData | null>(null);

  const handleTooltipChange = useCallback((data: TooltipData | null) => {
    setActiveTooltip(data);
  }, []);

  const illustration = slide.illustrationKey
    ? resolveIllustration(slide.illustrationKey, handleTooltipChange)
    : null;

  // Tooltip Y in ScrollView content = illustration's top-Y + element's bottom-Y within preview
  const tooltipTop = activeTooltip
    ? illustrationLayout.y + activeTooltip.relativeY
    : 0;

  // Arrow left = illustration's left-X offset + element center-X within preview, minus half arrow width,
  // minus TooltipCard's marginHorizontal (Spacing.md) since arrowLeft is relative to the wrapper's content edge
  const arrowLeft = activeTooltip
    ? illustrationLayout.x + activeTooltip.centerX - 8 - Spacing.md
    : undefined;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[styles.illustration, !illustration && styles.illustrationPlaceholder, !illustration && { backgroundColor: `${Colors.accent}1A` }]}
        onLayout={(e) => setIllustrationLayout({ x: e.nativeEvent.layout.x, y: e.nativeEvent.layout.y })}
      >
        {illustration}
      </View>
      <Text style={[styles.title, { color: theme.text }]}>{slide.title}</Text>
      <Text style={[styles.body, { color: theme.textSecondary }]}>{slide.body}</Text>

      {/* Rendered last → on top of title/body; absolute → no layout impact */}
      {activeTooltip !== null && tooltipTop > 0 && (
        <View style={{ position: 'absolute', top: tooltipTop, left: 0, right: 0 }}>
          <TooltipCard
            step={activeTooltip.step}
            total={activeTooltip.total}
            title={activeTooltip.title}
            body={activeTooltip.body}
            onNext={activeTooltip.onNext}
            onDismiss={activeTooltip.onDismiss}
            arrowLeft={arrowLeft}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  } as ViewStyle,
  container: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    flexGrow: 1,
  } as ViewStyle,
  illustration: {
    minHeight: 180,
    marginBottom: Spacing.xxl,
  } as ViewStyle,
  illustrationPlaceholder: {
    borderRadius: BorderRadius.lg,
  } as ViewStyle,
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    marginBottom: Spacing.md,
  } as TextStyle,
  body: {
    fontSize: FontSizes.md,
    lineHeight: 24,
    fontWeight: '500',
  } as TextStyle,
});
