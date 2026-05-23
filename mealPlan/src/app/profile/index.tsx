import { useEffect, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DietaryTags } from '@/constants/dietary-tags';
import { DefaultMacros, type MacroDefinition } from '@/constants/macros';
import { signOut } from '@/services/supabase';
import { updateDietaryPreferences, updateMacroGoals, updateNotificationSettings } from '@/services/user-service';
import { useUserProfile } from '@/hooks/use-user-profile';
import { MaxContentWidth, Spacing } from '@/constants/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, loading, reload } = useUserProfile();
  const [displayName, setDisplayName] = useState('');
  const [macros, setMacros] = useState<MacroDefinition[]>(DefaultMacros);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [notifications, setNotifications] = useState({
    mealReminders: false,
    planningNudges: false,
    macroCheckIns: false,
  });

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.user.display_name ?? '');
    setSelectedTags(profile.dietaryPreferences ?? []);
    setNotifications({
      mealReminders: profile.user.notification_meal_reminders,
      planningNudges: profile.user.notification_planning_nudges,
      macroCheckIns: profile.user.notification_macro_checkins,
    });

    const syncedMacros = DefaultMacros.map((macro) => {
      const match = profile.macroGoals.find((item) => item.macro_name === macro.key);
      return {
        ...macro,
        defaultGoal: match ? Number(match.daily_target) : macro.defaultGoal,
      };
    });
    setMacros(syncedMacros);
  }, [profile]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]
    );
  };

  const updateMacroValue = (index: number, value: string) => {
    const amount = Number(value);
    setMacros((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, defaultGoal: Number.isNaN(amount) ? item.defaultGoal : amount } : item
      )
    );
  };

  const handleSave = async () => {
    if (!profile) return;

    await updateMacroGoals(profile.user.id, macros.map((macro, index) => ({
      macro_name: macro.key,
      daily_target: macro.defaultGoal,
      unit: macro.unit,
      display_order: index,
      is_active: true,
    })));
    await updateDietaryPreferences(profile.user.id, selectedTags);
    await updateNotificationSettings(profile.user.id, {
      notification_meal_reminders: notifications.mealReminders,
      notification_planning_nudges: notifications.planningNudges,
      notification_macro_checkins: notifications.macroCheckIns,
    });
    reload();
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/sign-in');
  };

  if (loading) {
    return <ThemedView style={styles.center}><ThemedText type="default">Loading profile…</ThemedText></ThemedView>;
  }

  if (!profile) {
    return <ThemedView style={styles.center}><ThemedText type="default">Please sign in to view your profile.</ThemedText></ThemedView>;
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.card}>
        <ThemedText type="title" style={styles.title}>Profile</ThemedText>
        <ThemedText type="default" style={styles.label}>Email</ThemedText>
        <ThemedText type="default">{profile.user.email}</ThemedText>

        <ThemedText type="default" style={styles.label}>Display name</ThemedText>
        <Input value={displayName} onChangeText={setDisplayName} style={styles.input} />

        <ThemedText type="default" style={styles.sectionTitle}>Macro goals</ThemedText>
        {macros.map((macro, index) => (
          <View key={macro.key} style={styles.fieldRow}>
            <ThemedText type="default">{macro.label}</ThemedText>
            <Input
              value={String(macro.defaultGoal)}
              onChangeText={(value) => updateMacroValue(index, value)}
              keyboardType="numeric"
              style={styles.numericInput}
            />
          </View>
        ))}

        <ThemedText type="default" style={styles.sectionTitle}>Dietary preferences</ThemedText>
        {DietaryTags.map((tag) => (
          <Button
            key={tag}
            label={`${selectedTags.includes(tag) ? '✓ ' : ''}${tag}`}
            onPress={() => toggleTag(tag)}
            variant={selectedTags.includes(tag) ? 'primary' : 'secondary'}
            style={styles.tagButton}
          />
        ))}

        <ThemedText type="default" style={styles.sectionTitle}>Notifications</ThemedText>
        {Object.entries(notifications).map(([key, value]) => (
          <View key={key} style={styles.toggleRow}>
            <ThemedText type="default">{key.replace(/([A-Z])/g, ' $1')}</ThemedText>
            <Switch
              value={value}
              onValueChange={(next) => setNotifications((prev) => ({ ...prev, [key]: next }))}
            />
          </View>
        ))}

        <Button label="Save profile" onPress={handleSave} />
        <Button label="Sign out" onPress={handleSignOut} variant="secondary" />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  label: {
    marginTop: Spacing.three,
    marginBottom: Spacing.one,
  },
  sectionTitle: {
    marginTop: Spacing.five,
  },
  input: {
    marginBottom: Spacing.three,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    marginBottom: Spacing.three,
  },
  numericInput: {
    width: 100,
  },
  tagButton: {
    marginBottom: Spacing.one,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
