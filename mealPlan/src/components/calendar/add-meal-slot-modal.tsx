import { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, Animated, Alert, type ViewStyle, type TextStyle } from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useKeyboardSlide } from '@/hooks/use-keyboard-slide';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogFoodForm, type LogFoodSubmitParams } from './log-food-form';
import type { Recipe } from '@/models/recipe';
import Ionicons from '@expo/vector-icons/Ionicons';
import { IconPicker } from '@/components/ui/icon-picker';

interface AddMealSlotModalProps {
  visible: boolean;
  date: string;
  initialTime?: string;
  userId?: string;
  onClose: () => void;
  onAdd: (label: string, time?: string, recipe?: Recipe, icon?: string | null) => void;
  onLogFood: (date: string, params: LogFoodSubmitParams) => Promise<void>;
  onPickRecipe: (onPicked: (recipe: Recipe) => void) => void;
}

const QUICK_LABELS = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Post-workout'];

function parse24to12(time24: string): { hour: string; minute: string; period: 'AM' | 'PM' } {
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10) || 0;
  const minute = mStr ?? '00';
  const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return { hour: String(h), minute, period };
}

function to24(hour: string, minute: string, period: 'AM' | 'PM'): string {
  let h = parseInt(hour, 10) || 0;
  if (period === 'AM' && h === 12) h = 0;
  else if (period === 'PM' && h !== 12) h += 12;
  return `${String(h).padStart(2, '0')}:${minute.padStart(2, '0')}`;
}

type Mode = 'plan' | 'log';

export function AddMealSlotModal({ visible, date, initialTime, userId, onClose, onAdd, onLogFood, onPickRecipe }: AddMealSlotModalProps) {
  const theme = useTheme();
  const [mode, setMode] = useState<Mode>('plan');
  const [label, setLabel] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [icon, setIcon] = useState<string | null>(null);

  const init = initialTime ? parse24to12(initialTime) : { hour: '12', minute: '00', period: 'PM' as const };
  const [hour, setHour] = useState(init.hour);
  const [minute, setMinute] = useState(init.minute);
  const [period, setPeriod] = useState<'AM' | 'PM'>(init.period);

  useEffect(() => {
    if (visible) {
      setMode('plan');
      const parsed = initialTime ? parse24to12(initialTime) : { hour: '12', minute: '00', period: 'PM' as const };
      setHour(parsed.hour);
      setMinute(parsed.minute);
      setPeriod(parsed.period);
      setLabel('');
      setSelectedRecipe(null);
      setIcon(null);
    }
  }, [visible, initialTime]);

  const handleAdd = () => {
    if (!label.trim()) return;
    onAdd(label.trim(), to24(hour, minute, period) || undefined, selectedRecipe ?? undefined, icon);
    onClose();
  };

  const handleLogFood = async (params: LogFoodSubmitParams) => {
    try {
      await onLogFood(date, params);
      onClose();
    } catch (e) {
      Alert.alert('Failed to log food', e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const keyboardSlide = useKeyboardSlide();

  const [year, month, day] = date.split('-').map(Number);
  const formattedDate = new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: 'long', month: 'short', day: 'numeric',
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} />
        <Animated.View
          style={[styles.sheet, { backgroundColor: theme.background, transform: [{ translateY: keyboardSlide }] }]}
        >
          <Pressable style={styles.closeButton} onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={22} color={theme.textSecondary} />
          </Pressable>

          {/* Mode toggle */}
          <View style={[styles.modeToggle, { backgroundColor: theme.backgroundElement }]}>
            <Pressable
              style={[styles.modeBtn, mode === 'plan' && styles.modeBtnActive]}
              onPress={() => setMode('plan')}
            >
              <Text style={[styles.modeBtnText, { color: theme.text }, mode === 'plan' && styles.modeBtnTextActive]}>
                Plan Recipe
              </Text>
            </Pressable>
            <Pressable
              style={[styles.modeBtn, mode === 'log' && styles.modeBtnActive]}
              onPress={() => setMode('log')}
            >
              <Text style={[styles.modeBtnText, { color: theme.text }, mode === 'log' && styles.modeBtnTextActive]}>
                Log Food
              </Text>
            </Pressable>
          </View>

          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{formattedDate}</Text>

          {mode === 'plan' ? (
            <>
              <IconPicker value={icon} onChange={setIcon} />

              <View style={styles.quickLabels}>
                {QUICK_LABELS.map((ql) => (
                  <Pressable
                    key={ql}
                    style={[styles.chip, { borderColor: theme.border }, label === ql && styles.chipActive]}
                    onPress={() => setLabel(ql)}
                  >
                    <Text style={[styles.chipText, { color: theme.text }, label === ql && styles.chipTextActive]}>{ql}</Text>
                  </Pressable>
                ))}
              </View>

              <Input placeholder="Custom label..." value={label} onChangeText={setLabel} />

              <View style={styles.timeRow}>
                <Input
                  placeholder="12"
                  value={hour}
                  onChangeText={(v) => setHour(v.replace(/[^0-9]/g, '').slice(0, 2))}
                  keyboardType="number-pad"
                  style={styles.timeInput}
                  containerStyle={styles.timeInputContainer}
                />
                <Text style={[styles.timeSeparator, { color: theme.text }]}>:</Text>
                <Input
                  placeholder="00"
                  value={minute}
                  onChangeText={(v) => setMinute(v.replace(/[^0-9]/g, '').slice(0, 2))}
                  keyboardType="number-pad"
                  style={styles.timeInput}
                  containerStyle={styles.timeInputContainer}
                />
                <View style={[styles.periodToggle, { borderColor: Colors.accent }]}>
                  <Pressable style={[styles.periodBtn, period === 'AM' && styles.periodBtnActive]} onPress={() => setPeriod('AM')}>
                    <Text style={[styles.periodText, period === 'AM' && styles.periodTextActive]}>AM</Text>
                  </Pressable>
                  <Pressable style={[styles.periodBtn, period === 'PM' && styles.periodBtnActive]} onPress={() => setPeriod('PM')}>
                    <Text style={[styles.periodText, period === 'PM' && styles.periodTextActive]}>PM</Text>
                  </Pressable>
                </View>
              </View>

              <Pressable
                style={[styles.recipePicker, { borderColor: selectedRecipe ? Colors.accent : theme.border }]}
                onPress={() => onPickRecipe(setSelectedRecipe)}
              >
                {selectedRecipe ? (
                  <View style={styles.recipePickerFilled}>
                    <Text style={[styles.recipePickerText, { color: theme.text }]} numberOfLines={1}>
                      {selectedRecipe.title}
                    </Text>
                    <Pressable onPress={() => setSelectedRecipe(null)} hitSlop={8}>
                      <Text style={[styles.recipePickerClear, { color: theme.textSecondary }]}>×</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Text style={[styles.recipePickerEmpty, { color: theme.textSecondary }]}>
                    + Add recipe (optional)
                  </Text>
                )}
              </Pressable>

              <View style={styles.actions}>
                <Button label="Cancel" onPress={onClose} variant="secondary" />
                <Button label="Add Slot" onPress={handleAdd} disabled={!label.trim()} />
              </View>
            </>
          ) : (
            <LogFoodForm
              initialTime={initialTime}
              userId={userId}
              onSubmit={handleLogFood}
              onCancel={onClose}
            />
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  } as ViewStyle,
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  } as ViewStyle,
  sheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.md,
  } as ViewStyle,
  closeButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    zIndex: 1,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  modeToggle: {
    flexDirection: 'row',
    borderRadius: BorderRadius.md,
    padding: 3,
  } as ViewStyle,
  modeBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  } as ViewStyle,
  modeBtnActive: {
    backgroundColor: Colors.accent,
  } as ViewStyle,
  modeBtnText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  } as TextStyle,
  modeBtnTextActive: {
    color: '#FFFFFF',
  } as TextStyle,
  subtitle: {
    fontSize: FontSizes.sm,
  } as TextStyle,
  quickLabels: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  } as ViewStyle,
  chip: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  } as ViewStyle,
  chipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  } as ViewStyle,
  chipText: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
  } as TextStyle,
  chipTextActive: {
    color: '#FFFFFF',
  } as TextStyle,
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  } as ViewStyle,
  timeInput: {
    textAlign: 'center',
  } as TextStyle,
  timeInputContainer: {
    width: 52,
  } as ViewStyle,
  timeSeparator: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
  } as TextStyle,
  periodToggle: {
    flexDirection: 'row',
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    borderWidth: 1,
    marginLeft: Spacing.sm,
  } as ViewStyle,
  periodBtn: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  } as ViewStyle,
  periodBtnActive: {
    backgroundColor: Colors.accent,
  } as ViewStyle,
  periodText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.accent,
  } as TextStyle,
  periodTextActive: {
    color: '#FFFFFF',
  } as TextStyle,
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  } as ViewStyle,
  recipePicker: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  } as ViewStyle,
  recipePickerFilled: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  } as ViewStyle,
  recipePickerText: {
    flex: 1,
    fontSize: FontSizes.sm,
    fontWeight: '500',
  } as TextStyle,
  recipePickerClear: {
    fontSize: 20,
    lineHeight: 20,
    fontWeight: '300',
  } as TextStyle,
  recipePickerEmpty: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
    textAlign: 'center',
  } as TextStyle,
});
