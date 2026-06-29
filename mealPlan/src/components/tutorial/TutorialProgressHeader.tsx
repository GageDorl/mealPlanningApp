import { View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Colors, FontSizes, Spacing } from '@/constants/theme';

interface Props {
  chapterTitle: string;
  current: number;
  total: number;
}

export function TutorialProgressHeader({ chapterTitle, current, total }: Props) {
  const theme = useTheme();
  const progressPercent = `${Math.round((current / total) * 100)}%`;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.track, { backgroundColor: theme.border }]}>
        <View style={[styles.fill, { width: progressPercent, backgroundColor: Colors.accent }]} />
      </View>
      <Text style={[styles.label, { color: theme.textSecondary }]}>
        Chapter {current} of {total} · {chapterTitle}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  } as ViewStyle,
  track: {
    height: 3,
    borderRadius: 999,
    overflow: 'hidden',
  } as ViewStyle,
  fill: {
    height: 3,
    borderRadius: 999,
  } as ViewStyle,
  label: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  } as TextStyle,
});
