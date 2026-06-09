import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type ThemeMode = 'light' | 'dark' | null;

interface PreferencesState {
  themeMode: ThemeMode;
}

const initialState: PreferencesState = {
  themeMode: null,
};

const preferencesSlice = createSlice({
  name: 'preferences',
  initialState,
  reducers: {
    setThemeMode(state, action: PayloadAction<ThemeMode>) {
      state.themeMode = action.payload;
    },
  },
});

export const { setThemeMode } = preferencesSlice.actions;
export default preferencesSlice.reducer;
