import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  type ViewStyle, type TextStyle,
} from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/services/supabase';
import {
  getPantryStaples, addPantryStaple, removePantryStaple, updatePantryStaple,
  type PantryStapleRow,
} from '@/services/grocery-service';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function PantryStaplesScreen() {
  const theme = useTheme();
  const [staples, setStaples] = useState<PantryStapleRow[]>([]);
  const [newName, setNewName] = useState('');
  const [newQty, setNewQty] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState('');
  const [editUnit, setEditUnit] = useState('');

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
    const qty = newQty.trim() ? parseFloat(newQty.trim()) : null;
    const unit = newUnit.trim() || null;
    if (newQty.trim() && isNaN(qty!)) return;
    setAdding(true);
    try {
      const staple = await addPantryStaple(userId, trimmed, qty, unit);
      setStaples((prev) => [...prev, staple].sort((a, b) => a.ingredient_name.localeCompare(b.ingredient_name)));
      setNewName('');
      setNewQty('');
      setNewUnit('');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (staple: PantryStapleRow) => {
    setStaples((prev) => prev.filter((s) => s.id !== staple.id));
    try {
      await removePantryStaple(staple.id);
    } catch {
      if (userId) load(userId);
    }
  };

  const startEdit = (staple: PantryStapleRow) => {
    setEditingId(staple.id);
    setEditQty(staple.quantity !== null ? String(staple.quantity) : '');
    setEditUnit(staple.unit ?? '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditQty('');
    setEditUnit('');
  };

  const saveEdit = async (staple: PantryStapleRow) => {
    const qty = editQty.trim() ? parseFloat(editQty.trim()) : null;
    const unit = editUnit.trim() || null;
    if (editQty.trim() && isNaN(qty!)) return;
    setStaples((prev) =>
      prev.map((s) => (s.id === staple.id ? { ...s, quantity: qty, unit } : s))
    );
    setEditingId(null);
    try {
      await updatePantryStaple(staple.id, qty, unit);
    } catch {
      if (userId) load(userId);
    }
  };

  const formatStock = (staple: PantryStapleRow): string | null => {
    if (staple.quantity === null && !staple.unit) return null;
    if (staple.quantity !== null && staple.unit) return `${staple.quantity} ${staple.unit}`;
    if (staple.quantity !== null) return String(staple.quantity);
    return staple.unit;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>Pantry</Text>
      </View>

      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        Log what you have on hand. Items with enough stock are excluded from generated lists; partial stock shows a deficit note.
      </Text>

      {/* Add form */}
      <View style={[styles.addSection, { borderBottomColor: theme.border }]}>
        <Input
          value={newName}
          onChangeText={setNewName}
          placeholder="Ingredient (e.g. Eggs)"
          containerStyle={styles.nameInput}
          returnKeyType="next"
        />
        <View style={styles.addQtyRow}>
          <Input
            value={newQty}
            onChangeText={setNewQty}
            placeholder="Qty"
            keyboardType="decimal-pad"
            containerStyle={styles.qtyInput}
            returnKeyType="next"
          />
          <Input
            value={newUnit}
            onChangeText={setNewUnit}
            placeholder="Unit"
            containerStyle={styles.unitInput}
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
      </View>

      {loading ? (
        <View style={styles.center}>
          <Text style={[styles.statusText, { color: theme.textSecondary }]}>Loading…</Text>
        </View>
      ) : staples.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.statusText, { color: theme.textSecondary }]}>
            No pantry items added yet.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {staples.map((staple) => {
            const isEditing = editingId === staple.id;
            const stock = formatStock(staple);

            return (
              <View key={staple.id} style={[styles.stapleRow, { borderBottomColor: theme.border }]}>
                {isEditing ? (
                  <>
                    <Text style={[styles.stapleName, { color: theme.text }]}>
                      {staple.ingredient_name.charAt(0).toUpperCase() + staple.ingredient_name.slice(1)}
                    </Text>
                    <View style={styles.editControls}>
                      <Input
                        value={editQty}
                        onChangeText={setEditQty}
                        placeholder="Qty"
                        keyboardType="decimal-pad"
                        containerStyle={styles.editQtyInput}
                        returnKeyType="next"
                        autoFocus
                      />
                      <Input
                        value={editUnit}
                        onChangeText={setEditUnit}
                        placeholder="Unit"
                        containerStyle={styles.editUnitInput}
                        returnKeyType="done"
                        onSubmitEditing={() => saveEdit(staple)}
                      />
                      <Pressable
                        onPress={() => saveEdit(staple)}
                        style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
                        hitSlop={8}
                      >
                        <Text style={[styles.saveLabel, { color: Colors.accent }]}>Save</Text>
                      </Pressable>
                      <Pressable
                        onPress={cancelEdit}
                        style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
                        hitSlop={8}
                      >
                        <Text style={[styles.cancelLabel, { color: theme.textSecondary }]}>Cancel</Text>
                      </Pressable>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.nameBlock}>
                      <Text style={[styles.stapleName, { color: theme.text }]}>
                        {staple.ingredient_name.charAt(0).toUpperCase() + staple.ingredient_name.slice(1)}
                      </Text>
                      {stock && (
                        <Text style={[styles.stockLabel, { color: theme.textSecondary }]}>{stock}</Text>
                      )}
                    </View>
                    <View style={styles.rowActions}>
                      <Pressable
                        onPress={() => startEdit(staple)}
                        style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
                        hitSlop={8}
                      >
                        <Text style={[styles.editLabel, { color: Colors.accent }]}>Edit</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleRemove(staple)}
                        style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
                        hitSlop={8}
                      >
                        <Text style={[styles.removeLabel, { color: Colors.light.error }]}>Remove</Text>
                      </Pressable>
                    </View>
                  </>
                )}
              </View>
            );
          })}
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
  addSection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,
  nameInput: {
    width: '100%',
  } as ViewStyle,
  addQtyRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-end',
  } as ViewStyle,
  qtyInput: {
    width: 80,
  } as ViewStyle,
  unitInput: {
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
    gap: Spacing.sm,
  } as ViewStyle,
  nameBlock: {
    flex: 1,
    gap: 2,
  } as ViewStyle,
  stapleName: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
  } as TextStyle,
  stockLabel: {
    fontSize: FontSizes.xs,
  } as TextStyle,
  rowActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  } as ViewStyle,
  editControls: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.xs,
    alignItems: 'center',
  } as ViewStyle,
  editQtyInput: {
    width: 72,
  } as ViewStyle,
  editUnitInput: {
    flex: 1,
  } as ViewStyle,
  actionButton: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  } as ViewStyle,
  pressed: {
    opacity: 0.6,
  } as ViewStyle,
  editLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  } as TextStyle,
  saveLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  } as TextStyle,
  cancelLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  } as TextStyle,
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
