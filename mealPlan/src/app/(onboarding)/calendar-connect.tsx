import { StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '@/components/ui/button';
import { OnboardingScreen } from '@/components/onboarding-screen';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useCalendar } from '@/hooks/use-calendar';
import { useTheme } from '@/hooks/use-theme';
import { FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { markOnboardingComplete } from '@/services/user-service';

export default function CalendarConnectScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { profile, loading } = useUserProfile();
  const { connected, connectError, connect } = useCalendar();

  const finish = async () => {
    if (profile) {
      await markOnboardingComplete(profile.user.id);
    }
    router.replace('/');
  };

  const handleConnect = async () => {
    await connect();
  };

  return (
    <OnboardingScreen title="Connect your calendar" loading={loading} loadingText="Checking your account…">
      <Text style={[styles.copy, { color: theme.text }]}>
        Connect your Google Calendar to sync meal plans with the dates and reminders you already use.
      </Text>

      {connected ? (
        <View style={[styles.successBadge, { backgroundColor: theme.backgroundElement }]}>
          <View style={[styles.successDot, { backgroundColor: theme.success }]} />
          <Text style={[styles.successText, { color: theme.text }]}>Google Calendar connected</Text>
        </View>
      ) : null}

      {connectError ? (
        <Text style={[styles.error, { color: theme.error }]}>{connectError}</Text>
      ) : null}

      {connected ? (
        <Button label="Continue" onPress={finish} />
      ) : (
        <>
          <Button label="Connect Google Calendar" onPress={handleConnect} />
          <Button label="Skip for now" onPress={finish} variant="secondary" />
        </>
      )}
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  copy: {
    fontSize: FontSizes.md,
    fontWeight: '500',
    marginBottom: Spacing.xl,
  } as TextStyle,
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.xl,
  } as ViewStyle,
  successDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  } as ViewStyle,
  successText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  } as TextStyle,
  error: {
    fontSize: FontSizes.sm,
    marginBottom: Spacing.md,
  } as TextStyle,
});
