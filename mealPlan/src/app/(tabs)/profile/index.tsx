import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View, type ViewStyle, type TextStyle, Pressable } from 'react-native';
import { LoadingModal } from '@/components/ui/loading-modal';
import { useRouter } from 'expo-router';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DietaryTags } from '@/constants/dietary-tags';
import { DefaultMacros, type MacroDefinition } from '@/constants/macros';
import { Colors, FontSizes, MaxContentWidth, Spacing, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemeToggle } from '@/hooks/use-theme-toggle';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useUserRole } from '@/hooks/use-user-role';
import { useCalendar } from '@/hooks/use-calendar';
import { signOut } from '@/services/supabase';
import { updateDietaryPreferences, updateMacroGoals, updateNotificationSettings } from '@/services/user-service';

export default function ProfileScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { themeMode, setTheme } = useThemeToggle();
  const { profile, loading, reload } = useUserProfile();
  const { role } = useUserRole();
  const { connected, calendarExportEnabled, setExportEnabled, disconnect } = useCalendar();
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
      return { ...macro, defaultGoal: match ? Number(match.daily_target) : macro.defaultGoal };
    });
    setMacros(syncedMacros);
  }, [profile]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
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
    await updateMacroGoals(
      profile.user.id,
      macros.map((macro, index) => ({
        macro_name: macro.key,
        daily_target: macro.defaultGoal,
        unit: macro.unit,
        display_order: index,
        is_active: true,
      }))
    );
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
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <LoadingModal visible message="Loading profile…" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={[styles.statusText, { color: theme.textSecondary }]}>Please sign in to view your profile.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { maxWidth: MaxContentWidth }]}>

          <Text style={[styles.pageTitle, { color: theme.text }]}>Profile</Text>

          {/* Account */}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Account</Text>
          <View style={[styles.field, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Email</Text>
            <Text style={[styles.fieldValue, { color: theme.text }]}>{profile.user.email}</Text>
          </View>
          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Display name</Text>
          <Input value={displayName} onChangeText={setDisplayName} placeholder="Your name" />

          {/* Macro goals */}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Macro goals</Text>
          {macros.map((macro, index) => (
            <View key={macro.key} style={styles.macroRow}>
              <View style={styles.macroLabelRow}>
                <View style={[styles.macroSwatch, { backgroundColor: macro.color }]} />
                <Text style={[styles.macroLabel, { color: theme.text }]}>
                  {macro.label}
                  <Text style={[styles.macroUnit, { color: theme.textSecondary }]}> ({macro.unit})</Text>
                </Text>
              </View>
              <Input
                value={String(macro.defaultGoal)}
                onChangeText={(v) => updateMacroValue(index, v)}
                keyboardType="numeric"
                containerStyle={styles.macroInput}
              />
            </View>
          ))}

          {/* Dietary preferences */}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Dietary preferences</Text>
          <View style={styles.tagGrid}>
            {DietaryTags.map((tag) => {
              const selected = selectedTags.includes(tag);
              return (
                <Button
                  key={tag}
                  label={tag}
                  onPress={() => toggleTag(tag)}
                  variant={selected ? 'primary' : 'secondary'}
                  style={styles.tagButton}
                />
              );
            })}
          </View>

          {/* Notifications */}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Notifications</Text>
          {[
            { key: 'mealReminders', label: 'Meal reminders' },
            { key: 'planningNudges', label: 'Planning nudges' },
            { key: 'macroCheckIns', label: 'Macro check-ins' },
          ].map(({ key, label }) => (
            <View key={key} style={[styles.toggleRow, { borderBottomColor: theme.border }]}>
              <Text style={[styles.toggleLabel, { color: theme.text }]}>{label}</Text>
              <Switch
                value={notifications[key as keyof typeof notifications]}
                onValueChange={(next) => setNotifications((prev) => ({ ...prev, [key]: next }))}
                trackColor={{ true: Colors.accent }}
              />
            </View>
          ))}

          {/* Calendar */}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Calendar</Text>
          <View style={[styles.toggleRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.toggleLabel, { color: theme.text }]}>Export meals to calendar</Text>
            <Switch
              value={calendarExportEnabled}
              onValueChange={setExportEnabled}
              trackColor={{ true: Colors.accent }}
            />
          </View>
          {connected ? (
            <Button label="Disconnect Google Calendar" onPress={disconnect} variant="secondary" />
          ) : (
            <Text style={[styles.fieldValue, { color: theme.textSecondary }]}>No calendar connected</Text>
          )}

          {/* Appearance */}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Appearance</Text>
          <View style={styles.themeButtonGroup}>
            {(['light', 'dark', null] as const).map((mode) => (
              <Pressable
                key={mode ?? 'system'}
                onPress={() => setTheme(mode)}
                style={[
                  styles.themeButton,
                  themeMode === mode && [styles.themeButtonActive, { backgroundColor: Colors.accent }],
                  themeMode !== mode && [{ backgroundColor: theme.backgroundElement, borderColor: theme.border }],
                ]}
              >
                <Text style={[styles.themeButtonLabel, themeMode === mode ? { color: '#FFFFFF' } : { color: theme.text }]}>
                  {mode === 'light' ? '☀️ Light' : mode === 'dark' ? '🌙 Dark' : '🖥️ System'}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Food Library */}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Food</Text>
          <Button
            label="My Food Library"
            onPress={() => router.push('/(tabs)/profile/food-library')}
            variant="secondary"
          />

          {/* Admin */}
          {(role === 'moderator' || role === 'admin') ? (
            <>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Admin</Text>
              <Button
                label="Pending Foods"
                onPress={() => router.push('/(tabs)/profile/admin/pending-foods')}
                variant="secondary"
              />
              <Button
                label="Flagged Foods"
                onPress={() => router.push('/(tabs)/profile/admin/flagged-foods')}
                variant="secondary"
              />
              {role === 'admin' ? (
                <Button
                  label="User Roles"
                  onPress={() => router.push('/(tabs)/profile/admin/user-roles')}
                  variant="secondary"
                />
              ) : null}
            </>
          ) : null}

          {/* Actions */}
          <View style={styles.actions}>
            <Button label="Save" onPress={handleSave} />
            <Button label="Sign out" onPress={handleSignOut} variant="secondary" />
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    maxWidth: MaxContentWidth,
    width: '100%',
    marginHorizontal: 'auto',
  } as ViewStyle,
  scrollContent: {
    padding: Spacing.lg,
    alignItems: 'center',
  } as ViewStyle,
  card: {
    width: '100%',
    gap: Spacing.sm,
  } as ViewStyle,
  pageTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  } as TextStyle,
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  } as TextStyle,
  field: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  } as ViewStyle,
  fieldLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  } as TextStyle,
  fieldValue: {
    fontSize: FontSizes.md,
  } as TextStyle,
  inputLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  } as TextStyle,
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  } as ViewStyle,
  macroLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  } as ViewStyle,
  macroSwatch: {
    width: 10,
    height: 10,
    borderRadius: 5,
  } as ViewStyle,
  macroLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  } as TextStyle,
  macroUnit: {
    fontSize: FontSizes.xs,
    fontWeight: '400',
  } as TextStyle,
  macroInput: {
    width: 90,
  } as ViewStyle,
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  } as ViewStyle,
  tagButton: {
    flexShrink: 1,
  } as ViewStyle,
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,
  toggleLabel: {
    fontSize: FontSizes.md,
  } as TextStyle,
  actions: {
    gap: Spacing.sm,
    marginTop: Spacing.xl,
    marginBottom: Spacing.xxl,
  } as ViewStyle,
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  statusText: {
    fontSize: FontSizes.md,
  } as TextStyle,
  themeButtonGroup: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  } as ViewStyle,
  themeButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  } as ViewStyle,
  themeButtonActive: {
    borderWidth: 0,
  } as ViewStyle,
  themeButtonLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  } as TextStyle,
});
