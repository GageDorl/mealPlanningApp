import { useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const DAY_HEADERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface Props {
  visible: boolean;
  currentDate: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
  allowFuture?: boolean;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isAfterDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() > b.getFullYear() ||
    (a.getFullYear() === b.getFullYear() && a.getMonth() > b.getMonth()) ||
    (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() > b.getDate())
  );
}

export function DatePickerModal({ visible, currentDate, onSelect, onClose, allowFuture = false }: Props) {
  const theme = useTheme();
  const today = new Date();

  const [viewYear, setViewYear] = useState(() => currentDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => currentDate.getMonth());

  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (isCurrentMonth && !allowFuture) return;
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  // Sunday-first offset: getDay() already returns 0=Sun, 1=Mon, …, 6=Sat
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const startOffset = firstDayOfWeek;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = Array.from({ length: startOffset + daysInMonth }, (_, i) =>
    i < startOffset ? null : i - startOffset + 1,
  );
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  function handleDay(day: number) {
    const selected = new Date(viewYear, viewMonth, day, 12, 0, 0);
    if (!allowFuture && isAfterDay(selected, today)) return;
    onSelect(selected);
    onClose();
  }

  return (
    <Modal transparent animationType="fade" visible={visible} statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.backgroundElement }]} onPress={() => {}}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <Pressable onPress={onClose}>
              <Text style={[styles.headerAction, { color: Colors.accent }]}>Cancel</Text>
            </Pressable>
            <Text style={[styles.sheetTitle, { color: theme.text }]}>Select Date</Text>
            <View style={styles.headerActionPlaceholder} />
          </View>

          {/* Month navigation */}
          <View style={styles.monthRow}>
            <Pressable onPress={prevMonth} style={styles.monthArrow}>
              <Text style={[styles.arrowText, { color: Colors.accent }]}>‹</Text>
            </Pressable>
            <Text style={[styles.monthLabel, { color: theme.text }]}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </Text>
            <Pressable onPress={nextMonth} style={styles.monthArrow}>
              <Text style={[styles.arrowText, { color: (isCurrentMonth && !allowFuture) ? theme.border : Colors.accent }]}>›</Text>
            </Pressable>
          </View>

          {/* Day-of-week headers */}
          <View style={styles.weekRow}>
            {DAY_HEADERS.map((d, i) => (
              <Text key={i} style={[styles.dayHeader, { color: theme.textSecondary }]}>{d}</Text>
            ))}
          </View>

          {/* Day grid — explicit rows of 7 to guarantee alignment */}
          {Array.from({ length: cells.length / 7 }, (_, rowIdx) => (
            <View key={rowIdx} style={styles.gridRow}>
              {cells.slice(rowIdx * 7, rowIdx * 7 + 7).map((day, colIdx) => {
                if (day === null) return <View key={`empty-${rowIdx}-${colIdx}`} style={styles.cell} />;
                const cellDate = new Date(viewYear, viewMonth, day, 12, 0, 0);
                const isFuture = isAfterDay(cellDate, today);
                const isDisabled = isFuture && !allowFuture;
                const isSelected = sameDay(cellDate, currentDate);
                const isToday = sameDay(cellDate, today);

                return (
                  <Pressable
                    key={day}
                    style={[
                      styles.cell,
                      isSelected && { backgroundColor: Colors.accent, borderRadius: BorderRadius.full },
                      !isSelected && isToday && { borderWidth: 1.5, borderColor: Colors.accent, borderRadius: BorderRadius.full },
                    ]}
                    onPress={() => handleDay(day)}
                    disabled={isDisabled}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        { color: theme.text },
                        isSelected && { color: '#fff', fontWeight: '700' },
                        isDisabled && { color: theme.border },
                      ]}
                    >
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const CELL_SIZE = 40;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  } as ViewStyle,
  sheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingBottom: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  } as ViewStyle,
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,
  headerAction: {
    fontSize: FontSizes.md,
  } as TextStyle,
  headerActionPlaceholder: {
    width: 56,
  } as ViewStyle,
  sheetTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  } as TextStyle,
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  } as ViewStyle,
  monthArrow: {
    padding: Spacing.sm,
  } as ViewStyle,
  arrowText: {
    fontSize: 28,
    fontWeight: '300',
  } as TextStyle,
  monthLabel: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  } as TextStyle,
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.xs,
  } as ViewStyle,
  dayHeader: {
    width: CELL_SIZE,
    textAlign: 'center',
    fontSize: FontSizes.xs,
    fontWeight: '500',
  } as TextStyle,
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  } as ViewStyle,
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  } as ViewStyle,
  dayText: {
    fontSize: FontSizes.sm,
  } as TextStyle,
});
