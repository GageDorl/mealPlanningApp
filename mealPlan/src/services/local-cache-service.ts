import { db } from './powersync-database';

type CacheTable = 'cached_recipes' | 'cached_foods' | 'cached_calendar_events';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

interface CacheRow { data: string; cached_at: string }

export async function getCached<T>(table: CacheTable, key: string): Promise<T | null> {
  try {
    const rows = await db.getAll<CacheRow>(`SELECT data FROM ${table} WHERE id = ?`, [key]);
    if (!rows.length) return null;
    return JSON.parse(rows[0].data) as T;
  } catch {
    return null;
  }
}

export async function getCachedIfFresh<T>(table: CacheTable, key: string): Promise<T | null> {
  try {
    const cutoff = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();
    const rows = await db.getAll<CacheRow>(
      `SELECT data FROM ${table} WHERE id = ? AND cached_at > ?`,
      [key, cutoff],
    );
    if (!rows.length) return null;
    return JSON.parse(rows[0].data) as T;
  } catch {
    return null;
  }
}

export async function setCached<T>(table: CacheTable, key: string, data: T): Promise<void> {
  try {
    await db.execute(
      `INSERT OR REPLACE INTO ${table} (id, data, cached_at) VALUES (?, ?, ?)`,
      [key, JSON.stringify(data), new Date().toISOString()],
    );
  } catch {}
}

export async function cleanupExpiredCache(): Promise<void> {
  const cutoff = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();
  await db.execute('DELETE FROM cached_recipes WHERE cached_at < ?', [cutoff]);
  await db.execute('DELETE FROM cached_foods WHERE cached_at < ?', [cutoff]);
  await db.execute('DELETE FROM cached_calendar_events WHERE cached_at < ?', [cutoff]);
}
