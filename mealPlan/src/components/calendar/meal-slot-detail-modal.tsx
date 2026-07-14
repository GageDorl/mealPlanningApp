import { useState, useEffect, useCallback } from 'react';
import { Modal, View, Text, Pressable, TextInput, ScrollView, KeyboardAvoidingView, StyleSheet, Platform, Alert, type ViewStyle, type TextStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import type { MealSlotWithRecipe, MealSlotRecipeEntry, MealSlotFoodEntry } from '@/services/meal-plan-service';
import { IconPicker } from '@/components/ui/icon-picker';

interface MealSlotDetailModalProps {
  slot: MealSlotWithRecipe | null;
  onClose: () => void;
  onAddRecipe: () => void;
  onAddFood?: () => void;
  onRemoveRecipe: (slotRecipeId: string) => void;
  onSaveRecipeServings: (slotRecipeId: string, servings: number | null) => void;
  onRemoveFood?: (slotFoodId: string) => void;
  onUpdateSlot?: (slotId: string, patch: { label?: string; time_of_day?: string | null; icon?: string | null }) => void;
  onDeleteSlot?: (slotId: string) => void;
}

function parse24to12(time24: string | null): { hour: number; min: 0 | 15 | 30 | 45 } {
  if (!time24) return { hour: 12, min: 0 };
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr, 10) || 0;
  const rawMin = parseInt(mStr ?? '0', 10);
  const min = ([0, 15, 30, 45] as const).reduce((best, v) =>
    Math.abs(rawMin - v) < Math.abs(rawMin - best) ? v : best, 0 as 0 | 15 | 30 | 45);
  return { hour: h, min };
}

function RecipeRow({
  entry,
  onViewRecipe,
  onRemove,
  onSaveServings,
}: {
  entry: MealSlotRecipeEntry;
  onViewRecipe: () => void;
  onRemove: () => void;
  onSaveServings: (servings: number | null) => void;
}) {
  const theme = useTheme();
  const defaultServings = entry.servings_eaten ?? entry.recipe.servings ?? 1;
  const [input, setInput] = useState(String(defaultServings));

  const handleBlur = useCallback(() => {
    const parsed = parseFloat(input);
    onSaveServings(isNaN(parsed) || parsed <= 0 ? null : parsed);
  }, [input, onSaveServings]);

  const scaledCal = entry.recipe.calories_per_serving != null
    ? Math.round(entry.recipe.calories_per_serving * (parseFloat(input) || defaultServings))
    : null;

  return (
    <View style={[styles.recipeCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={styles.recipeCardHeader}>
        <Pressable style={{ flex: 1 }} onPress={onViewRecipe}>
          <Text style={[styles.recipeTitle, { color: theme.text }]} numberOfLines={2}>
            {entry.recipe.title}
          </Text>
          {scaledCal != null && (
            <Text style={[styles.recipeCalHint, { color: theme.textSecondary }]}>≈ {scaledCal} kcal</Text>
          )}
        </Pressable>
        <Pressable onPress={onRemove} hitSlop={8} style={styles.removeBtn}>
          <Text style={[styles.removeIcon, { color: theme.textSecondary }]}>×</Text>
        </Pressable>
      </View>

      <View style={styles.servingsRow}>
        <Text style={[styles.servingsLabel, { color: theme.textSecondary }]}>Servings eaten</Text>
        <TextInput
          style={[styles.servingsInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
          value={input}
          onChangeText={setInput}
          onBlur={handleBlur}
          keyboardType="decimal-pad"
          selectTextOnFocus
          placeholderTextColor={theme.textSecondary}
        />
      </View>
    </View>
  );
}

function FoodRow({ entry, onRemove }: { entry: MealSlotFoodEntry; onRemove: () => void }) {
  const theme = useTheme();
  const calories = entry.calories != null ? Math.round(entry.calories * (entry.servings_planned || 1)) : null;

  return (
    <View style={[styles.recipeCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={styles.recipeCardHeader}>
        <View style={{ flex: 1 }}>
          <View style={styles.foodNameRow}>
            <Ionicons
              name={entry.source === 'fatsecret' ? 'cart-outline' : 'restaurant-outline'}
              size={13}
              color={theme.textSecondary}
            />
            <Text style={[styles.recipeTitle, { color: theme.text }]} numberOfLines={2}>
              {entry.food_name}{entry.brand_name ? ` (${entry.brand_name})` : ''}
            </Text>
          </View>
          {calories != null && (
            <Text style={[styles.recipeCalHint, { color: theme.textSecondary }]}>≈ {calories} kcal</Text>
          )}
        </View>
        <Pressable onPress={onRemove} hitSlop={8} style={styles.removeBtn}>
          <Text style={[styles.removeIcon, { color: theme.textSecondary }]}>×</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function MealSlotDetailModal({ slot, onClose, onAddRecipe, onAddFood, onRemoveRecipe, onSaveRecipeServings, onRemoveFood, onUpdateSlot, onDeleteSlot }: MealSlotDetailModalProps) {
  const theme = useTheme();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState('');
  const [editIcon, setEditIcon] = useState<string | null>(null);
  const [editHour, setEditHour] = useState(12);
  const [editMin, setEditMin] = useState<0 | 15 | 30 | 45>(0);

  useEffect(() => {
    setEditing(false);
  }, [slot?.id]);

  if (!slot) return null;

  function startEdit() {
    const parsed = parse24to12(slot!.time_of_day ?? null);
    setEditLabel(slot!.label);
    setEditIcon(slot!.icon ?? null);
    setEditHour(parsed.hour);
    setEditMin(parsed.min);
    setEditing(true);
  }

  function handleDeleteSlot() {
    if (!onDeleteSlot) return;
    if (Platform.OS === 'web') {
      if (window.confirm('Delete this meal slot?')) {
        onDeleteSlot(slot!.id);
        onClose();
      }
    } else {
      Alert.alert('Delete meal slot?', 'This will remove it from your calendar.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => { onDeleteSlot(slot!.id); onClose(); } },
      ]);
    }
  }

  function commitEdit() {
    if (!onUpdateSlot) return;
    const hh = String(editHour).padStart(2, '0');
    const mm = String(editMin).padStart(2, '0');
    const time = `${hh}:${mm}`;
    onUpdateSlot(slot!.id, {
      label: editLabel.trim() || slot!.label,
      time_of_day: time,
      icon: editIcon,
    });
    setEditing(false);
  }

  return (
    <Modal visible={!!slot} transparent animationType="fade" onRequestClose={editing ? () => setEditing(false) : onClose}>
      {/* This card is vertically centered rather than anchored to the bottom, so a
          translateY slide (used for bottom sheets elsewhere) would miscenter it —
          KeyboardAvoidingView instead shrinks the flex area so centering recalculates. */}
      <KeyboardAvoidingView behavior="padding" style={styles.kbAvoid}>
        <Pressable style={styles.overlay} onPress={editing ? () => setEditing(false) : onClose}>
          <Pressable style={[styles.card, { backgroundColor: theme.background }]} onPress={() => {}}>
          <View style={styles.strip} />

          {editing ? (
            <>
              <View style={styles.editHeader}>
                <Pressable onPress={() => setEditing(false)} hitSlop={8}>
                  <Text style={[styles.backText, { color: Colors.accent }]}>‹ Back</Text>
                </Pressable>
                <Text style={[styles.editTitle, { color: theme.text }]}>Edit Slot</Text>
              </View>
              <ScrollView contentContainerStyle={styles.editContent} showsVerticalScrollIndicator={false}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Label</Text>
                <TextInput
                  style={[styles.labelInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
                  value={editLabel}
                  onChangeText={setEditLabel}
                  placeholder="Slot label"
                  placeholderTextColor={theme.textSecondary}
                />

                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Time</Text>
                <View style={styles.timeEditorRow}>
                  <View style={styles.timeStepper}>
                    <Pressable style={styles.stepperBtn} onPress={() => setEditHour((h) => (h + 23) % 24)} hitSlop={6}>
                      <Text style={[styles.stepperArrow, { color: Colors.accent }]}>−</Text>
                    </Pressable>
                    <Text style={[styles.stepperValue, { color: theme.text }]}>{String(editHour).padStart(2, '0')}</Text>
                    <Pressable style={styles.stepperBtn} onPress={() => setEditHour((h) => (h + 1) % 24)} hitSlop={6}>
                      <Text style={[styles.stepperArrow, { color: Colors.accent }]}>+</Text>
                    </Pressable>
                  </View>
                  <Text style={[styles.stepperColon, { color: theme.text }]}>:</Text>
                  <View style={styles.timeStepper}>
                    <Pressable style={styles.stepperBtn} onPress={() => setEditMin((m) => (((m - 15) % 60 + 60) % 60) as 0 | 15 | 30 | 45)} hitSlop={6}>
                      <Text style={[styles.stepperArrow, { color: Colors.accent }]}>−</Text>
                    </Pressable>
                    <Text style={[styles.stepperValue, { color: theme.text }]}>{String(editMin).padStart(2, '0')}</Text>
                    <Pressable style={styles.stepperBtn} onPress={() => setEditMin((m) => ((m + 15) % 60) as 0 | 15 | 30 | 45)} hitSlop={6}>
                      <Text style={[styles.stepperArrow, { color: Colors.accent }]}>+</Text>
                    </Pressable>
                  </View>
                </View>

                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Icon</Text>
                <IconPicker value={editIcon} onChange={setEditIcon} />
              </ScrollView>
              <View style={styles.footer}>
                <Pressable style={[styles.doneBtn, { backgroundColor: Colors.accent }]} onPress={commitEdit}>
                  <Text style={styles.doneBtnText}>Save</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.detailHeader}>
                  <Text style={[styles.slotLabel, { color: theme.textSecondary }]}>{slot.label}</Text>
                  {onUpdateSlot && (
                    <Pressable onPress={startEdit} hitSlop={8}>
                      <Text style={[styles.editLink, { color: Colors.accent }]}>Edit ✎</Text>
                    </Pressable>
                  )}
                </View>

                {slot.recipes.length === 0 && slot.foods.length === 0 ? (
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Nothing planned yet</Text>
                ) : (
                  <>
                    {slot.recipes.map((entry) => (
                      <RecipeRow
                        key={entry.id}
                        entry={entry}
                        onViewRecipe={() => { onClose(); router.push(`/recipes/${entry.recipe_id}`); }}
                        onRemove={() => onRemoveRecipe(entry.id)}
                        onSaveServings={(s) => onSaveRecipeServings(entry.id, s)}
                      />
                    ))}
                    {slot.foods.map((entry) => (
                      <FoodRow
                        key={entry.id}
                        entry={entry}
                        onRemove={() => onRemoveFood?.(entry.id)}
                      />
                    ))}
                  </>
                )}

                <View style={styles.addBtnRow}>
                  <Pressable style={[styles.addBtn, styles.addBtnHalf, { borderColor: Colors.accent }]} onPress={onAddRecipe}>
                    <Text style={[styles.addBtnText, { color: Colors.accent }]}>+ Recipe</Text>
                  </Pressable>
                  {onAddFood && (
                    <Pressable style={[styles.addBtn, styles.addBtnHalf, { borderColor: Colors.accent }]} onPress={onAddFood}>
                      <Text style={[styles.addBtnText, { color: Colors.accent }]}>+ Food Item</Text>
                    </Pressable>
                  )}
                </View>
              </ScrollView>

              <View style={[styles.footer, styles.footerRow]}>
                {onDeleteSlot && (
                  <Pressable style={[styles.doneBtn, styles.deleteBtn, { flex: 1 }]} onPress={handleDeleteSlot}>
                    <Text style={[styles.doneBtnText, styles.deleteBtnText]}>Delete Slot</Text>
                  </Pressable>
                )}
                <Pressable style={[styles.doneBtn, { backgroundColor: Colors.accent, flex: 1 }]} onPress={onClose}>
                  <Text style={styles.doneBtnText}>Done</Text>
                </Pressable>
              </View>
            </>
          )}
        </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  kbAvoid: {
    flex: 1,
  } as ViewStyle,
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: Spacing.lg,
  } as ViewStyle,
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    maxHeight: '85%',
    flexShrink: 1,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 6px 16px rgba(0,0,0,0.2)' }
      : {
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
          elevation: 8,
        }),
  } as ViewStyle,
  strip: {
    height: 4,
    backgroundColor: '#4A90D9',
  } as ViewStyle,
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  } as ViewStyle,
  backText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  } as TextStyle,
  editTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
  } as TextStyle,
  editContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  } as ViewStyle,
  fieldLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  } as TextStyle,
  labelInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    fontSize: FontSizes.sm,
  } as TextStyle,
  timeEditorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  } as ViewStyle,
  timeStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  } as ViewStyle,
  stepperBtn: {
    padding: 4,
  } as ViewStyle,
  stepperArrow: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  } as TextStyle,
  stepperValue: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    minWidth: 26,
    textAlign: 'center',
  } as TextStyle,
  stepperColon: {
    fontSize: FontSizes.md,
    fontWeight: '700',
  } as TextStyle,
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  } as ViewStyle,
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  } as ViewStyle,
  slotLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,
  editLink: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  } as TextStyle,
  emptyText: {
    fontSize: FontSizes.sm,
    fontStyle: 'italic',
  } as TextStyle,
  recipeCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    gap: Spacing.xs,
  } as ViewStyle,
  recipeCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  } as ViewStyle,
  recipeTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    flexShrink: 1,
  } as TextStyle,
  foodNameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  } as ViewStyle,
  recipeCalHint: {
    fontSize: FontSizes.xs,
    marginTop: 2,
  } as TextStyle,
  removeBtn: {
    paddingTop: 2,
  } as ViewStyle,
  removeIcon: {
    fontSize: 20,
    fontWeight: '300',
    lineHeight: 22,
  } as TextStyle,
  servingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as ViewStyle,
  servingsLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
  } as TextStyle,
  servingsInput: {
    width: 72,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    fontSize: FontSizes.sm,
    textAlign: 'center',
  } as TextStyle,
  addBtnRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  } as ViewStyle,
  addBtn: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  } as ViewStyle,
  addBtnHalf: {
    flex: 1,
  } as ViewStyle,
  addBtnText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  } as TextStyle,
  footer: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
  } as ViewStyle,
  footerRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  } as ViewStyle,
  doneBtn: {
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  } as ViewStyle,
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: FontSizes.sm,
    fontWeight: '700',
  } as TextStyle,
  deleteBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E53E3E',
  } as ViewStyle,
  deleteBtnText: {
    color: '#E53E3E',
  } as TextStyle,
});
