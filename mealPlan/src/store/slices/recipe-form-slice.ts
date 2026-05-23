import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface IngredientInput {
  id: string;
  name: string;
  quantity: number;
  unit: string;
}

interface RecipeFormState {
  title: string;
  description: string;
  servings: number;
  ingredients: IngredientInput[];
  steps: string[];
  sourceUrl: string;
  tags: string[];
  loading: boolean;
}

const initialState: RecipeFormState = {
  title: '',
  description: '',
  servings: 1,
  ingredients: [],
  steps: [],
  sourceUrl: '',
  tags: [],
  loading: false,
};

const recipeFormSlice = createSlice({
  name: 'recipeForm',
  initialState,
  reducers: {
    setTitle(state, action: PayloadAction<string>) {
      state.title = action.payload;
    },
    setDescription(state, action: PayloadAction<string>) {
      state.description = action.payload;
    },
    setServings(state, action: PayloadAction<number>) {
      state.servings = action.payload;
    },
    setIngredients(state, action: PayloadAction<IngredientInput[]>) {
      state.ingredients = action.payload;
    },
    setSteps(state, action: PayloadAction<string[]>) {
      state.steps = action.payload;
    },
    setSourceUrl(state, action: PayloadAction<string>) {
      state.sourceUrl = action.payload;
    },
    setTags(state, action: PayloadAction<string[]>) {
      state.tags = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    resetForm(state) {
      state.title = '';
      state.description = '';
      state.servings = 1;
      state.ingredients = [];
      state.steps = [];
      state.sourceUrl = '';
      state.tags = [];
      state.loading = false;
    },
  },
});

export const {
  setTitle,
  setDescription,
  setServings,
  setIngredients,
  setSteps,
  setSourceUrl,
  setTags,
  setLoading,
  resetForm,
} = recipeFormSlice.actions;
export default recipeFormSlice.reducer;
