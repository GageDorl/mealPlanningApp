import { useRef, useEffect } from 'react';
import {
  Modal, View, Text, Pressable, FlatList, StyleSheet,
  type ViewStyle, type TextStyle, type ListRenderItem,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';

const RANGE = 52; // ±52 weeks (~1 year each direction)
const ITEM_HEIGHT = 52;

function getWeekStart(offset: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() + offset * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekRange(offset: number): string {
  const start = getWeekStart(offset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const s = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const e = end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${s} – ${e}`;
}

interface WeekPickerModalProps {
  visible: boolean;
  weekOffset: number;
  onSelect: (offset: number) => void;
  onClose: () => void;
}

export function WeekPickerModal({ visible, weekOffset, onSelect, onClose }: WeekPickerModalProps) {
  const theme = useTheme();
  const listRef = useRef<FlatList>(null);
  const offsets = Array.from({ length: RANGE * 2 + 1 }, (_, i) => i - RANGE);
  const selectedIndex = weekOffset + RANGE;

  useEffect(() => {
    if (!visible) return;
    const target = Math.max(0, Math.min(offsets.length - 1, selectedIndex));
    setTimeout(() => {
      listRef.current?.scrollToIndex({ index: target, animated: false, viewPosition: 0.4 });
    }, 80);
  }, [visible]);

  const renderItem: ListRenderItem<number> = ({ item }) => {
    const isSelected = item === weekOffset;
    const isCurrentWeek = item === 0;
    return (
      <Pressable
        style={[
          styles.row,
          { borderBottomColor: theme.border },
          isSelected && { backgroundColor: Colors.accent + '22' },
        ]}
        onPress={() => { onSelect(item); onClose(); }}
      >
        <Text style={[styles.label, { color: isSelected ? Colors.accent : theme.text }, isSelected && styles.labelSelected]}>
          {formatWeekRange(item)}
        </Text>
        {isCurrentWeek && (
          <View style={[styles.badge, { backgroundColor: Colors.accent }]}>
            <Text style={styles.badgeText}>This week</Text>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.background }]} onPress={() => {}}>
          <View style={[styles.handle, { backgroundColor: theme.border }]} />
          <Text style={[styles.title, { color: theme.text }]}>Jump to week</Text>
          <FlatList
            ref={listRef}
            data={offsets}
            renderItem={renderItem}
            keyExtractor={(item) => String(item)}
            getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
            style={styles.list}
            showsVerticalScrollIndicator={false}
            onScrollToIndexFailed={({ index }) => {
              setTimeout(() => {
                listRef.current?.scrollToIndex({ index, animated: false, viewPosition: 0.4 });
              }, 100);
            }}
          />
        </Pressable>
      </Pressable>
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
    paddingTop: Spacing.sm,
    height: '60%',
  } as ViewStyle,
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.sm,
  } as ViewStyle,
  title: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    textAlign: 'center',
    paddingBottom: Spacing.sm,
  } as TextStyle,
  list: {
    flex: 1,
  } as ViewStyle,
  row: {
    height: ITEM_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,
  label: {
    flex: 1,
    fontSize: FontSizes.md,
  } as TextStyle,
  labelSelected: {
    fontWeight: '700',
  } as TextStyle,
  badge: {
    borderRadius: BorderRadius.full,
    paddingVertical: 2,
    paddingHorizontal: Spacing.sm,
  } as ViewStyle,
  badgeText: {
    color: '#FFFFFF',
    fontSize: FontSizes.xs,
    fontWeight: '600',
  } as TextStyle,
});
