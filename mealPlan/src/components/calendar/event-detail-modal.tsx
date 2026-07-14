import { Modal, View, Text, Pressable, ScrollView, StyleSheet, Platform, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import type { CalendarEvent } from '@/services/calendar.types';

interface EventDetailModalProps {
  event: CalendarEvent | null;
  onClose: () => void;
}

function formatFullDate(date: Date): string {
  return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatDuration(startDate: Date, endDate: Date): string {
  const ms = endDate.getTime() - startDate.getTime();
  if (ms <= 0) return '—';
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function EventDetailModal({ event, onClose }: EventDetailModalProps) {
  const theme = useTheme();

  if (!event) return null;

  return (
    <Modal visible={!!event} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.card, { backgroundColor: theme.background }]} onPress={() => {}}>
          {/* Accent strip */}
          <View style={styles.strip} />

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {event.isBento && (
              <View style={styles.bentoBadge}>
                <Text style={styles.bentoBadgeText}>Bento meal</Text>
              </View>
            )}
            <Text style={[styles.title, { color: theme.text }]}>{event.title}</Text>

            {event.isAllDay ? (
              <Text style={[styles.timeRow, { color: theme.textSecondary }]}>
                {formatFullDate(event.startDate)} · All day
              </Text>
            ) : (
              <Text style={[styles.timeRow, { color: theme.textSecondary }]}>
                {formatFullDate(event.startDate)}
              </Text>
            )}

            {!event.isAllDay && (
              <View style={[styles.row, { borderBottomColor: theme.border }]}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Time</Text>
                <Text style={[styles.value, { color: theme.text }]}>
                  {formatTime(event.startDate)} – {formatTime(event.endDate)}
                </Text>
              </View>
            )}

            <View style={[styles.row, { borderBottomColor: theme.border }]}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Duration</Text>
              <Text style={[styles.value, { color: theme.text }]}>
                {event.isAllDay ? 'All day' : formatDuration(event.startDate, event.endDate)}
              </Text>
            </View>

          </ScrollView>

          <Pressable style={[styles.closeButton, { backgroundColor: Colors.accent }]} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
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
    maxWidth: 420,
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
    backgroundColor: '#4A90D9',
  } as ViewStyle,
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.sm,
  } as ViewStyle,
  bentoBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    marginBottom: Spacing.sm,
  } as ViewStyle,
  bentoBadgeText: {
    color: '#FFFFFF',
    fontSize: FontSizes.xs,
    fontWeight: '700',
  } as TextStyle,
  title: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  } as TextStyle,
  timeRow: {
    fontSize: FontSizes.sm,
    marginBottom: Spacing.md,
  } as TextStyle,
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,
  label: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
  } as TextStyle,
  value: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: Spacing.md,
  } as TextStyle,
  closeButton: {
    margin: Spacing.lg,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  } as ViewStyle,
  closeText: {
    color: '#FFFFFF',
    fontSize: FontSizes.sm,
    fontWeight: '700',
  } as TextStyle,
});
