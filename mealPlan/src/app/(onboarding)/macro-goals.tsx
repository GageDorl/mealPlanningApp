import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { usePowerSync } from '@powersync/react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OnboardingScreen } from '@/components/onboarding-screen';
import { DefaultMacros, type MacroDefinition } from '@/constants/macros';
import { updateMacroGoals } from '@/services/user-service';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useTheme } from '@/hooks/use-theme';
import { FontSizes, Spacing } from '@/constants/theme';

export default function MacroGoalsScreen() {
  const db = usePowerSync();
  const router = useRouter();
  const theme = useTheme();
  const { profile, loading } = useUserProfile();
  const [goals, setGoals] = useState<MacroDefinition[]>(DefaultMacros);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.macroGoals && profile.macroGoals.length > 0) {
      const synced = DefaultMacros.map((macro) => {
        const match = profile.macroGoals.find((item) => item.macro_name === macro.key);
        return {
          ...macro,
          defaultGoal: match ? Number(match.daily_target) : macro.defaultGoal,
        };
      });
      setGoals(synced);
    }
  }, [profile]);

  const handleSave = async () => {
    if (!profile) {
      setSaveError('Profile not loaded — please sign out and sign in again.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await updateMacroGoals(db, profile.user.id, goals.map((goal, index) => ({
        macro_name: goal.key,
        daily_target: goal.defaultGoal,
        unit: goal.unit,
        display_order: index,
        is_active: true,
      })));
      router.push('/dietary-preferences');
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save goals. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateGoal = (index: number, value: string) => {
    const amount = Number(value);
    setGoals((prev) => prev.map((item, idx) => (idx === index ? { ...item, defaultGoal: Number.isNaN(amount) ? item.defaultGoal : amount } : item)));
  };

  return (
    <OnboardingScreen title="Set your macro goals" loading={loading} loadingText="Loading onboarding…">
      {goals.map((macro, index) => (
        <View key={macro.key} style={styles.fieldRow}>
          <View style={styles.label}>
            <Text style={[styles.labelText, { color: theme.text }]}>{macro.label}</Text>
          </View>
          <Input
            value={String(macro.defaultGoal)}
            onChangeText={(value) => updateGoal(index, value)}
            keyboardType="numeric"
            containerStyle={styles.numericInput}
          />
        </View>
      ))}
      {saveError ? <Text style={[styles.labelText, { color: theme.error }]}>{saveError}</Text> : null}
      <Button label={saving ? 'Saving…' : 'Save and continue'} onPress={handleSave} disabled={loading || saving} />
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    maxWidth: '100%',
  } as ViewStyle,
  label: {
    flex: 1,
  } as ViewStyle,
  labelText: {
    fontSize: FontSizes.md,
    fontWeight: '500',
  } as TextStyle,
  numericInput: {
    flex: 3,
  } as ViewStyle,
});
