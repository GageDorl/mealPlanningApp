import { useState, useEffect } from 'react';
import { Modal, View, Text, Pressable, TextInput, Switch, ScrollView, StyleSheet, Platform, Alert, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import type { FoodLogWithItems, FoodLogItemInput } from '@/services/food-log-service';
import type { FoodLogItem } from '@/models/food-log';
import { FatSecretAttribution } from '@/components/food/fatsecret-attribution';
import { sharePublicFood, flagPublicFood } from '@/services/public-food-service';
import { LogFoodForm } from './log-food-form';

interface FoodLogDetailModalProps {
  log: FoodLogWithItems | null;
  userId?: string;
  onClose: () => void;
  onDeleteLog: (logId: string) => void;
  onDeleteItem: (logId: string, itemId: string) => void;
  onUpdateItem: (logId: string, itemId: string, patch: Partial<FoodLogItem>) => void;
  onAddItems?: (logId: string, items: FoodLogItemInput[]) => Promise<void>;
  onUpdateTime?: (logId: string, newTime: string | null) => void;
  onSaveToLibrary?: (item: FoodLogItem) => Promise<void>;
}

function formatTime12(time24: string): string {
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10) || 0;
  const m = mStr ?? '00';
  const suffix = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return m === '00' ? `${h} ${suffix}` : `${h}:${m} ${suffix}`;
}

function macroLine(item: FoodLogItem, servings: number): string {
  const parts: string[] = [];
  if (item.calories != null) parts.push(`${Math.round(item.calories * servings)} kcal`);
  if (item.protein != null) parts.push(`${Math.round(item.protein * servings * 10) / 10}g P`);
  if (item.carbs != null) parts.push(`${Math.round(item.carbs * servings * 10) / 10}g C`);
  if (item.fat != null) parts.push(`${Math.round(item.fat * servings * 10) / 10}g F`);
  return parts.join(' · ') || '—';
}

function ItemRow({
  logId,
  item,
  onDelete,
  onUpdate,
  onSaveToLibrary,
}: {
  logId: string;
  item: FoodLogItem;
  onDelete: (logId: string, itemId: string) => void;
  onUpdate: (logId: string, itemId: string, patch: Partial<FoodLogItem>) => void;
  onSaveToLibrary?: (item: FoodLogItem) => Promise<void>;
}) {
  const theme = useTheme();
  const [servingsText, setServingsText] = useState(String(item.servings_eaten));
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shareEnabled, setShareEnabled] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [flagging, setFlagging] = useState(false);
  const [flagged, setFlagged] = useState(false);
  const [flagModalVisible, setFlagModalVisible] = useState(false);
  const [flagReason, setFlagReason] = useState('');

  function commitServings() {
    const parsed = parseFloat(servingsText);
    if (isNaN(parsed) || parsed <= 0) {
      setServingsText(String(item.servings_eaten));
      return;
    }
    if (parsed !== item.servings_eaten) {
      onUpdate(logId, item.id, { servings_eaten: parsed });
    }
  }

  async function handleSave() {
    if (!onSaveToLibrary || saving || saved) return;
    setSaving(true);
    try {
      await onSaveToLibrary(item);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  async function handleShareToggle(value: boolean) {
    setShareEnabled(value);
    if (!value) return;
    setSharing(true);
    try {
      await sharePublicFood({
        food_name: item.food_name,
        brand_name: item.brand_name,
        serving_size_amount: item.serving_size_amount,
        serving_size_unit: item.serving_size_unit ?? undefined,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        saturated_fat: item.saturated_fat,
        trans_fat: item.trans_fat,
        cholesterol: item.cholesterol,
        sodium: item.sodium,
        dietary_fiber: item.dietary_fiber,
        total_sugar: item.total_sugar,
        added_sugar: item.added_sugar,
        fatsecret_id: item.source === 'fatsecret' ? item.source_id : null,
        source: item.source === 'fatsecret' ? 'fatsecret' : 'manual',
      });
    } catch {
      setShareEnabled(false);
    } finally {
      setSharing(false);
    }
  }

  async function handleFlag() {
    if (flagging || flagged || !item.source_id) return;
    setFlagging(true);
    try {
      const success = await flagPublicFood(item.source_id, flagReason.trim() || undefined);
      if (success) {
        setFlagged(true);
      } else {
        Alert.alert('Already flagged', 'You have already flagged this food.');
      }
    } catch {
      Alert.alert('Error', 'Failed to flag food. Please try again.');
    } finally {
      setFlagging(false);
      setFlagModalVisible(false);
      setFlagReason('');
    }
  }

  const displayServings = parseFloat(servingsText) > 0 ? parseFloat(servingsText) : item.servings_eaten;

  return (
    <View style={[styles.itemRow, { borderBottomColor: theme.border }]}>
      <View style={styles.itemLeft}>
        {item.brand_name ? (
          <Text style={[styles.brandName, { color: Colors.accent }]} numberOfLines={1}>{item.brand_name}</Text>
        ) : null}
        <Text style={[styles.foodName, { color: theme.text }]} numberOfLines={1}>{item.food_name}</Text>
        <Text style={[styles.macros, { color: theme.textSecondary }]}>{macroLine(item, displayServings)}</Text>
        {item.source === 'fatsecret' ? <FatSecretAttribution style={styles.attribution} /> : null}

        {saved ? (
          <View style={styles.shareRow}>
            <Text style={[styles.shareLabel, { color: theme.textSecondary }]}>
              {sharing ? 'Sharing…' : 'Share with community?'}
            </Text>
            <Switch
              value={shareEnabled}
              onValueChange={handleShareToggle}
              disabled={sharing || shareEnabled}
              trackColor={{ false: theme.border, true: Colors.accent }}
              thumbColor="#FFFFFF"
            />
          </View>
        ) : null}

        {item.source === 'community' && item.source_id ? (
          <Pressable
            onPress={() => setFlagModalVisible(true)}
            disabled={flagged || flagging}
            hitSlop={8}
            style={styles.flagButton}
          >
            <Text style={[styles.flagButtonText, { color: flagged ? theme.textSecondary : '#E53E3E' }]}>
              {flagged ? 'Flagged' : flagging ? 'Flagging…' : 'Flag'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.itemRight}>
        {onSaveToLibrary ? (
          <Pressable onPress={handleSave} hitSlop={8} style={styles.bookmarkButton} disabled={saving || saved}>
            <Text style={[styles.bookmarkIcon, { color: saved ? Colors.accent : theme.textSecondary }]}>
              {saved ? '★' : '☆'}
            </Text>
          </Pressable>
        ) : null}
        <View style={styles.servingsRow}>
          <TextInput
            style={[styles.servingsInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
            value={servingsText}
            onChangeText={setServingsText}
            onBlur={commitServings}
            keyboardType="decimal-pad"
            selectTextOnFocus
          />
          <Text style={[styles.servingsLabel, { color: theme.textSecondary }]}>
            {item.serving_size_amount != null
              ? `× ${item.serving_size_amount}${item.serving_size_unit ?? ''}`
              : 'srv'}
          </Text>
        </View>
        <Pressable onPress={() => onDelete(logId, item.id)} hitSlop={8} style={styles.deleteItemButton}>
          <Text style={[styles.deleteIcon, { color: theme.textSecondary }]}>×</Text>
        </Pressable>
      </View>

      <Modal visible={flagModalVisible} transparent animationType="fade" onRequestClose={() => setFlagModalVisible(false)}>
        <Pressable style={styles.flagOverlay} onPress={() => setFlagModalVisible(false)}>
          <Pressable style={[styles.flagCard, { backgroundColor: theme.background }]} onPress={() => {}}>
            <Text style={[styles.flagTitle, { color: theme.text }]}>Flag this food</Text>
            <Text style={[styles.flagSubtitle, { color: theme.textSecondary }]}>
              Report incorrect or inappropriate nutrition data.
            </Text>
            <TextInput
              style={[styles.flagInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
              placeholder="Reason (optional)"
              placeholderTextColor={theme.textSecondary}
              value={flagReason}
              onChangeText={setFlagReason}
              multiline
            />
            <View style={styles.flagActions}>
              <Pressable style={[styles.flagActionBtn, { borderColor: theme.border }]} onPress={() => setFlagModalVisible(false)}>
                <Text style={[styles.flagActionText, { color: theme.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.flagActionBtn, styles.flagSubmitBtn]}
                onPress={handleFlag}
                disabled={flagging}
              >
                <Text style={styles.flagSubmitText}>{flagging ? 'Flagging…' : 'Submit'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export function FoodLogDetailModal({ log, userId, onClose, onDeleteLog, onDeleteItem, onUpdateItem, onAddItems, onUpdateTime, onSaveToLibrary }: FoodLogDetailModalProps) {
  const theme = useTheme();
  const [addingItems, setAddingItems] = useState(false);
  const [timeEditing, setTimeEditing] = useState(false);
  const [editHour, setEditHour] = useState(0);
  const [editMin, setEditMin] = useState<0 | 15 | 30 | 45>(0);

  useEffect(() => {
    setTimeEditing(false);
  }, [log?.id]);

  if (!log) return null;

  function startEditTime() {
    if (!onUpdateTime) return;
    if (log?.time_of_day) {
      const [hStr, mStr] = log.time_of_day.split(':');
      setEditHour(parseInt(hStr, 10) || 0);
      const rawMin = parseInt(mStr ?? '0', 10);
      const snapped = ([0, 15, 30, 45] as const).reduce((best, v) =>
        Math.abs(rawMin - v) < Math.abs(rawMin - best) ? v : best, 0 as 0 | 15 | 30 | 45);
      setEditMin(snapped);
    } else {
      setEditHour(12);
      setEditMin(0);
    }
    setTimeEditing(true);
  }

  function commitTime() {
    const hh = String(editHour).padStart(2, '0');
    const mm = String(editMin).padStart(2, '0');
    onUpdateTime!(log!.id, `${hh}:${mm}`);
    setTimeEditing(false);
  }

  function handleDeleteLog() {
    if (Platform.OS === 'web') {
      if (window.confirm('Delete this entire food log entry?')) {
        onDeleteLog(log!.id);
        onClose();
      }
    } else {
      Alert.alert('Delete food log?', 'This will remove all items in this entry.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => { onDeleteLog(log!.id); onClose(); } },
      ]);
    }
  }

  async function handleAddItemsSubmit(params: { label: string | null; timeOfDay: string | null; items: FoodLogItemInput[] }) {
    if (!onAddItems) return;
    await onAddItems(log!.id, params.items);
    setAddingItems(false);
  }

  const totalCals = log.items.reduce((sum, i) => sum + (i.calories ?? 0) * i.servings_eaten, 0);

  return (
    <Modal visible={!!log} transparent animationType="fade" onRequestClose={addingItems ? () => setAddingItems(false) : onClose}>
      <Pressable style={styles.overlay} onPress={addingItems ? () => setAddingItems(false) : onClose}>
        <Pressable style={[styles.card, { backgroundColor: theme.background }]} onPress={() => {}}>
          <View style={styles.strip} />

          {addingItems ? (
            <>
              <View style={styles.addHeader}>
                <Pressable onPress={() => setAddingItems(false)} hitSlop={8} style={styles.backButton}>
                  <Text style={[styles.backText, { color: Colors.accent }]}>‹ Back</Text>
                </Pressable>
                <Text style={[styles.addTitle, { color: theme.text }]}>Add Items</Text>
              </View>
              <LogFoodForm
                userId={userId}
                showLabelAndTime={false}
                onSubmit={handleAddItemsSubmit}
                onCancel={() => setAddingItems(false)}
              />
            </>
          ) : (
            <>
              <View style={styles.titleRow}>
                <View style={{ flex: 1 }}>
                  {log.label ? (
                    <Text style={[styles.logLabel, { color: theme.textSecondary }]}>{log.label.toUpperCase()}</Text>
                  ) : null}
                  {timeEditing ? (
                    <View style={styles.timeEditorRow}>
                      <View style={styles.timeStepper}>
                        <Pressable style={styles.stepperBtn} onPress={() => setEditHour((h) => (h + 23) % 24)} hitSlop={6}>
                          <Text style={[styles.stepperArrow, { color: Colors.accent }]}>−</Text>
                        </Pressable>
                        <Text style={[styles.stepperValue, { color: theme.text }]}>{String(editHour).padStart(2, '0')}</Text>
                        <Pressable style={styles.stepperBtn} onPress={() => setEditHour((h) => (h + 1) % 24)} hitSlop={6}>
                          <Text style={[styles.stepperArrow, { color: Colors.accent }]}>+</Text>
                        </Pressable>
                      </View>
                      <Text style={[styles.stepperColon, { color: theme.text }]}>:</Text>
                      <View style={styles.timeStepper}>
                        <Pressable style={styles.stepperBtn} onPress={() => setEditMin((m) => (((m - 15) % 60 + 60) % 60) as 0 | 15 | 30 | 45)} hitSlop={6}>
                          <Text style={[styles.stepperArrow, { color: Colors.accent }]}>−</Text>
                        </Pressable>
                        <Text style={[styles.stepperValue, { color: theme.text }]}>{String(editMin).padStart(2, '0')}</Text>
                        <Pressable style={styles.stepperBtn} onPress={() => setEditMin((m) => ((m + 15) % 60) as 0 | 15 | 30 | 45)} hitSlop={6}>
                          <Text style={[styles.stepperArrow, { color: Colors.accent }]}>+</Text>
                        </Pressable>
                      </View>
                      <Pressable style={[styles.timeSetButton, { backgroundColor: Colors.accent }]} onPress={commitTime}>
                        <Text style={styles.timeSetButtonText}>Set</Text>
                      </Pressable>
                      <Pressable onPress={() => setTimeEditing(false)} hitSlop={8}>
                        <Text style={[styles.timeCancelText, { color: theme.textSecondary }]}>✕</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable onPress={onUpdateTime ? startEditTime : undefined} disabled={!onUpdateTime}>
                      <Text style={[styles.title, { color: theme.text }]}>
                        {log.time_of_day ? formatTime12(log.time_of_day) : 'Untimed'}
                        {totalCals > 0 ? ` · ${Math.round(totalCals)} kcal` : ''}
                        {onUpdateTime ? <Text style={{ color: theme.textSecondary }}> ✎</Text> : null}
                      </Text>
                    </Pressable>
                  )}
                </View>
                {onAddItems && !timeEditing ? (
                  <Pressable style={[styles.addItemButton, { borderColor: Colors.accent }]} onPress={() => setAddingItems(true)}>
                    <Text style={[styles.addItemButtonText, { color: Colors.accent }]}>+ Add Item</Text>
                  </Pressable>
                ) : null}
              </View>

              <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {log.items.length === 0 ? (
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No items.</Text>
                ) : (
                  log.items.map((item) => (
                    <ItemRow
                      key={item.id}
                      logId={log.id}
                      item={item}
                      onDelete={onDeleteItem}
                      onUpdate={onUpdateItem}
                      onSaveToLibrary={onSaveToLibrary}
                    />
                  ))
                )}
              </ScrollView>

              <View style={styles.buttons}>
                <Pressable style={[styles.button, styles.deleteButton]} onPress={handleDeleteLog}>
                  <Text style={[styles.buttonText, styles.deleteButtonText]}>Delete Log</Text>
                </Pressable>
                <Pressable style={[styles.button, styles.closeButton, { backgroundColor: Colors.accent }]} onPress={onClose}>
                  <Text style={[styles.buttonText, styles.closeButtonText]}>Close</Text>
                </Pressable>
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: Spacing.lg,
  } as ViewStyle,
  card: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '80%',
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 6px 16px rgba(0,0,0,0.2)' }
      : {
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
          elevation: 8,
        }),
  } as ViewStyle,
  strip: {
    height: 4,
    backgroundColor: '#50C878',
  } as ViewStyle,
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  } as ViewStyle,
  addItemButton: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
  } as ViewStyle,
  addItemButtonText: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
  } as TextStyle,
  addHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  } as ViewStyle,
  backButton: {
    paddingRight: Spacing.xs,
  } as ViewStyle,
  backText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  } as TextStyle,
  addTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
  } as TextStyle,
  logLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  } as TextStyle,
  title: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
  } as TextStyle,
  scroll: {
    flexGrow: 0,
    maxHeight: 340,
  } as ViewStyle,
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  } as ViewStyle,
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  } as ViewStyle,
  itemLeft: {
    flex: 1,
  } as ViewStyle,
  foodName: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  } as TextStyle,
  brandName: {
    fontSize: FontSizes.xs,
    marginTop: 1,
  } as TextStyle,
  macros: {
    fontSize: FontSizes.xs,
    marginTop: 2,
  } as TextStyle,
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  } as ViewStyle,
  servingsRow: {
    alignItems: 'center',
  } as ViewStyle,
  servingsInput: {
    width: 52,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
    fontSize: FontSizes.sm,
    textAlign: 'center',
  } as TextStyle,
  servingsLabel: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  } as TextStyle,
  bookmarkButton: {
    padding: 4,
  } as ViewStyle,
  bookmarkIcon: {
    fontSize: 16,
    lineHeight: 18,
  } as TextStyle,
  deleteItemButton: {
    padding: 4,
  } as ViewStyle,
  deleteIcon: {
    fontSize: 18,
    lineHeight: 18,
    fontWeight: '400',
  } as TextStyle,
  attribution: {
    alignSelf: 'flex-start',
    marginTop: 2,
  } as ViewStyle,
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
    gap: Spacing.sm,
  } as ViewStyle,
  shareLabel: {
    fontSize: FontSizes.xs,
    flex: 1,
  } as TextStyle,
  flagButton: {
    marginTop: 4,
    alignSelf: 'flex-start',
  } as ViewStyle,
  flagButtonText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  } as TextStyle,
  flagOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: Spacing.lg,
  } as ViewStyle,
  flagCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    gap: Spacing.sm,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 4px 12px rgba(0,0,0,0.2)' }
      : { shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, elevation: 6 }),
  } as ViewStyle,
  flagTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
  } as TextStyle,
  flagSubtitle: {
    fontSize: FontSizes.xs,
  } as TextStyle,
  flagInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    fontSize: FontSizes.sm,
    minHeight: 64,
    textAlignVertical: 'top',
  } as TextStyle,
  flagActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  } as ViewStyle,
  flagActionBtn: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  } as ViewStyle,
  flagActionText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  } as TextStyle,
  flagSubmitBtn: {
    backgroundColor: '#E53E3E',
    borderColor: '#E53E3E',
  } as ViewStyle,
  flagSubmitText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: '#FFFFFF',
  } as TextStyle,
  emptyText: {
    fontSize: FontSizes.sm,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  } as TextStyle,
  buttons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    margin: Spacing.lg,
    marginTop: Spacing.sm,
  } as ViewStyle,
  button: {
    flex: 1,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  } as ViewStyle,
  deleteButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E53E3E',
  } as ViewStyle,
  deleteButtonText: {
    color: '#E53E3E',
  } as TextStyle,
  closeButton: {} as ViewStyle,
  closeButtonText: {
    color: '#FFFFFF',
  } as TextStyle,
  buttonText: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
  } as TextStyle,
  timeEditorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'nowrap',
    marginTop: 2,
  } as ViewStyle,
  timeStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  } as ViewStyle,
  stepperBtn: {
    padding: 4,
  } as ViewStyle,
  stepperArrow: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  } as TextStyle,
  stepperValue: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    minWidth: 26,
    textAlign: 'center',
  } as TextStyle,
  stepperColon: {
    fontSize: FontSizes.md,
    fontWeight: '700',
  } as TextStyle,
  timeSetButton: {
    borderRadius: BorderRadius.sm,
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
  } as ViewStyle,
  timeSetButtonText: {
    color: '#FFFFFF',
    fontSize: FontSizes.xs,
    fontWeight: '700',
  } as TextStyle,
  timeCancelText: {
    fontSize: 16,
    lineHeight: 20,
    padding: 2,
  } as TextStyle,
});
