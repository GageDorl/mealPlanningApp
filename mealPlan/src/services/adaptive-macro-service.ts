import type { WeightLogEntry, WeightGoal } from './weight-log-service';
import { calculateDailyDeficit, computeMacrosFromCalories, type GoalType } from './macro-planner-service';

export type DailyCalories = {
  date: string;   // 'YYYY-MM-DD'
  calories: number;
};

export type SuspiciousReason = 'low_calories' | 'unexpected_gain';

export type SuspiciousDay = {
  date: string;
  reasons: SuspiciousReason[];
  calories: number;
  weightLbs: number | null;
  weightDeltaLbs: number | null;
};

export type MacroAdjustment = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  actualTdee: number;
  dailyDeficit: number;
};

const MIN_DATA_DAYS = 7;
const LOW_CAL_THRESHOLD = 800;
const SUSPICIOUS_GAIN_CAL_THRESHOLD = 1500;

export function hasEnoughData(
  weightLogs: WeightLogEntry[],
  dailyCalories: DailyCalories[],
): boolean {
  const calMap = new Map(dailyCalories.map((d) => [d.date, d.calories]));
  const daysWithBoth = weightLogs.filter(
    (w) => calMap.has(w.date) && (calMap.get(w.date) ?? 0) > 0,
  );
  return daysWithBoth.length >= MIN_DATA_DAYS;
}

export function isDismissed(weightGoal: WeightGoal): boolean {
  if (!weightGoal.last_dismissed_at) return false;
  const dismissedMs = new Date(weightGoal.last_dismissed_at).getTime();
  return Date.now() - dismissedMs < 7 * 24 * 60 * 60 * 1000;
}

export function detectSuspiciousDays(
  weightLogs: WeightLogEntry[],
  dailyCalories: DailyCalories[],
): SuspiciousDay[] {
  const calMap = new Map(dailyCalories.map((d) => [d.date, d.calories]));
  const calDates = [...calMap.keys()].sort();
  const windowStart = calDates[0];
  const windowEnd = calDates[calDates.length - 1];
  const sortedWeights = [...weightLogs]
    .filter((w) => w.date >= windowStart && w.date <= windowEnd)
    .sort((a, b) => a.date.localeCompare(b.date));

  const suspicious: SuspiciousDay[] = [];

  for (let i = 0; i < sortedWeights.length; i++) {
    const { date, weight_lbs } = sortedWeights[i];
    const calories = calMap.get(date) ?? 0;
    const reasons: SuspiciousReason[] = [];

    if (calories < LOW_CAL_THRESHOLD) {
      reasons.push('low_calories');
    }

    if (i > 0 && calories < SUSPICIOUS_GAIN_CAL_THRESHOLD) {
      const prevWeight = sortedWeights[i - 1].weight_lbs;
      const delta = weight_lbs - prevWeight;
      if (delta > 0.5) {
        reasons.push('unexpected_gain');
      }
    }

    if (reasons.length > 0) {
      const prevWeight = i > 0 ? sortedWeights[i - 1].weight_lbs : null;
      suspicious.push({
        date,
        reasons,
        calories,
        weightLbs: weight_lbs,
        weightDeltaLbs: prevWeight !== null ? weight_lbs - prevWeight : null,
      });
    }
  }

  return suspicious;
}

export function calculateActualTdee(
  weightLogs: WeightLogEntry[],
  dailyCalories: DailyCalories[],
  excludeDates: Set<string>,
): number {
  const calDates = dailyCalories
    .filter((d) => !excludeDates.has(d.date))
    .map((d) => d.date)
    .sort();
  if (calDates.length === 0) return 0;

  const windowStart = calDates[0];
  const windowEnd = calDates[calDates.length - 1];

  const weightInWindow = [...weightLogs]
    .filter((w) => !excludeDates.has(w.date) && w.date >= windowStart && w.date <= windowEnd)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (weightInWindow.length < 2) return 0;

  const mean = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
  const calMap = new Map(dailyCalories.map((d) => [d.date, d.calories]));

  const weekOf = (date: string) =>
    Math.floor((new Date(`${date}T12:00:00`).getTime() - new Date(`${windowStart}T12:00:00`).getTime()) / (7 * 86400000));

  const weightByWeek = new Map<number, number[]>();
  for (const w of weightInWindow) {
    const wk = weekOf(w.date);
    if (!weightByWeek.has(wk)) weightByWeek.set(wk, []);
    weightByWeek.get(wk)!.push(w.weight_lbs);
  }
  const weekEntries = [...weightByWeek.entries()].sort(([a], [b]) => a - b);
  const mostRecentWeekCount = weekEntries[weekEntries.length - 1]?.[1].length ?? 0;

  let weightChangeLbs: number;
  let avgDailyCals: number;

  if (weekEntries.length < 2 || mostRecentWeekCount < 3) {
    // First week or thin recent-week bucket: use the first log as the baseline and
    // the average of all subsequent logs as the current state, over a 7-day span.
    // This prevents a single end-of-week weigh-in from flipping the trend direction.
    const firstWeight = weightInWindow[0].weight_lbs;
    const restAvgWeight = mean(weightInWindow.slice(1).map((w) => w.weight_lbs));
    weightChangeLbs = restAvgWeight - firstWeight;
    avgDailyCals = mean(calDates.map((d) => calMap.get(d) ?? 0));
  } else {
    // Standard week-over-week: compare the two most recent full weeks.
    const weekAvgWeights = weekEntries.map(([, ws]) => mean(ws));
    weightChangeLbs = weekAvgWeights[weekAvgWeights.length - 1] - weekAvgWeights[weekAvgWeights.length - 2];
    const calByWeek = new Map<number, number[]>();
    for (const date of calDates) {
      const wk = weekOf(date);
      if (!calByWeek.has(wk)) calByWeek.set(wk, []);
      calByWeek.get(wk)!.push(calMap.get(date) ?? 0);
    }
    avgDailyCals = mean([...calByWeek.values()].map((cals) => mean(cals)));
  }

  return Math.round(avgDailyCals - (weightChangeLbs * 3500) / 7);
}

export function buildMacroAdjustment(
  actualTdee: number,
  weightGoal: WeightGoal,
  currentWeightLbs: number,
  goalType: GoalType,
  currentCalories: number,
): MacroAdjustment {
  const dailyDeficit = calculateDailyDeficit(
    currentWeightLbs,
    weightGoal.goal_weight_lbs,
    weightGoal.goal_date,
  );
  const rawCalories = Math.max(1200, Math.round(actualTdee + dailyDeficit));
  // Dampen toward the current goal to avoid large one-shot corrections from noisy early data.
  const calories = currentCalories > 0
    ? Math.max(1200, Math.round((rawCalories + currentCalories) / 2))
    : rawCalories;
  const { protein, carbs, fat } = computeMacrosFromCalories(calories, currentWeightLbs, goalType);
  return { calories, protein, carbs, fat, actualTdee, dailyDeficit };
}
