import type {
  AbstractPowerSyncDatabase,
  CrudEntry,
  PowerSyncBackendConnector,
} from '@powersync/web';
import { UpdateType } from '@powersync/web';
import { supabase } from './supabase';
import env from '@/constants/env';

export class SupabasePowerSyncConnector implements PowerSyncBackendConnector {
  constructor(_log: (msg: string) => void = () => {}) {}
  async fetchCredentials() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    return { endpoint: env.POWERSYNC_URL, token: session.access_token };
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const batch = await database.getCrudBatch(200);
    if (!batch) return;

    try {
      for (const op of batch.crud) {
        await this.applyOperation(op);
      }
      await batch.complete();
    } catch (e) {
      // Do NOT call batch.complete() on error — PowerSync will retry
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
