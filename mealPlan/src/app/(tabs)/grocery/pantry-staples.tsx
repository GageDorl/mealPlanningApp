import { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, RefreshControl, Pressable, StyleSheet,
  type ViewStyle, type TextStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { usePowerSync, useQuery } from '@powersync/react-native';
import { triggerSync } from '@/utils/trigger-sync';
import { Colors, FontSizes, MaxContentWidth, Spacing, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getCachedUserId } from '@/services/supabase';
import {
  addPantryStaple, removePantryStaple, updatePantryStaple,
  type PantryStapleRow,
} from '@/services/grocery-service';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function PantryStaplesScreen() {
  const db = usePowerSync();
  const theme = useTheme();
  const router = useRouter();
  const userId = getCachedUserId() ?? '';

  const { data: staples, isLoading } = useQuery<PantryStapleRow>(
    'SELECT * FROM pantry_staples WHERE user_id = ? ORDER BY ingredient_name',
    [userId],
  );

  const [newName, setNewName] = useState('');
  const [newQty, setNewQty] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [adding, setAdding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await triggerSync();
    setRefreshing(false);
  }, []);

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState('');
  const [editUnit, setEditUnit] = useState('');

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed || !userId) return;
    const qty = newQty.trim() ? parseFloat(newQty.trim()) : null;
    const unit = newUnit.trim() || null;
    if (newQty.trim() && isNaN(qty!)) return;
    setAdding(true);
    try {
      await addPantryStaple(db, userId, trimmed, qty, unit);
      setNewName('');
      setNewQty('');
      setNewUnit('');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (staple: PantryStapleRow) => {
    await removePantryStaple(db, staple.id);
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
    setEditingId(null);
    await updatePantryStaple(db, staple.id, qty, unit);
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
        <Pressable onPress={() => router.push('/grocery')} style={styles.backBtn} hitSlop={8}>
          <Text style={[styles.backIcon, { color: Colors.accent }]}>‹</Text>
        </Pressable>
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

      {isLoading ? (
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
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} colors={[Colors.accent]} />}
        >
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
    maxWidth: MaxContentWidth,
    marginHorizontal: 'auto',
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  } as ViewStyle,
  backBtn: {
    flexShrink: 0,
  } as ViewStyle,
  backIcon: {
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 30,
  } as TextStyle,
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
