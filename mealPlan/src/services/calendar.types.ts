export interface CalendarEvent {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  calendarId: string;
  isAllDay: boolean;
}

export interface MealEventInput {
  title: string;
  date: string;
  timeOfDay: string | null;
  slotId: string;
}

export interface CalendarInfo {
  id: string;
  title: string;
  source: string;
}
