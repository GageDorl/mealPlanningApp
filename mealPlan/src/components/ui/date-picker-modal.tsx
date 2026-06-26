import { useEffect, useRef, useState } from 'react';
import { Modal, ScrollView, View, Text, Pressable, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { surfaces } from '@/styles/surfaces';

const DAY_HEADERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type Mode = 'cal' | 'month' | 'year';

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
  const yearScrollRef = useRef<ScrollView>(null);

  const [mode, setMode] = useState<Mode>('cal');
  const [viewYear, setViewYear] = useState(() => currentDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => currentDate.getMonth());

  const minYear = today.getFullYear() - 120;
  const maxYear = allowFuture ? today.getFullYear() + 10 : today.getFullYear();
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i);

  useEffect(() => {
    if (visible) {
      setViewYear(currentDate.getFullYear());
      setViewMonth(currentDate.getMonth());
      setMode('cal');
    }
  }, [visible, currentDate]);

  // Scroll year list so the selected year is near the top
  useEffect(() => {
    if (mode === 'year') {
      const idx = years.indexOf(viewYear);
      if (idx >= 0) {
        setTimeout(() => {
          yearScrollRef.current?.scrollTo({ y: idx * YEAR_ROW_H, animated: false });
        }, 50);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }

  function nextMonth() {
    if (isCurrentMonth && !allowFuture) return;
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  function pickMonth(m: number) {
    // Clamp to today's month if needed
    if (!allowFuture && viewYear === today.getFullYear() && m > today.getMonth()) {
      setViewMonth(today.getMonth());
    } else {
      setViewMonth(m);
    }
    setMode('cal');
  }

  function pickYear(y: number) {
    setViewYear(y);
    // Clamp month when switching to current year without allowFuture
    if (!allowFuture && y === today.getFullYear() && viewMonth > today.getMonth()) {
      setViewMonth(today.getMonth());
    }
    setMode('cal');
  }

  // Calendar grid
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = Array.from({ length: firstDayOfWeek + daysInMonth }, (_, i) =>
    i < firstDayOfWeek ? null : i - firstDayOfWeek + 1,
  );
  while (cells.length % 7 !== 0) cells.push(null);

  function handleDay(day: number) {
    const selected = new Date(viewYear, viewMonth, day, 12, 0, 0);
    if (!allowFuture && isAfterDay(selected, today)) return;
    onSelect(selected);
    onClose();
  }

  const headerTitle = mode === 'month' ? 'Month' : mode === 'year' ? 'Year' : 'Select Date';

  return (
    <Modal transparent animationType="fade" visible={visible} statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={surfaces.sheetOverlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.backgroundElement }]} onPress={() => {}}>

          {/* Header */}
          <View style={[styles.sheetHeader, { borderBottomColor: theme.border }]}>
            <Pressable onPress={onClose}>
              <Text style={[styles.headerAction, { color: Colors.accent }]}>Cancel</Text>
            </Pressable>
            <Text style={[styles.sheetTitle, { color: theme.text }]}>{headerTitle}</Text>
            {mode !== 'cal' ? (
              <Pressable onPress={() => setMode('cal')}>
                <Text style={[styles.headerAction, { color: Colors.accent }]}>Done</Text>
              </Pressable>
            ) : (
              <View style={styles.headerActionPlaceholder} />
            )}
          </View>

          {/* ── Calendar view ── */}
          {mode === 'cal' && (
            <>
              <View style={styles.monthRow}>
                <Pressable onPress={prevMonth} style={styles.monthArrow}>
                  <Text style={[styles.arrowText, { color: Colors.accent }]}>‹</Text>
                </Pressable>

                <View style={styles.monthLabelGroup}>
                  <Pressable onPress={() => setMode('month')} style={styles.labelChip}>
                    <Text style={[styles.monthLabelText, { color: theme.text }]}>
                      {MONTH_NAMES[viewMonth]}
                    </Text>
                    <Text style={[styles.labelChipCaret, { color: theme.textSecondary }]}>▾</Text>
                  </Pressable>
                  <Pressable onPress={() => setMode('year')} style={styles.labelChip}>
                    <Text style={[styles.monthLabelText, { color: theme.text }]}>
                      {viewYear}
                    </Text>
                    <Text style={[styles.labelChipCaret, { color: theme.textSecondary }]}>▾</Text>
                  </Pressable>
                </View>

                <Pressable onPress={nextMonth} style={styles.monthArrow}>
                  <Text style={[styles.arrowText, { color: (isCurrentMonth && !allowFuture) ? theme.border : Colors.accent }]}>›</Text>
                </Pressable>
              </View>

              <View style={styles.weekRow}>
                {DAY_HEADERS.map((d, i) => (
                  <Text key={i} style={[styles.dayHeader, { color: theme.textSecondary }]}>{d}</Text>
                ))}
              </View>

              {Array.from({ length: cells.length / 7 }, (_, rowIdx) => (
                <View key={rowIdx} style={styles.gridRow}>
                  {cells.slice(rowIdx * 7, rowIdx * 7 + 7).map((day, colIdx) => {
                    if (day === null) return <View key={`e-${rowIdx}-${colIdx}`} style={styles.cell} />;
                    const cellDate = new Date(viewYear, viewMonth, day, 12, 0, 0);
                    const isDisabled = !allowFuture && isAfterDay(cellDate, today);
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
                        <Text style={[
                          styles.dayText,
                          { color: theme.text },
                          isSelected && { color: '#fff', fontWeight: '700' },
                          isDisabled && { color: theme.border },
                        ]}>
                          {day}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </>
          )}

          {/* ── Month picker ── */}
          {mode === 'month' && (
            <View style={styles.monthGrid}>
              {MONTH_SHORT.map((name, m) => {
                const isDisabled = !allowFuture && viewYear === today.getFullYear() && m > today.getMonth();
                const isSelected = m === viewMonth;
                return (
                  <Pressable
                    key={m}
                    style={[
                      styles.monthCell,
                      isSelected && { backgroundColor: Colors.accent, borderRadius: BorderRadius.md },
                    ]}
                    onPress={() => !isDisabled && pickMonth(m)}
                    disabled={isDisabled}
                  >
                    <Text style={[
                      styles.monthCellText,
                      { color: theme.text },
                      isSelected && { color: '#fff', fontWeight: '700' },
                      isDisabled && { color: theme.border },
                    ]}>
                      {name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* ── Year picker ── */}
          {mode === 'year' && (
            <ScrollView
              ref={yearScrollRef}
              style={styles.yearScroll}
              showsVerticalScrollIndicator={false}
            >
              {years.map((y) => {
                const isSelected = y === viewYear;
                return (
                  <Pressable
                    key={y}
                    style={[
                      styles.yearRow,
                      isSelected && { backgroundColor: `${Colors.accent}18` },
                    ]}
                    onPress={() => pickYear(y)}
                  >
                    <Text style={[
                      styles.yearText,
                      { color: theme.text },
                      isSelected && { color: Colors.accent, fontWeight: '700' },
                    ]}>
                      {y}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

        </Pressable>
      </Pressable>
    </Modal>
  );
}

const CELL_SIZE = 40;
const YEAR_ROW_H = 44;

const styles = StyleSheet.create({
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
    minWidth: 56,
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
  monthLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  } as ViewStyle,
  labelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 4,
    paddingHorizontal: 6,
  } as ViewStyle,
  monthLabelText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  } as TextStyle,
  labelChipCaret: {
    fontSize: 10,
    marginTop: 1,
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
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  } as ViewStyle,
  monthCell: {
    width: '33.33%',
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  monthCellText: {
    fontSize: FontSizes.md,
    fontWeight: '500',
  } as TextStyle,
  yearScroll: {
    maxHeight: 280,
    marginTop: Spacing.sm,
  } as ViewStyle,
  yearRow: {
    height: YEAR_ROW_H,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  } as ViewStyle,
  yearText: {
    fontSize: FontSizes.md,
    fontWeight: '500',
  } as TextStyle,
});
