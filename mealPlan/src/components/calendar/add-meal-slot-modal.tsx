import { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, KeyboardAvoidingView, Platform, type ViewStyle, type TextStyle } from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AddMealSlotModalProps {
  visible: boolean;
  date: string;
  initialTime?: string;
  onClose: () => void;
  onAdd: (label: string, time?: string) => void;
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

export function AddMealSlotModal({ visible, date, initialTime, onClose, onAdd }: AddMealSlotModalProps) {
  const theme = useTheme();
  const [label, setLabel] = useState('');

  const init = initialTime ? parse24to12(initialTime) : { hour: '12', minute: '00', period: 'PM' as const };
  const [hour, setHour] = useState(init.hour);
  const [minute, setMinute] = useState(init.minute);
  const [period, setPeriod] = useState<'AM' | 'PM'>(init.period);

  useEffect(() => {
    if (visible) {
      const parsed = initialTime ? parse24to12(initialTime) : { hour: '12', minute: '00', period: 'PM' as const };
      setHour(parsed.hour);
      setMinute(parsed.minute);
      setPeriod(parsed.period);
      setLabel('');
    }
  }, [visible, initialTime]);

  const handleAdd = () => {
    if (!label.trim()) return;
    const time24 = to24(hour, minute, period);
    onAdd(label.trim(), time24 || undefined);
    onClose();
  };

  const handleQuickLabel = (quickLabel: string) => {
    setLabel(quickLabel);
  };

  const [year, month, day] = date.split('-').map(Number);
  const formattedDate = new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.kavWrapper} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.background }]} onPress={()=>{}}>
          <Text style={[styles.title, { color: theme.text }]}>Add Meal Slot</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{formattedDate}</Text>

          <View style={styles.quickLabels}>
            {QUICK_LABELS.map((ql) => (
              <Pressable
                key={ql}
                style={[
                  styles.chip,
                  { borderColor: theme.border },
                  label === ql && { backgroundColor: Colors.accent, borderColor: Colors.accent },
                ]}
                onPress={() => handleQuickLabel(ql)}
              >
                <Text style={[styles.chipText, { color: theme.text }, label === ql && { color: '#FFFFFF' }]}>{ql}</Text>
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
            <View style={styles.periodToggle}>
              <Pressable
                style={[styles.periodBtn, period === 'AM' && { backgroundColor: Colors.accent }]}
                onPress={() => setPeriod('AM')}
              >
                <Text style={[styles.periodText, period === 'AM' && { color: '#FFFFFF' }]}>AM</Text>
              </Pressable>
              <Pressable
                style={[styles.periodBtn, period === 'PM' && { backgroundColor: Colors.accent }]}
                onPress={() => setPeriod('PM')}
              >
                <Text style={[styles.periodText, period === 'PM' && { color: '#FFFFFF' }]}>PM</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.actions}>
            <Button label="Cancel" onPress={onClose} variant="secondary" />
            <Button label="Add Slot" onPress={handleAdd} disabled={!label.trim()} />
          </View>
        </Pressable>
      </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  kavWrapper: {
    flex: 1,
  } as ViewStyle,
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  } as ViewStyle,
  sheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.md,
  } as ViewStyle,
  title: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
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
  chipText: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
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
    borderColor: Colors.accent,
    marginLeft: Spacing.sm,
  } as ViewStyle,
  periodBtn: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  } as ViewStyle,
  periodText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.accent,
  } as TextStyle,
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  } as ViewStyle,
});
