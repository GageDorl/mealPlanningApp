import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface OnboardingState {
  currentStep: 'macro-goals' | 'dietary-preferences' | 'calendar-connect' | 'complete';
  skippedSteps: string[];
  onboardingCompleted: boolean;
}

const initialState: OnboardingState = {
  currentStep: 'macro-goals',
  skippedSteps: [],
  onboardingCompleted: false,
};

const onboardingSlice = createSlice({
  name: 'onboarding',
  initialState,
  reducers: {
    setCurrentStep(state, action: PayloadAction<OnboardingState['currentStep']>) {
      state.currentStep = action.payload;
    },
    addSkippedStep(state, action: PayloadAction<string>) {
      if (!state.skippedSteps.includes(action.payload)) {
        state.skippedSteps.push(action.payload);
      }
    },
    completeOnboarding(state) {
      state.onboardingCompleted = true;
      state.currentStep = 'complete';
    },
    resetOnboarding(state) {
      state.currentStep = 'macro-goals';
      state.skippedSteps = [];
      state.onboardingCompleted = false;
    },
  },
});

export const { setCurrentStep, addSkippedStep, completeOnboarding, resetOnboarding } = onboardingSlice.actions;
export default onboardingSlice.reducer;
