import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle, type TextStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { usePowerSync } from '@powersync/react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DietaryTags } from '@/constants/dietary-tags';
import { Colors, FontSizes, Spacing, BorderRadius, MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useUserProfile } from '@/hooks/use-user-profile';
import { updateDietaryPreferences, updateDisplayName, deleteAccount } from '@/services/user-service';
import { signOut } from '@/services/supabase';

export default function AccountScreen() {
  const db = usePowerSync();
  const router = useRouter();
  const theme = useTheme();
  const { profile, reload } = useUserProfile();

  const [displayName, setDisplayName] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.user.display_name ?? '');
    setSelectedTags(profile.dietaryPreferences ?? []);
  }, [profile]);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    await updateDisplayName(db, profile.user.id, displayName);
    await updateDietaryPreferences(db, profile.user.id, selectedTags);
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
