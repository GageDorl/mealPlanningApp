import { useState, useCallback, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/hooks/use-theme';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { Input } from '@/components/ui/input';
import { IconPicker } from '@/components/ui/icon-picker';
import { LogFoodForm } from '@/components/calendar/log-food-form';
import type { TooltipData } from '@/types/tutorial';

const NOOP = () => {};
const QUICK_LABELS = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Post-workout'];

const FILLER_RECIPES = [
  { title: 'Chicken & Rice Bowl', kcal: 520, prep: '25 min' },
  { title: 'Oatmeal with Berries', kcal: 340, prep: '10 min' },
  { title: 'Salmon Salad', kcal: 390, prep: '15 min' },
];

const TOOLTIPS = [
  {
    title: 'Plan or Log',
    body: "Choose 'Plan a Recipe' to schedule a meal on your calendar. Choose 'Log Food' to record what you've eaten. Both options track your macros for the day.",
  },
  {
    title: 'Name & time',
    body: 'Quick-pick buttons fill the label instantly. The time determines where the block sits on your calendar grid.',
  },
  {
    title: 'Choose a recipe',
    body: "Search your saved recipes or millions from Spoonacular. Picking one pulls its macros into your daily totals automatically.",
  },
  {
    title: 'Log Food',
    body: "Try searching for something — results come from your food library, the Prepd community, and FatSecret's database. Switch to Manual to enter nutrition info yourself.",
  },
];

const TOTAL = TOOLTIPS.length;

interface Props {
  onTooltipChange?: (data: TooltipData | null) => void;
}

export function AddMealSlotPreview({ onTooltipChange }: Props) {
  const theme = useTheme();
  const [step, setStep] = useState(1);
  const [tooltipVisible, setTooltipVisible] = useState(true);
  const [contentBottom, setContentBottom] = useState(0);
  const [contentCX, setContentCX] = useState(0);

  const advance = useCallback(() => setStep((s) => Math.min(s + 1, TOTAL)), []);
  const goToStep = (n: number) => { setStep(n); setTooltipVisible(true); };
  const dismiss = useCallback(() => setTooltipVisible(false), []);

  const trackBottom = (e: { nativeEvent: { layout: { x: number; y: number; width: number; height: number } } }) => {
    setContentBottom(e.nativeEvent.layout.y + e.nativeEvent.layout.height);
    setContentCX(e.nativeEvent.layout.x + e.nativeEvent.layout.width / 2);
  };

  const hlStyle = [styles.highlight, { borderColor: tooltipVisible ? Colors.accent : 'transparent' }];

  useEffect(() => {
    if (!tooltipVisible || contentBottom === 0) {
      onTooltipChange?.(null);
      return;
    }
    onTooltipChange?.({
      step: step - 1,
      total: TOTAL,
      title: TOOLTIPS[step - 1].title,
      body: TOOLTIPS[step - 1].body,
      relativeY: contentBottom,
      centerX: contentCX,
      onNext: advance,
      onDismiss: dismiss,
    });
  }, [step, tooltipVisible, contentBottom, contentCX, onTooltipChange, advance, dismiss]);

  return (
    <View style={styles.container}>
      {/* Step dots — tappable to re-open a tip */}
      <View style={styles.stepIndicator}>
        {Array.from({ length: TOTAL }, (_, i) => i + 1).map((n) => (
          <Pressable key={n} onPress={() => goToStep(n)} hitSlop={8}>
            <View
              style={[
                styles.stepDot,
                { backgroundColor: n === step ? Colors.accent : theme.border },
                n === step && styles.stepDotActive,
              ]}
            />
          </Pressable>
        ))}
      </View>

      {/* ── Step 1: Choose Plan or Log ── */}
      {step === 1 && (
        <View style={styles.stepContent} onLayout={trackBottom}>
          <Text style={[styles.stepTitle, { color: theme.text }]}>What would you like to add?</Text>
          <View style={hlStyle}>
            <View style={styles.typeCards}>
              <View style={[styles.typeCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                <Ionicons name="restaurant-outline" size={26} color={Colors.accent} />
                <Text style={[styles.typeCardTitle, { color: theme.text }]}>Plan a Recipe</Text>
                <Text style={[styles.typeCardSub, { color: theme.textSecondary }]}>Schedule a recipe on your calendar</Text>
              </View>
              <View style={[styles.typeCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                <Ionicons name="nutrition-outline" size={26} color={Colors.accent} />
                <Text style={[styles.typeCardTitle, { color: theme.text }]}>Log Food</Text>
                <Text style={[styles.typeCardSub, { color: theme.textSecondary }]}>Track what you ate or are eating</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* ── Step 2: Name, icon, time ── */}
      {step === 2 && (
        <View style={styles.stepContent} onLayout={trackBottom}>
          <Text style={[styles.stepTitle, { color: theme.text }]}>Name your meal slot</Text>
          <IconPicker value="Sandwich" onChange={NOOP} />
          <View style={hlStyle}>
            <View style={styles.chipRow}>
              {QUICK_LABELS.map((lbl) => (
                <View
                  key={lbl}
                  style={[
                    styles.chip,
                    { borderColor: lbl === 'Lunch' ? Colors.accent : theme.border },
                    lbl === 'Lunch' && { backgroundColor: Colors.accent },
                  ]}
                >
                  <Text style={[styles.chipText, { color: lbl === 'Lunch' ? '#fff' : theme.text }]}>{lbl}</Text>
                </View>
              ))}
            </View>
            <Input value="Lunch" onChangeText={NOOP} editable={false} />
          </View>
          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Time</Text>
          <View style={styles.timeRow}>
            <Input value="12" onChangeText={NOOP} editable={false} style={styles.timeInput} containerStyle={styles.timeInputWrap} />
            <Text style={[styles.colon, { color: theme.text }]}>:</Text>
            <Input value="30" onChangeText={NOOP} editable={false} style={styles.timeInput} containerStyle={styles.timeInputWrap} />
            <View style={[styles.periodToggle, { borderColor: Colors.accent }]}>
              <View style={styles.periodBtn}>
                <Text style={[styles.periodText, { color: Colors.accent }]}>AM</Text>
              </View>
              <View style={[styles.periodBtn, styles.periodBtnActive]}>
                <Text style={[styles.periodText, styles.periodTextActive]}>PM</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* ── Step 3: Choose a recipe ── */}
      {step === 3 && (
        <View style={styles.stepContent} onLayout={trackBottom}>
          <Text style={[styles.stepTitle, { color: theme.text }]}>Choose a Recipe</Text>
          <View style={[styles.searchBar, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
            <Ionicons name="search-outline" size={14} color={theme.textSecondary} />
            <Text style={[styles.searchPlaceholder, { color: theme.textSecondary }]}>Search saved &amp; Spoonacular…</Text>
          </View>
          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Most Used</Text>
          <View style={hlStyle}>
            <View style={[styles.resultList, { borderColor: theme.border }]}>
              {FILLER_RECIPES.map((r, i) => (
                <View
                  key={r.title}
                  style={[styles.resultRow, { borderBottomColor: theme.border }, i === FILLER_RECIPES.length - 1 && { borderBottomWidth: 0 }]}
                >
                  <View style={styles.resultInfo}>
                    <Text style={[styles.resultTitle, { color: theme.text }]} numberOfLines={1}>{r.title}</Text>
                    <Text style={[styles.resultMeta, { color: theme.textSecondary }]}>{r.kcal} kcal · {r.prep}</Text>
                  </View>
                  <Text style={[styles.chevron, { color: theme.textSecondary }]}>›</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* ── Step 4: real LogFoodForm ── */}
      {step === 4 && (
        <View onLayout={trackBottom}>
          <LogFoodForm showLabelAndTime={false} onSubmit={() => {}} onCancel={NOOP} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  } as ViewStyle,
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xs,
  } as ViewStyle,
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  } as ViewStyle,
  stepDotActive: {
    width: 18,
    borderRadius: 3,
  } as ViewStyle,

  highlight: {
    borderWidth: 2,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xs,
  } as ViewStyle,

  stepContent: {
    gap: Spacing.sm,
  } as ViewStyle,
  stepTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
  } as TextStyle,

  // Step 1
  typeCards: {
    flexDirection: 'row',
    gap: Spacing.sm,
  } as ViewStyle,
  typeCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.xs,
  } as ViewStyle,
  typeCardTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
  } as TextStyle,
  typeCardSub: {
    fontSize: FontSizes.xs,
    lineHeight: 16,
  } as TextStyle,

  // Step 2
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  } as ViewStyle,
  chip: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  } as ViewStyle,
  chipText: {
    fontSize: FontSizes.xs,
    fontWeight: '500',
  } as TextStyle,
  fieldLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  } as ViewStyle,
  timeInput: {
    textAlign: 'center',
  } as TextStyle,
  timeInputWrap: {
    width: 52,
  } as ViewStyle,
  colon: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
  } as TextStyle,
  periodToggle: {
    flexDirection: 'row',
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    borderWidth: 1,
    marginLeft: Spacing.sm,
  } as ViewStyle,
  periodBtn: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  } as ViewStyle,
  periodBtnActive: {
    backgroundColor: Colors.accent,
  } as ViewStyle,
  periodText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  } as TextStyle,
  periodTextActive: {
    color: '#fff',
  } as TextStyle,

  // Step 3
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  } as ViewStyle,
  searchPlaceholder: {
    fontSize: FontSizes.sm,
  } as TextStyle,
  resultList: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  } as ViewStyle,
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,
  resultInfo: {
    flex: 1,
  } as ViewStyle,
  resultTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
  } as TextStyle,
  resultMeta: {
    fontSize: FontSizes.xs,
    marginTop: 2,
  } as TextStyle,
  chevron: {
    fontSize: 18,
    paddingLeft: Spacing.sm,
  } as TextStyle,
});
