import { ScrollView, View, Text, Pressable, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { Colors, FontSizes, Spacing, BorderRadius, MaxContentWidth } from '@/constants/theme';
import { useTutorial } from '@/hooks/use-tutorial';
import { TUTORIAL_CHAPTERS } from '@/constants/tutorial-chapters';

export default function TutorialIndexScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { tutorialCompleted, isChapterComplete, nextIncompleteChapter, skipTutorial } = useTutorial();

  const revisit = tutorialCompleted;
  const anyStarted = TUTORIAL_CHAPTERS.some((c) => isChapterComplete(c.id));
  const nextChapterId = nextIncompleteChapter() ?? TUTORIAL_CHAPTERS[0].id;

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.content, { maxWidth: MaxContentWidth, alignSelf: 'center', width: '100%' }]}>

        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>
            {revisit ? 'Review the tutorial' : 'Get started with Prepd'}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {revisit
              ? 'Tap any chapter to revisit it.'
              : 'Five short chapters to help you make the most of the app.'}
          </Text>
        </View>

        <View style={[styles.chapterList, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
          {TUTORIAL_CHAPTERS.map((chapter, index) => {
            const complete = isChapterComplete(chapter.id);
            const last = index === TUTORIAL_CHAPTERS.length - 1;
            return (
              <Pressable
                key={chapter.id}
                onPress={() =>
                  router.push({
                    pathname: '/(tutorial)/[chapter]',
                    params: { chapter: chapter.id, ...(revisit && { revisit: '1' }) },
                  })
                }
                style={({ pressed }) => [
                  styles.chapterRow,
                  !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.border },
                  pressed && { backgroundColor: theme.backgroundSelected },
                ]}
              >
                <Text style={styles.chapterIcon}>{chapter.icon}</Text>
                <View style={styles.chapterBody}>
                  <Text style={[styles.chapterTitle, { color: theme.text }]}>{chapter.title}</Text>
                  <Text style={[styles.chapterMeta, { color: theme.textSecondary }]}>
                    {chapter.estimatedMinutes} min
                  </Text>
                </View>
                {complete ? (
                  <Text style={[styles.checkmark, { color: Colors.accent }]}>✓</Text>
                ) : (
                  <Text style={[styles.chapterNum, { color: theme.textSecondary }]}>{index + 1}</Text>
                )}
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={() =>
            router.push({
              pathname: '/(tutorial)/[chapter]',
              params: { chapter: nextChapterId, ...(revisit && { revisit: '1' }) },
            })
          }
          style={({ pressed }) => [styles.startButton, pressed && styles.startButtonPressed]}
        >
          <Text style={styles.startButtonText}>
            {revisit ? 'Review Tutorial' : anyStarted ? 'Resume Tutorial' : 'Start Tutorial'}
          </Text>
        </Pressable>

        {!revisit && (
          <Pressable onPress={skipTutorial} style={styles.skipLink} hitSlop={8}>
            <Text style={[styles.skipText, { color: theme.textSecondary }]}>Skip Tutorial</Text>
          </Pressable>
        )}

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  } as ViewStyle,
  content: {
    gap: Spacing.xl,
  } as ViewStyle,
  header: {
    gap: Spacing.sm,
  } as ViewStyle,
  title: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
  } as TextStyle,
  subtitle: {
    fontSize: FontSizes.md,
    lineHeight: 22,
  } as TextStyle,
  chapterList: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  } as ViewStyle,
  chapterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    minHeight: 60,
  } as ViewStyle,
  chapterIcon: {
    fontSize: 22,
    width: 32,
    textAlign: 'center',
  } as TextStyle,
  chapterBody: {
    flex: 1,
    gap: 2,
  } as ViewStyle,
  chapterTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  } as TextStyle,
  chapterMeta: {
    fontSize: FontSizes.sm,
  } as TextStyle,
  checkmark: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    width: 24,
    textAlign: 'center',
  } as TextStyle,
  chapterNum: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    width: 24,
    textAlign: 'center',
  } as TextStyle,
  startButton: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    minHeight: 52,
  } as ViewStyle,
  startButtonPressed: {
    opacity: 0.85,
  } as ViewStyle,
  startButtonText: {
    color: '#FFFFFF',
    fontSize: FontSizes.md,
    fontWeight: '700',
  } as TextStyle,
  skipLink: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  } as ViewStyle,
  skipText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    textDecorationLine: 'underline',
  } as TextStyle,
});
