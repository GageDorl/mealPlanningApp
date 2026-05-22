import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface SearchState {
  searchQuery: string;
  filters: Record<string, string>;
  loading: boolean;
  results: Array<Record<string, unknown>>;
}

const initialState: SearchState = {
  searchQuery: '',
  filters: {},
  loading: false,
  results: [],
};

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
    },
    setFilters(state, action: PayloadAction<Record<string, string>>) {
      state.filters = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setResults(state, action: PayloadAction<Array<Record<string, unknown>>>) {
      state.results = action.payload;
    },
    clearResults(state) {
      state.results = [];
    },
  },
});

export const { setSearchQuery, setFilters, setLoading, setResults, clearResults } = searchSlice.actions;
export default searchSlice.reducer;
