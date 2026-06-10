import { useState } from 'react';
import { Modal, View, Text, Pressable, TextInput, ScrollView, StyleSheet, Platform, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import type { MealSlotWithRecipe } from '@/services/meal-plan-service';

interface MealSlotDetailModalProps {
  slot: MealSlotWithRecipe | null;
  onClose: () => void;
  onSaveServings: (slotId: string, servings: number | null) => void;
}

export function MealSlotDetailModal({ slot, onClose, onSaveServings }: MealSlotDetailModalProps) {
  const theme = useTheme();
  const [servingsInput, setServingsInput] = useState('');

  // Reset input whenever slot changes
  const currentServings = slot?.servings_eaten ?? slot?.serving_override ?? slot?.recipe?.servings ?? 1;

  if (!slot) return null;

  const recipe = slot.recipe ?? null;

  function handleOpen() {
    setServingsInput(String(currentServings));
  }

  function handleSave() {
    const parsed = parseFloat(servingsInput);
    const value = isNaN(parsed) || parsed <= 0 ? null : parsed;
    onSaveServings(slot!.id, value);
    onClose();
  }

  const scaledCalories = recipe?.calories_per_serving != null
    ? Math.round(recipe.calories_per_serving * (parseFloat(servingsInput) || currentServings) / (recipe.servings || 1))
    : null;

  return (
    <Modal
      visible={!!slot}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onShow={handleOpen}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.card, { backgroundColor: theme.background }]} onPress={() => {}}>
          <View style={styles.strip} />

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>{slot.label}</Text>
            <Text style={[styles.title, { color: theme.text }]}>
              {recipe?.title ?? 'No recipe assigned'}
            </Text>

            {recipe && (
              <>
                <View style={[styles.row, { borderBottomColor: theme.border }]}>
                  <Text style={[styles.rowLabel, { color: theme.textSecondary }]}>Recipe servings</Text>
                  <Text style={[styles.rowValue, { color: theme.text }]}>{recipe.servings ?? '—'}</Text>
                </View>

                <View style={[styles.row, { borderBottomColor: theme.border }]}>
                  <Text style={[styles.rowLabel, { color: theme.textSecondary }]}>Calories / serving</Text>
                  <Text style={[styles.rowValue, { color: theme.text }]}>
                    {recipe.calories_per_serving != null ? `${recipe.calories_per_serving} kcal` : '—'}
                  </Text>
                </View>

                <View style={[styles.inputRow, { borderBottomColor: theme.border }]}>
                  <Text style={[styles.rowLabel, { color: theme.textSecondary }]}>Servings eaten</Text>
                  <TextInput
                    style={[styles.servingsInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
                    value={servingsInput}
                    onChangeText={setServingsInput}
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                    placeholder={String(currentServings)}
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>

                {scaledCalories != null && (
                  <Text style={[styles.calorieHint, { color: theme.textSecondary }]}>
                    ≈ {scaledCalories} kcal total
                  </Text>
                )}
              </>
            )}
          </ScrollView>

          <View style={styles.buttons}>
            <Pressable style={[styles.button, styles.cancelButton, { borderColor: theme.border }]} onPress={onClose}>
              <Text style={[styles.buttonText, { color: theme.text }]}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.saveButton, { backgroundColor: Colors.accent }]} onPress={handleSave}>
              <Text style={[styles.buttonText, styles.saveButtonText]}>Save</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: Spacing.lg,
  } as ViewStyle,
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
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
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.sm,
  } as ViewStyle,
  label: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  } as TextStyle,
  title: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    marginBottom: Spacing.md,
  } as TextStyle,
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,
  rowLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
  } as TextStyle,
  rowValue: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
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
  calorieHint: {
    fontSize: FontSizes.xs,
    marginTop: Spacing.sm,
    textAlign: 'right',
  } as TextStyle,
  buttons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    margin: Spacing.lg,
    marginTop: Spacing.sm,
  } as ViewStyle,
  button: {
    flex: 1,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  } as ViewStyle,
  cancelButton: {
    borderWidth: 1,
  } as ViewStyle,
  saveButton: {} as ViewStyle,
  buttonText: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
  } as TextStyle,
  saveButtonText: {
    color: '#FFFFFF',
  } as TextStyle,
});
