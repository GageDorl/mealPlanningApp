import { PowerSyncDatabase } from '@powersync/web';
import { AppSchema } from './powersync-schema';

export const db = new PowerSyncDatabase({
  schema: AppSchema,
  database: {
    dbFilename: 'Bento.db',
    worker: '/@powersync/worker/WASQLiteDB.umd.js',
  } as any,
  sync: {
    worker: '/@powersync/worker/SharedSyncImplementation.umd.js',
  },
});
