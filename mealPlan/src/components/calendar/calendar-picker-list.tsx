import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import type { CalendarInfo } from '@/services/calendar.types';

interface CalendarPickerListProps {
  calendars: CalendarInfo[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  loading?: boolean;
}

export function CalendarPickerList({ calendars, selectedIds, onToggle, loading }: CalendarPickerListProps) {
  const theme = useTheme();

  if (loading) {
    return (
      <View style={styles.loadingRow}>
        <ActivityIndicator size="small" color={theme.textSecondary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading calendars…</Text>
      </View>
    );
  }

  if (calendars.length === 0) return null;

  // Empty selectedIds means all calendars are shown
  const isSelected = (id: string) => selectedIds.length === 0 || selectedIds.includes(id);

  return (
    <View style={[styles.container, { borderColor: theme.border }]}>
      {calendars.map((cal, idx) => {
        const selected = isSelected(cal.id);
        const isLast = idx === calendars.length - 1;
        return (
          <Pressable
            key={cal.id}
            style={[styles.row, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }]}
            onPress={() => onToggle(cal.id)}
          >
            <View
              style={[
                styles.checkbox,
                { borderColor: selected ? Colors.accent : theme.border },
                selected && { backgroundColor: Colors.accent },
              ]}
            >
              {selected && <Text style={styles.checkmark}>✓</Text>}
            </View>
            {cal.color ? <View style={[styles.colorDot, { backgroundColor: cal.color }]} /> : null}
            <Text style={[styles.calTitle, { color: theme.text }]} numberOfLines={1}>
              {cal.title}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  } as ViewStyle,
  loadingText: {
    fontSize: FontSizes.sm,
  } as TextStyle,
  container: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  } as ViewStyle,
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  } as ViewStyle,
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 15,
  } as TextStyle,
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  } as ViewStyle,
  calTitle: {
    flex: 1,
    fontSize: FontSizes.sm,
    fontWeight: '500',
  } as TextStyle,
});
