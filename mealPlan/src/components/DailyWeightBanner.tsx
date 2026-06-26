import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle, type TextStyle } from 'react-native';
import { useQuery } from '@powersync/react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { surfaces } from '@/styles/surfaces';
import { parseWeightLogs, parseWeightGoal, hasLoggedToday } from '@/services/weight-log-service';
import { WeightLogModal } from '@/components/WeightLogModal';

interface Props {
  userId: string;
}

export function DailyWeightBanner({ userId }: Props) {
  const theme = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [sessionDismissed, setSessionDismissed] = useState(false);

  const { data: rows } = useQuery<{ weight_logs: string | null; weight_goal: string | null }>(
    'SELECT weight_logs, weight_goal FROM users WHERE id = ?',
    [userId],
  );

  const row = rows[0];
  const weightLogs = parseWeightLogs(row?.weight_logs);
  const weightGoal = parseWeightGoal(row?.weight_goal);

  if (!weightGoal || hasLoggedToday(weightLogs) || sessionDismissed) return null;

  return (
    <>
      <View style={[styles.banner, { backgroundColor: theme.backgroundElement, borderColor: Colors.accent }]}>
        <View style={styles.content}>
          <View style={[surfaces.dot, { flexShrink: 0, backgroundColor: Colors.accent }]} />
          <Text style={[styles.message, { color: theme.text }]} numberOfLines={2}>
            Log today's weight to track your goal progress.
          </Text>
        </View>
        <View style={styles.actions}>
          <Pressable style={styles.ctaButton} onPress={() => setShowModal(true)}>
            <Text style={[styles.ctaText, { color: Colors.accent }]}>Log Weight</Text>
          </Pressable>
          <Pressable onPress={() => setSessionDismissed(true)} hitSlop={12}>
            <Text style={[styles.dismissText, { color: theme.textSecondary }]}>✕</Text>
          </Pressable>
        </View>
      </View>

      <WeightLogModal
        visible={showModal}
        userId={userId}
        onClose={() => setShowModal(false)}
      />
    </>
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
