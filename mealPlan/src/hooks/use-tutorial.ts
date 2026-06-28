import { useCallback } from 'react';
import { usePowerSync } from '@powersync/react-native';
import { useRouter } from 'expo-router';
import { useUserProfile } from '@/hooks/use-user-profile';
import { getCachedUserId } from '@/services/supabase';
import { updateTutorialChapters, completeTutorialProgress } from '@/services/user-service';
import { TUTORIAL_CHAPTERS } from '@/constants/tutorial-chapters';

export function useTutorial() {
  const db = usePowerSync();
  const router = useRouter();
  const { profile } = useUserProfile();
  const userId = getCachedUserId() ?? '';

  const completedChapters = profile?.user.tutorial_chapters_completed ?? [];
  const tutorialCompleted = profile?.user.tutorial_completed ?? false;

  const isChapterComplete = useCallback(
    (chapterId: string) => completedChapters.includes(chapterId),
    [completedChapters],
  );

  const nextIncompleteChapter = useCallback((): string | null => {
    const next = TUTORIAL_CHAPTERS.find((c) => !completedChapters.includes(c.id));
    return next?.id ?? null;
  }, [completedChapters]);

  const markChapterComplete = useCallback(async (chapterId: string) => {
    if (!userId || completedChapters.includes(chapterId)) return;
    await updateTutorialChapters(db, userId, [...completedChapters, chapterId]);
  }, [db, userId, completedChapters]);

  const completeTutorial = useCallback(async () => {
    if (!userId) return;
    await completeTutorialProgress(db, userId);
    router.replace('/(tabs)');
  }, [db, userId, router]);

  const skipTutorial = useCallback(async () => {
    if (!userId) return;
    await completeTutorialProgress(db, userId);
    router.replace('/(tabs)');
  }, [db, userId, router]);

  return {
    completedChapters,
    tutorialCompleted,
    isChapterComplete,
    nextIncompleteChapter,
    markChapterComplete,
    completeTutorial,
    skipTutorial,
  };
}
