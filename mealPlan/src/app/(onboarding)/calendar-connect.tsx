import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '@/components/ui/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useUserProfile } from '@/hooks/use-user-profile';
import { MaxContentWidth, Spacing } from '@/constants/theme';

export default function CalendarConnectScreen() {
  const router = useRouter();
  const { profile, loading } = useUserProfile();

  const handleContinue = () => {
    router.replace('/profile');
  };

  if (loading) {
    return <ThemedView style={styles.center}><ThemedText type="default">Checking your account…</ThemedText></ThemedView>;
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.card}>
        <ThemedText type="title" style={styles.title}>
          Connect your calendar
        </ThemedText>
        <ThemedText type="default" style={styles.copy}>
          Connect your calendar to sync meal plans with the dates and reminders you already use.
        </ThemedText>
        <Button label="Connect calendar later" onPress={handleContinue} variant="secondary" />
        <Button label="Continue" onPress={handleContinue} />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.five,
  },
  card: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.four,
  },
  title: {
    marginBottom: Spacing.four,
  },
  copy: {
    marginBottom: Spacing.five,
  },  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
