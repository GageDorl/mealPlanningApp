import { useState } from 'react';
import { StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { usePowerSync } from '@powersync/react-native';

import { Button } from '@/components/ui/button';
import { OnboardingScreen } from '@/components/onboarding-screen';
import { CalendarPickerModal } from '@/components/calendar/calendar-picker-modal';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useCalendar } from '@/hooks/use-calendar';
import { useTheme } from '@/hooks/use-theme';
import { FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { markOnboardingComplete } from '@/services/user-service';

export default function CalendarConnectScreen() {
  const db = usePowerSync();
  const router = useRouter();
  const theme = useTheme();
  const { profile, loading } = useUserProfile();
  const { connected, connectError, availableCalendars, selectedCalendarIds, connectedCalendarTitle, connect, selectCalendars } = useCalendar();
  const [pickerVisible, setPickerVisible] = useState(false);

  const finish = async () => {
    if (profile) {
      await markOnboardingComplete(db, profile.user.id);
    }
    router.replace('/');
  };

  const handleConnect = async () => {
    const granted = await connect();
    if (granted) {
      setPickerVisible(true);
    }
  };

  return (
    <OnboardingScreen title="Connect your calendar" loading={loading} loadingText="Checking your account…">
      <Text style={[styles.copy, { color: theme.text }]}>
        Connect your calendar to sync meal plans with the dates and reminders you already use.
      </Text>

      {connected ? (
        <View style={[styles.successBadge, { backgroundColor: theme.backgroundElement }]}>
          <View style={[styles.successDot, { backgroundColor: theme.success }]} />
          <Text style={[styles.successText, { color: theme.text }]}>{connectedCalendarTitle} connected</Text>
        </View>
      ) : null}

      {connectError ? (
        <Text style={[styles.error, { color: theme.error }]}>{connectError}</Text>
      ) : null}

      {connected ? (
        <>
          {availableCalendars.length > 1 && (
            <Button label={`Using: ${connectedCalendarTitle} · Change`} onPress={() => setPickerVisible(true)} variant="secondary" />
          )}
          <Button label="Continue" onPress={finish} />
        </>
      ) : (
        <>
          <Button label="Connect Calendar" onPress={handleConnect} />
          <Button label="Skip for now" onPress={finish} variant="secondary" />
        </>
      )}

      <CalendarPickerModal
        visible={pickerVisible}
        calendars={availableCalendars}
        selectedIds={selectedCalendarIds}
        onDone={(ids) => { selectCalendars(ids); setPickerVisible(false); }}
      />
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
