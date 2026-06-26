import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ViewStyle, type TextStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { usePowerSync, useQuery } from '@powersync/react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePickerModal } from '@/components/ui/date-picker-modal';
import { DietaryTags } from '@/constants/dietary-tags';
import { Colors, FontSizes, Spacing, BorderRadius, MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useUserProfile } from '@/hooks/use-user-profile';
import { updateBodyProfile, updateDietaryPreferences, updateDisplayName, deleteAccount } from '@/services/user-service';
import { signOut } from '@/services/supabase';
import type { Sex } from '@/services/macro-planner-service';

const SEX_OPTIONS: Array<{ label: string; value: Sex }> = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Prefer not to say', value: 'other' },
];

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatDob(dob: string): string {
  const [y, m, d] = dob.split('-').map(Number);
  if (!y || !m || !d) return dob;
  return `${MONTH_NAMES[m - 1]} ${d}, ${y}`;
}

function dobToDate(dob: string): Date {
  const [y, m, d] = dob.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

function dateToDob(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function AccountScreen() {
  const db = usePowerSync();
  const router = useRouter();
  const theme = useTheme();
  const { profile, reload } = useUserProfile();

  const [displayName, setDisplayName] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Body stats
  const [sex, setSex] = useState<Sex>('other');
  const [dob, setDob] = useState('');
  const [dobDate, setDobDate] = useState<Date>(new Date(1990, 0, 1, 12, 0, 0));
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');

  const { data: bodyRows } = useQuery<{
    planner_sex: string | null;
    planner_dob: string | null;
    planner_height_ft: number | null;
    planner_height_in: number | null;
  }>(
    'SELECT planner_sex, planner_dob, planner_height_ft, planner_height_in FROM users WHERE id = ?',
    [profile?.user.id ?? ''],
  );

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.user.display_name ?? '');
    setSelectedTags(profile.dietaryPreferences ?? []);
  }, [profile]);

  useEffect(() => {
    const row = bodyRows[0];
    if (!row) return;
    if (row.planner_sex) setSex(row.planner_sex as Sex);
    if (row.planner_dob) {
      setDob(row.planner_dob);
      setDobDate(dobToDate(row.planner_dob));
    }
    if (row.planner_height_ft != null) setHeightFt(String(row.planner_height_ft));
    if (row.planner_height_in != null) setHeightIn(String(row.planner_height_in));
  }, [bodyRows]);

  const handleDobSelect = (date: Date) => {
    setDobDate(date);
    setDob(dateToDob(date));
    setShowDobPicker(false);
  };

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    await updateDisplayName(db, profile.user.id, displayName);
    await updateDietaryPreferences(db, profile.user.id, selectedTags);
    await updateBodyProfile(db, profile.user.id, {
      sex,
      dob,
      height_ft: Number(heightFt) || 0,
      height_in: Number(heightIn) || 0,
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

  return (
    <>
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.content, { maxWidth: MaxContentWidth, alignSelf: 'center', width: '100%' }]}>

          {/* Email */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Email</Text>
            <View style={[styles.readonlyField, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <Text style={[styles.readonlyValue, { color: theme.text }]}>{profile?.user.email}</Text>
            </View>
          </View>

          {/* Display name */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Display name</Text>
            <Input value={displayName} onChangeText={setDisplayName} placeholder="Your name" />
          </View>

          {/* Body stats */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Body stats</Text>
            <Text style={[styles.sectionHint, { color: theme.textSecondary }]}>
              Used to calculate personalized macro recommendations.
            </Text>
            <View style={[styles.group, { backgroundColor: theme.backgroundElement }]}>
              {/* Height */}
              <View style={[styles.row, { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.border }]}>
                <Text style={[styles.rowLabel, { color: theme.text }]}>Height</Text>
                <View style={styles.rowRight}>
                  <TextInput
                    style={[styles.inlineInput, { color: theme.text }]}
                    value={heightFt}
                    onChangeText={setHeightFt}
                    keyboardType="number-pad"
                    textAlign="right"
                    placeholderTextColor={theme.textSecondary}
                    placeholder="5"
                  />
                  <Text style={[styles.unit, { color: theme.textSecondary }]}>ft</Text>
                  <TextInput
                    style={[styles.inlineInput, { color: theme.text }]}
                    value={heightIn}
                    onChangeText={setHeightIn}
                    keyboardType="number-pad"
                    textAlign="right"
                    placeholderTextColor={theme.textSecondary}
                    placeholder="10"
                  />
                  <Text style={[styles.unit, { color: theme.textSecondary }]}>in</Text>
                </View>
              </View>
              {/* Birthday */}
              <Pressable
                style={[styles.row, { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.border }]}
                onPress={() => setShowDobPicker(true)}
              >
                <Text style={[styles.rowLabel, { color: theme.text }]}>Birthday</Text>
                <View style={styles.rowRight}>
                  <Text style={[styles.rowValue, { color: dob ? theme.text : theme.textSecondary }]}>
                    {dob ? formatDob(dob) : 'Not set'}
                  </Text>
                  <Text style={[styles.chevron, { color: Colors.accent }]}>›</Text>
                </View>
              </Pressable>
              {/* Biological sex */}
              <View style={styles.sexRow}>
                <Text style={[styles.rowLabel, { color: theme.text }]}>Biological sex</Text>
                <View style={styles.chipRow}>
                  {SEX_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt.value}
                      style={[
                        styles.chip,
                        {
                          borderColor: sex === opt.value ? Colors.accent : theme.border,
                          backgroundColor: sex === opt.value ? Colors.accent : theme.backgroundElement,
                        },
                      ]}
                      onPress={() => setSex(opt.value)}
                    >
                      <Text style={[styles.chipText, { color: sex === opt.value ? '#fff' : theme.text }]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          </View>

          {/* Dietary preferences */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Dietary preferences</Text>
            <View style={styles.tagGrid}>
              {DietaryTags.map((tag) => {
                const selected = selectedTags.includes(tag);
                return (
                  <Pressable
                    key={tag}
                    onPress={() => toggleTag(tag)}
                    style={[
                      styles.pill,
                      selected
                        ? { backgroundColor: Colors.accent, borderColor: Colors.accent }
                        : { backgroundColor: 'transparent', borderColor: theme.border },
                    ]}
                  >
                    <Text style={[styles.pillLabel, { color: selected ? '#FFFFFF' : theme.textSecondary }]}>
                      {tag}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

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

      <DatePickerModal
        visible={showDobPicker}
        currentDate={dobDate}
        onSelect={handleDobSelect}
        onClose={() => setShowDobPicker(false)}
      />

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
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  } as ViewStyle,
  content: {
    gap: Spacing.xl,
  } as ViewStyle,
  section: {
    gap: Spacing.sm,
  } as ViewStyle,
  sectionTitle: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,
  sectionHint: {
    fontSize: FontSizes.xs,
    lineHeight: 16,
    marginTop: -2,
  } as TextStyle,
  readonlyField: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    minHeight: 44,
    justifyContent: 'center',
  } as ViewStyle,
  readonlyValue: {
    fontSize: FontSizes.md,
  } as TextStyle,
  group: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  } as ViewStyle,
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
  } as ViewStyle,
  sexRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  } as ViewStyle,
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  } as TextStyle,
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  } as ViewStyle,
  rowValue: {
    fontSize: 15,
  } as TextStyle,
  inlineInput: {
    fontSize: 15,
    minWidth: 36,
    maxWidth: 60,
    paddingVertical: 2,
    paddingHorizontal: 2,
  } as TextStyle,
  unit: {
    fontSize: 13,
    fontWeight: '500',
    minWidth: 18,
  } as TextStyle,
  chevron: {
    fontSize: 20,
    fontWeight: '300',
    marginLeft: 4,
  } as TextStyle,
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  } as ViewStyle,
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  } as ViewStyle,
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  } as TextStyle,
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  } as ViewStyle,
  pill: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingVertical: 5,
    paddingHorizontal: Spacing.md,
  } as ViewStyle,
  pillLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  } as TextStyle,
  actions: {
    gap: Spacing.sm,
  } as ViewStyle,
  dangerZone: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
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
