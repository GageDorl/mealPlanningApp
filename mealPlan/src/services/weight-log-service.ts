export type WeightLogEntry = {
  date: string;        // 'YYYY-MM-DD'
  weight_lbs: number;
};

export type WeightGoal = {
  goal_weight_lbs: number;
  goal_date: string;           // 'YYYY-MM-DD'
  baseline_weight_lbs: number;
  baseline_date: string;
  last_dismissed_at?: string;  // ISO timestamp — suppresses adjustment card for 7 days
};

interface PsDb {
  execute(sql: string, params?: unknown[]): Promise<unknown>;
  getAll<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
}

export function parseWeightLogs(raw: string | null | undefined): WeightLogEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as WeightLogEntry[]) : [];
  } catch {
    return [];
  }
}

export function parseWeightGoal(raw: string | null | undefined): WeightGoal | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.goal_weight_lbs !== 'number' || typeof parsed.goal_date !== 'string') return null;
    return parsed as WeightGoal;
  } catch {
    return null;
  }
}

export function hasLoggedToday(weightLogs: WeightLogEntry[]): boolean {
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return weightLogs.some((e) => e.date === today);
}

export async function upsertWeightLog(
  db: PsDb,
  userId: string,
  entry: WeightLogEntry,
): Promise<void> {
  const rows = await db.getAll<{ weight_logs: string }>(
    'SELECT weight_logs FROM users WHERE id = ?',
    [userId],
  );
  const existing = parseWeightLogs(rows[0]?.weight_logs);
  const updated = existing.filter((e) => e.date !== entry.date);
  updated.push(entry);
  updated.sort((a, b) => a.date.localeCompare(b.date));
  await db.execute(
    'UPDATE users SET weight_logs = ?, updated_at = ? WHERE id = ?',
    [JSON.stringify(updated), new Date().toISOString(), userId],
  );
}

export async function setWeightGoal(
  db: PsDb,
  userId: string,
  goal: WeightGoal,
): Promise<void> {
  await db.execute(
    'UPDATE users SET weight_goal = ?, updated_at = ? WHERE id = ?',
    [JSON.stringify(goal), new Date().toISOString(), userId],
  );
}

export async function clearWeightGoal(db: PsDb, userId: string): Promise<void> {
  await db.execute(
    'UPDATE users SET weight_goal = NULL, updated_at = ? WHERE id = ?',
    [new Date().toISOString(), userId],
  );
}

export async function dismissAdjustment(
  db: PsDb,
  userId: string,
  currentGoal: WeightGoal,
): Promise<void> {
  await setWeightGoal(db, userId, { ...currentGoal, last_dismissed_at: new Date().toISOString() });
}
