import {
  AbstractPowerSyncDatabase,
  CrudEntry,
  PowerSyncBackendConnector,
  UpdateType,
} from '@powersync/react-native';
import { supabase } from './supabase';
import env from '@/constants/env';

export class SupabasePowerSyncConnector implements PowerSyncBackendConnector {
  private log: (msg: string) => void;
  constructor(log: (msg: string) => void = () => {}) {
    this.log = log;
  }

  async fetchCredentials() {
    this.log('fetchCredentials: calling getSession...');
    const { data: { session } } = await supabase.auth.getSession();
    this.log(`fetchCredentials: session=${!!session} endpoint=${env.POWERSYNC_URL}`);
    if (!session) return null;
    return {
      endpoint: env.POWERSYNC_URL,
      token: session.access_token,
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const batch = await database.getCrudBatch(200);
    if (!batch) return;

    this.log(`upload: ${batch.crud.length} ops queued`);
    try {
      for (const op of batch.crud) {
        this.log(`upload: ${op.op} ${op.table}/${op.id}`);
        await this.applyOperation(op);
      }
      await batch.complete();
      this.log(`upload: batch complete`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : JSON.stringify(e).slice(0, 150);
      this.log(`upload: FAILED - ${msg}`);
      // Permanent Postgres errors can never succeed — skip the batch to unblock the queue
      const pgCode = (e as Record<string, unknown>)?.code as string | undefined;
      if (pgCode && ['22P02', '23505', '23503', '42703', '42P01'].includes(pgCode)) {
        this.log(`upload: permanent error ${pgCode}, skipping batch`);
        await batch.complete();
        return;
      }
      throw e;
    }
  }

  private async applyOperation(op: CrudEntry): Promise<void> {
    const { table, op: type, id, opData } = op;
    if (type === UpdateType.PUT) {
      const { error } = await supabase.from(table).upsert({ id, ...opData });
      if (error) throw error;
    } else if (type === UpdateType.PATCH) {
      const { error } = await supabase.from(table).update(opData ?? {}).eq('id', id);
      if (error) throw error;
    } else if (type === UpdateType.DELETE) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
    }
  }
}
