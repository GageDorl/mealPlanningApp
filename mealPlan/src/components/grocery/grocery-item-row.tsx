import { Pressable, Text, View, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface GroceryItemRowProps {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  isChecked: boolean;
  onToggle: (id: string, checked: boolean) => void;
  deficitNote?: string | null;
}

export function GroceryItemRow({ id, name, quantity, unit, isChecked, onToggle, deficitNote }: GroceryItemRowProps) {
  const theme = useTheme();

  const quantityText = quantity !== null
    ? unit ? `${quantity} ${unit}` : String(quantity)
    : unit ?? null;

  return (
    <Pressable
      style={[styles.row, { borderBottomColor: theme.border }]}
      onPress={() => onToggle(id, !isChecked)}
    >
      <View style={[
        styles.checkbox,
        { borderColor: isChecked ? Colors.accent : theme.border },
        isChecked && styles.checkboxChecked,
      ]}>
        {isChecked && <Text style={styles.checkmark}>✓</Text>}
      </View>

      <View style={styles.nameContainer}>
        <Text
          style={[styles.name, { color: isChecked ? theme.textSecondary : theme.text }, isChecked && styles.strikethrough]}
          numberOfLines={1}
        >
          {name}
        </Text>
        {deficitNote && !isChecked && (
          <Text style={[styles.deficitNote, { color: theme.textSecondary }]}>{deficitNote}</Text>
        )}
      </View>

      {quantityText && (
        <Text style={[styles.quantity, { color: theme.textSecondary }]}>{quantityText}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  } as ViewStyle,
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,
  checkboxChecked: {
    backgroundColor: Colors.accent,
  } as ViewStyle,
  checkmark: {
    color: '#FFFFFF',
    fontSize: FontSizes.xs,
    fontWeight: '700',
  } as TextStyle,
  nameContainer: {
    flex: 1,
    gap: 2,
  } as ViewStyle,
  name: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
  } as TextStyle,
  strikethrough: {
    textDecorationLine: 'line-through',
  } as TextStyle,
  deficitNote: {
    fontSize: FontSizes.xs,
    fontStyle: 'italic',
  } as TextStyle,
  quantity: {
    fontSize: FontSizes.xs,
    flexShrink: 0,
  } as TextStyle,
});
