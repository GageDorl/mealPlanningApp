import { useDispatch, useSelector } from 'react-redux';
import { supabase } from '@/services/supabase';
import { updateThemePreference } from '@/services/user-service';
import { setThemeMode, type ThemeMode } from '@/store/slices/preferences-slice';
import type { RootState } from '@/store';

export function useThemeToggle() {
  const dispatch = useDispatch();
  const themeMode = useSelector((state: RootState) => state.preferences.themeMode);

  const setTheme = async (mode: ThemeMode) => {
    dispatch(setThemeMode(mode));

    const sessionResult = await supabase.auth.getSession();
    const userId = sessionResult.data.session?.user.id;

    if (userId) {
      await updateThemePreference(userId, mode);
    }
  };

  return {
    themeMode,
    setTheme,
  };
}
