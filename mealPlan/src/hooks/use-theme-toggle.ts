import { useDispatch, useSelector } from 'react-redux';
import { usePowerSync } from '@powersync/react-native';
import { getCachedUserId } from '@/services/supabase';
import { updateThemePreference } from '@/services/user-service';
import { setThemeMode, type ThemeMode } from '@/store/slices/preferences-slice';
import type { RootState } from '@/store';

export function useThemeToggle() {
  const dispatch = useDispatch();
  const db = usePowerSync();
  const themeMode = useSelector((state: RootState) => state.preferences.themeMode);

  const setTheme = async (mode: ThemeMode) => {
    dispatch(setThemeMode(mode));

    const userId = getCachedUserId();

    if (userId) {
      await updateThemePreference(db, userId, mode);
    }
  };

  return {
    themeMode,
    setTheme,
  };
}
