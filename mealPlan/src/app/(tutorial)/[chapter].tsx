import { useCallback } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { WoodTexture } from '@/components/WoodTexture';
import { TutorialProgressHeader } from '@/components/tutorial/TutorialProgressHeader';
import { TutorialChapterLayout } from '@/components/tutorial/TutorialChapterLayout';
import { useTutorial } from '@/hooks/use-tutorial';
import { getChapterById, getChapterIndex, getNextChapterId, CHAPTER_COUNT } from '@/constants/tutorial-chapters';

export default function TutorialChapterScreen() {
  const router = useRouter();
  const { chapter: chapterId, revisit } = useLocalSearchParams<{ chapter: string; revisit?: string }>();
  const { width, height } = useWindowDimensions();
  const { markChapterComplete, skipTutorial } = useTutorial();

  const chapter = getChapterById(chapterId ?? '');
  const chapterIndex = getChapterIndex(chapterId ?? '');
  const isRevisit = revisit === '1';

  const handleChapterComplete = useCallback(async () => {
    if (isRevisit) {
      router.back();
      return;
    }
    await markChapterComplete(chapterId ?? '');
    const nextId = getNextChapterId(chapterId ?? '');
    if (nextId) {
      router.push({ pathname: '/(tutorial)/[chapter]', params: { chapter: nextId } });
    } else {
      router.replace('/(tutorial)/complete');
    }
  }, [isRevisit, markChapterComplete, chapterId, router]);

  if (!chapter) return null;

  return (
    <View style={{ flex: 1 }}>
      <WoodTexture width={width} height={height} style={StyleSheet.absoluteFill} />
      <Stack.Screen options={{ headerShown: false }} />
      <TutorialProgressHeader
        chapterTitle={chapter.title}
        current={chapterIndex + 1}
        total={CHAPTER_COUNT}
      />
      <TutorialChapterLayout
        chapter={chapter}
        onChapterComplete={handleChapterComplete}
        onSkipTutorial={isRevisit ? undefined : skipTutorial}
      />
    </View>
  );
}
