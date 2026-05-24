import { Modal, View, Text, Pressable, ScrollView, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
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

  const durationMs = event.endDate.getTime() - event.startDate.getTime();
  const durationMin = Math.round(durationMs / 60000);
  const startMinFromMidnight = event.startDate.getHours() * 60 + event.startDate.getMinutes();
  const endMinFromMidnight = event.endDate.getHours() * 60 + event.endDate.getMinutes();

  return (
    <Modal visible={!!event} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.card, { backgroundColor: theme.background }]} onPress={() => {}}>
          {/* Accent strip */}
          <View style={styles.strip} />

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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

            {/* Debug section — helps diagnose rendering issues */}
            <View style={[styles.debugBox, { backgroundColor: theme.backgroundElement }]}>
              <Text style={[styles.debugTitle, { color: theme.textSecondary }]}>Debug info</Text>
              <Text style={[styles.debugLine, { color: theme.textSecondary }]}>
                startISO: {event.startDate.toISOString()}
              </Text>
              <Text style={[styles.debugLine, { color: theme.textSecondary }]}>
                endISO: {event.endDate.toISOString()}
              </Text>
              <Text style={[styles.debugLine, { color: theme.textSecondary }]}>
                durationMs: {durationMs} ({durationMin} min)
              </Text>
              <Text style={[styles.debugLine, { color: theme.textSecondary }]}>
                startMin (local h*60+m): {startMinFromMidnight}
              </Text>
              <Text style={[styles.debugLine, { color: theme.textSecondary }]}>
                endMin (local h*60+m): {endMinFromMidnight}
              </Text>
              <Text style={[styles.debugLine, { color: theme.textSecondary }]}>
                calendarId: {event.calendarId}
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
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  } as ViewStyle,
  strip: {
    height: 4,
    backgroundColor: '#4A90D9',
  } as ViewStyle,
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.sm,
  } as ViewStyle,
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
  debugBox: {
    marginTop: Spacing.md,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    gap: 3,
  } as ViewStyle,
  debugTitle: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  } as TextStyle,
  debugLine: {
    fontSize: 10,
    fontFamily: 'monospace',
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
