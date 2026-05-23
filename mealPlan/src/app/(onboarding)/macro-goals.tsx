import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DefaultMacros, type MacroDefinition } from '@/constants/macros';
import { updateMacroGoals } from '@/services/user-service';
import { useUserProfile } from '@/hooks/use-user-profile';
import { MaxContentWidth, Spacing } from '@/constants/theme';

export default function MacroGoalsScreen() {
  const router = useRouter();
  const { profile, loading } = useUserProfile();
  const [goals, setGoals] = useState<MacroDefinition[]>(DefaultMacros);

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
    if (!profile) return;
    await updateMacroGoals(profile.user.id, goals.map((goal, index) => ({
      macro_name: goal.key,
      daily_target: goal.defaultGoal,
      unit: goal.unit,
      display_order: index,
      is_active: true,
    })));
    router.push('/dietary-preferences');
  };

  const updateGoal = (index: number, value: string) => {
    const amount = Number(value);
    setGoals((prev) => prev.map((item, idx) => (idx === index ? { ...item, defaultGoal: Number.isNaN(amount) ? item.defaultGoal : amount } : item)));
  };

  if (loading) {
    return <ThemedView style={styles.center}><ThemedText type="default">Loading onboarding...</ThemedText></ThemedView>;
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.card}>
        <ThemedText type="title" style={styles.title}>
          Set your macro goals
        </ThemedText>
        {goals.map((macro, index) => (
          <View key={macro.key} style={styles.fieldRow}>
            <ThemedText type="default" style={styles.label}>{macro.label}</ThemedText>
            <Input
              value={String(macro.defaultGoal)}
              onChangeText={(value) => updateGoal(index, value)}
              keyboardType="numeric"
              style={styles.numericInput}
            />
          </View>
        ))}
        <Button label="Save and continue" onPress={handleSave} />
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
  fieldRow: {
    gap: Spacing.three,
    marginBottom: Spacing.three,
  },
  label: {
    marginBottom: Spacing.one,
  },
  numericInput: {
    width: '100%',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
