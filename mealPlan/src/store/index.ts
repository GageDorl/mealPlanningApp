import { configureStore } from '@reduxjs/toolkit';
import onboardingReducer from './slices/onboarding-slice';
import preferencesReducer from './slices/preferences-slice';
import recipeFormReducer from './slices/recipe-form-slice';
import searchReducer from './slices/search-slice';
import uiReducer from './slices/ui-slice';
import foodSuggestionsReducer from './slices/food-suggestions-slice';

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    search: searchReducer,
    recipeForm: recipeFormReducer,
    onboarding: onboardingReducer,
    preferences: preferencesReducer,
    foodSuggestions: foodSuggestionsReducer,
  },
  devTools: true,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
