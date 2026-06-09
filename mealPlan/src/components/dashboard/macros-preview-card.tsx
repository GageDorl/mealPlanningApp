import { useState } from 'react';
import { Pressable, View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ProgressRing } from '@/components/macros/progress-ring';
import { MacroProgressBar } from '@/components/macros/macro-progress-bar';
import type { DailyMacroProgress } from '@/services/macro-service';

interface MacrosPreviewCardProps {
  dailyProgress: DailyMacroProgress | null;
  onPress: () => void;
}

const MACRO_COLORS: Record<string, string> = {
  calories: Colors.accent,
  protein: '#4A90E2',
  carbs: '#F5A623',
  fat: '#7ED321',
  fiber: '#9B59B6',
  sugar: '#E91E63',
  sodium: '#00BCD4',
};

export function MacrosPreviewCard({ dailyProgress, onPress }: MacrosPreviewCardProps) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  const calorieMacro = dailyProgress?.macros.find((m) => m.macro_name === 'calories');
  const otherMacros = dailyProgress?.macros.filter((m) => m.macro_name !== 'calories') ?? [];

  const handleExpandToggle = () => setExpanded((prev) => !prev);

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <Pressable style={styles.header} onPress={onPress}>
        <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>Macros</Text>
        <Pressable onPress={handleExpandToggle} hitSlop={12}>
          <Text style={[styles.chevron, { color: theme.textSecondary }]}>
            {expanded ? '▲' : '▼'}
          </Text>
        </Pressable>
      </Pressable>

      {!expanded ? (
        <Pressable style={styles.compactContent} onPress={onPress}>
          {calorieMacro ? (
            <ProgressRing
              current={calorieMacro.current}
              goal={calorieMacro.goal}
              unit={calorieMacro.unit}
              label="Calories"
              color={Colors.accent}
              size={88}
            />
          ) : (
            <View style={styles.noGoalsState}>
              <Text style={[styles.noGoalsText, { color: theme.textSecondary }]}>
                Set macro goals to track progress
              </Text>
            </View>
          )}
        </Pressable>
      ) : (
        <View style={styles.expandedContent}>
          {dailyProgress && dailyProgress.macros.length > 0 ? (
            dailyProgress.macros.map((macro) => (
              <MacroProgressBar
                key={macro.macro_name}
                label={macro.label}
                current={macro.current}
                goal={macro.goal}
                unit={macro.unit}
                color={MACRO_COLORS[macro.macro_name] ?? Colors.accent}
              />
            ))
          ) : (
            <Text style={[styles.noGoalsText, { color: theme.textSecondary }]}>
              Set macro goals in your profile to start tracking.
            </Text>
          )}
          {otherMacros.length > 0 && (
            <Pressable style={styles.detailLink} onPress={onPress}>
              <Text style={[styles.detailLinkText, { color: Colors.accent }]}>
                View full breakdown →
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
    gap: Spacing.sm,
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as ViewStyle,
  cardTitle: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  } as TextStyle,
  chevron: {
    fontSize: 10,
    fontWeight: '600',
  } as TextStyle,
  compactContent: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  } as ViewStyle,
  expandedContent: {
    gap: Spacing.md,
  } as ViewStyle,
  noGoalsState: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  } as ViewStyle,
  noGoalsText: {
    fontSize: FontSizes.sm,
    textAlign: 'center',
  } as TextStyle,
  detailLink: {
    alignItems: 'flex-end',
    marginTop: Spacing.xs,
  } as ViewStyle,
  detailLinkText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  } as TextStyle,
});
