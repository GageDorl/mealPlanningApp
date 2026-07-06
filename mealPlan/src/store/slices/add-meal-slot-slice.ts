import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { LogFoodFormPrefill } from '@/components/calendar/log-food-form';
import type { RootState } from '@/store';

export type AddModalPrefill = LogFoodFormPrefill & {
  searchQuery: string;
  label?: string;
  icon?: string | null;
};

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface AddMealSlotState {
  isOpen: boolean;
  prefillDate: string;
  prefillTime: string | null;
  prefillSuggestion: AddModalPrefill | null;
}

const initialState: AddMealSlotState = {
  isOpen: false,
  prefillDate: todayString(),
  prefillTime: null,
  prefillSuggestion: null,
};

const addMealSlotSlice = createSlice({
  name: 'addMealSlot',
  initialState,
  reducers: {
    openAddModal(
      state,
      action: PayloadAction<{ date?: string; time?: string | null; suggestion?: AddModalPrefill | null }>
    ) {
      state.isOpen = true;
      state.prefillDate = action.payload.date ?? todayString();
      state.prefillTime = action.payload.time ?? null;
      state.prefillSuggestion = action.payload.suggestion ?? null;
    },
    closeAddModal(state) {
      state.isOpen = false;
      state.prefillSuggestion = null;
    },
  },
});

export const { openAddModal, closeAddModal } = addMealSlotSlice.actions;
export default addMealSlotSlice.reducer;

export const selectAddModalOpen       = (s: RootState) => s.addMealSlot.isOpen;
export const selectAddModalDate       = (s: RootState) => s.addMealSlot.prefillDate;
export const selectAddModalTime       = (s: RootState) => s.addMealSlot.prefillTime;
export const selectAddModalSuggestion = (s: RootState) => s.addMealSlot.prefillSuggestion;
