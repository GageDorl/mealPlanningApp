import { Text } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '@/components/ui/button';
import { OnboardingScreen } from '@/components/onboarding-screen';
import { useTheme } from '@/hooks/use-theme';
import { FontSizes } from '@/constants/theme';

export default function MacroGoalsScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <OnboardingScreen title="Set your macro goals">
      <Text style={{ fontSize: FontSizes.sm, color: theme.textSecondary, marginBottom: 8 }}>
        Use the Macro Planner to get personalized daily targets based on your body, activity level, and goals. You can always update these later from your profile.
      </Text>
      <Button
        label="Open Macro Planner"
        onPress={() => router.push('/(tabs)/profile/macro-planner')}
      />
      <Button
        label="Continue"
        variant="secondary"
        onPress={() => router.push('/dietary-preferences')}
      />
    </OnboardingScreen>
  );
}
