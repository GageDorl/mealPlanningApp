import { useCallback, useEffect, useState } from 'react';
import { ScrollView, RefreshControl, StyleSheet, Switch, Text, View, Modal, type ViewStyle, type TextStyle, Pressable } from 'react-native';
import { triggerSync } from '@/utils/trigger-sync';
import { useRouter } from 'expo-router';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DietaryTags } from '@/constants/dietary-tags';
import { Colors, FontSizes, MaxContentWidth, Spacing, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemeToggle } from '@/hooks/use-theme-toggle';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useUserRole } from '@/hooks/use-user-role';
import { useCalendar } from '@/hooks/use-calendar';
import { CalendarPickerList } from '@/components/calendar/calendar-picker-list';
import { usePowerSync } from '@powersync/react-native';
import { signOut } from '@/services/supabase';
import { updateDietaryPreferences, updateDisplayName, updateNotificationSettings, deleteAccount } from '@/services/user-service';

export default function ProfileScreen() {
  const db = usePowerSync();
  const router = useRouter();
  const theme = useTheme();
  const { themeMode, setTheme } = useThemeToggle();
  const { profile, reload } = useUserProfile();
  const { role } = useUserRole();
  const {
    connected, connectError, availableCalendars, selectedCalendarIds,
    calendarExportEnabled, setExportEnabled, connect, disconnect, selectCalendars,
  } = useCalendar();
  const [refreshing, setRefreshing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await triggerSync();
    setRefreshing(false);
  }, []);
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

  }, [profile]);

  const toggleTag = (tag: string) => {

    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = async () => {
    if (!profile) return;
    await updateDisplayName(db, profile.user.id, displayName);
    await updateDietaryPreferences(db, profile.user.id, selectedTags);
    await updateNotificationSettings(db, profile.user.id, {
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

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      router.replace('/about');
    } catch (err) {
      setDeleting(false);
      setShowDeleteConfirm(false);
      console.error('[deleteAccount]', err);
    }
  };

  if (!profile) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={[styles.statusText, { color: theme.textSecondary }]}>Please sign in to view your profile.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} colors={[Colors.accent]} />}
      >
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

          {/* Google Calendar */}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Google Calendar</Text>
          {connected ? (
            <>
              <View style={[styles.toggleRow, { borderBottomColor: theme.border }]}>
                <Text style={[styles.toggleLabel, { color: theme.text }]}>Export meals to calendar</Text>
                <Switch
                  value={calendarExportEnabled}
                  onValueChange={setExportEnabled}
                  trackColor={{ true: Colors.accent }}
                />
              </View>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Calendars to display</Text>
              <CalendarPickerList
                calendars={availableCalendars}
                selectedIds={selectedCalendarIds}
                loading={availableCalendars.length === 0}
                onToggle={(id) => {
                  const allIds = availableCalendars.map((c) => c.id);
                  const effective = selectedCalendarIds.length === 0 ? allIds : selectedCalendarIds;
                  const next = effective.includes(id)
                    ? effective.filter((x) => x !== id)
                    : [...effective, id];
                  selectCalendars(next.length === allIds.length ? [] : next);
                }}
              />
              <Button label="Disconnect Google Calendar" onPress={disconnect} variant="secondary" />
            </>
          ) : (
            <>
              <Button label="Connect Google Calendar" onPress={connect} />
              {connectError ? (
                <Text style={[styles.fieldValue, { color: theme.error }]}>{connectError}</Text>
              ) : null}
            </>
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
          <Button
            label="Macro Planner"
            onPress={() => router.push('/(tabs)/profile/macro-planner')}
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
              <Button
                label="Popular Recipes"
                onPress={() => router.push('/(tabs)/profile/admin/popular-recipes')}
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

          {/* Danger zone */}
          <View style={[styles.dangerZone, { borderColor: theme.error }]}>
            <Text style={[styles.dangerTitle, { color: theme.error }]}>Danger zone</Text>
            <Text style={[styles.dangerDesc, { color: theme.textSecondary }]}>
              Permanently delete your account and all data. This cannot be undone.
            </Text>
            <Pressable
              onPress={() => setShowDeleteConfirm(true)}
              style={[styles.deleteButton, { borderColor: theme.error }]}
            >
              <Text style={[styles.deleteButtonLabel, { color: theme.error }]}>Delete account</Text>
            </Pressable>
          </View>

        </View>
      </ScrollView>

      {/* Delete confirmation modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => !deleting && setShowDeleteConfirm(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => !deleting && setShowDeleteConfirm(false)}
        >
          <Pressable style={[styles.modalCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Delete account?</Text>
            <Text style={[styles.modalBody, { color: theme.textSecondary }]}>
              This will permanently delete your account, all meal plans, food logs, recipes, and preferences. This action cannot be undone.
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShowDeleteConfirm(false)}
                style={[styles.modalBtn, { backgroundColor: theme.backgroundElement, borderColor: theme.border, borderWidth: 1 }]}
                disabled={deleting}
              >
                <Text style={[styles.modalBtnLabel, { color: theme.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleDeleteAccount}
                style={[styles.modalBtn, styles.modalBtnDanger, { opacity: deleting ? 0.6 : 1 }]}
                disabled={deleting}
              >
                <Text style={[styles.modalBtnLabel, { color: '#FFFFFF' }]}>
                  {deleting ? 'Deleting…' : 'Delete account'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  dangerZone: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.xxl,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    gap: Spacing.sm,
  } as ViewStyle,
  dangerTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,
  dangerDesc: {
    fontSize: FontSizes.sm,
    lineHeight: 20,
  } as TextStyle,
  deleteButton: {
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  } as ViewStyle,
  deleteButtonLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  } as TextStyle,
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  } as ViewStyle,
  modalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.xl,
    gap: Spacing.md,
  } as ViewStyle,
  modalTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
  } as TextStyle,
  modalBody: {
    fontSize: FontSizes.sm,
    lineHeight: 22,
  } as TextStyle,
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  } as ViewStyle,
  modalBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  } as ViewStyle,
  modalBtnDanger: {
    backgroundColor: '#FF3B30',
  } as ViewStyle,
  modalBtnLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  } as TextStyle,
});
