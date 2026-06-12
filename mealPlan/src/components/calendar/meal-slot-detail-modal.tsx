import { useState, useCallback } from 'react';
import { Modal, View, Text, Pressable, TextInput, ScrollView, StyleSheet, Platform, type ViewStyle, type TextStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import type { MealSlotWithRecipe, MealSlotRecipeEntry } from '@/services/meal-plan-service';

interface MealSlotDetailModalProps {
  slot: MealSlotWithRecipe | null;
  onClose: () => void;
  onAddRecipe: () => void;
  onRemoveRecipe: (slotRecipeId: string) => void;
  onSaveRecipeServings: (slotRecipeId: string, servings: number | null) => void;
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

export function MealSlotDetailModal({ slot, onClose, onAddRecipe, onRemoveRecipe, onSaveRecipeServings }: MealSlotDetailModalProps) {
  const theme = useTheme();
  const router = useRouter();

  if (!slot) return null;

  return (
    <Modal
      visible={!!slot}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.card, { backgroundColor: theme.background }]} onPress={() => {}}>
          <View style={styles.strip} />

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={[styles.slotLabel, { color: theme.textSecondary }]}>{slot.label}</Text>

            {slot.recipes.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No recipes assigned</Text>
            ) : (
              slot.recipes.map((entry) => (
                <RecipeRow
                  key={entry.id}
                  entry={entry}
                  onViewRecipe={() => { onClose(); router.push(`/recipes/${entry.recipe_id}`); }}
                  onRemove={() => onRemoveRecipe(entry.id)}
                  onSaveServings={(s) => onSaveRecipeServings(entry.id, s)}
                />
              ))
            )}

            <Pressable style={[styles.addBtn, { borderColor: Colors.accent }]} onPress={onAddRecipe}>
              <Text style={[styles.addBtnText, { color: Colors.accent }]}>+ Add Recipe</Text>
            </Pressable>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={[styles.doneBtn, { backgroundColor: Colors.accent }]} onPress={onClose}>
              <Text style={styles.doneBtnText}>Done</Text>
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
    maxWidth: 420,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    maxHeight: '85%',
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
    gap: Spacing.sm,
  } as ViewStyle,
  slotLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
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
  } as TextStyle,
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
  addBtn: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    marginTop: Spacing.xs,
  } as ViewStyle,
  addBtnText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  } as TextStyle,
  footer: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
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
});
