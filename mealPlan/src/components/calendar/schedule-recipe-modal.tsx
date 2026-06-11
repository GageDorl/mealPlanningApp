import { useState, useEffect } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { DatePickerModal } from '@/components/ui/date-picker-modal';
import { Button } from '@/components/ui/button';

const MEAL_LABELS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const MONTH_ABBREVS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDate(d: Date): string {
  return `${DAY_NAMES[d.getDay()]}, ${MONTH_ABBREVS[d.getMonth()]} ${d.getDate()}`;
}

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

interface Props {
  visible: boolean;
  recipeTitle: string;
  onClose: () => void;
  onSchedule: (date: string, label: string, time: string) => Promise<void>;
}

export function ScheduleRecipeModal({ visible, recipeTitle, onClose, onSchedule }: Props) {
  const theme = useTheme();
  const today = new Date();

  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [selectedLabel, setSelectedLabel] = useState('Dinner');
  const [hour, setHour] = useState('12');
  const [minute, setMinute] = useState('00');
  const [period, setPeriod] = useState<'AM' | 'PM'>('PM');
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelectedDate(today);
      setSelectedLabel('Dinner');
      const { hour: h, minute: m, period: p } = parse24to12('18:00');
      setHour(h);
      setMinute(m);
      setPeriod(p);
      setSubmitting(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  async function handleAdd() {
    setSubmitting(true);
    try {
      await onSchedule(dateKey(selectedDate), selectedLabel, to24(hour, minute, period));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={onClose} />
          <View style={[styles.sheet, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
              <Pressable onPress={onClose}>
                <Text style={[styles.headerAction, { color: Colors.accent }]}>Cancel</Text>
              </Pressable>
              <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>Add to Calendar</Text>
              <View style={styles.headerActionPlaceholder} />
            </View>

            <Text style={[styles.recipeName, { color: theme.textSecondary }]} numberOfLines={1}>
              {recipeTitle}
            </Text>

            {/* Date */}
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Date</Text>
            <Pressable
              style={[styles.dateBtn, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
              onPress={() => setDatePickerVisible(true)}
            >
              <Text style={[styles.dateBtnText, { color: theme.text }]}>{formatDate(selectedDate)}</Text>
              <Text style={[styles.dateArrow, { color: theme.textSecondary }]}>›</Text>
            </Pressable>

            {/* Meal type */}
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Meal</Text>
            <View style={styles.chips}>
              {MEAL_LABELS.map((lbl) => (
                <Pressable
                  key={lbl}
                  style={[
                    styles.chip,
                    { borderColor: theme.border },
                    selectedLabel === lbl && { backgroundColor: Colors.accent, borderColor: Colors.accent },
                  ]}
                  onPress={() => setSelectedLabel(lbl)}
                >
                  <Text style={[styles.chipText, { color: selectedLabel === lbl ? '#fff' : theme.text }]}>
                    {lbl}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Time */}
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Time</Text>
            <View style={styles.timeRow}>
              <View style={[styles.timeInput, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
                <Text
                  style={[styles.timeText, { color: theme.text }]}
                  onPress={() => setHour((h) => String(((parseInt(h, 10) - 2 + 12) % 12) + 1))}
                >
                  ‹
                </Text>
                <Text style={[styles.timeValue, { color: theme.text }]}>{hour.padStart(2, '0')}</Text>
                <Text
                  style={[styles.timeText, { color: theme.text }]}
                  onPress={() => setHour((h) => String((parseInt(h, 10) % 12) + 1))}
                >
                  ›
                </Text>
              </View>
              <Text style={[styles.timeSep, { color: theme.text }]}>:</Text>
              <View style={[styles.timeInput, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
                <Text
                  style={[styles.timeText, { color: theme.text }]}
                  onPress={() => setMinute((m) => String((parseInt(m, 10) - 15 + 60) % 60).padStart(2, '0'))}
                >
                  ‹
                </Text>
                <Text style={[styles.timeValue, { color: theme.text }]}>{minute.padStart(2, '0')}</Text>
                <Text
                  style={[styles.timeText, { color: theme.text }]}
                  onPress={() => setMinute((m) => String((parseInt(m, 10) + 15) % 60).padStart(2, '0'))}
                >
                  ›
                </Text>
              </View>
              <Pressable
                style={[styles.periodBtn, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
                onPress={() => setPeriod((p) => (p === 'AM' ? 'PM' : 'AM'))}
              >
                <Text style={[styles.periodText, { color: theme.text }]}>{period}</Text>
              </Pressable>
            </View>

            <Button
              label={submitting ? 'Scheduling…' : 'Add to Calendar'}
              onPress={handleAdd}
              disabled={submitting}
              style={styles.addBtn}
            />
          </View>
        </View>
      </Modal>

      <DatePickerModal
        visible={datePickerVisible}
        currentDate={selectedDate}
        allowFuture
        onSelect={setSelectedDate}
        onClose={() => setDatePickerVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  } as ViewStyle,
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  } as ViewStyle,
  sheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  } as ViewStyle,
  header: {
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
    minWidth: 56,
  } as ViewStyle,
  title: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  } as TextStyle,
  recipeName: {
    fontSize: FontSizes.sm,
    textAlign: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  } as TextStyle,
  sectionLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  } as TextStyle,
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  } as ViewStyle,
  dateBtnText: {
    fontSize: FontSizes.md,
  } as TextStyle,
  dateArrow: {
    fontSize: 20,
  } as TextStyle,
  chips: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  } as ViewStyle,
  chip: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  } as ViewStyle,
  chipText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  } as TextStyle,
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  } as ViewStyle,
  timeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  } as ViewStyle,
  timeText: {
    fontSize: 20,
    fontWeight: '300',
    paddingHorizontal: 4,
  } as TextStyle,
  timeValue: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    minWidth: 28,
    textAlign: 'center',
  } as TextStyle,
  timeSep: {
    fontSize: FontSizes.lg,
    fontWeight: '300',
  } as TextStyle,
  periodBtn: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  } as ViewStyle,
  periodText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  } as TextStyle,
  addBtn: {
    marginTop: Spacing.xl,
  } as ViewStyle,
});
