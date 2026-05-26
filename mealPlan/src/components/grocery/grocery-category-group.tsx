import { useState } from 'react';
import { Pressable, Text, View, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { GroceryItemRow } from './grocery-item-row';
import type { GroceryItemRow as GroceryItemData } from '@/services/grocery-service';

interface GroceryCategoryGroupProps {
  displayLabel: string;
  items: GroceryItemData[];
  onToggleItem: (id: string, checked: boolean) => void;
}

export function GroceryCategoryGroup({ displayLabel, items, onToggleItem }: GroceryCategoryGroupProps) {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(true);

  const checkedCount = items.filter((i) => i.is_checked).length;
  const allChecked = checkedCount === items.length;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundElement }]}>
      <Pressable
        style={({ pressed }) => [styles.header, pressed && styles.headerPressed]}
        onPress={() => setIsOpen((v) => !v)}
      >
        <Text style={[styles.label, { color: theme.text }]}>{displayLabel}</Text>
        <View style={styles.headerRight}>
          <Text style={[styles.count, { color: allChecked ? theme.textSecondary : theme.text }]}>
            {checkedCount}/{items.length}
          </Text>
          <Text style={[styles.chevron, { color: theme.textSecondary }]}>
            {isOpen ? '▾' : '▸'}
          </Text>
        </View>
      </Pressable>

      {isOpen && (
        <View style={styles.itemList}>
          {items.map((item) => (
            <GroceryItemRow
              key={item.id}
              id={item.id}
              name={item.name}
              quantity={item.quantity}
              unit={item.unit}
              isChecked={item.is_checked}
              onToggle={onToggleItem}
              deficitNote={item.deficit_note}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  } as ViewStyle,
  headerPressed: {
    opacity: 0.7,
  } as ViewStyle,
  label: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  } as ViewStyle,
  count: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  } as TextStyle,
  chevron: {
    fontSize: FontSizes.sm,
  } as TextStyle,
  itemList: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  } as ViewStyle,
});
