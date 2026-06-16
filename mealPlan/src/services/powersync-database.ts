import { PowerSyncDatabase } from '@powersync/react-native';
import { AppSchema } from './powersync-schema';

export const db = new PowerSyncDatabase({
  schema: AppSchema,
  database: { dbFilename: 'prepd.db' },
});
