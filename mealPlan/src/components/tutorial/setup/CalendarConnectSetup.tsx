import { useState } from 'react';
import { View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';

// Demo-only: simulates the calendar connect flow without actually connecting anything.

interface Props {
  onComplete: () => void;
  onSkip?: () => void;
}

export function CalendarConnectSetup({ onComplete }: Props) {
  const theme = useTheme();
  const [demoConnected, setDemoConnected] = useState(false);

  return (
    <View style={styles.container}>
      {demoConnected && (
        <View style={[styles.successBadge, { backgroundColor: theme.backgroundElement }]}>
          <View style={[styles.successDot, { backgroundColor: Colors.accent }]} />
          <Text style={[styles.successText, { color: theme.text }]}>My Calendar connected</Text>
        </View>
      )}
      <View style={styles.buttons}>
        {demoConnected ? (
          <Button label="Continue" onPress={onComplete} />
        ) : (
          <Button label="Connect Calendar" onPress={() => setDemoConnected(true)} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    gap: Spacing.lg,
  } as ViewStyle,
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
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
  buttons: {
    gap: Spacing.sm,
  } as ViewStyle,
});
