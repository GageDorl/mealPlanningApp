import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useRefresh } from '@/contexts/refresh-context';

export function useSetPageRefresh(fn: () => Promise<void>) {
  const { registerRefresh } = useRefresh();
  useFocusEffect(
    useCallback(() => {
      registerRefresh(fn);
    }, [fn, registerRefresh]),
  );
}
