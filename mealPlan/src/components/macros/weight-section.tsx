import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { useQuery } from '@powersync/react-native';

import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { parseWeightLogs, parseWeightGoal } from '@/services/weight-log-service';
import { WeightLogModal } from '@/components/WeightLogModal';

interface Props {
  userId: string;
  selectedDate: Date;
}

function dateToStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function WeightSection({ userId, selectedDate }: Props) {
  const theme = useTheme();
  const [showModal, setShowModal] = useState(false);

  const { data: rows } = useQuery<{ weight_logs: string | null; weight_goal: string | null }>(
    'SELECT weight_logs, weight_goal FROM users WHERE id = ?',
    [userId],
  );

  const weightLogs = parseWeightLogs(rows[0]?.weight_logs);
  const weightGoal = parseWeightGoal(rows[0]?.weight_goal);
  const dateStr = dateToStr(selectedDate);
  const entry = weightLogs.find((e) => e.date === dateStr);

  const goalDiff = entry && weightGoal
    ? Math.round((entry.weight_lbs - weightGoal.goal_weight_lbs) * 10) / 10
    : null;

  return (
    <>
      <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
        <View style={styles.row}>
          <View style={styles.left}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Weight</Text>
            {entry ? (
              <View style={styles.valueRow}>
                <Text style={[styles.value, { color: theme.text }]}>{entry.weight_lbs}</Text>
                <Text style={[styles.unit, { color: theme.textSecondary }]}>lbs</Text>
              </View>
            ) : (
              <Text style={[styles.noEntry, { color: theme.textSecondary }]}>No entry</Text>
            )}
            {goalDiff !== null && (
              <Text style={[styles.goalHint, { color: goalDiff <= 0 ? theme.success : theme.textSecondary }]}>
                {goalDiff <= 0
                  ? `${Math.abs(goalDiff)} lbs below goal`
                  : `${goalDiff} lbs above goal`}
              </Text>
            )}
          </View>

          <Pressable
            onPress={() => setShowModal(true)}
            style={[styles.logButton, { borderColor: Colors.accent }]}
          >
            <Text style={[styles.logButtonText, { color: Colors.accent }]}>
              {entry ? 'Edit' : 'Log Weight'}
            </Text>
          </Pressable>
        </View>
      </View>

      <WeightLogModal
        visible={showModal}
        userId={userId}
        initialDate={selectedDate}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  } as ViewStyle,
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as ViewStyle,
  left: {
    gap: Spacing.xs,
  } as ViewStyle,
  label: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.xs,
  } as ViewStyle,
  value: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
  } as TextStyle,
  unit: {
    fontSize: FontSizes.md,
    fontWeight: '500',
  } as TextStyle,
  noEntry: {
    fontSize: FontSizes.lg,
    fontWeight: '500',
  } as TextStyle,
  goalHint: {
    fontSize: FontSizes.xs,
    fontWeight: '500',
  } as TextStyle,
  logButton: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  } as ViewStyle,
  logButtonText: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
  } as TextStyle,
});
