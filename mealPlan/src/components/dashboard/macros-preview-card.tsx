import { useState } from 'react';
import { Pressable, View, Text, StyleSheet, Platform, type ViewStyle, type TextStyle } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { layout } from '@/styles/layout';
import { surfaces } from '@/styles/surfaces';
import { typography } from '@/styles/typography';
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
  const [showRemaining, setShowRemaining] = useState(false);

  const calorieMacro = dailyProgress?.macros.find((m) => m.macro_name === 'calories');
  const otherMacros = dailyProgress?.macros.filter((m) => m.macro_name !== 'calories') ?? [];

  const handleExpandToggle = () => setExpanded((prev) => !prev);

  return (
    <View style={[surfaces.card, styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={layout.rowSpaceBetween}>
        <Pressable onPress={onPress}>
          <Text style={[typography.label, { color: theme.textSecondary }]}>Macros</Text>
        </Pressable>
        <View style={styles.headerRight}>
          <Pressable
            onPress={() => setShowRemaining((v) => !v)}
            style={[styles.viewToggle, { borderColor: theme.border }, showRemaining
              ? { backgroundColor: theme.backgroundSelected }
              : { backgroundColor: theme.backgroundElement, ...(Platform.OS !== 'web' && { elevation: 2 }), shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 2 }
            ]}
          >
            <Text style={[styles.viewToggleText, { color: theme.textSecondary }]}>
              {showRemaining ? 'Remaining' : 'Consumed'}
            </Text>
          </Pressable>
          <Pressable onPress={handleExpandToggle} hitSlop={12}>
            <Text style={[styles.chevron, { color: theme.textSecondary }]}>
              {expanded ? '▲' : '▼'}
            </Text>
          </Pressable>
        </View>
      </View>

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
              showRemaining={showRemaining}
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
                showRemaining={showRemaining}
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
    gap: Spacing.sm,
  } as ViewStyle,
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  } as ViewStyle,
  viewToggle: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingVertical: 3,
    paddingHorizontal: Spacing.sm,
  } as ViewStyle,
  viewToggleText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
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
