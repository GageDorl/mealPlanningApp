import { Pressable, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import type { CalendarEvent } from '@/services/calendar.types';

interface ExternalEventBlockProps {
  event: CalendarEvent;
  compact?: boolean;
  onPress?: () => void;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function ExternalEventBlock({ event, compact = false, onPress }: ExternalEventBlockProps) {
  const timeLabel = event.isAllDay
    ? 'All day'
    : `${formatTime(event.startDate)} – ${formatTime(event.endDate)}`;

  return (
    <Pressable style={[styles.block, compact && styles.blockCompact]} onPress={onPress}>
      <Text style={styles.title} numberOfLines={compact ? 1 : 2}>
        {event.title}
      </Text>
      {!compact && <Text style={styles.time}>{timeLabel}</Text>}
    </Pressable>
  );
}

const ACCENT = '#6A9EC8';

const styles = StyleSheet.create({
  block: {
    backgroundColor: `${ACCENT}BB`,
    borderLeftWidth: 3,
    borderLeftColor: ACCENT,
    borderRadius: BorderRadius.sm,
    padding: Spacing.xs,
    flex: 1,
  } as ViewStyle,
  blockCompact: {
    justifyContent: 'center',
  } as ViewStyle,
  title: {
    fontSize: FontSizes.xs,
    fontWeight: '500',
    color: '#FFFFFF',
  } as TextStyle,
  time: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.80)',
    marginTop: 1,
  } as TextStyle,
});
