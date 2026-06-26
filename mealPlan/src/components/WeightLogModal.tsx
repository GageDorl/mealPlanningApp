import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, View, type ViewStyle, type TextStyle } from 'react-native';
import { usePowerSync } from '@powersync/react-native';
import { DatePickerModal } from '@/components/ui/date-picker-modal';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { surfaces } from '@/styles/surfaces';
import { upsertWeightLog, type WeightLogEntry } from '@/services/weight-log-service';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface Props {
  visible: boolean;
  userId: string;
  onClose: () => void;
  onSaved?: () => void;
  initialDate?: Date;
}

function toNoon(d: Date): Date {
  const result = new Date(d);
  result.setHours(12, 0, 0, 0);
  return result;
}

function dateToStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDate(d: Date): string {
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function WeightLogModal({ visible, userId, onClose, onSaved, initialDate }: Props) {
  const db = usePowerSync();
  const theme = useTheme();
  const [weightInput, setWeightInput] = useState('');
  const [logDate, setLogDate] = useState(() => toNoon(initialDate ?? new Date()));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setWeightInput('');
      setLogDate(toNoon(initialDate ?? new Date()));
    }
  }, [visible, initialDate]);

  const handleSave = async () => {
    const lbs = parseFloat(weightInput);
    if (Number.isNaN(lbs) || lbs < 50 || lbs > 700) {
      Alert.alert('Invalid weight', 'Please enter a weight between 50 and 700 lbs.');
      return;
    }
    setSaving(true);
    try {
      const entry: WeightLogEntry = { date: dateToStr(logDate), weight_lbs: lbs };
      await upsertWeightLog(db, userId, entry);
      setWeightInput('');
      setLogDate(new Date());
      onSaved?.();
      onClose();
    } catch {
      Alert.alert('Error', 'Failed to save weight log.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const canSave = weightInput.length > 0 && !saving;

  return (
    <>
      <Modal transparent animationType="fade" visible={visible} statusBarTranslucent onRequestClose={handleClose}>
        <Pressable style={surfaces.sheetOverlay} onPress={handleClose}>
          <Pressable style={[styles.sheet, { backgroundColor: theme.backgroundElement }]} onPress={() => {}}>
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
              <Pressable onPress={handleClose} hitSlop={12}>
                <Text style={[styles.headerAction, { color: Colors.accent }]}>Cancel</Text>
              </Pressable>
              <Text style={[styles.title, { color: theme.text }]}>Log Weight</Text>
              <Pressable onPress={handleSave} disabled={!canSave} hitSlop={12}>
                <Text style={[styles.headerAction, { color: canSave ? Colors.accent : theme.border }]}>
                  {saving ? 'Saving…' : 'Save'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.body}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Weight (lbs)</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                value={weightInput}
                onChangeText={setWeightInput}
                keyboardType="decimal-pad"
                placeholder="e.g. 172.4"
                placeholderTextColor={theme.textSecondary}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />

              <Text style={[styles.label, { color: theme.textSecondary, marginTop: Spacing.md }]}>Date</Text>
              <Pressable
                style={[styles.datePressable, { backgroundColor: theme.background, borderColor: theme.border }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={[styles.dateText, { color: theme.text }]}>{formatDate(logDate)}</Text>
                <Text style={[styles.dateChevron, { color: Colors.accent }]}>›</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <DatePickerModal
        visible={showDatePicker}
        currentDate={logDate}
        onSelect={setLogDate}
        onClose={() => setShowDatePicker(false)}
        allowFuture={false}
      />
    </>
  );
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingBottom: Spacing.xxxl,
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,
  headerAction: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  } as TextStyle,
  title: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  } as TextStyle,
  body: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  } as ViewStyle,
  label: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  } as TextStyle,
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSizes.lg,
    fontWeight: '500',
  } as TextStyle,
  datePressable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  } as ViewStyle,
  dateText: {
    fontSize: FontSizes.md,
    fontWeight: '500',
  } as TextStyle,
  dateChevron: {
    fontSize: 22,
    fontWeight: '300',
  } as TextStyle,
});
