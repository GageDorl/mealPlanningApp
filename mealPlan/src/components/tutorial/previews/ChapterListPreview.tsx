import { View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { TUTORIAL_CHAPTERS } from '@/constants/tutorial-chapters';

export function ChapterListPreview() {
  const theme = useTheme();
  return (
    <View style={[styles.list, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      {TUTORIAL_CHAPTERS.map((chapter, i) => {
        const last = i === TUTORIAL_CHAPTERS.length - 1;
        return (
          <View
            key={chapter.id}
            style={[
              styles.row,
              !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.border },
            ]}
          >
            <Text style={styles.icon}>{chapter.icon}</Text>
            <Text style={[styles.title, { color: theme.text }]}>{chapter.title}</Text>
            <Text style={[styles.time, { color: theme.textSecondary }]}>{chapter.estimatedMinutes} min</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  } as ViewStyle,
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    minHeight: 40,
  } as ViewStyle,
  icon: {
    fontSize: 16,
    width: 24,
    textAlign: 'center',
  } as TextStyle,
  title: {
    flex: 1,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  } as TextStyle,
  time: {
    fontSize: FontSizes.xs,
  } as TextStyle,
});
