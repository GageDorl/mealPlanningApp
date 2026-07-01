export interface CalendarEvent {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  calendarId: string;
  isAllDay: boolean;
  isBento?: boolean;
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
  color?: string;
}

export interface CachedEventData {
  events: CalendarEvent[];
  fetchedAt: number;
}
