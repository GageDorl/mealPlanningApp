import { useState } from 'react';
import { Pressable, View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { UserProfileData } from '@/services/user-service';

interface NudgeBannerProps {
  profile: UserProfileData;
  calendarConnected: boolean;
  onPress: () => void;
}

interface NudgeConfig {
  message: string;
  cta: string;
}

function getNudge(profile: UserProfileData, calendarConnected: boolean): NudgeConfig | null {
  if (!calendarConnected) {
    return {
      message: 'Connect your calendar to plan meals around your schedule.',
      cta: 'Connect',
    };
  }
  if (profile.macroGoals.length === 0) {
    return {
      message: 'Set daily macro goals to start tracking your nutrition.',
      cta: 'Set goals',
    };
  }
  if (!profile.user.onboarding_completed) {
    return {
      message: 'Finish setting up your profile to get the most out of Prepd.',
      cta: 'Continue',
    };
  }
  return null;
}

export function NudgeBanner({ profile, calendarConnected, onPress }: NudgeBannerProps) {
  const theme = useTheme();
  const [dismissed, setDismissed] = useState(false);

  const nudge = getNudge(profile, calendarConnected);

  if (!nudge || dismissed) return null;

  return (
    <View style={[styles.banner, { backgroundColor: theme.backgroundElement, borderColor: Colors.accent }]}>
      <View style={styles.content}>
        <View style={[styles.dot, { backgroundColor: Colors.accent }]} />
        <Text style={[styles.message, { color: theme.text }]} numberOfLines={2}>
          {nudge.message}
        </Text>
      </View>
      <View style={styles.actions}>
        <Pressable style={styles.ctaButton} onPress={onPress}>
          <Text style={[styles.ctaText, { color: Colors.accent }]}>{nudge.cta}</Text>
        </Pressable>
        <Pressable onPress={() => setDismissed(true)} hitSlop={12}>
          <Text style={[styles.dismissText, { color: theme.textSecondary }]}>✕</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderLeftWidth: 3,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  } as ViewStyle,
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  } as ViewStyle,
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  } as ViewStyle,
  message: {
    fontSize: FontSizes.sm,
    flex: 1,
    lineHeight: 18,
  } as TextStyle,
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flexShrink: 0,
  } as ViewStyle,
  ctaButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  } as ViewStyle,
  ctaText: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
  } as TextStyle,
  dismissText: {
    fontSize: FontSizes.sm,
  } as TextStyle,
});
