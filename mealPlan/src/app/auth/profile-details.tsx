import { useState } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { usePowerSync } from '@powersync/react-native';

import { Colors, FontSizes, Spacing, BorderRadius, MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DatePickerModal } from '@/components/ui/date-picker-modal';
import { updateBodyProfile } from '@/services/user-service';
import { getCachedUserId } from '@/services/supabase';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type Sex = 'male' | 'female' | 'prefer_not_to_answer';

const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'prefer_not_to_answer', label: 'Prefer not to answer' },
];

function formatDob(date: Date): string {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export default function ProfileDetailsScreen() {
  const db = usePowerSync();
  const router = useRouter();
  const theme = useTheme();
  const userId = getCachedUserId();

  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [dob, setDob] = useState<Date | null>(null);
  const [sex, setSex] = useState<Sex | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!userId) { setError('Session expired. Please sign in again.'); return; }

    setLoading(true);
    setError(null);

    try {
      await updateBodyProfile(db, userId, {
        sex: sex ?? undefined,
        dob: dob ? dob.toISOString().split('T')[0] : undefined,
        height_ft: heightFt ? parseInt(heightFt, 10) : undefined,
        height_in: heightIn ? parseInt(heightIn, 10) : undefined,
      });
      router.replace('/(tutorial)' as any);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    router.replace('/(tutorial)' as any);
  };

  const dobPickerDate = dob ?? new Date(2000, 0, 1);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={[styles.scroll, { maxWidth: MaxContentWidth, alignSelf: 'center', width: '100%' }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: theme.text }]}>A bit about you</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        This helps us calculate your calorie and macro targets. You can always update it later.
      </Text>

      {/* Height */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: theme.text }]}>Height</Text>
        <View style={styles.heightRow}>
          <View style={styles.heightInput}>
            <Input
              value={heightFt}
              onChangeText={(v) => setHeightFt(v.replace(/[^0-9]/g, ''))}
              placeholder="ft"
              keyboardType="number-pad"
              maxLength={1}
            />
          </View>
          <Text style={[styles.heightUnit, { color: theme.textSecondary }]}>ft</Text>
          <View style={styles.heightInput}>
            <Input
              value={heightIn}
              onChangeText={(v) => setHeightIn(v.replace(/[^0-9]/g, ''))}
              placeholder="in"
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
          <Text style={[styles.heightUnit, { color: theme.textSecondary }]}>in</Text>
        </View>
      </View>

      {/* Birthday */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: theme.text }]}>Birthday</Text>
        <Pressable
          onPress={() => setPickerVisible(true)}
          style={[styles.datePicker, { borderColor: theme.border, backgroundColor: theme.background }]}
        >
          <Text style={[styles.datePickerText, { color: dob ? theme.text : theme.textSecondary }]}>
            {dob ? formatDob(dob) : 'Select date'}
          </Text>
        </Pressable>
      </View>

      {/* Biological sex */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: theme.text }]}>Biological sex</Text>
        <View style={styles.sexRow}>
          {SEX_OPTIONS.map((opt) => {
            const active = sex === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setSex(opt.value)}
                style={[
                  styles.sexOption,
                  { borderColor: active ? Colors.accent : theme.border, backgroundColor: active ? `${Colors.accent}18` : theme.backgroundElement },
                ]}
              >
                <Text style={[styles.sexOptionText, { color: active ? Colors.accent : theme.text }]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {error ? <Text style={[styles.error, { color: theme.error }]}>{error}</Text> : null}

      <Button
        label={loading ? 'Saving…' : 'Continue'}
        onPress={handleSubmit}
        disabled={loading}
        style={styles.submitButton}
      />
      <Pressable onPress={handleSkip} style={styles.skipLink} hitSlop={8} disabled={loading}>
        <Text style={[styles.skipText, { color: theme.textSecondary }]}>Skip for now</Text>
      </Pressable>

      <DatePickerModal
        visible={pickerVisible}
        currentDate={dobPickerDate}
        onSelect={(date) => setDob(date)}
        onClose={() => setPickerVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xxl,
    gap: Spacing.xl,
  } as ViewStyle,
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
  } as TextStyle,
  subtitle: {
    fontSize: FontSizes.md,
    lineHeight: 22,
    marginTop: -Spacing.md,
  } as TextStyle,
  field: {
    gap: Spacing.sm,
  } as ViewStyle,
  label: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  } as TextStyle,
  heightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  } as ViewStyle,
  heightInput: {
    width: 72,
  } as ViewStyle,
  heightUnit: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
  } as TextStyle,
  datePicker: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  } as ViewStyle,
  datePickerText: {
    fontSize: 16,
  } as TextStyle,
  sexRow: {
    gap: Spacing.sm,
  } as ViewStyle,
  sexOption: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
  } as ViewStyle,
  sexOptionText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  } as TextStyle,
  error: {
    fontSize: FontSizes.sm,
    textAlign: 'center',
  } as TextStyle,
  submitButton: {
    marginTop: Spacing.sm,
  } as ViewStyle,
  skipLink: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  } as ViewStyle,
  skipText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    textDecorationLine: 'underline',
  } as TextStyle,
});
