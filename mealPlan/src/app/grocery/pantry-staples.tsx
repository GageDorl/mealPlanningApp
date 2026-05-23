import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  type ViewStyle, type TextStyle,
} from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/services/supabase';
import { getPantryStaples, addPantryStaple, removePantryStaple, type PantryStapleRow } from '@/services/grocery-service';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function PantryStaplesScreen() {
  const theme = useTheme();
  const [staples, setStaples] = useState<PantryStapleRow[]>([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async (uid: string) => {
    setLoading(true);
    try {
      const result = await getPantryStaples(uid);
      setStaples(result);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id ?? null;
      setUserId(uid);
      if (uid) load(uid);
      else setLoading(false);
    });
  }, [load]);

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed || !userId) return;
    setAdding(true);
    try {
      const staple = await addPantryStaple(userId, trimmed);
      setStaples((prev) => [...prev, staple].sort((a, b) => a.ingredient_name.localeCompare(b.ingredient_name)));
      setNewName('');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (staple: PantryStapleRow) => {
    setStaples((prev) => prev.filter((s) => s.id !== staple.id));
    try {
      await removePantryStaple(staple.id);
    } catch {
      // Revert
      if (userId) load(userId);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>Pantry Staples</Text>
      </View>

      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        Items marked as staples are excluded from auto-generated grocery lists.
      </Text>

      {/* Add input */}
      <View style={styles.addRow}>
        <Input
          value={newName}
          onChangeText={setNewName}
          placeholder="e.g. Olive Oil"
          containerStyle={styles.inputContainer}
          returnKeyType="done"
          onSubmitEditing={handleAdd}
        />
        <Button
          label={adding ? '…' : 'Add'}
          onPress={handleAdd}
          disabled={adding || !newName.trim()}
          style={styles.addButton}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <Text style={[styles.statusText, { color: theme.textSecondary }]}>Loading…</Text>
        </View>
      ) : staples.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.statusText, { color: theme.textSecondary }]}>
            No pantry staples added yet.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {staples.map((staple) => (
            <View key={staple.id} style={[styles.stapleRow, { borderBottomColor: theme.border }]}>
              <Text style={[styles.stapleName, { color: theme.text }]}>
                {staple.ingredient_name.charAt(0).toUpperCase() + staple.ingredient_name.slice(1)}
              </Text>
              <Pressable
                onPress={() => handleRemove(staple)}
                style={({ pressed }) => [styles.removeButton, pressed && styles.removePressed]}
                hitSlop={8}
              >
                <Text style={[styles.removeLabel, { color: Colors.light.error }]}>Remove</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 800,
    marginHorizontal: 'auto',
  } as ViewStyle,
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,
  title: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
  } as TextStyle,
  subtitle: {
    fontSize: FontSizes.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  } as TextStyle,
  addRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    alignItems: 'flex-end',
  } as ViewStyle,
  inputContainer: {
    flex: 1,
  } as ViewStyle,
  addButton: {
    minWidth: 64,
    minHeight: 44,
    paddingVertical: Spacing.sm,
  } as ViewStyle,
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  } as ViewStyle,
  stapleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,
  stapleName: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
    flex: 1,
  } as TextStyle,
  removeButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  } as ViewStyle,
  removePressed: {
    opacity: 0.6,
  } as ViewStyle,
  removeLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  } as TextStyle,
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  } as ViewStyle,
  statusText: {
    fontSize: FontSizes.md,
    textAlign: 'center',
  } as TextStyle,
});
