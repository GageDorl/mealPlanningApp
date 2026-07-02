import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { FoodSuggestion } from '@/services/food-suggestions-service';
import type { RootState } from '@/store';

export interface PendingLogSuggestion extends FoodSuggestion {
  pendingLabel: string
  pendingIcon: string | null
}

interface FoodSuggestionsState {
  suggestions: FoodSuggestion[];
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  loadedForDate: string | null;
  pendingLogSuggestion: PendingLogSuggestion | null;
}

const initialState: FoodSuggestionsState = {
  suggestions: [],
  status: 'idle',
  error: null,
  loadedForDate: null,
  pendingLogSuggestion: null,
};

const foodSuggestionsSlice = createSlice({
  name: 'foodSuggestions',
  initialState,
  reducers: {
    setLoading(state) {
      state.status = 'loading';
      state.error = null;
    },
    setSuggestions(state, action: PayloadAction<{ suggestions: FoodSuggestion[]; date: string }>) {
      state.suggestions = action.payload.suggestions;
      state.loadedForDate = action.payload.date;
      state.status = 'success';
      state.error = null;
    },
    setError(state, action: PayloadAction<string>) {
      state.status = 'error';
      state.error = action.payload;
    },
    clearSuggestions(state) {
      state.suggestions = [];
      state.status = 'idle';
      state.error = null;
    },
    setPendingLogSuggestion(state, action: PayloadAction<PendingLogSuggestion>) {
      state.pendingLogSuggestion = action.payload;
    },
    clearPendingLogSuggestion(state) {
      state.pendingLogSuggestion = null;
    },
  },
});

export const { setLoading, setSuggestions, setError, clearSuggestions, setPendingLogSuggestion, clearPendingLogSuggestion } = foodSuggestionsSlice.actions;
export default foodSuggestionsSlice.reducer;

export const selectSuggestions       = (s: RootState) => s.foodSuggestions.suggestions;
export const selectSuggestionsStatus = (s: RootState) => s.foodSuggestions.status;
export const selectSuggestionsError  = (s: RootState) => s.foodSuggestions.error;
export const selectLoadedForDate     = (s: RootState) => s.foodSuggestions.loadedForDate;
export const selectPendingLogSuggestion = (s: RootState) => s.foodSuggestions.pendingLogSuggestion;
