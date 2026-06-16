import { ScrollView, Pressable, View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import {
  EggFried, Sandwich, Beef, Donut, Salad, Dumbbell, GlassWater, Hamburger, CakeSlice,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export const ICON_SET: { name: string; label: string }[] = [
  { name: 'EggFried', label: 'Breakfast' },
  { name: 'Sandwich', label: 'Lunch' },
  { name: 'Beef', label: 'Dinner' },
  { name: 'Donut', label: 'Snack' },
  { name: 'Salad', label: 'Salad' },
  { name: 'Dumbbell', label: 'Protein' },
  { name: 'GlassWater', label: 'Drink' },
  { name: 'Hamburger', label: 'Fast food' },
  { name: 'CakeSlice', label: 'Dessert' },
];

export const ICON_COMPONENTS: Record<string, LucideIcon> = {
  EggFried,
  Sandwich,
  Beef,
  Donut,
  Salad,
  Dumbbell,
  GlassWater,
  Hamburger,
  CakeSlice,
};

interface IconPickerProps {
  value: string | null;
  onChange: (name: string | null) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const theme = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {ICON_SET.map(({ name, label }) => {
        const selected = value === name;
        const IconComp = ICON_COMPONENTS[name];
        return (
          <Pressable
            key={name}
            style={[
              styles.chip,
              { borderColor: selected ? Colors.accent : theme.border },
              selected && styles.chipSelected,
            ]}
            onPress={() => onChange(selected ? null : name)}
          >
            <IconComp size={18} color={selected ? '#FFFFFF' : theme.text} />
            <Text style={[styles.chipLabel, { color: selected ? '#FFFFFF' : theme.textSecondary }]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingVertical: 2,
  } as ViewStyle,
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    minWidth: 56,
  } as ViewStyle,
  chipSelected: {
    backgroundColor: Colors.accent,
  } as ViewStyle,
  chipLabel: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  } as TextStyle,
});
