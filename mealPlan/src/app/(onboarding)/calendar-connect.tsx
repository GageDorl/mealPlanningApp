import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '@/components/ui/button';
import { ThemedText } from '@/components/themed-text';
import { OnboardingScreen } from '@/components/onboarding-screen';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Spacing } from '@/constants/theme';

export default function CalendarConnectScreen() {
  const router = useRouter();
  const { loading } = useUserProfile();

  const handleContinue = () => {
    router.replace('/profile');
  };

  return (
    <OnboardingScreen title="Connect your calendar" loading={loading} loadingText="Checking your account…">
      <ThemedText type="default" style={styles.copy}>
        Connect your calendar to sync meal plans with the dates and reminders you already use.
      </ThemedText>
      <Button label="Connect calendar later" onPress={handleContinue} variant="secondary" />
      <Button label="Continue" onPress={handleContinue} />
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  copy: {
    marginBottom: Spacing.xl,
  },
});
