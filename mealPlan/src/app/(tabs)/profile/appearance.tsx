import { ScrollView, View, Text, Pressable, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';

import { CalendarPickerList } from '@/components/calendar/calendar-picker-list';
import { Colors, FontSizes, Spacing, BorderRadius, MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemeToggle } from '@/hooks/use-theme-toggle';
import { useCalendar } from '@/hooks/use-calendar';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';

const THEME_OPTIONS = [
  { label: '☀️ Light', value: 'light' as const },
  { label: '🌙 Dark', value: 'dark' as const },
  { label: '🖥️ System', value: null as null },
];

export default function AppearanceScreen() {
  const theme = useTheme();
  const { themeMode, setTheme } = useThemeToggle();
  const {
    connected, connectError, availableCalendars, selectedCalendarIds,
    calendarExportEnabled, setExportEnabled, connect, disconnect, selectCalendars,
  } = useCalendar();

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.content, { maxWidth: MaxContentWidth, alignSelf: 'center', width: '100%' }]}>

        {/* Theme */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Theme</Text>
          <View style={styles.themeRow}>
            {THEME_OPTIONS.map(({ label, value }) => {
              const active = themeMode === value;
              return (
                <Pressable
                  key={label}
                  onPress={() => setTheme(value)}
                  style={[
                    styles.themeBtn,
                    active
                      ? { backgroundColor: Colors.accent }
                      : { backgroundColor: theme.backgroundElement, borderColor: theme.border, borderWidth: 1 },
                  ]}
                >
                  <Text style={[styles.themeBtnLabel, { color: active ? '#FFFFFF' : theme.text }]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Google Calendar */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Google Calendar</Text>
          <View style={[styles.calendarCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            {connected ? (
              <>
                <View style={[styles.toggleRow, { borderBottomColor: theme.border }]}>
                  <Text style={[styles.toggleLabel, { color: theme.text }]}>Export meals to calendar</Text>
                  <Toggle
                    value={calendarExportEnabled}
                    onValueChange={setExportEnabled}
                  />
                </View>
                <View style={styles.calendarListSection}>
                  <Text style={[styles.calendarListLabel, { color: theme.textSecondary }]}>Calendars to display</Text>
                  <CalendarPickerList
                    calendars={availableCalendars}
                    selectedIds={selectedCalendarIds}
                    loading={availableCalendars.length === 0}
                    onToggle={(id) => {
                      const allIds = availableCalendars.map((c) => c.id);
                      const effective = selectedCalendarIds.length === 0 ? allIds : selectedCalendarIds;
                      const next = effective.includes(id)
                        ? effective.filter((x) => x !== id)
                        : [...effective, id];
                      selectCalendars(next.length === allIds.length ? [] : next);
                    }}
                  />
                </View>
                <Button label="Disconnect Google Calendar" onPress={disconnect} variant="secondary" />
              </>
            ) : (
              <View style={styles.connectSection}>
                <Text style={[styles.connectDesc, { color: theme.textSecondary }]}>
                  Connect Google Calendar to export your meal plans as calendar events.
                </Text>
                <Button label="Connect Google Calendar" onPress={connect} />
                {connectError ? (
                  <Text style={[styles.errorText, { color: theme.error }]}>{connectError}</Text>
                ) : null}
              </View>
            )}
          </View>
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  } as ViewStyle,
  content: {
    gap: Spacing.xl,
  } as ViewStyle,
  section: {
    gap: Spacing.sm,
  } as ViewStyle,
  sectionTitle: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,
  themeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  } as ViewStyle,
  themeBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  } as ViewStyle,
  themeBtnLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  } as TextStyle,
  calendarCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    padding: Spacing.lg,
    gap: Spacing.md,
  } as ViewStyle,
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,
  toggleLabel: {
    fontSize: FontSizes.md,
    fontWeight: '500',
  } as TextStyle,
  calendarListSection: {
    gap: Spacing.sm,
  } as ViewStyle,
  calendarListLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  } as TextStyle,
  connectSection: {
    gap: Spacing.md,
  } as ViewStyle,
  connectDesc: {
    fontSize: FontSizes.sm,
    lineHeight: 20,
  } as TextStyle,
  errorText: {
    fontSize: FontSizes.sm,
  } as TextStyle,
});
