import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const PLANNING_NUDGE_ID = 'planning-nudge-weekly';
const MACRO_CHECKIN_ID = 'macro-checkin-daily';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function mealReminderId(slotId: string) {
  return `meal-reminder-${slotId}`;
}

export async function register(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleMealReminder(
  slotId: string,
  recipeName: string,
  date: Date,
): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(mealReminderId(slotId)).catch(() => {});
  if (date <= new Date()) return;
  await Notifications.scheduleNotificationAsync({
    identifier: mealReminderId(slotId),
    content: {
      title: 'Time to cook!',
      body: `Time to start cooking ${recipeName}.`,
      data: { slotId },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
    },
  });
}

export async function cancelMealReminder(slotId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(mealReminderId(slotId)).catch(() => {});
}

export async function schedulePlanningNudge(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(PLANNING_NUDGE_ID).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: PLANNING_NUDGE_ID,
    content: {
      title: "Plan next week's meals",
      body: "You haven't planned next week yet. Take a moment to set up your meals.",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 1, // Sunday
      hour: 19,
      minute: 0,
    },
  });
}

export async function cancelPlanningNudge(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(PLANNING_NUDGE_ID).catch(() => {});
}

export async function scheduleMacroCheckIn(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(MACRO_CHECKIN_ID).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: MACRO_CHECKIN_ID,
    content: {
      title: 'Daily macro check-in',
      body: 'How did your nutrition go today? Check your macro progress.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 21,
      minute: 0,
    },
  });
}

export async function cancelMacroCheckIn(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(MACRO_CHECKIN_ID).catch(() => {});
}

export async function cancelAll(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}
