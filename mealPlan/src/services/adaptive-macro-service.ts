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
  const sortedWeights = [...weightLogs].sort((a, b) => a.date.localeCompare(b.date));

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
  const sorted = [...weightLogs]
    .filter((w) => !excludeDates.has(w.date))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (sorted.length < 2) return 0;

  const calMap = new Map(dailyCalories.map((d) => [d.date, d.calories]));
  const firstWeight = sorted[0].weight_lbs;
  const lastWeight = sorted[sorted.length - 1].weight_lbs;
  const weightChangeLbs = lastWeight - firstWeight;

  const includedCals = [...calMap.entries()]
    .filter(([date]) => !excludeDates.has(date))
    .reduce((sum, [, cal]) => sum + cal, 0);

  const days = dailyCalories.filter((d) => !excludeDates.has(d.date)).length;
  if (days === 0) return 0;

  const netSurplusKcal = weightChangeLbs * 3500;
  return Math.round((includedCals - netSurplusKcal) / days);
}

export function buildMacroAdjustment(
  actualTdee: number,
  weightGoal: WeightGoal,
  currentWeightLbs: number,
  goalType: GoalType,
): MacroAdjustment {
  const dailyDeficit = calculateDailyDeficit(
    currentWeightLbs,
    weightGoal.goal_weight_lbs,
    weightGoal.goal_date,
  );
  const calories = Math.max(1200, Math.round(actualTdee + dailyDeficit));
  const { protein, carbs, fat } = computeMacrosFromCalories(calories, currentWeightLbs, goalType);
  return { calories, protein, carbs, fat, actualTdee, dailyDeficit };
}
