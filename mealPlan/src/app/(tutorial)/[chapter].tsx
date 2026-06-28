import { useEffect } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { useTutorial } from '@/hooks/use-tutorial';
import { getChapterById, getChapterIndex, getNextChapterId, CHAPTER_COUNT } from '@/constants/tutorial-chapters';
import { TutorialProgressHeader } from '@/components/tutorial/TutorialProgressHeader';
import { TutorialChapterLayout } from '@/components/tutorial/TutorialChapterLayout';

export default function TutorialChapterScreen() {
  const { chapter: chapterId, revisit } = useLocalSearchParams<{ chapter: string; revisit?: string }>();
  const isRevisit = revisit === '1';
  const router = useRouter();
  const theme = useTheme();
  const { markChapterComplete, skipTutorial } = useTutorial();

  const chapter = getChapterById(chapterId);
  const chapterIndex = getChapterIndex(chapterId);

  useEffect(() => {
    if (!chapter) router.replace('/(tutorial)' as any);
  }, [chapter, router]);

  if (!chapter) return null;

  const handleChapterComplete = async () => {
    if (isRevisit) {
      router.back();
      return;
    }
    await markChapterComplete(chapterId);
    const nextId = getNextChapterId(chapterId);
    if (nextId) {
      router.push({ pathname: '/(tutorial)/[chapter]', params: { chapter: nextId } });
    } else {
      router.replace('/(tutorial)/complete');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {!isRevisit && <Stack.Screen options={{ headerLeft: () => null }} />}
      <TutorialProgressHeader
        chapterTitle={chapter.title}
        current={chapterIndex + 1}
        total={CHAPTER_COUNT}
      />
      <TutorialChapterLayout
        chapter={chapter}
        onChapterComplete={handleChapterComplete}
        onSkipTutorial={skipTutorial}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  } as ViewStyle,
});
