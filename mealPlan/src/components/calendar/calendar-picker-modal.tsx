import { useState, useRef } from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import type { CalendarInfo } from '@/services/calendar.types';

interface CalendarPickerModalProps {
  visible: boolean;
  calendars: CalendarInfo[];
  selectedIds: string[];
  onDone: (ids: string[]) => void;
}

export function CalendarPickerModal({ visible, calendars, selectedIds, onDone }: CalendarPickerModalProps) {
  const theme = useTheme();
  const [draft, setDraft] = useState<string[]>(selectedIds);

  // Reset draft to current selection each time the modal opens
  const prevVisible = useRef(false);
  if (visible && !prevVisible.current) {
    if (draft.join(',') !== selectedIds.join(',')) {
      setDraft(selectedIds);
    }
  }
  prevVisible.current = visible;

  const toggle = (id: string) => {
    setDraft((prev: string[]) =>
      prev.includes(id) ? prev.filter((x: string) => x !== id) : [...prev, id]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => onDone(draft)}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: theme.background }]}>
          <Text style={[styles.title, { color: theme.text }]}>Choose calendars</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Select one or more to display</Text>
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {calendars.map((cal) => {
              const selected = draft.includes(cal.id);
              return (
                <Pressable
                  key={cal.id}
                  style={[styles.row, { borderBottomColor: theme.border }]}
                  onPress={() => toggle(cal.id)}
                >
                  <View style={[styles.checkbox, { borderColor: selected ? Colors.accent : theme.border, backgroundColor: selected ? Colors.accent : 'transparent' }]}>
                    {selected && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <View style={styles.rowText}>
                    <Text style={[styles.calTitle, { color: theme.text }]}>{cal.title}</Text>
                    {cal.source ? (
                      <Text style={[styles.calSource, { color: theme.textSecondary }]}>{cal.source}</Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable
            style={[styles.doneButton, { backgroundColor: draft.length > 0 ? Colors.accent : theme.border }]}
            onPress={() => onDone(draft)}
            disabled={draft.length === 0}
          >
            <Text style={styles.doneText}>
              {draft.length === 0 ? 'Select a calendar' : `Done${draft.length > 1 ? ` (${draft.length})` : ''}`}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  } as ViewStyle,
  sheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    maxHeight: '70%',
  } as ViewStyle,
  title: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  } as TextStyle,
  subtitle: {
    fontSize: FontSizes.sm,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  } as TextStyle,
  list: {
    flexGrow: 0,
  } as ViewStyle,
  listContent: {
    paddingHorizontal: Spacing.lg,
  } as ViewStyle,
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  checkmark: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16,
  } as TextStyle,
  rowText: {
    flex: 1,
  } as ViewStyle,
  calTitle: {
    fontSize: FontSizes.md,
    fontWeight: '500',
  } as TextStyle,
  calSource: {
    fontSize: FontSizes.sm,
    marginTop: 2,
  } as TextStyle,
  doneButton: {
    marginTop: Spacing.lg,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  } as ViewStyle,
  doneText: {
    color: '#FFFFFF',
    fontSize: FontSizes.md,
    fontWeight: '700',
  } as TextStyle,
});
