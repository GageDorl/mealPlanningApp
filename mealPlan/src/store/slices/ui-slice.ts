import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface DashboardModuleStates {
  calendar: boolean;
  grocery: boolean;
  meals: boolean;
  macros: boolean;
}

interface UiState {
  selectedDate: string;
  dashboardModuleStates: DashboardModuleStates;
  activeFilters: Record<string, string>;
}

const initialState: UiState = {
  selectedDate: new Date().toISOString().split('T')[0],
  dashboardModuleStates: {
    calendar: true,
    grocery: true,
    meals: true,
    macros: true,
  },
  activeFilters: {},
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setSelectedDate(state, action: PayloadAction<string>) {
      state.selectedDate = action.payload;
    },
    setDashboardModuleState(
      state,
      action: PayloadAction<{ module: keyof DashboardModuleStates; enabled: boolean }>
    ) {
      state.dashboardModuleStates[action.payload.module] = action.payload.enabled;
    },
    setActiveFilters(state, action: PayloadAction<Record<string, string>>) {
      state.activeFilters = action.payload;
    },
  },
});

export const { setSelectedDate, setDashboardModuleState, setActiveFilters } = uiSlice.actions;
export default uiSlice.reducer;
